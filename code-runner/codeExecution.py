from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import ast

app = Flask(__name__)
CORS(app)

def run_user_code(user_code, test_cases, function_name):
    """
    Executes the user code against the provided test cases.

    Expected user code format:
    -------------------------------
    class Solution:
        def some_fn(self, *args):
            # implementation
            ...

    Each test case is expected to be a dict:
    {
        "input_data": "[2,3]",
        "expected_output": 5
    }
    """
    results = []
    global_namespace = {}

    # Load the user code
    try:
        exec(user_code, global_namespace)
    except Exception as e:
        return {"error": f"Error in user code: {e}"}

    # Verify the submitted code contains a class named 'solution'
    if 'Solution' not in global_namespace:
        return {"error": "No class named 'Solution' found in the submitted code."}

    sol_instance = global_namespace['Solution']()
    start_time = time.time()

    for tc in test_cases:
        input_data = tc.get("input_data", "")
        expected_output = tc.get("expected_output", None)

        # Parse input into arguments
        try:
            args = ast.literal_eval(input_data)
            if not isinstance(args, (list, tuple)):
                args = [args]
        except Exception as e:
            results.append({
                "input": input_data,
                "expected": expected_output,
                "output": f"Error parsing input: {e}",
                "passed": False
            })
            continue

        # Call some_fn with the parsed arguments
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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/run-code', methods=['POST'])
def run_code():
    data = request.json
    user_code = data.get("code", "")
    test_cases = data.get("test_cases", [])
    function_name = data.get("function_name", "")
    
    if not user_code:
        return jsonify({"error": "No code provided"}), 400

    result = run_user_code(user_code, test_cases, function_name)
    print(result)
    if "error" in result:
        return jsonify({"error": result["error"]}), 400

    return jsonify(result)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)