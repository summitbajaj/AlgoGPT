from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, List, Any, Optional, TypedDict
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
import os
import uuid
import json
from dotenv import load_dotenv
from database.database import SessionLocal
from database.models import StudentProfile, StudentTopicMastery, Problem, Topic, TestCase
from sqlalchemy.orm import Session
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Azure OpenAI Chat model for analysis
analysis_model = AzureChatOpenAI(
    azure_deployment=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    api_version=os.getenv("AZURE_OPENAI_VERSION"),
    temperature=0.1  # Low temperature for analytical tasks
)

# Initialize memory checkpointing
analysis_memory = MemorySaver()

# Define state structure for the analysis agent
class AnalysisState(TypedDict):
    student_id: str
    problem_id: int
    submission_id: str
    submission_code: str
    submission_status: str
    test_results: List[Dict[str, Any]]
    is_profiling: bool
    problem_data: Optional[Dict[str, Any]]
    student_data: Optional[Dict[str, Any]]
    code_analysis: Optional[Dict[str, Any]]
    mastery_update: Optional[Dict[str, Any]]
    feedback: Optional[Dict[str, Any]]
    errors: List[str]

def fetch_context_data(state: AnalysisState) -> AnalysisState:
    """
    Fetch necessary context data to analyze the submission.
    Includes problem details and student background.
    """
    problem_id = state["problem_id"]
    student_id = state["student_id"]
    
    db = SessionLocal()
    try:
        # Fetch problem data
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            return {
                **state,
                "errors": [f"Problem with ID {problem_id} not found"]
            }
        
        # Get problem topics
        topics = [topic.name for topic in problem.topics]
        
        # Get test cases
        test_cases = db.query(TestCase).filter(TestCase.problem_id == problem_id).all()
        test_case_data = [
            {
                "id": tc.id,
                "input_data": tc.input_data,
                "expected_output": tc.expected_output
            }
            for tc in test_cases
        ]
        
        # Get student profile
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == uuid.UUID(student_id)
        ).first()
        
        student_data = None
        if student_profile:
            # Get topic masteries
            topic_masteries = db.query(StudentTopicMastery).filter(
                StudentTopicMastery.student_profile_id == student_profile.id
            ).all()
            
            topic_mastery_data = []
            for tm in topic_masteries:
                topic = db.query(Topic).filter(Topic.id == tm.topic_id).first()
                topic_mastery_data.append({
                    "topic_name": topic.name if topic else "Unknown",
                    "mastery_level": tm.mastery_level,
                    "problems_attempted": tm.problems_attempted,
                    "problems_solved": tm.problems_solved
                })
            
            student_data = {
                "topic_masteries": topic_mastery_data
            }
        
        # Construct problem data
        problem_data = {
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "difficulty": problem.difficulty.value,
            "constraints": problem.constraints,
            "function_name": problem.function_name,
            "starter_code": problem.starter_code,
            "topics": topics,
            "test_cases": test_case_data
        }
        
        return {
            **state,
            "problem_data": problem_data,
            "student_data": student_data
        }
    except Exception as e:
        return {
            **state,
            "errors": [f"Error fetching context data: {str(e)}"]
        }
    finally:
        db.close()

def analyze_code_quality(state: AnalysisState) -> AnalysisState:
    """
    Analyze code quality and implementation approach using LLM.
    """
    if state.get("errors"):
        return state
    
    submission_code = state["submission_code"]
    problem_data = state["problem_data"]
    
    # Skip analysis if submission failed (focus on fixing errors first)
    if state["submission_status"] != "Accepted" and not state.get("is_profiling", False):
        return {
            **state,
            "code_analysis": {
                "quality_score": 0,
                "approach_score": 0,
                "efficiency_score": 0,
                "readability_score": 0,
                "comments": "Submission did not pass all test cases.",
                "struggle_areas": ["algorithm_understanding"]
            }
        }
    
    try:
        # Create a prompt for the LLM to analyze the code
        system_prompt = """You are an expert code reviewer and algorithm specialist tasked with analyzing student code submissions.
        Analyze the following code submission for a programming problem and provide detailed feedback.
        
        Focus on:
        1. Code quality (style, structure, readability)
        2. Implementation approach (algorithm choice, data structures)
        3. Time and space complexity
        4. Potential edge cases or optimizations
        
        Please be specific and educational in your feedback. Provide a rating from 1-10 for each category:
        - Quality: Code structure, style, and readability
        - Approach: Algorithm selection and implementation
        - Efficiency: Time and space complexity optimization
        - Readability: Variable names, comments, and overall clarity
        
        Also identify specific struggle areas such as:
        - algorithm_understanding: Issues with selecting or implementing the right algorithm
        - data_structure_misuse: Problems with using appropriate data structures
        - logic_errors: Fundamental logical mistakes in implementation
        - efficiency_problems: Suboptimal time or space complexity
        - edge_case_handling: Missing or improper handling of edge cases
        
        Format your response as a JSON object with these fields:
        - quality_score: numeric score (1-10)
        - approach_score: numeric score (1-10)
        - efficiency_score: numeric score (1-10)
        - readability_score: numeric score (1-10)
        - comments: detailed feedback with specific suggestions
        - complexity: estimated time complexity in Big-O notation
        - struggle_areas: array of struggle areas from the list above that apply
        """
        
        human_prompt = f"""
        Problem Title: {problem_data['title']}
        
        Problem Description:
        {problem_data['description']}
        
        Constraints:
        {problem_data['constraints']}
        
        Expected Function: {problem_data['function_name']}
        
        Student's code submission:
        ```python
        {submission_code}
        ```
        
        Test Results: {"Passed all tests" if state["submission_status"] == "Accepted" else "Failed some tests"}
        
        Please analyze this code and provide your assessment as a valid JSON object according to the specified format.
        """
        
        # Call the LLM
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        response = analysis_model(messages)
        
        # Extract JSON from response
        import re
        json_match = re.search(r'```json\s*(.*?)\s*```', response.content, re.DOTALL)
        
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to use the entire response
            json_str = response.content
        
        try:
            # Parse and validate the JSON
            analysis_result = json.loads(json_str)
            
            required_keys = ["quality_score", "approach_score", "efficiency_score", "readability_score", "comments"]
            for key in required_keys:
                if key not in analysis_result:
                    analysis_result[key] = 0 if "score" in key else "Not provided"
            
            # Ensure scores are numeric and in range 1-10
            for key in ["quality_score", "approach_score", "efficiency_score", "readability_score"]:
                try:
                    score = float(analysis_result[key])
                    analysis_result[key] = max(1, min(10, score))  # Clamp to 1-10
                except:
                    analysis_result[key] = 1  # Default if invalid
            
            # Ensure struggle_areas exists and is valid
            if "struggle_areas" not in analysis_result or not isinstance(analysis_result["struggle_areas"], list):
                # Create default struggle areas based on scores
                struggle_areas = []
                if analysis_result["approach_score"] < 5:
                    struggle_areas.append("algorithm_understanding")
                if analysis_result["efficiency_score"] < 5:
                    struggle_areas.append("efficiency_problems")
                if analysis_result["quality_score"] < 5:
                    struggle_areas.append("logic_errors")
                
                analysis_result["struggle_areas"] = struggle_areas
            
            return {
                **state,
                "code_analysis": analysis_result
            }
        except json.JSONDecodeError:
            # If JSON parsing fails, create a basic analysis
            default_struggles = ["algorithm_understanding"] if state["submission_status"] != "Accepted" else []
            
            return {
                **state,
                "code_analysis": {
                    "quality_score": 5,
                    "approach_score": 5,
                    "efficiency_score": 5,
                    "readability_score": 5,
                    "comments": "Unable to parse detailed analysis. The code " + 
                                ("passes all test cases." if state["submission_status"] == "Accepted" else "fails some test cases."),
                    "struggle_areas": default_struggles
                }
            }
    except Exception as e:
        return {
            **state,
            "errors": state.get("errors", []) + [f"Error analyzing code: {str(e)}"],
            "code_analysis": {
                "quality_score": 5,
                "approach_score": 5,
                "efficiency_score": 5,
                "readability_score": 5,
                "comments": "Error occurred during analysis.",
                "struggle_areas": ["algorithm_understanding"] if state["submission_status"] != "Accepted" else []
            }
        }
        
def generate_feedback(state: AnalysisState) -> AnalysisState:
    """
    Generate personalized feedback for the student based on their submission.
    """
    if state.get("errors"):
        return state
    
    submission_status = state["submission_status"]
    code_analysis = state.get("code_analysis", {})
    mastery_update = state.get("mastery_update", {})
    problem_data = state["problem_data"]
    
    try:
        # Generate feedback based on submission results
        if submission_status == "Accepted":
            # Successful submission
            # Tailor feedback based on code quality analysis
            quality_score = code_analysis.get("quality_score", 5)
            approach_score = code_analysis.get("approach_score", 5)
            efficiency_score = code_analysis.get("efficiency_score", 5)
            overall_score = (quality_score + approach_score + efficiency_score) / 3
            
            if overall_score >= 8:
                status_feedback = "Excellent job! Your solution is correct and well-implemented."
            elif overall_score >= 6:
                status_feedback = "Good work! Your solution passes all test cases."
            else:
                status_feedback = "Your solution is correct, but has room for improvement."
            
            # Add specific feedback on approach
            approach_feedback = code_analysis.get("comments", "")
            
            # Add mastery updates
            topic_updates = []
            for topic in mastery_update.get("topics", []):
                change = topic["change"]
                if change > 0:
                    topic_updates.append(f"Your mastery of {topic['topic_name']} increased by {change:.1f} points.")
                else:
                    topic_updates.append(f"Your mastery of {topic['topic_name']} remained stable.")
            
            mastery_feedback = "\n".join(topic_updates)
            
            # Combine feedback
            feedback = {
                "title": "Success!",
                "status": status_feedback,
                "details": approach_feedback,
                "mastery": mastery_feedback,
                "next_steps": "Try more challenging problems to further improve your skills."
            }
        else:
            # Failed submission
            # Analyze test results to provide targeted feedback
            test_results = state["test_results"]
            
            # Find failing test cases
            failing_tests = [tr for tr in test_results if not tr.get("passed", False)]
            
            if failing_tests:
                # Get the first failing test for focused feedback
                failing_test = failing_tests[0]
                
                # Prepare information about the failing test
                test_info = f"""
                Input: {json.dumps(failing_test.get('input', {}))}
                Expected Output: {json.dumps(failing_test.get('expected_output', ''))}
                Your Output: {json.dumps(failing_test.get('output', ''))}
                """
                
                # Determine failure type and give appropriate hints
                if failing_test.get('status') == 'RUNTIME_ERROR':
                    error_msg = failing_test.get('error_message', 'Unknown error')
                    status_feedback = f"Your code encountered a runtime error: {error_msg}"
                elif failing_test.get('status') == 'TIME_LIMIT_EXCEEDED':
                    status_feedback = "Your code exceeded the time limit. Try to optimize your solution."
                else:
                    status_feedback = "Your solution produces incorrect output for some test cases."
                
                details_feedback = f"""
                Here's a test case that failed:
                {test_info}
                
                Suggestion: Step through your algorithm with this input to see where it's going wrong.
                """
            else:
                status_feedback = "Your solution didn't pass all test cases."
                details_feedback = "Review your implementation and test with various inputs."
            
            # Add mastery updates
            topic_updates = []
            for topic in mastery_update.get("topics", []):
                change = topic["change"]
                if change < 0:
                    topic_updates.append(f"Your mastery of {topic['topic_name']} decreased by {abs(change):.1f} points.")
                else:
                    topic_updates.append(f"You're still making progress in {topic['topic_name']} despite this challenge.")
            
            mastery_feedback = "\n".join(topic_updates)
            
            # Add struggle area feedback based on code analysis
            struggle_areas = code_analysis.get("struggle_areas", [])
            struggle_feedback = ""
            
            struggle_advice = {
                "algorithm_understanding": "Make sure you understand the core algorithm needed for this problem.",
                "data_structure_misuse": "Consider whether you're using the most appropriate data structures.",
                "logic_errors": "Check your logic carefully, especially in conditional statements and loops.",
                "efficiency_problems": "Your solution might be inefficient. Look for ways to reduce time complexity.",
                "edge_case_handling": "Pay attention to edge cases like empty inputs, negative values, or boundary conditions."
            }
            
            if struggle_areas:
                struggle_items = [f"• {struggle_advice.get(area, area)}" for area in struggle_areas[:2]]
                struggle_feedback = "Areas to focus on:\n" + "\n".join(struggle_items)
            
            # Combine feedback
            feedback = {
                "title": "Not quite there yet",
                "status": status_feedback,
                "details": details_feedback,
                "struggles": struggle_feedback,
                "mastery": mastery_feedback,
                "next_steps": "Review the algorithm, test with examples, and try again."
            }
        
        return {
            **state,
            "feedback": feedback
        }
    except Exception as e:
        # Create basic feedback if generation fails
        basic_feedback = {
            "title": "Submission Processed",
            "status": "Your solution has been " + ("accepted." if submission_status == "Accepted" else "rejected."),
            "details": "No detailed feedback available.",
            "mastery": "Mastery tracking is active.",
            "next_steps": "Continue practicing to improve your skills."
        }
        
        return {
            **state,
            "errors": state.get("errors", []) + [f"Error generating feedback: {str(e)}"],
            "feedback": basic_feedback
        }

def update_student_mastery(state: AnalysisState) -> AnalysisState:
    """
    Update student mastery levels based on their performance.
    """
    if state.get("errors"):
        return state
    
    student_id = state["student_id"]
    problem_id = state["problem_id"]
    submission_status = state["submission_status"]
    is_profiling = state.get("is_profiling", False)
    
    # Get topic IDs from problem data
    problem_data = state["problem_data"]
    topic_names = problem_data["topics"]
    
    db = SessionLocal()
    try:
        # Get student profile
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == uuid.UUID(student_id)
        ).first()
        
        if not student_profile:
            return {
                **state,
                "errors": state.get("errors", []) + ["Student profile not found"]
            }
        
        # Get topics by name
        topics = db.query(Topic).filter(Topic.name.in_(topic_names)).all()
        topic_ids = [topic.id for topic in topics]
        
        # Update mastery for each related topic
        mastery_updates = []
        
        for topic_id in topic_ids:
            # Get current mastery
            topic_mastery = db.query(StudentTopicMastery).filter(
                StudentTopicMastery.student_profile_id == student_profile.id,
                StudentTopicMastery.topic_id == topic_id
            ).first()
            
            if not topic_mastery:
                # Create new mastery record
                topic_mastery = StudentTopicMastery(
                    student_profile_id=student_profile.id,
                    topic_id=topic_id,
                    mastery_level=0.0,
                    problems_attempted=0,
                    problems_solved=0
                )
                db.add(topic_mastery)
                db.flush()
            
            # Get topic name
            topic_name = next((topic.name for topic in topics if topic.id == topic_id), "Unknown")
            
            # Update counts
            topic_mastery.problems_attempted += 1
            if submission_status == "Accepted":
                topic_mastery.problems_solved += 1
            
            # Calculate mastery changes
            old_mastery = topic_mastery.mastery_level
            old_ratio = topic_mastery.problems_solved / max(1, topic_mastery.problems_attempted)
            
            # Get code analysis data
            code_analysis = state.get("code_analysis", {})
            code_quality = code_analysis.get("quality_score", 5) / 10.0  # Normalize to 0-1
            approach_score = code_analysis.get("approach_score", 5) / 10.0
            efficiency_score = code_analysis.get("efficiency_score", 5) / 10.0
            
            # Calculate mastery adjustment factors
            solved_factor = 1.0 if submission_status == "Accepted" else 0.2
            difficulty_factor = {
                "Easy": 1.0,
                "Medium": 1.5,
                "Hard": 2.0
            }.get(problem_data["difficulty"], 1.0)
            
            # Calculate quality factor (impact of code quality on mastery)
            quality_factor = (code_quality + approach_score + efficiency_score) / 3
            
            # Calculate mastery change
            # Base change from solving or attempting
            base_change = solved_factor * difficulty_factor * 5.0
            
            # Quality multiplier
            quality_multiplier = 0.5 + quality_factor
            
            # Final change
            mastery_change = base_change * quality_multiplier
            
            # For profiling, we use larger adjustments to quickly establish baseline
            if is_profiling:
                mastery_change *= 2.0
            
            # Update mastery level (capped at 100)
            topic_mastery.mastery_level = min(100, topic_mastery.mastery_level + mastery_change)
            
            # Apply decay for failed solutions
            if submission_status != "Accepted":
                decay = difficulty_factor * 2.0
                topic_mastery.mastery_level = max(0, topic_mastery.mastery_level - decay)
            
            # Update last attempted timestamp
            topic_mastery.last_attempted_at = datetime.utcnow()
            
            # Record the update for feedback
            mastery_updates.append({
                "topic_id": topic_id,
                "topic_name": topic_name,
                "old_mastery": old_mastery,
                "new_mastery": topic_mastery.mastery_level,
                "change": topic_mastery.mastery_level - old_mastery,
                "problems_attempted": topic_mastery.problems_attempted,
                "problems_solved": topic_mastery.problems_solved
            })
        
        # Commit changes
        db.commit()
        
        return {
            **state,
            "mastery_update": {
                "topics": mastery_updates
            }
        }
    except Exception as e:
        return {
            **state,
            "errors": state.get("errors", []) + [f"Error updating student mastery: {str(e)}"]
        }
    finally:
        db.close()

# Create the Analysis Agent graph
def create_analysis_graph():
    """
    Create and return the Analysis agent graph.
    """
    # Initialize the graph
    workflow = StateGraph(AnalysisState)
    
    # Add nodes
    workflow.add_node("fetch_context", fetch_context_data)
    workflow.add_node("analyze_code", analyze_code_quality)
    workflow.add_node("update_mastery", update_student_mastery)
    workflow.add_node("generate_feedback", generate_feedback)
    
    # Define the flow
    workflow.add_edge(START, "fetch_context")
    workflow.add_edge("fetch_context", "analyze_code")
    workflow.add_edge("analyze_code", "update_mastery")
    workflow.add_edge("update_mastery", "generate_feedback")
    workflow.add_edge("generate_feedback", END)
    
    # Compile the graph with memory checkpointing
    return workflow.compile(checkpointer=analysis_memory)

# Initialize the analysis agent
analysis_agent = create_analysis_graph()

# Function to analyze a submission
def analyze_submission(
    student_id: str,
    problem_id: int,
    submission_id: str,
    submission_code: str,
    submission_status: str,
    test_results: List[Dict[str, Any]],
    is_profiling: bool = False
) -> Dict[str, Any]:
    """
    Analyze a student's submission and update their profile.
    
    Args:
        student_id: ID of the student
        problem_id: ID of the problem
        submission_id: ID of the submission
        submission_code: Code submitted by student
        submission_status: Status of submission (Accepted, Wrong Answer, etc.)
        test_results: Results of test cases
        is_profiling: Whether this is part of a profiling assessment
        
    Returns:
        Analysis results with feedback
    """
    # Generate a unique ID for this analysis
    analysis_id = f"analysis_{uuid.uuid4()}"
    
    # Initialize state
    initial_state = {
        "student_id": student_id,
        "problem_id": problem_id,
        "submission_id": submission_id,
        "submission_code": submission_code,
        "submission_status": submission_status,
        "test_results": test_results,
        "is_profiling": is_profiling,
        "problem_data": None,
        "student_data": None,
        "code_analysis": None,
        "mastery_update": None,
        "feedback": None,
        "errors": []
    }
    
    # Configure thread for this analysis
    config = {"configurable": {"thread_id": analysis_id}}
    
    # Run the graph
    result = analysis_agent.invoke(initial_state, config=config)
    
    # Check for errors
    if result.get("errors"):
        return {
            "success": False,
            "errors": result["errors"],
            "feedback": result.get("feedback")
        }
    
    # Return the analysis results
    return {
        "success": True,
        "code_analysis": result["code_analysis"],
        "mastery_update": result["mastery_update"],
        "feedback": result["feedback"]
    }