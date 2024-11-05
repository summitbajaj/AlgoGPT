# Sample Flask API (Python) for Code Execution
from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

@app.route('/run-code', methods=['POST'])
def run_code():
    code = request.json.get("code", "")
    try:
        # Run the code in a safe subprocess
        output = subprocess.run(
            ["python3", "-c", code],
            capture_output=True,
            text=True,
            timeout=5  # Set a timeout for safety
        )
        return jsonify({"output": output.stdout, "error": output.stderr})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
