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
from sqlalchemy.orm import Session
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

def initialize_profiling(state: ProfilingState) -> ProfilingState:
    """
    Initialize the profiling session for a student.
    - Creates student profile if it doesn't exist
    - Sets up initial assessment parameters
    """
    student_id = state["student_id"]
    
    # Create a new session
    db = SessionLocal()
    try:
        # Check if student profile exists, create if not
        # First try to parse the student_id as a UUID, but if that fails, use it as a string
        try:
            # Try to parse as UUID
            uuid_student_id = uuid.UUID(student_id)
        except ValueError:
            # If not a valid UUID, we'll need to handle this differently
            # Option 1: Generate a UUID from the string
            uuid_student_id = uuid.uuid5(uuid.NAMESPACE_DNS, student_id)
            
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == uuid_student_id
        ).first()
        
        if not student_profile:
            student_profile = StudentProfile(user_id=uuid_student_id)
            db.add(student_profile)
            db.flush()
            
            # Initialize topic mastery for all topics
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
        
        # Initialize assessment state with empty values
        result = {
            **state,
            "current_phase": "initializing",
            "assessment_status": {
                "current_topic_id": None,
                "current_difficulty": "Easy",
                "problems_presented": 0,
                "problems_solved": 0,
                "current_topic_mastery": 0.0,
                "estimated_skill_level": "Beginner",
            },
            "completed_problems": [],
            "current_problem": None,
            "topic_assessments": {},
            "recommendations": [],
            "errors": [],
            "question_selection_request": None
        }
        return result
    except Exception as e:
        return {
            **state,
            "errors": [f"Error initializing profiling: {str(e)}"]
        }
        return {
            **state,
            "errors": [f"Error initializing profiling: {str(e)}"]
        }
    finally:
        db.close()

def select_next_topic(state: ProfilingState) -> ProfilingState:
    """
    Determine the next topic to assess based on current state.
    Uses topic progression map and previous assessment results.
    """
    
    db = SessionLocal()
    try:
        # If we're just starting, select the initial topic (Arrays)
        if state["current_phase"] == "initializing":
            
            # Start with Arrays (assuming it has ID 1 - adjust as needed)
            arrays_topic = db.query(Topic).filter(Topic.name == "Arrays").first()
            if not arrays_topic:
                # Fallback to first topic in database
                arrays_topic = db.query(Topic).first()
            
            if not arrays_topic:
                return {
                    **state,
                    "errors": ["No topics found in database"]
                }
            
            result = {
                **state,
                "current_phase": "assessing",
                "assessment_status": {
                    **state["assessment_status"],
                    "current_topic_id": arrays_topic.id,
                    "current_topic_name": arrays_topic.name,
                    "current_difficulty": "Easy",  # Start with easy problems
                    "problems_presented": 0
                }
            }
            return result
        
        # If we're in assessment phase, determine next topic based on performance
        if state["current_phase"] == "assessing":
            current_topic_id = state["assessment_status"].get("current_topic_id")
            problems_presented = state["assessment_status"].get("problems_presented", 0)
            problems_solved = state["assessment_status"].get("problems_solved", 0)
            
            # Check if we've assessed enough problems for the current topic
            if problems_presented >= 3:  # Assess 3 problems per topic
                # Calculate mastery level for current topic
                mastery_level = (problems_solved / problems_presented) * 100
                
                # Update topic assessments
                state["topic_assessments"][str(current_topic_id)] = mastery_level
                
                # Determine next topic based on performance
                # Query the topic progression map
                current_topic = db.query(Topic).filter(Topic.id == current_topic_id).first()
                
                # Simple logic: If mastery level is high, move to a more advanced topic
                if mastery_level >= 70:
                    # Find the next topic based on progression
                    # For now, using a simple mapping based on NeetCode structure
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
                    
                    next_topic_name = topic_progression.get(current_topic.name)
                    if next_topic_name:
                        next_topic = db.query(Topic).filter(Topic.name == next_topic_name).first()
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
                
                # If we couldn't find a next topic or mastery is low, 
                # we're done with assessment
                return {
                    **state, 
                    "current_phase": "finalizing"
                }
            
            # Continue with current topic but adjust difficulty
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
            
            result = {
                **state,
                "assessment_status": {
                    **state["assessment_status"],
                    "current_difficulty": new_difficulty
                }
            }
            return result
        
        return state
    except Exception as e:
        return {
            **state,
            "errors": [f"Error selecting next topic: {str(e)}"]
        }
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
    
    # Normalize problem structure to ensure consistent access
    normalized_problem = {
        "problem_id": problem_id,
        "title": problem_data.get('title', ''),
        "description": problem_data.get('description', ''),
        "difficulty": problem_data.get('difficulty', ''),
        "constraints": problem_data.get('constraints', ''),
        "starter_code": problem_data.get('starter_code', ''),
        "function_name": problem_data.get('function_name', ''),
        "examples": problem_data.get('examples', [])
    }
    
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
        problems_solved = current_status["problems_solved"]
        
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
            }
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
    
    # Add conditional edges from select_topic with debug
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
        "question_selection_request": None
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
    Process a student's submission and get the next problem.
    
    Args:
        session_id: ID of the profiling session
        submission_result: Result of the student's submission
        
    Returns:
        Next problem or final assessment
    """
    # Configure thread for this session
    config = {"configurable": {"thread_id": session_id}}
    
    # Get current state
    current_checkpoint = profiling_agent.checkpointer.get(config)
    if not current_checkpoint:
        error_msg = f"No active session found with ID {session_id}"
        return {
            "status": "error",
            "errors": [error_msg]
        }
    
    # Get current state
    current_state = current_checkpoint.get("channel_values", {})
    
    # If current_problem is missing, try to reconstruct it
    if current_state.get("current_problem") is None:
        problem_id = submission_result.get("problem_id")
        if problem_id:
            try:
                # Fetch problem from database
                db = SessionLocal()
                problem = db.query(Problem).filter(Problem.id == problem_id).first()
                
                if problem:
                    # Create problem data structure
                    current_state["current_problem"] = {
                        "problem_id": problem.id,
                        "title": problem.title,
                        "description": problem.description,
                        "difficulty": problem.difficulty.value if hasattr(problem.difficulty, 'value') else problem.difficulty,
                        "constraints": problem.constraints,
                        "starter_code": problem.starter_code,
                        "function_name": problem.function_name
                    }
                db.close()
            except Exception as e:
                pass
    
    # Process submission using the agent's process_submission node
    try:
        # Use direct function call for more control over the process
        updated_state = process_submission_result(current_state, submission_result)
        
        # Check if process_submission_result added any errors
        if len(updated_state.get("errors", [])) > len(current_state.get("errors", [])):
            return {
                "status": "error",
                "errors": updated_state.get("errors", ["Unknown error during submission processing"])
            }
        
        # Continue profiling by selecting next topic
        next_state = select_next_topic(updated_state)
        
        # Save updated state
        profiling_agent.invoke(next_state, config=config)
        
        # Check if we've completed the assessment
        if next_state.get("current_phase") == "finalizing":
            # Run finalize step
            final_state = finalize_profiling(next_state)
            # Save final state
            profiling_agent.invoke(final_state, config=config)
            
            return {
                "status": "completed",
                "assessment": {
                    "skill_level": final_state["assessment_status"]["estimated_skill_level"],
                    "topic_assessments": final_state["topic_assessments"],
                    "recommendations": final_state["recommendations"],
                    "problems_attempted": len(final_state["completed_problems"]),
                    "problems_solved": final_state["assessment_status"]["problems_solved"]
                }
            }
        
        # Request next problem
        problem_request_state = request_problem(next_state)
        
        # Save state with problem request
        profiling_agent.invoke(problem_request_state, config=config)
        
        # Return the next problem request
        if "question_selection_request" in problem_request_state:
            return {
                "status": "in_progress",
                "question_selection_request": problem_request_state["question_selection_request"]
            }
        
        # If we get here, something went wrong
        return {
            "status": "error",
            "errors": ["Failed to generate next question request"]
        }
        
    except Exception as e:
        return {
            "status": "error",
            "errors": [f"Error processing submission: {str(e)}"]
        }
    finally:
        db.close()