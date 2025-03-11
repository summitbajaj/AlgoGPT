from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, List, Any, Optional, TypedDict
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
import os
import uuid
import json
import traceback
from dotenv import load_dotenv
from database.database import SessionLocal
from database.models import StudentProfile, StudentTopicMastery, Topic, StudentAttempt, Problem
from sqlalchemy import func 
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Azure OpenAI Chat model
chat_model = AzureChatOpenAI(
    azure_deployment=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    api_version=os.getenv("AZURE_OPENAI_VERSION"),
    temperature=0.2  # Lower temperature for more consistent reasoning
)

# Initialize memory checkpointing
profiling_memory = MemorySaver()

# Define state structure for the profiling agent
class ProfilingState(TypedDict):
    student_id: str
    session_id: str
    current_phase: str  # "initializing", "assessing", "finalizing"
    assessment_status: Dict[str, Any]  # Track current assessment status
    completed_problems: List[Dict[str, Any]]  # Problems already presented
    current_problem: Optional[Dict[str, Any]]  # Current problem being presented
    topic_assessments: Dict[str, float]  # Topic mastery assessments
    recommendations: List[Dict[str, Any]]  # Final recommendations
    errors: List[str]  # Any errors encountered during the process
    question_selection_request: Optional[Dict[str, Any]]  # Used to request new questions
    session_start_time: datetime  # When the session started
    struggle_patterns: Dict[str, int]  # Track areas where student struggles

def initialize_profiling(state: ProfilingState) -> ProfilingState:
    """
    Initialize the profiling session for a student.
    Only sets default values if they are not already present.
    """
    student_id = state["student_id"]
    db = SessionLocal()
    try:
        # Parse or generate the UUID for the student
        try:
            uuid_student_id = uuid.UUID(student_id)
        except ValueError:
            uuid_student_id = uuid.uuid5(uuid.NAMESPACE_DNS, student_id)
        
        # Check if student profile exists; create if not
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == uuid_student_id
        ).first()
        
        if not student_profile:
            student_profile = StudentProfile(user_id=uuid_student_id)
            db.add(student_profile)
            db.flush()
            topics = db.query(Topic).all()
            for topic in topics:
                topic_mastery = StudentTopicMastery(
                    student_profile_id=student_profile.id,
                    topic_id=topic.id,
                    mastery_level=0.0,
                    problems_attempted=0,
                    problems_solved=0
                )
                db.add(topic_mastery)
            db.commit()
        
        # Set defaults only if the keys are missing
        state.setdefault("current_phase", "initializing")
        state.setdefault("assessment_status", {
            "current_topic_id": None,
            "current_difficulty": "Easy",
            "problems_presented": 0,
            "problems_solved": 0,
            "current_topic_mastery": 0.0,
            "estimated_skill_level": "Beginner",
        })
        state.setdefault("completed_problems", [])
        state.setdefault("current_problem", None)
        state.setdefault("topic_assessments", {})
        state.setdefault("recommendations", [])
        state.setdefault("errors", [])
        state.setdefault("question_selection_request", None)
        state.setdefault("struggle_patterns", {})
        if "session_start_time" not in state:
            state["session_start_time"] = datetime.utcnow()
        
        # IMPORTANT: Do not override keys if they already exist
        return state
    except Exception as e:
        state["errors"] = state.get("errors", []) + [f"Error initializing profiling: {str(e)}"]
        return state
    finally:
        db.close()


def select_next_topic(state: ProfilingState) -> ProfilingState:
    """
    Enhanced topic selection with better rotation logic
    """
    # Check for max questions limit
    MAX_QUESTIONS = 12
    total_problems_attempted = len(state["completed_problems"])
    
    if total_problems_attempted >= MAX_QUESTIONS:
        return {**state, "current_phase": "finalizing"}
    
    # Check time limit
    current_time = datetime.utcnow()
    session_start_time = state.get("session_start_time", current_time)
    session_duration = (current_time - session_start_time).total_seconds() / 60
    
    if session_duration >= 30:  # 30-minute limit
        return {**state, "current_phase": "finalizing"}
    
    db = SessionLocal()
    try:
        # Handle initialization phase
        if state["current_phase"] == "initializing":
            # Start with Arrays
            arrays_topic = db.query(Topic).filter(Topic.name == "Arrays").first()
            if not arrays_topic:
                arrays_topic = db.query(Topic).first()
            
            if not arrays_topic:
                return {**state, "errors": ["No topics found in database"]}
            
            return {
                **state,
                "current_phase": "assessing",
                "assessment_status": {
                    **state["assessment_status"],
                    "current_topic_id": arrays_topic.id,
                    "current_topic_name": arrays_topic.name,
                    "current_difficulty": "Easy",
                    "problems_presented": 0
                }
            }
        
        # Assessment phase logic with enhanced topic rotation
        if state["current_phase"] == "assessing":
            current_topic_id = state["assessment_status"].get("current_topic_id")
            problems_presented = state["assessment_status"].get("problems_presented", 0)
            problems_solved = state["assessment_status"].get("problems_solved", 0)
            
            # Count problems per topic
            topic_problems = {}
            for problem in state["completed_problems"]:
                topic_id = problem["topic_id"]
                topic_problems[topic_id] = topic_problems.get(topic_id, 0) + 1
            
            # Force topic change conditions:
            # 1. If we've done 3+ problems in this topic
            # 2. If we've done 2+ problems AND solved at least 1
            current_topic_count = topic_problems.get(current_topic_id, 0)
            current_topic_solved = sum(1 for p in state["completed_problems"] 
                                     if p["topic_id"] == current_topic_id and 
                                        p["status"].lower() == "accepted")
            
            should_change_topic = (current_topic_count >= 3) or (current_topic_count >= 2 and current_topic_solved >= 1)
            
            if should_change_topic:
                # Get next topic using progression map
                current_topic = db.query(Topic).filter(Topic.id == current_topic_id).first()
                
                # Defined progression path
                topic_progression = {
                    "Arrays": "Two Pointers",
                    "Two Pointers": "Binary Search",
                    "Binary Search": "Trees",
                    "Trees": "Heap / Priority Queue",
                    "Heap / Priority Queue": "Graphs",
                    "Graphs": "1D Dynamic Programming",
                    "1D Dynamic Programming": "2D Dynamic Programming",
                    "2D Dynamic Programming": "Math & Geometry"
                }
                
                # Try to get next topic from progression map
                next_topic_name = topic_progression.get(current_topic.name)
                next_topic = None
                
                if next_topic_name:
                    next_topic = db.query(Topic).filter(Topic.name == next_topic_name).first()
                
                # If we couldn't find the next topic or if we've already covered many topics,
                # check if there's a topic we haven't assessed yet
                if not next_topic or len(topic_problems) >= 4:
                    assessed_topic_ids = list(topic_problems.keys())
                    next_topic = db.query(Topic).filter(~Topic.id.in_(assessed_topic_ids)).first()
                
                # If we still don't have a next topic, just pick a random one 
                # (excluding the current one)
                if not next_topic:
                    next_topic = db.query(Topic).filter(Topic.id != current_topic_id).order_by(func.random()).first()
                
                if next_topic:
                    return {
                        **state,
                        "assessment_status": {
                            **state["assessment_status"],
                            "current_topic_id": next_topic.id,
                            "current_topic_name": next_topic.name,
                            "current_difficulty": "Easy",  # Reset difficulty for new topic
                            "problems_presented": 0,
                            "problems_solved": 0
                        }
                    }
                else:
                    # If we somehow couldn't find any topic, finalize
                    return {**state, "current_phase": "finalizing"}
            
            # Adjust difficulty within the current topic
            current_difficulty = state["assessment_status"]["current_difficulty"]
            if problems_solved == 0 and problems_presented >= 1:
                # Student is struggling, make it easier
                new_difficulty = "Easy"
            elif problems_solved == problems_presented and problems_presented >= 1:
                # Student is doing well, increase difficulty
                if current_difficulty == "Easy":
                    new_difficulty = "Medium"
                elif current_difficulty == "Medium":
                    new_difficulty = "Hard"
                else:
                    new_difficulty = "Hard"
            else:
                # Keep same difficulty
                new_difficulty = current_difficulty
            
            return {
                **state,
                "assessment_status": {
                    **state["assessment_status"],
                    "current_difficulty": new_difficulty
                }
            }
        
        return state
    except Exception as e:
        return {**state, "errors": [f"Error selecting next topic: {str(e)}"]}
    finally:
        db.close()

def request_problem(state: ProfilingState) -> ProfilingState:
    """
    Prepare the request to the Question Selection Agent to get a problem.
    """
    
    if state["current_phase"] != "assessing":
        return state
    
    # Extract relevant information for question selection
    topic_id = state["assessment_status"].get("current_topic_id")
    difficulty = state["assessment_status"].get("current_difficulty")
    
    if topic_id is None:
        return {
            **state,
            "errors": state.get("errors", []) + ["Missing topic_id for question selection"]
        }
    
    # Create a list of problems the student has already seen (to avoid repeats)
    completed_problem_ids = [p["problem_id"] for p in state["completed_problems"]]
    
    # Prepare the request for the Question Selection Agent
    question_request = {
        "topic_id": topic_id, 
        "difficulty": difficulty,
        "avoided_problem_ids": completed_problem_ids,
        "is_profiling": True
    }
    
    # This will be passed to that agent later
    result = {
        **state,
        "question_selection_request": question_request
    }
    
    return result

def update_with_problem(state: ProfilingState, problem_data: Dict[str, Any]) -> ProfilingState:
    """
    Update state with the problem received from the Question Selection Agent.
    """
    # Extract proper problem_id regardless of structure
    problem_id = problem_data.get('problem_id')
    if not problem_id:
        problem_id = problem_data.get('id')
    
    # Clean up the title - remove any leading dots or extra spacing
    title = problem_data.get('title', '')
    clean_title = title.lstrip('. ')  # Remove any leading dots and spaces
    
    # Normalize problem structure to ensure consistent access
    normalized_problem = {
        "problem_id": problem_id,
        "title": clean_title,
        "description": problem_data.get('description', ''),
        "difficulty": problem_data.get('difficulty', ''),
        "constraints": problem_data.get('constraints', ''),
        "starter_code": problem_data.get('starter_code', ''),
        "function_name": problem_data.get('function_name', ''),
        "examples": problem_data.get('examples', [])
    }
    
    # Make sure problem_id is included even if we couldn't extract it
    if not normalized_problem["problem_id"] and 'id' in problem_data:
        normalized_problem["problem_id"] = problem_data['id']
    
    # Increment problems presented count
    problems_presented = state["assessment_status"]["problems_presented"] + 1
    
    result = {
        **state,
        "current_problem": normalized_problem,
        "assessment_status": {
            **state["assessment_status"],
            "problems_presented": problems_presented
        }
    }
    
    return result

def process_submission_result(state: ProfilingState, submission_result: Dict[str, Any]) -> ProfilingState:
    """
    Process the result of a student's solution submission.
    Update their profile based on performance.
    """
    # Check if current_problem is missing
    if state["current_problem"] is None:
        # Try to recover by using problem_id from submission_result
        problem_id = submission_result.get("problem_id")
        if not problem_id:
            return {
                **state,
                "errors": state.get("errors", []) + ["Cannot process submission: no current problem in session state and no problem_id in submission"]
            }
        
        try:
            # Try to recover by fetching problem from database
            db = SessionLocal()
            problem = db.query(Problem).filter(Problem.id == problem_id).first()
            
            if problem:
                # Create problem structure
                state = {
                    **state,
                    "current_problem": {
                        "problem_id": problem.id,
                        "title": problem.title,
                        "description": problem.description,
                        "difficulty": problem.difficulty.value,
                        "constraints": problem.constraints,
                        "starter_code": problem.starter_code,
                        "function_name": problem.function_name
                    }
                }
            else:
                return {
                    **state,
                    "errors": state.get("errors", []) + [f"Cannot process submission: problem with ID {problem_id} not found"]
                }
            db.close()
        except Exception as e:
            return {
                **state,
                "errors": state.get("errors", []) + [f"Error recovering problem: {str(e)}"]
            }
    
    db = SessionLocal()
    try:
        # Extract relevant data
        problem_id = state["current_problem"]["problem_id"]
        student_id = state["student_id"]
        status = submission_result["status"]
        
        # Update assessment status
        current_status = state["assessment_status"]
        problems_solved = current_status.get("problems_solved", 0) 
        
        if status.lower() == "accepted":
            problems_solved += 1
        
        # Add problem to completed problems
        completed_problem = {
            "problem_id": problem_id,
            "topic_id": current_status["current_topic_id"],
            "difficulty": current_status["current_difficulty"],
            "status": status,
            "submission_id": submission_result["submission_id"]
        }
        
        # Track struggle areas from code analysis
        struggle_areas = submission_result.get("code_analysis", {}).get("struggle_areas", [])
        if not struggle_areas and status.lower() != "accepted":
            # If no specific struggles identified but submission failed, add a generic one
            struggle_areas = ["algorithm_understanding"]
            
        # Update struggle patterns
        current_struggles = state.get("struggle_patterns", {})
        for area in struggle_areas:
            current_struggles[area] = current_struggles.get(area, 0) + 1
        
        # Handle UUID conversion safely
        try:
            # Try to parse as UUID
            uuid_student_id = uuid.UUID(student_id)
        except ValueError:
            # If not a valid UUID, generate one consistently
            uuid_student_id = uuid.uuid5(uuid.NAMESPACE_DNS, student_id)
        
        # Update student profile in database
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == uuid_student_id
        ).first()
        
        if student_profile:
            # Update topic mastery
            topic_mastery = db.query(StudentTopicMastery).filter(
                StudentTopicMastery.student_profile_id == student_profile.id,
                StudentTopicMastery.topic_id == current_status["current_topic_id"]
            ).first()
            
            if topic_mastery:
                topic_mastery.problems_attempted += 1
                if status.lower() == "accepted":
                    topic_mastery.problems_solved += 1
                
                # Update mastery level (simple calculation)
                if topic_mastery.problems_attempted > 0:
                    topic_mastery.mastery_level = (
                        topic_mastery.problems_solved / topic_mastery.problems_attempted
                    ) * 100
                
                topic_mastery.last_attempted_at = datetime.utcnow()
            
            # Record student attempt
            student_attempt = StudentAttempt(
                student_id=uuid_student_id,
                problem_id=problem_id,
                start_time=datetime.utcnow(),  # Approximation
                end_time=datetime.utcnow(),
                submission_count=1,  # Assuming 1 submission per problem in profiling
                completed=(status.lower() == "accepted")
            )
            
            db.add(student_attempt)
            db.commit()
        
        result = {
            **state,
            "completed_problems": state["completed_problems"] + [completed_problem],
            "current_problem": None,  # Clear current problem
            "assessment_status": {
                **current_status,
                "problems_solved": problems_solved
            },
            "struggle_patterns": current_struggles
        }
        
        return result
    except Exception as e:
        return {
            **state,
            "errors": state.get("errors", []) + [f"Error processing submission: {str(e)}"]
        }
    finally:
        db.close()

def finalize_profiling(state: ProfilingState) -> ProfilingState:
    """
    Generate final profiling report and recommendations.
    """
    if state["current_phase"] != "finalizing":
        return state
    
    db = SessionLocal()
    try:
        # Handle UUID conversion safely
        student_id = state["student_id"]
        try:
            # Try to parse as UUID
            uuid_student_id = uuid.UUID(student_id)
        except ValueError:
            # If not a valid UUID, generate one consistently
            uuid_student_id = uuid.uuid5(uuid.NAMESPACE_DNS, student_id)
            
        # Get all topic masteries
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == uuid_student_id
        ).first()
        
        if not student_profile:
            return {
                **state,
                "errors": state.get("errors", []) + ["Student profile not found"]
            }
        
        # Get all topic masteries
        topic_masteries = db.query(StudentTopicMastery).filter(
            StudentTopicMastery.student_profile_id == student_profile.id
        ).all()
        
        # Prepare topic assessments
        topic_assessments = {}
        for tm in topic_masteries:
            topic = db.query(Topic).filter(Topic.id == tm.topic_id).first()
            if topic:
                topic_assessments[topic.name] = {
                    "mastery_level": tm.mastery_level,
                    "problems_attempted": tm.problems_attempted,
                    "problems_solved": tm.problems_solved
                }
        
        # Determine overall skill level
        total_mastery = sum(tm.mastery_level for tm in topic_masteries if tm.problems_attempted > 0)
        num_assessed_topics = sum(1 for tm in topic_masteries if tm.problems_attempted > 0)
        
        overall_skill_level = "Beginner"
        avg_mastery = 0
        if num_assessed_topics > 0:
            avg_mastery = total_mastery / num_assessed_topics
            if avg_mastery >= 80:
                overall_skill_level = "Advanced"
            elif avg_mastery >= 50:
                overall_skill_level = "Intermediate"
        
        # Generate recommendations
        recommendations = []
        
        # 1. Identify weakest areas
        weak_topics = [
            (topic.name, tm.mastery_level) 
            for tm in topic_masteries 
            for topic in [db.query(Topic).filter(Topic.id == tm.topic_id).first()]
            if tm.problems_attempted > 0 and tm.mastery_level < 50
        ]
        
        weak_topics.sort(key=lambda x: x[1])  # Sort by mastery level
        
        for topic_name, mastery in weak_topics[:3]:  # Top 3 weakest
            recommendations.append({
                "type": "improvement",
                "topic": topic_name,
                "message": f"Focus on improving {topic_name}. Current mastery: {mastery:.1f}%"
            })
        
        # 2. Recommend next topics to learn
        if num_assessed_topics > 0:
            # Find topics not yet assessed
            assessed_topic_ids = [tm.topic_id for tm in topic_masteries if tm.problems_attempted > 0]
            next_topics = db.query(Topic).filter(~Topic.id.in_(assessed_topic_ids)).all()
            
            for topic in next_topics[:2]:  # Recommend up to 2 new topics
                recommendations.append({
                    "type": "next_topic",
                    "topic": topic.name,
                    "message": f"Start learning {topic.name} next"
                })
        
        # 3. Recommend practice for topics with medium mastery
        medium_topics = [
            (topic.name, tm.mastery_level) 
            for tm in topic_masteries 
            for topic in [db.query(Topic).filter(Topic.id == tm.topic_id).first()]
            if tm.problems_attempted > 0 and 50 <= tm.mastery_level < 80
        ]
        
        for topic_name, mastery in medium_topics[:2]:  # Top 2 medium mastery
            recommendations.append({
                "type": "practice",
                "topic": topic_name,
                "message": f"Continue practicing {topic_name} to improve mastery"
            })
        
        # 4. Add recommendations based on struggle patterns
        struggle_patterns = state.get("struggle_patterns", {})
        if struggle_patterns:
            # Find top 2 struggles
            top_struggles = sorted(struggle_patterns.items(), key=lambda x: x[1], reverse=True)[:2]
            
            # Map struggle codes to readable names and recommendations
            struggle_map = {
                "algorithm_understanding": "Algorithm Selection",
                "data_structure_misuse": "Data Structure Usage",
                "logic_errors": "Logic Implementation",
                "efficiency_problems": "Code Efficiency",
                "edge_case_handling": "Edge Case Handling"
            }
            
            struggle_recommendations = {
                "algorithm_understanding": "Work on understanding which algorithms to apply for different problem types",
                "data_structure_misuse": "Practice choosing the right data structures for your problems",
                "logic_errors": "Focus on step-by-step implementation of algorithms",
                "efficiency_problems": "Study time and space complexity optimizations",
                "edge_case_handling": "Pay attention to edge cases and test boundary conditions"
            }
            
            for struggle_code, count in top_struggles:
                struggle_name = struggle_map.get(struggle_code, struggle_code)
                recommendation = struggle_recommendations.get(
                    struggle_code, 
                    f"Work on improving your {struggle_name} skills"
                )
                
                recommendations.append({
                    "type": "skill_gap",
                    "area": struggle_name,
                    "message": f"{recommendation}. This was challenging in {count} problems."
                })
        
        result = {
            **state,
            "topic_assessments": topic_assessments,
            "recommendations": recommendations,
            "assessment_status": {
                **state["assessment_status"],
                "estimated_skill_level": overall_skill_level
            }
        }
        
        return result
    except Exception as e:
        return {
            **state,
            "errors": state.get("errors", []) + [f"Error finalizing profiling: {str(e)}"]
        }
    finally:
        db.close()

# Create the Profiling Agent graph
def create_profiling_agent() -> StateGraph:
    """
    Create the Profiling Agent workflow graph.
    """
    workflow = StateGraph(ProfilingState)
    
    # Add nodes
    workflow.add_node("initialize", initialize_profiling)
    workflow.add_node("select_topic", select_next_topic)
    workflow.add_node("request_problem", request_problem)
    workflow.add_node("process_submission", process_submission_result)
    workflow.add_node("finalize", finalize_profiling)
    
    # Add edges
    workflow.add_edge(START, "initialize")
    workflow.add_edge("initialize", "select_topic")
    
    # Add conditional edges from select_topic
    def conditional_debug(state):
        phase = state["current_phase"]
        should_finalize = phase == "finalizing"
        return should_finalize
    
    workflow.add_conditional_edges(
        "select_topic",
        conditional_debug,
        {
            True: "finalize",
            False: "request_problem"
        }
    )
    
    workflow.add_edge("request_problem", END)
    workflow.add_edge("process_submission", "select_topic")  # After processing submission, select next topic
    workflow.add_edge("finalize", END)
    
    return workflow.compile(checkpointer=profiling_memory)

# Initialize the profiling agent
profiling_agent = create_profiling_agent()

# Function to start a new profiling session
def start_profiling_session(student_id: str):
    """
    Start a new profiling session for a student.
    """
    session_id = f"profiling_{uuid.uuid4()}"
    
    initial_state = {
        "student_id": student_id,
        "session_id": session_id,
        "current_phase": "initializing",
        "assessment_status": {},
        "completed_problems": [],
        "current_problem": None,
        "topic_assessments": {},
        "recommendations": [],
        "errors": [],
        "question_selection_request": None,
        "session_start_time": datetime.utcnow(),
        "struggle_patterns": {}
    }
    
    # Configure thread for this session
    config = {"configurable": {"thread_id": session_id}}
    
    # Initialize session and get first problem
    result = profiling_agent.invoke(initial_state, config=config)
    
    # Check that question_selection_request is present
    if "question_selection_request" not in result:
        # Try to rerun the graph from the current state
        updated_state = request_problem(result)
        
        # Save the updated state with question_selection_request
        if "question_selection_request" in updated_state:
            result = profiling_agent.invoke(updated_state, config=config)
    
    return session_id, result

# Function to process a submission and get the next problem
def process_submission_and_continue(session_id: str, submission_result: Dict[str, Any]):
    """
    Process a student's submission and get the next problem with enhanced diversity.
    """
    try:
        # Configure thread for this session
        config = {"configurable": {"thread_id": session_id}}
        
        # Get current state
        try:
            current_checkpoint = profiling_agent.checkpointer.get(config)
        except Exception as e:
            return {
                "status": "error",
                "errors": [f"Error retrieving checkpoint: {str(e)}"]
            }
        
        if not current_checkpoint:
            error_msg = f"No active session found with ID {session_id}"
            return {
                "status": "error",
                "errors": [error_msg]
            }
        
        # Get current state
        try:
            current_state = current_checkpoint.get("channel_values", {})
        except Exception as e:
            return {
                "status": "error",
                "errors": [f"Error accessing state: {str(e)}"]
            }
        
        # Make sure submission_result has problem_id
        try:
            if "problem_id" not in submission_result and "id" in submission_result:
                submission_result["problem_id"] = submission_result["id"]
        except Exception as e:
            # Continue anyway, let process_submission_result handle missing problem_id
            pass
        
        # Process submission using the direct function
        try:
            updated_state = process_submission_result(current_state, submission_result)
        except Exception as e:
            return {
                "status": "error",
                "errors": [f"Error processing submission: {str(e)}"]
            }
        
        # Check for processing errors
        if len(updated_state.get("errors", [])) > len(current_state.get("errors", [])):
            return {
                "status": "error",
                "errors": updated_state.get("errors", ["Unknown error during submission processing"])
            }
        
        # Save the updated state FIRST to ensure it's preserved
        try:
            invoke_result = profiling_agent.invoke(updated_state, config=config)
        except Exception as e:
            # Continue anyway, we still have updated_state in memory
            pass
        
        # Check if we've reached the maximum questions limit
        try:
            MAX_QUESTIONS = 12
            total_problems_attempted = len(updated_state["completed_problems"])
            
            if total_problems_attempted >= MAX_QUESTIONS:
                # Directly set to finalizing and skip next topic selection
                updated_state["current_phase"] = "finalizing"
                
                # Finalize assessment
                final_state = finalize_profiling(updated_state)
                profiling_agent.invoke(final_state, config=config)
                
                return {
                    "status": "completed",
                    "assessment": {
                        "skill_level": final_state["assessment_status"]["estimated_skill_level"],
                        "topic_assessments": final_state["topic_assessments"],
                        "recommendations": final_state["recommendations"],
                        "problems_attempted": len(final_state["completed_problems"]),
                        "problems_solved": final_state["assessment_status"]["problems_solved"],
                        "struggle_areas": [{"area": k, "count": v} for k, v in final_state.get("struggle_patterns", {}).items()]
                    }
                }
        except Exception as e:
            return {
                "status": "error",
                "errors": [f"Error checking question limit: {str(e)}"]
            }
        
        # Continue profiling by selecting next topic
        try:
            next_state = select_next_topic(updated_state)
        except Exception as e:
            return {
                "status": "error",
                "errors": [f"Error selecting next topic: {str(e)}"]
            }
        
        # Save updated state
        try:
            profiling_agent.invoke(next_state, config=config)
        except Exception as e:
            # Continue anyway
            pass
        
        # Check if assessment is complete (this could be from time limit or other conditions)
        if next_state.get("current_phase") == "finalizing":
            try:
                # Finalize assessment
                final_state = finalize_profiling(next_state)
                profiling_agent.invoke(final_state, config=config)
                
                return {
                    "status": "completed",
                    "assessment": {
                        "skill_level": final_state["assessment_status"]["estimated_skill_level"],
                        "topic_assessments": final_state["topic_assessments"],
                        "recommendations": final_state["recommendations"],
                        "problems_attempted": len(final_state["completed_problems"]),
                        "problems_solved": final_state["assessment_status"]["problems_solved"],
                        "struggle_areas": [{"area": k, "count": v} for k, v in final_state.get("struggle_patterns", {}).items()]
                    }
                }
            except Exception as e:
                return {
                    "status": "error",
                    "errors": [f"Error finalizing assessment: {str(e)}"]
                }
        
        # Request next problem with high diversity
        try:
            problem_request_state = request_problem(next_state)
            profiling_agent.invoke(problem_request_state, config=config)
        except Exception as e:
            return {
                "status": "error",
                "errors": [f"Error requesting next problem: {str(e)}"]
            }
        
        if "question_selection_request" in problem_request_state:
            try:
                # Add flag to avoid similar content
                question_request = problem_request_state["question_selection_request"]
                question_request["avoid_similar_content"] = True
                
                return {
                    "status": "in_progress",
                    "question_selection_request": question_request
                }
            except Exception as e:
                return {
                    "status": "error", 
                    "errors": [f"Error preparing question request: {str(e)}"]
                }
        
        return {
            "status": "error",
            "errors": ["Failed to generate next question request"]
        }
        
    except Exception as e:
        return {
            "status": "error",
            "errors": [f"Critical error in process_submission_and_continue: {str(e)}"]
        }