from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import requests
from database.database import SessionLocal
from database.models import Problem, TestCase, Submission
from helpers import get_all_test_cases, get_function_name, get_benchmark_test_cases, get_problem_context_for_ai, get_all_test_cases, get_function_name, determine_submission_status, get_first_failing_test, store_submission_results
from dotenv import load_dotenv
import os
from ai_chatbot import graph
from langchain_core.messages import HumanMessage, AIMessage
import sys
import json
from ai_complexity_analyzer import AIComplexityAnalyzer, should_enhance_with_ai

# Add shared_resources to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "shared_resources")))

from shared_resources.schemas import SubmitCodeRequest, SubmitCodeResponse, ComplexityAnalysisRequest, ComplexityAnalysisResponse, GetProblemResponse, ExampleTestCaseModel, PostRunCodeRequest, RunCodeExecutionPayload,PostRunCodeResponse, ChatRequest, SubmitCodeExecutionPayload, ComplexityAnalysisPayload

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

# -------------------------------
# 1️⃣ Fetch all problems
# -------------------------------
@app.get("/problems")
def list_problems(db: Session = Depends(get_db)):
    problems = db.query(Problem).all()
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
from fastapi import HTTPException
from sqlalchemy.orm import Session

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

    # Unique thread ID for this user-problem pair
    thread_id = f"{user_id}_{problem_id}"

    # Check if the thread already exists
    current_checkpoint = graph.checkpointer.get({"configurable": {"thread_id": thread_id}})

    if current_checkpoint is None:
        # New thread: fetch problem context from DB
        problem_context = get_problem_context_for_ai(db, problem_id)
        if not problem_context:
            raise HTTPException(status_code=404, detail="Problem not found")
        initial_state = {
            "messages": [HumanMessage(content=user_message)],
            "problem_context": problem_context,
        }
    else:
        # Existing thread: use the saved problem context
        initial_state = {
            "messages": [HumanMessage(content=user_message)],
        }

    # Run the LangGraph model with the initial state
    response = graph.invoke(
        initial_state,
        config={
            "configurable": {"thread_id": thread_id},
        }
    )

    # Send back the AI’s latest reply
    return {"answer": response["messages"][-1].content}

# -------------------------------
# Websocket endpoint to communicate with AI Chatbot for a given problem
# -------------------------------
# Store active WebSocket connections
active_connections = {}

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
            elif message_type == "code_update":
                user_code = message_data.get("code", "")
                if not user_code:
                    continue
                message_content = json.dumps({"type": "code_update", "code": user_code})
            else:
                continue
            
            human_message = HumanMessage(content=message_content)
            config = {"configurable": {"thread_id": connection_id}}
            
            current_checkpoint = graph.checkpointer.get(config)
            
            if current_checkpoint is None:
                problem_context = get_problem_context_for_ai(db, int(problem_id))
                if not problem_context:
                    await websocket.send_json({"error": "Problem not found"})
                    continue
                initial_state = {
                    "messages": [human_message],
                    "problem_context": problem_context,
                    "user_code": "",
                    "code_history": []  # Initialize empty history
                }
            else:
                channel_values = current_checkpoint.get("channel_values", {}) if isinstance(current_checkpoint, dict) else {}
                messages = channel_values.get("messages", [])
                if not isinstance(messages, list):
                    messages = []
                initial_state = {
                    "messages": messages + [human_message],
                    "problem_context": channel_values.get("problem_context", get_problem_context_for_ai(db, int(problem_id))),
                    "user_code": channel_values.get("user_code", ""),
                    "code_history": channel_values.get("code_history", [])  # Retrieve history
                }
            
            response = graph.invoke(initial_state, config=config)
            
            last_message = response["messages"][-1]
            if isinstance(last_message, AIMessage):
                await websocket.send_json({"answer": last_message.content})
    
    except WebSocketDisconnect:
        if connection_id in active_connections:
            del active_connections[connection_id]
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
        if connection_id in active_connections:
            del active_connections[connection_id]