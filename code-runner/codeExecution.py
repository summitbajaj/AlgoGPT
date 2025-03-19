from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException
import time
import sys
import os
from helper import run_code_using_user_tests, submit_user_code_tests
from typing import Dict, List

from shared_resources.schemas import RunCodeExecutionPayload, PostRunCodeResponse, SubmitCodeExecutionPayload, SubmitCodeTestResult, ComplexityAnalysisPayload

# Import the benchmark-based complexity analysis function
from complexity_analysis import analyze_complexity

app = FastAPI()
# Add secured CORS middleware

# Get server backend URL from environment variable with default for local development
SERVER_BACKEND_URL = os.environ.get("SERVER_BACKEND_URL", "http://localhost:8000")
# Allow only your server backend to access this service
ALLOWED_ORIGINS = [SERVER_BACKEND_URL]

# Add CORS middleware with restricted access
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Only allow the server backend
    allow_credentials=True,
    allow_methods=["POST", "GET"],  # Only methods you actually need
    allow_headers=["Content-Type"],  # Only headers you actually need
)

@app.get('/health')
def health():
    return {"status": "healthy"}

@app.post('/submit-code', response_model=Dict[str, List[SubmitCodeTestResult]])
async def run_code(request: SubmitCodeExecutionPayload):
    """ Endpoint for running user-submitted code against test cases. """

    user_code = request.source_code
    test_cases = request.test_cases
    function_name = request.function_name
    
    if not user_code:
        raise HTTPException(status_code=400, detail="No code provided")

    result = submit_user_code_tests(user_code, test_cases, function_name)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result

@app.post('/analyze-complexity')
async def analyze_complexity_endpoint(request: ComplexityAnalysisPayload):
    """
    Endpoint for combined static and empirical (benchmark-based) complexity analysis.
    
    Expects JSON with:
      - source_code: the user-submitted code.
      - function_name: the name of the function in the Solution class.
      - problem_id: the problem ID to fetch benchmark test cases.
      - benchmark_cases: benchmark list of test cases to use for empirical analysis.
    
    Returns:
      A dictionary containing the complexity analysis results that will be processed
      by the main service before returning to the client.
    """
    source_code = request.source_code
    function_name = request.function_name
    benchmark_cases = request.benchmark_cases
    problem_id = request.problem_id
    
    if not source_code:
        raise HTTPException(status_code=400, detail="No code provided")
    if not function_name:
        raise HTTPException(status_code=400, detail="No function_name provided")
    if problem_id is None:
        raise HTTPException(status_code=400, detail="No problem_id provided")

    # Run the analysis
    analysis_result = analyze_complexity(
        source_code, 
        problem_id, 
        function_name, 
        benchmark_cases, 
        repeats=5
    )
    
    if "error" in analysis_result:
        raise HTTPException(status_code=400, detail=analysis_result["error"])

    # Return the full analysis result
    # The main service will extract what it needs and enhance with AI analysis
    return analysis_result

@app.post('/run-user-tests', response_model=PostRunCodeResponse)
def run_user_tests(request: RunCodeExecutionPayload):
    """
    - Endpoint for running user-defined tests when user clicks the "run tests" button.
    """
    results = run_code_using_user_tests(
        request.source_code,
        request.test_cases,
        request.function_name
    )

    # If there's an error key in results, raise an HTTPException (or handle it however you see fit).
    if "error" in results:
        # Return a 400 with the error message, or use another status code if appropriate.
        raise HTTPException(status_code=400, detail=results["error"])

    return PostRunCodeResponse(**results)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)