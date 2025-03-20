from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Any
from database.database import SessionLocal
from agents.profiling_agent import start_profiling_session, process_submission_and_continue, finalize_profiling, profiling_agent, update_with_problem
from agents.question_selector_agent import select_problem
from agents.analysis_agent import analyze_submission
import traceback
import sys
import os
from database.models import StudentProfile, StudentTopicMastery, Topic, StudentAttempt, Problem, Submission, ProfilingSession, CodeAnalysis

# Add shared_resources to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "shared_resources")))
from shared_resources.schemas import (
    StartProfilingRequest,
    StartProfilingResponse,
    SubmitProfilingAnswerRequest,
    SubmitProfilingAnswerResponse,
    ProfilingStatusRequest,
    ProfilingStatusResponse,
    StudentAssessmentResponse,
)

# Define get_db function here to avoid circular imports
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create router
profiling_router = APIRouter()

# Endpoint to start a profiling session
@profiling_router.post("/start-profiling", response_model=StartProfilingResponse)
async def api_start_profiling(
    request: StartProfilingRequest,
    db: Session = Depends(get_db)
):
    try:
        # Start profiling session
        session_id, result = start_profiling_session(request.student_id)
        
        # Get question selection request from result
        question_request = result.get("question_selection_request")
        if not question_request:
            raise HTTPException(status_code=500, detail="Failed to initialize profiling session")
        
        # Select the first problem
        problem_result = select_problem(
            topic_id=question_request["topic_id"],
            difficulty=question_request["difficulty"],
            avoided_problem_ids=question_request.get("avoided_problem_ids", []),
            is_profiling=True,
            student_id=request.student_id,
            force_generation=True  # Force generation for the first problem
        )
        
        if not problem_result.get("success", False):
            error_detail = f"Failed to select problem: {problem_result.get('errors', ['Unknown error'])}"
            raise HTTPException(
                status_code=500, 
                detail=error_detail
            )
        
        # CRITICAL: Update the agent state with the selected problem
        from agents.profiling_agent import profiling_agent, update_with_problem
        config = {"configurable": {"thread_id": session_id}}
        
        # Get the current state
        try:
            current_checkpoint = profiling_agent.checkpointer.get(config)
            if current_checkpoint:
                current_state = current_checkpoint.get("channel_values", {})
                
                # Update with the selected problem
                updated_state = update_with_problem(current_state, problem_result["problem"])
                
                # Save the updated state back to the agent
                profiling_agent.invoke(updated_state, config=config)
        except Exception as e:
            pass
        
        return StartProfilingResponse(
            session_id=session_id,
            problem=problem_result["problem"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to submit an answer during profiling
@profiling_router.post("/submit-profiling-answer", response_model=SubmitProfilingAnswerResponse)
async def api_submit_profiling_answer(
    request: SubmitProfilingAnswerRequest,
    db: Session = Depends(get_db)
):
    try:
        # Check if problem_id exists in submission result
        if "problem_id" not in request.submission_result:
            # Try to get problem_id from other fields if available
            if "submission_id" in request.submission_result:
                # Try to fetch problem_id using submission_id
                try:
                    submission_id = request.submission_result["submission_id"]
                    submission = db.query(Submission).filter(Submission.id == submission_id).first()
                    if submission:
                        request.submission_result["problem_id"] = submission.problem_id
                except Exception as e:
                    pass
        if "user_code" in request.submission_result:
            try:
                # Call the analysis agent
                analysis_result = analyze_submission(
                    student_id=request.submission_result.get("student_id"),
                    problem_id=request.submission_result.get("problem_id"),
                    submission_id=request.submission_result.get("submission_id"),
                    submission_code=request.submission_result.get("user_code"),
                    submission_status=request.submission_result.get("status"),
                    test_results=request.submission_result.get("test_results", []),
                    is_profiling=True
                )
                print(f"Analysis completed: {analysis_result.get('success', False)}")
            except Exception as e:
                # Don't fail the submission process if analysis fails
                print(f"Error in submission analysis: {str(e)}")
        
        # Process submission and get next problem
        result = process_submission_and_continue(
            request.session_id,
            request.submission_result
        )
        
        # Check result status
        if result.get("status") == "error":
            error_msg = result.get("errors", ["Unknown error"])[0]
            return SubmitProfilingAnswerResponse(
                status="error",
                error=error_msg
            )
        
        if result.get("status") == "completed":
            # Profiling is complete, return assessment
            return SubmitProfilingAnswerResponse(
                status="completed",
                assessment_result=result.get("assessment")
            )
        
        # Still in progress, get next problem
        question_request = result.get("question_selection_request")
        
        if not question_request:
            return SubmitProfilingAnswerResponse(
                status="error",
                error="Failed to get next question"
            )
        
        # Select the next problem
        student_id = request.submission_result.get("student_id")
        
        # Select the next problem
        problem_result = select_problem(
            topic_id=question_request["topic_id"],
            difficulty=question_request["difficulty"],
            avoided_problem_ids=question_request.get("avoided_problem_ids", []),
            is_profiling=True,
            student_id=student_id,
            force_generation=True  # Force generation for new problems
        )
        
        if problem_result.get('success', False):
            # CRITICAL: Update the agent state with the selected problem
            try:
                config = {"configurable": {"thread_id": request.session_id}}
                
                # Get current state
                current_checkpoint = profiling_agent.checkpointer.get(config)
                if current_checkpoint:
                    current_state = current_checkpoint.get("channel_values", {})
                    
                    # Additional check for max questions
                    completed_problems = current_state.get("completed_problems", [])
                    if len(completed_problems) >= 12:  # MAX_QUESTIONS
                        # Force finalize if we've reached the limit
                        current_state["current_phase"] = "finalizing"
                        final_state = finalize_profiling(current_state)
                        profiling_agent.invoke(final_state, config=config)
                        
                        return SubmitProfilingAnswerResponse(
                            status="completed",
                            assessment_result={
                                "skill_level": final_state["assessment_status"]["estimated_skill_level"],
                                "topic_assessments": final_state["topic_assessments"],
                                "recommendations": final_state["recommendations"],
                                "problems_attempted": len(final_state["completed_problems"]),
                                "problems_solved": final_state["assessment_status"]["problems_solved"],
                                "struggle_areas": [
                                    {"area": "algorithm_understanding", "count": final_state.get("struggle_patterns", {}).get("algorithm_selection", 0) + final_state.get("struggle_patterns", {}).get("algorithm_application", 0)},
                                    {"area": "edge_case_handling", "count": final_state.get("struggle_patterns", {}).get("edge_cases", 0)},
                                    {"area": "code_efficiency", "count": final_state.get("struggle_patterns", {}).get("time_complexity", 0) + final_state.get("struggle_patterns", {}).get("space_complexity", 0)},
                                    {"area": "data_structure_choice", "count": final_state.get("struggle_patterns", {}).get("data_structure", 0)}
                                ]
                            }
                        )
                    
                    # If not at limit, update with the selected problem
                    updated_state = update_with_problem(current_state, problem_result["problem"])
                    
                    # Save the updated state
                    profiling_agent.invoke(updated_state, config=config)
                else:
                    pass
            except Exception as e:
                pass
        else:
            return SubmitProfilingAnswerResponse(
                status="error",
                error=f"Failed to select problem: {problem_result.get('errors', ['Unknown error'])}"
            )
        
        return SubmitProfilingAnswerResponse(
            status="in_progress",
            next_problem=problem_result["problem"]
        )
    except Exception as e:
        traceback.print_exc()
        return SubmitProfilingAnswerResponse(
            status="error",
            error=str(e)
        )
# Endpoint to analyze a submission with detailed feedback
@profiling_router.post("/analyze-submission")
async def api_analyze_submission(
    student_id: str,
    problem_id: int,
    submission_id: str,
    submission_code: str,
    submission_status: str,
    test_results: List[Dict[str, Any]],
    is_profiling: bool = False,
    db: Session = Depends(get_db)
):
    try:
        # Call analysis agent
        analysis_result = analyze_submission(
            student_id=student_id,
            problem_id=problem_id,
            submission_id=submission_id,
            submission_code=submission_code,
            submission_status=submission_status,
            test_results=test_results,
            is_profiling=is_profiling
        )
        
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to check profiling status
@profiling_router.post("/profiling-status", response_model=ProfilingStatusResponse)
async def api_profiling_status(
    request: ProfilingStatusRequest,
    db: Session = Depends(get_db)
):
    try:
        # Get profiling state from agent memory
        from agents.profiling_agent import profiling_agent
        config = {"configurable": {"thread_id": request.session_id}}
        
        # Retrieve current checkpoint
        current_checkpoint = profiling_agent.checkpointer.get(config)
        if not current_checkpoint:
            raise HTTPException(status_code=404, detail=f"No active session found with ID {request.session_id}")
        
        # Get current state
        current_state = current_checkpoint.get("channel_values", {})
        
        # Extract status information
        current_phase = current_state.get("current_phase", "initializing")
        assessment_status = current_state.get("assessment_status", {})
        completed_problems = current_state.get("completed_problems", [])
        
        return ProfilingStatusResponse(
            status=current_phase,
            completed=(current_phase == "finalizing"),
            problems_attempted=len(completed_problems),
            current_topic=assessment_status.get("current_topic_name"),
            current_difficulty=assessment_status.get("current_difficulty")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to get student assessment data
@profiling_router.get("/student/{student_id}/assessment", response_model=StudentAssessmentResponse)
async def get_student_assessment(
    student_id: str,
    db: Session = Depends(get_db)
):
    """Get assessment data for a specific student"""
    try:
        # Get student profile
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.id == student_id
        ).first()
        
        if not student_profile:
            raise HTTPException(status_code=404, detail="Student profile not found")
        
        # Get topic masteries
        topic_masteries = db.query(StudentTopicMastery).filter(
            StudentTopicMastery.student_profile_id == student_profile.id
        ).all()
        
        # Format topic mastery data
        mastery_data = []
        for tm in topic_masteries:
            topic = db.query(Topic).filter(Topic.id == tm.topic_id).first()
            if topic and tm.problems_attempted > 0:
                mastery_data.append({
                    "topic_name": topic.name,
                    "mastery_level": tm.mastery_level,
                    "problems_attempted": tm.problems_attempted,
                    "problems_solved": tm.problems_solved,
                    "problems_solved_non_ai": db.query(StudentAttempt).join(Problem).filter(
                        StudentAttempt.student_id == student_id,
                        Problem.topics.any(Topic.id == tm.topic_id),
                        Problem.is_ai_generated == False,
                        StudentAttempt.completed == True
                    ).count(),
                    "last_attempted_at": tm.last_attempted_at
                })
        
        # Get recent attempts
        attempts = db.query(StudentAttempt).filter(
            StudentAttempt.student_id == student_id
        ).order_by(StudentAttempt.start_time.desc()).limit(10).all()
        
        # Format attempt data
        attempt_data = []
        for attempt in attempts:
            problem = db.query(Problem).filter(Problem.id == attempt.problem_id).first()
            if problem:
                # Get problem topics
                topics = [topic.name for topic in problem.topics]
                
                attempt_data.append({
                    "problem_id": attempt.problem_id,
                    "problem_title": problem.title,
                    "problem_difficulty": problem.difficulty.value,
                    "topics": topics,
                    "start_time": attempt.start_time,
                    "completed": attempt.completed,
                    "submission_count": attempt.submission_count,
                    "is_profiling_problem": problem.is_profiling_problem
                })
        
        # Calculate skill level
        overall_mastery = 0
        if mastery_data:
            overall_mastery = sum(item["mastery_level"] for item in mastery_data) / len(mastery_data)
        
        skill_level = "Beginner"
        if overall_mastery >= 80:
            skill_level = "Advanced"
        elif overall_mastery >= 50:
            skill_level = "Intermediate"
        
        # Get struggle patterns from actual data
        struggle_counts = {}
        
        # Try to get from CodeAnalysis table
        try:
            code_analyses = db.query(CodeAnalysis).filter(
                CodeAnalysis.student_id == student_id
            ).order_by(CodeAnalysis.created_at.desc()).limit(20).all()
            
            for analysis in code_analyses:
                if analysis.struggle_areas:
                    for area in analysis.struggle_areas:
                        struggle_counts[area] = struggle_counts.get(area, 0) + 1
        except Exception as e:
            print(f"Error querying code analyses: {str(e)}")
        
        # If not enough data, also check ProfilingSession table
        if len(struggle_counts) < 2:
            try:
                profiling_sessions = db.query(ProfilingSession).filter(
                    ProfilingSession.student_id == student_id
                ).order_by(ProfilingSession.created_at.desc()).limit(5).all()
                
                for session in profiling_sessions:
                    if session.struggle_patterns:
                        for area, count in session.struggle_patterns.items():
                            struggle_counts[area] = struggle_counts.get(area, 0) + count
            except Exception as e:
                print(f"Error querying profiling sessions: {str(e)}")
        
        # Convert to expected format and sort by count
        struggle_patterns = []
        if struggle_counts:
            struggle_patterns = [
                {"area": area, "count": count} 
                for area, count in struggle_counts.items()
            ]
            struggle_patterns.sort(key=lambda x: x["count"], reverse=True)
            
            # Define readable names for the frontend
            area_display_names = {
                "algorithm_understanding": "Algorithm Pattern Recognition",
                "algorithm_selection": "Algorithm Pattern Recognition",
                "algorithm_application": "Algorithm Pattern Recognition",
                "data_structure_misuse": "Data Structure Selection",
                "data_structure": "Data Structure Selection",
                "logic_errors": "Logic Implementation",
                "efficiency_problems": "Time/Space Optimization",
                "time_complexity": "Time/Space Optimization",
                "space_complexity": "Time/Space Optimization",
                "edge_case_handling": "Edge Case Handling",
                "edge_cases": "Edge Case Handling"
            }
            
            # Transform the area names for display
            for pattern in struggle_patterns:
                if pattern["area"] in area_display_names:
                    pattern["area"] = area_display_names[pattern["area"]]
            
            # Take top 4 most frequent struggle areas
            struggle_patterns = struggle_patterns[:4]
        
        # If we couldn't find any struggle patterns, return an empty list
        # instead of hardcoded values
        if not struggle_patterns:
            struggle_patterns = []
        
        return {
            "student_id": student_id,
            "skill_level": skill_level,
            "overall_mastery": overall_mastery,
            "topic_masteries": mastery_data,
            "recent_attempts": attempt_data,
            "struggle_patterns": struggle_patterns
        }
    except HTTPException:
        # Re-raise HTTPExceptions (like 404) without modification
        raise
    except Exception as e:
        # Convert other exceptions to 500 errors
        raise HTTPException(status_code=500, detail=str(e))


# Function to register the router with the main app
def register_profiling_api(app):
    app.include_router(profiling_router, prefix="/api/profiling", tags=["profiling"])


# Add this to profiling_api.py

@profiling_router.post("/finalize-assessment")
async def api_finalize_assessment(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Manually finalize an assessment that's reached the question limit"""
    try:
        # Get profiling state from agent memory
        from agents.profiling_agent import profiling_agent, finalize_profiling
        config = {"configurable": {"thread_id": session_id}}
        
        # Retrieve current checkpoint
        current_checkpoint = profiling_agent.checkpointer.get(config)
        if not current_checkpoint:
            raise HTTPException(status_code=404, detail=f"No active session found with ID {session_id}")
        
        # Get current state
        current_state = current_checkpoint.get("channel_values", {})
        
        # Force finalize
        current_state["current_phase"] = "finalizing"
        
        # Run finalize step
        final_state = finalize_profiling(current_state)
        
        # Save final state
        profiling_agent.invoke(final_state, config=config)
        
        # Return the assessment results with enhanced struggle areas mapping
        return {
            "success": True,
            "assessment_result": {
                "skill_level": final_state["assessment_status"]["estimated_skill_level"],
                "topic_assessments": final_state["topic_assessments"],
                "recommendations": final_state["recommendations"],
                "problems_attempted": len(final_state["completed_problems"]),
                "problems_solved": final_state["assessment_status"]["problems_solved"],
                "struggle_areas": [
                    {"area": "algorithm_understanding", "count": final_state.get("struggle_patterns", {}).get("algorithm_selection", 0) + final_state.get("struggle_patterns", {}).get("algorithm_application", 0)},
                    {"area": "edge_case_handling", "count": final_state.get("struggle_patterns", {}).get("edge_cases", 0)},
                    {"area": "code_efficiency", "count": final_state.get("struggle_patterns", {}).get("time_complexity", 0) + final_state.get("struggle_patterns", {}).get("space_complexity", 0)},
                    {"area": "data_structure_choice", "count": final_state.get("struggle_patterns", {}).get("data_structure", 0)}
                ]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))