from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import time
import os

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/run-code', methods=['POST'])
def run_code():
    code = request.json.get("code", "")
    if not code:
        return jsonify({"error": "No code provided"}), 400

    try:
        start_time = time.time()
        
        # Run the code in a safe subprocess
        output = subprocess.run(
            ["/usr/local/bin/python3", "-c", code],  # Explicitly call python3
            capture_output=True,
            text=True,
            timeout=5,
            env=os.environ  # Keep default environment
        )
        
        execution_time = time.time() - start_time
        
        return jsonify({
            "output": output.stdout,
            "error": output.stderr,
            "execution_time": round(execution_time, 3)
        })

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Code execution timed out"}), 408
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)