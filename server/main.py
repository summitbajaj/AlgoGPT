from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import requests
from database.database import SessionLocal
from database.models import Problem, TestCase, Example, Topic
from schemas import ExecutionRequest, ExecutionResponse
from helpers import get_test_cases, get_function_name
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

EXECUTION_SERVER_URL = "http://code-runner:5000/run-code"

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
@app.get("/problems/{problem_id}")
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        return {"error": "Problem not found"}

    return {
        "id": problem.id,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty,
        "constraints": problem.constraints,
        "topics": [t.name for t in problem.topics],
        "examples": [
            {"input": ex.input_data, "output": ex.output_data, "explanation": ex.explanation}
            for ex in problem.examples
        ],
        "starter_code": problem.starter_code,
    }

# -------------------------------
# 3️⃣ Fetch test cases for a problem
# -------------------------------
@app.get("/problems/{problem_id}/test-cases")
def fetch_test_cases(problem_id: int, db: Session = Depends(get_db)):
    test_cases = db.query(TestCase).filter(TestCase.problem_id == problem_id).all()
    return [
        {"input": tc.input_data, "expected_output": tc.expected_output}
        for tc in test_cases
    ]

# -------------------------------
# 4️⃣ Execute user code (Forwards to Flask Code Runner)
# -------------------------------
@app.post("/execute", response_model=ExecutionResponse)
def execute_code(request: ExecutionRequest, db: Session = Depends(get_db)):
    """Fetches test cases, forwards request to code runner, and returns results."""

    # Fetch test cases from the database
    test_cases = get_test_cases(db, request.problem_id)

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

    # # Forward request to Flask Code Runner
    # flask_url = "http://code-runner:5000/run-code" 
    # execution_request = {"code": user_code}

    # response = requests.post(flask_url, json=execution_request)
    # return response.json()