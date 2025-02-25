from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException
import time
import sys
import os
from helper import run_code_using_user_tests

# Add shared_resources to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "shared_resources")))
from shared_resources.schemas import RunCodeExecutionPayload, PostRunCodeResponse

# Import the benchmark-based complexity analysis function
from complexity_analysis import combine_complexity_analysis

app = FastAPI()
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modify this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_user_code(user_code, test_cases, function_name):
    """
    Executes the user code against provided test cases.
    
    Expects the code to define a class named 'Solution'.
    """
    results = []
    global_namespace = {}

    try:
        exec(user_code, global_namespace)
    except Exception as e:
        return {"error": f"Error in user code: {e}"}

    if 'Solution' not in global_namespace:
        return {"error": "No class named 'Solution' found in the submitted code."}

    sol_instance = global_namespace['Solution']()
    start_time = time.time()

    for tc in test_cases:
        input_data = tc.get("input_data")
        expected_output = tc.get("expected_output")
        order_sensitive = tc.get("order_sensitive", True)

        # If input_data is a dict, assume it's keyword arguments
        if isinstance(input_data, dict):
            try:
                output = getattr(sol_instance, function_name)(**input_data)
            except Exception as e:
                results.append({
                    "input": input_data,
                    "expected": expected_output,
                    "output": f"Error during execution: {e}",
                    "passed": False
                })
                continue
        else:
            # Otherwise treat input_data as positional arguments
            args = input_data if isinstance(input_data, (list, tuple)) else [input_data]
            try:
                output = getattr(sol_instance, function_name)(*args)
            except Exception as e:
                results.append({
                    "input": input_data,
                    "expected": expected_output,
                    "output": f"Error during execution: {e}",
                    "passed": False
                })
                continue

        # Compare output with expected output, considering order sensitivity
        if (not order_sensitive and 
            isinstance(output, list) and isinstance(expected_output, list)):
            passed = sorted(output) == sorted(expected_output)
        else:
            passed = output == expected_output

        results.append({
            "input": input_data,
            "expected": expected_output,
            "output": output,
            "passed": passed
        })

    execution_time = time.time() - start_time
    return {
        "test_results": results,
        "execution_time": round(execution_time, 3)
    }

@app.get('/health')
def health():
    return {"status": "healthy"}

@app.post('/run-code')
async def run_code(data: dict):
    user_code = data.get("code", "")
    test_cases = data.get("test_cases", [])
    function_name = data.get("function_name", "")
    
    if not user_code:
        raise HTTPException(status_code=400, detail="No code provided")

    result = run_user_code(user_code, test_cases, function_name)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result

@app.post('/analyze-complexity')
def analyze_complexity_endpoint(data: dict):
    """
    Endpoint for combined static and empirical (benchmark-based) complexity analysis.
    
    Expects JSON with:
      - source_code: the user-submitted code.
      - function_name: the name of the function in the Solution class.
      - problem_id: the problem ID to fetch benchmark test cases.
      - benchmark_cases: benchmark list of test cases to use for empirical analysis.
    """

    source_code = data.get("source_code", "")
    function_name = data.get("function_name", "")
    benchmark_cases = data.get("benchmark_cases", [])
    problem_id = data.get("problem_id")
    
    if not source_code:
        raise HTTPException(status_code=400, detail="No code provided")
    if not function_name:
        raise HTTPException(status_code=400, detail="No function_name provided")
    if problem_id is None:
        raise HTTPException(status_code=400, detail="No problem_id provided")

    analysis_result = combine_complexity_analysis(source_code, problem_id, function_name, benchmark_cases, repeats=5)
    if "error" in analysis_result:
        raise HTTPException(status_code=400, detail=analysis_result["error"])

    feedback = f"Your solution appears to run in {analysis_result['combined_complexity']}."
    analysis_result["feedback"] = feedback

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