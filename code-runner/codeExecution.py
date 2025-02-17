from flask import Flask, request, jsonify
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

def run_user_code(user_code, test_cases, function_name):
    """
    Executes the user code against test cases.
    Test cases now have 'input_data' stored as structured JSONB.
    
    For example:
    Two Sum:
        input_data: { "nums": [2, 7, 11, 15], "target": 9 }
        expected_output: [0, 1]
    
    Valid Parentheses:
        input_data: { "s": "()" }
        expected_output: true
    """
    results = []
    global_namespace = {}

    # Load the user code.
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
        # by default, assume order_sensitive is True 
        order_sensitive = tc.get("order_sensitive", True)

        # If input_data is a dict, assume it's mapping parameter names to values and unpack as keyword arguments.
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
            # Otherwise, if it's a list or a scalar, build positional arguments.
            if isinstance(input_data, (list, tuple)):
                args = input_data
            else:
                args = [input_data]
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

        # compare results based on order sensitivity
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
    if "error" in result:
        return jsonify({"error": result["error"]}), 400

    return jsonify(result)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)