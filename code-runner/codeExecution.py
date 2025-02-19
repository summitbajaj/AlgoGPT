from flask import Flask, request, jsonify
from flask_cors import CORS
import time

# Import the benchmark-based complexity analysis function
from complexity_analysis import combine_complexity_analysis

app = Flask(__name__)
CORS(app)

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

@app.route('/analyze-complexity', methods=['POST'])
def analyze_complexity_endpoint():
    """
    Endpoint for combined static and empirical (benchmark-based) complexity analysis.
    
    Expects JSON with:
      - source_code: the user-submitted code.
      - function_name: the name of the function in the Solution class.
      - problem_id: the problem ID to fetch benchmark test cases.
      - benchmark_cases: benchmark list of test cases to use for empirical analysis.
    """
    data = request.json

    source_code = data.get("source_code", "")
    function_name = data.get("function_name", "")
    benchmark_cases = data.get("benchmark_cases", [])
    problem_id = data.get("problem_id")
    
    if not source_code:
        return jsonify({"error": "No code provided"}), 400
    if not function_name:
        return jsonify({"error": "No function_name provided"}), 400
    if problem_id is None:
        return jsonify({"error": "No problem_id provided"}), 400

    # Perform combined complexity analysis using benchmark test cases
    analysis_result = combine_complexity_analysis(source_code, problem_id, function_name, benchmark_cases, repeats=5)
    if "error" in analysis_result:
        return jsonify({"error": analysis_result["error"]}), 400

    # Use the new combined complexity field for feedback.
    feedback = f"Your solution appears to run in {analysis_result['combined_complexity']}."
    analysis_result["feedback"] = feedback

    return jsonify(analysis_result)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)