from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import requests
from database.database import SessionLocal
from database.models import Problem, TestCase
from helpers import get_all_test_cases, get_function_name, get_benchmark_test_cases, get_problem_context_for_ai
from dotenv import load_dotenv
import os
from ai_model import graph
from langchain_core.messages import HumanMessage
from shared_resources.schemas import ChatRequest
import sys

# Add shared_resources to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "shared_resources")))

from shared_resources.schemas import CodeExecutionRequest, CodeExecutionResponse, ComplexityAnalysisRequest, ComplexityAnalysisResponse, GetProblemResponse, ExampleTestCaseModel, PostRunCodeRequest, RunCodeExecutionPayload,PostRunCodeResponse, ChatRequest

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# TODO: change name for proper url
EXECUTION_SERVER_URL = "http://code-runner:5000/run-code"
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
# 4️⃣ Execute user code (Forwards to Flask Code Runner)
# -------------------------------
@app.post("/execute", response_model=CodeExecutionResponse)
def execute_code(request: CodeExecutionRequest, db: Session = Depends(get_db)):
    """Fetches test cases, forwards request to code runner, and returns results."""

    # Fetch test cases from the database
    test_cases = get_all_test_cases(db, request.problem_id)

    # Fetch function name from the database
    function_name = get_function_name(db, request.problem_id)

    if not test_cases:
        raise HTTPException(status_code=404, detail="No test cases found for this problem")

    # Send user code + test cases to the execution service
    execution_payload = {
        "code": request.code,
        "test_cases": test_cases,
        "function_name": function_name,
    }

    response = requests.post(EXECUTION_SERVER_URL, json=execution_payload)

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Code execution service failed")

    return response.json()

# -------------------------------
# 5️⃣ Execute complexity analysis (Forwards to Flask Code Runner)
# -------------------------------
@app.post("/analyze_complexity", response_model=ComplexityAnalysisResponse)
def analyze_complexity(request: ComplexityAnalysisRequest, db: Session = Depends(get_db)):
    """Fetches test cases, forwards request to code runner, and returns results."""

    # Fetch benchmark test cases from the database
    benchmark_test_cases = get_benchmark_test_cases(db, request.problem_id)

    # Fetch function name from the database
    function_name = get_function_name(db, request.problem_id)

    if not benchmark_test_cases:
        raise HTTPException(status_code=404, detail="No test cases found for this problem")
    
    # Send user code + test cases to the execution service
    execution_payload = {
        "source_code": request.code,
        "problem_id": request.problem_id,
        "function_name": function_name,
        "benchmark_cases": benchmark_test_cases,
    }

    response = requests.post(ANALYZE_COMPLEXITY_URL, json=execution_payload)

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Code execution service failed")

    response = response.json()

    # Return only complexity & feedback
    return ComplexityAnalysisResponse(
        combined_complexity=response.get("combined_complexity", "Unknown Complexity"),
        feedback=response.get("feedback", "No feedback available.")
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