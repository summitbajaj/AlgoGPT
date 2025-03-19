FROM python:3.9-slim

WORKDIR /code-runner

# Install necessary packages 
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install uvicorn

# Copy everything in the current directory to /code-runner
# (This includes the shared_resources that was copied by your script)
COPY . /code-runner

# Create non-root user for security
RUN useradd -m appuser
RUN chown -R appuser:appuser /code-runner
USER appuser

# Expose the port FastAPI will run on
EXPOSE 5000

# Run with uvicorn
CMD ["python", "-m", "uvicorn", "codeExecution:app", "--host", "0.0.0.0", "--port", "5000"]