from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from database.database import SessionLocal
from agents.profiling_agent import start_profiling_session, process_submission_and_continue, update_with_problem
from agents.question_selector_agent import select_problem
from agents.analysis_agent import analyze_submission
import json
import traceback

# Define get_db function here to avoid circular imports
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Request/Response Models
class StartProfilingRequest(BaseModel):
    student_id: str

class StartProfilingResponse(BaseModel):
    session_id: str
    problem: Dict[str, Any]

class SubmitProfilingAnswerRequest(BaseModel):
    session_id: str
    submission_result: Dict[str, Any]

class SubmitProfilingAnswerResponse(BaseModel):
    status: str
    next_problem: Optional[Dict[str, Any]] = None
    assessment_result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ProfilingStatusRequest(BaseModel):
    session_id: str

class ProfilingStatusResponse(BaseModel):
    status: str
    completed: bool
    problems_attempted: int
    current_topic: Optional[str] = None
    current_difficulty: Optional[str] = None

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
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to select problem: {problem_result.get('errors', ['Unknown error'])}"
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
            else:
                pass
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
                    from database.models import Submission
                    submission_id = request.submission_result["submission_id"]
                    submission = db.query(Submission).filter(Submission.id == submission_id).first()
                    if submission:
                        request.submission_result["problem_id"] = submission.problem_id
                except Exception as e:
                    pass
        
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
                from agents.profiling_agent import profiling_agent, update_with_problem
                config = {"configurable": {"thread_id": request.session_id}}
                
                # Get current state
                current_checkpoint = profiling_agent.checkpointer.get(config)
                if current_checkpoint:
                    current_state = current_checkpoint.get("channel_values", {})
                    
                    # Update with the selected problem
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

# Function to register the router with the main app
def register_profiling_api(app):
    app.include_router(profiling_router, prefix="/api/profiling", tags=["profiling"])