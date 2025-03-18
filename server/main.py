from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import requests
from database.database import SessionLocal
from database.models import Problem, TestCase, Submission, Topic
from utils.helpers import get_all_test_cases, get_function_name, get_benchmark_test_cases, get_problem_context_for_ai, determine_submission_status, get_first_failing_test, store_submission_results
from dotenv import load_dotenv
import os
from agents.ai_chatbot import AITutorChatbot
from langchain_core.messages import HumanMessage, AIMessage
import sys
import json
from agents.ai_complexity_analyzer import AIComplexityAnalyzer
from agents.question_generator_agent import generate_new_problem
from utils.embedding_creator import create_embedding_after_generation
from profiling_api import register_profiling_api
from roadmap_api import register_roadmap_api
from uuid import UUID
import datetime
import uuid

# Add shared_resources to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "shared_resources")))

from shared_resources.schemas import SubmitCodeRequest, SubmitCodeResponse, ComplexityAnalysisRequest, ComplexityAnalysisResponse, GetProblemResponse, ExampleTestCaseModel, PostRunCodeRequest, RunCodeExecutionPayload,PostRunCodeResponse, ChatRequest, SubmitCodeExecutionPayload, ComplexityAnalysisPayload, GeneratedProblemResponse, GenerateProblemRequest, TopicListResponse

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# TODO: change name for proper url
SUBMIT_CODE_SERVER_URL = "http://code-runner:5000/submit-code"
ANALYZE_COMPLEXITY_URL = "http://code-runner:5000/analyze-complexity"
RUN_CODE_URL = "http://code-runner:5000/run-user-tests"

# ✅ Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (change this in production)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Dependency to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Register profiling API routes
register_profiling_api(app)
register_roadmap_api(app)

# -------------------------------
# 1️⃣ Fetch all problems that are not ai generated
# -------------------------------
@app.get("/problems")
def list_problems(db: Session = Depends(get_db)):
    problems = db.query(Problem).filter(Problem.is_ai_generated == False).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "difficulty": p.difficulty,
            "topics": [t.name for t in p.topics],  # Fetch related topics
        }
        for p in problems
    ]

# -------------------------------
# 2️⃣ Fetch a single problem by ID
# -------------------------------
@app.get("/problems/{problem_id}", response_model=GetProblemResponse)
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()

    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Fetch all test_case_ids from the examples table
    example_test_case_ids = {ex.test_case_id: ex.explanation for ex in problem.examples}

    # Fetch test cases that match the problem_id and test_case_ids
    test_cases = (
        db.query(TestCase)
        .filter(TestCase.problem_id == problem_id, TestCase.id.in_(example_test_case_ids.keys()))
        .all()
    )

    # Map test case ID to input/output
    test_case_map = {tc.id: tc for tc in test_cases}

    return GetProblemResponse(
        problem_id=problem.id,
        title=problem.title,
        description=problem.description,
        difficulty=problem.difficulty,
        constraints=problem.constraints,
        topics=[t.name for t in problem.topics],
        starter_code=problem.starter_code,
        examples=[
            ExampleTestCaseModel(
                test_case_id=tc_id,  # From example
                input_data=test_case_map[tc_id].input_data if tc_id in test_case_map else {},
                expected_output=test_case_map[tc_id].expected_output if tc_id in test_case_map else {},
                explanation=example_test_case_ids[tc_id],  # From examples table
            )
            for tc_id in example_test_case_ids.keys()
        ],
    )


# -------------------------------
# 3️⃣ Fetch test cases for a problem
# -------------------------------
@app.get("/problems/{problem_id}/test-cases")
def fetch_test_cases(problem_id: int, db: Session = Depends(get_db)):
    test_cases = db.query(TestCase).filter(TestCase.problem_id == problem_id).all()
    return [
        {"id": tc.id ,"input": tc.input_data, "expected_output": tc.expected_output}
        for tc in test_cases
    ]


# -------------------------------
# Submit user code, forward to code runner for submissions, and return results
# -------------------------------
@app.post("/submit-code", response_model=SubmitCodeResponse)
def execute_code(request: SubmitCodeRequest, db: Session = Depends(get_db)):
    """
    Fetches test cases, forwards request to code runner, and returns results.
    Stores submission results in the database.
    """

    # Fetch test cases from the database
    test_cases = get_all_test_cases(db, request.problem_id)

    # Fetch function name from the database
    function_name = get_function_name(db, request.problem_id)

    if not test_cases:
        raise HTTPException(status_code=404, detail="No test cases found for this problem")

    # Send user code + test cases to the execution service
    execution_payload = SubmitCodeExecutionPayload(
        source_code=request.source_code,
        problem_id=request.problem_id,
        function_name=function_name,
        test_cases=test_cases
    )
    
    response = requests.post(SUBMIT_CODE_SERVER_URL, json=execution_payload.dict())

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Submit Code execution service failed")

    # Process response data
    response_data = response.json()
    test_results = response_data.get("test_results", [])
    
    # Determine overall submission status using helper function
    status = determine_submission_status(test_results)
    
    # Store submission results in the database
    submission = store_submission_results(
        db=db,
        problem_id=request.problem_id,
        source_code=request.source_code,
        test_results=test_results,
        user_id=request.user_id,
        status=status
    )

    # Calculate test statistics
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results if result.get("passed", False))

    # Find first failing test case (if any)
    failing_test = get_first_failing_test(test_results)
    
    # Return response with appropriate information
    return SubmitCodeResponse(
        submission_id=str(submission.id),
        status=status.value,
        passed_tests=passed_tests,
        total_tests=total_tests,
        failing_test=failing_test,
        user_code=request.source_code
    )

# -------------------------------
# Execute complexity analysis (Forwards to Code Runner)
# -------------------------------
@app.post("/analyze-complexity", response_model=ComplexityAnalysisResponse)
def analyze_submission_complexity(
    request: ComplexityAnalysisRequest, 
    db: Session = Depends(get_db)
):
    """
    Analyzes the time and space complexity of a successful submission,
    with AI enhancement to provide the final determination.
    
    This endpoint:
    1. Verifies that the submission exists and passed all tests
    2. Retrieves benchmark test cases for empirical analysis
    3. Forwards request to code-runner service for analysis
    4. Enhances results with AI insights 
    5. Returns the final complexity analysis results with only the essential information
    """
    # Fetch the submission from the database
    submission = db.query(Submission).filter(Submission.id == request.submission_id).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Only analyze submissions that have passed all tests
    if submission.status.value != "Accepted":
        raise HTTPException(
            status_code=400, 
            detail=f"Submission has not passed all tests. Status: {submission.status.value}"
        )
    
    # Get problem details
    problem_id = submission.problem_id
    source_code = submission.source_code
    
    # Get function name from problem
    function_name = get_function_name(db, problem_id)
    
    # Get benchmark test cases for varying input sizes
    benchmark_cases = get_benchmark_test_cases(db, problem_id)
    
    if not benchmark_cases:
        # If no benchmark cases exist, we'll still perform static analysis
        # but we should log this for the admin to fix
        print(f"Warning: No benchmark test cases found for problem {problem_id}")
    
    # Prepare payload for code-runner service
    execution_payload = ComplexityAnalysisPayload(
        source_code=source_code,
        problem_id=problem_id,
        function_name=function_name,
        benchmark_cases=benchmark_cases
    )
    
    # Forward request to code-runner service
    try:
        response = requests.post(ANALYZE_COMPLEXITY_URL, json=execution_payload.dict())
        response.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Code execution service failed: {str(e)}")
    
    # Process response data from code-runner
    analysis_result = response.json()
    
    # Check for errors
    if "error" in analysis_result:
        raise HTTPException(status_code=400, detail=analysis_result["error"])
    
    # Enhance with AI analysis (no longer optional - always perform AI analysis)
    try:
        # Initialize the AI analyzer
        ai_analyzer = AIComplexityAnalyzer()
        
        # Enhance the analysis with AI insights
        enhanced_result = ai_analyzer.analyze_complexity(
            source_code=source_code,
            function_name=function_name,
            current_analysis=analysis_result
        )
        
        # Use AI's assessment as the final determination
        time_complexity = enhanced_result.get("ai_analysis", {}).get("ai_time_complexity", 
                                enhanced_result.get("time_complexity", "Unknown"))
        space_complexity = enhanced_result.get("ai_analysis", {}).get("space_complexity", 
                                enhanced_result.get("space_complexity", "Not analyzed"))
        
        # Use the AI-enhanced message
        message = enhanced_result.get("message", f"Your solution has {time_complexity} time complexity.")
        
    except Exception as e:
        # Log error but continue with the non-enhanced result
        print(f"AI enhancement failed: {str(e)}")
        # Fall back to algorithmic analysis
        time_complexity = analysis_result.get("time_complexity", "Unknown")
        space_complexity = analysis_result.get("space_complexity", "Not analyzed")
        message = analysis_result.get("message", f"Your solution has {time_complexity} time complexity.")
    
    # Return only the essential information needed by the frontend
    return ComplexityAnalysisResponse(
        submission_id=str(submission.id),
        problem_id=problem_id,
        time_complexity=time_complexity,
        space_complexity=space_complexity,
        message=message
    )
# -------------------------------
# Runs userCode against test cases provided by the user and returns the results
# -------------------------------
@app.post("/run-code", response_model=PostRunCodeResponse)
def run_code(request: PostRunCodeRequest, db: Session = Depends(get_db)):
    """
    Handles run code execution requests.

    - Receives the user-submitted code, problem ID, and test cases.
    - Forwards the request to the code execution engine.
    - Retrieves the execution results and returns them to the client.

    Args:
        request (PostRunCodeRequest): The request payload containing the code, problem ID, and test cases.
        db (Session): The database session dependency for querying/storing execution results.

    Returns:
        JSON response with execution results.
    """ 
    # Fetch function name from the database
    function_name = get_function_name(db, request.problem_id)

    if not function_name:
        raise HTTPException(status_code=404, detail="Function name not found for this problem")
    
    # Send user code + test cases to the execution service
    execution_payload = RunCodeExecutionPayload(
        source_code=request.source_code,
        problem_id=request.problem_id,
        function_name=function_name,
        test_cases=request.test_cases,
    )

    response = requests.post(RUN_CODE_URL, json=execution_payload.dict())

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Code execution service failed")
    
    response_data = response.json()
    return PostRunCodeResponse(
        problem_id=request.problem_id,
        test_results=response_data["test_results"]
    )

# -------------------------------
# Post request to communicate with AI Chatbot for a given problem
# -------------------------------
@app.post("/chat")
async def chat_ai(request: ChatRequest, db: Session = Depends(get_db)):
    """
    AI Chat endpoint using LangGraph for structured chat memory with problem context.
    """
    user_id = request.user_id
    problem_id = request.problem_id
    user_message = request.user_message

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    # Create chatbot instance
    chatbot = AITutorChatbot(db=db)
    
    # Unique thread ID for this user-problem pair
    thread_id = f"{user_id}_{problem_id}"
    
    # Get problem context
    problem_context = get_problem_context_for_ai(db, problem_id)
    if not problem_context:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Create chat state
    chat_state = {
        "messages": [HumanMessage(content=json.dumps({"type": "chat", "content": user_message}))],
        "problem_context": problem_context,
        "user_code": "",
        "code_history": [],
        "student_id": user_id,
        "problem_id": problem_id
    }
    
    # Invoke the chatbot
    response = chatbot.invoke(chat_state)
    
    # Send back the AI's latest reply
    return {"answer": response["messages"][-1].content}

# -------------------------------
# Websocket endpoint to communicate with AI Chatbot for a given problem
# -------------------------------
# Store active WebSocket connections
# Store active WebSocket connections and chatbot instances
active_connections = {}
chatbot_instances = {}

@app.websocket("/ws/chat/{user_id}/{problem_id}")
async def websocket_chat(
    websocket: WebSocket,
    user_id: str,
    problem_id: str,
    db: Session = Depends(get_db)
):
    await websocket.accept()
    connection_id = f"{user_id}_{problem_id}"
    active_connections[connection_id] = websocket

    # Create a dedicated chatbot instance for this connection
    chatbot_instances[connection_id] = AITutorChatbot(db=db)

    # Initialize chat state with empty messages
    chat_state = None

    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            message_type = message_data.get("type", "chat")
            
            if message_type == "chat":
                user_message = message_data.get("user_message", "")
                if not user_message:
                    await websocket.send_json({"error": "user_message is required"})
                    continue
                message_content = json.dumps({"type": "chat", "content": user_message})
                human_message = HumanMessage(content=message_content)
                
                # Initialize chat state if this is the first message
                if chat_state is None:
                    problem_context = get_problem_context_for_ai(db, int(problem_id))
                    if not problem_context:
                        await websocket.send_json({"error": "Problem not found"})
                        continue
                    
                    chat_state = {
                        "messages": [human_message],
                        "problem_context": problem_context,
                        "user_code": "",
                        "code_history": [],
                        "student_id": user_id,
                        "problem_id": int(problem_id)
                    }
                else:
                    chat_state["messages"].append(human_message)
                
                # Process through the chatbot normally
                chat_state = chatbot_instances[connection_id].invoke(chat_state)
                
                # Extract the AI's response
                last_message = chat_state["messages"][-1]
                if isinstance(last_message, AIMessage):
                    await websocket.send_json({"answer": last_message.content})
            
            elif message_type == "code_update":
                user_code = message_data.get("code", "")
                print(f"Received code update. Code length: {len(user_code)}")
                
                if not user_code:
                    await websocket.send_json({"error": "code is required for code_update"})
                    continue
                
                # Initialize chat state if this is the first message
                if chat_state is None:
                    problem_context = get_problem_context_for_ai(db, int(problem_id))
                    if not problem_context:
                        await websocket.send_json({"error": "Problem not found"})
                        continue
                    
                    chat_state = {
                        "messages": [],
                        "problem_context": problem_context,
                        "user_code": "",  # Start with empty code
                        "code_history": [],
                        "student_id": user_id,
                        "problem_id": int(problem_id)
                    }
                
                # Save the original messages so we can restore them
                original_messages = chat_state.get("messages", [])
                
                # Create a message for the graph system
                message_content = json.dumps({"type": "code_update", "code": user_code})
                human_message = HumanMessage(content=message_content)
                
                # Create a clean state with just the code update message
                # This ensures the graph routes properly to the update_code node
                chat_state["messages"] = [human_message]
                
                try:
                    # Process through the graph
                    updated_state = chatbot_instances[connection_id].invoke(chat_state)
                    
                    # If graph processing somehow failed to update the code, do it directly
                    if not updated_state.get("user_code"):
                        updated_state["user_code"] = user_code
                        print("Graph didn't update code, doing it directly")
                    
                    # Restore the original messages
                    updated_state["messages"] = original_messages
                    
                    # Update our chat state
                    chat_state = updated_state
                    
                    # Acknowledge the update
                    await websocket.send_json({
                        "status": "code_updated", 
                        "code_length": len(user_code)
                    })
                except Exception as e:
                    print(f"Error processing code update: {e}")
                    # If graph processing failed, still update the code directly
                    chat_state["user_code"] = user_code
                    chat_state["messages"] = original_messages
                    
                    await websocket.send_json({
                        "status": "code_updated", 
                        "code_length": len(user_code),
                        "warning": "Graph processing failed but code was updated"
                    })
            
            else:
                await websocket.send_json({"error": f"Unknown message type: {message_type}"})
                continue

    except WebSocketDisconnect:
        if connection_id in active_connections:
            del active_connections[connection_id]
        if connection_id in chatbot_instances:
            del chatbot_instances[connection_id]
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
        if connection_id in active_connections:
            del active_connections[connection_id]
        if connection_id in chatbot_instances:
            del chatbot_instances[connection_id]

# Get available topics endpoint
@app.get("/topics", response_model=TopicListResponse)
def get_topics(db: Session = Depends(get_db)):
    """Get all available topics for problem generation"""
    try:
        topics = db.query(Topic).all()
        return TopicListResponse(
            topics=[
                {"id": topic.id, "name": topic.name}
                for topic in topics
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Generate problem endpoint
@app.post("/generate-problem", response_model=GeneratedProblemResponse)
def generate_problem(
    request: GenerateProblemRequest,
    db: Session = Depends(get_db)
):
    """Generate a new problem based on topic and difficulty"""
    try:
        # Validate topic exists
        topic = db.query(Topic).filter(Topic.id == request.topic_id).first()
        if not topic:
            raise HTTPException(status_code=404, detail=f"Topic with ID {request.topic_id} not found")
        
        # Validate difficulty
        valid_difficulties = ["Easy", "Medium", "Hard"]
        if request.difficulty not in valid_difficulties:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid difficulty. Must be one of: {', '.join(valid_difficulties)}"
            )
        
        # Generate problem
        result = generate_new_problem(
            topic_id=request.topic_id,
            difficulty=request.difficulty,
            existing_problem_id=request.existing_problem_id
        )
        
        # If problem was successfully generated, create embedding
        if result.get("success", False) and result.get("problem_id"):
            try:
                embedding_result = create_embedding_after_generation(result["problem_id"])
                # Note: We don't fail if embedding creation fails, just log it
                if not embedding_result.get("success", False):
                    print(f"Warning: Failed to create embedding: {embedding_result.get('error', 'Unknown error')}")
            except Exception as e:
                print(f"Error creating embedding: {str(e)}")
        
        return GeneratedProblemResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))