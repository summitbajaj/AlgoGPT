FROM python:3.9-slim

WORKDIR /code-runner

# Install minimal requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the necessary files
COPY . .

# Expose the port FastAPI will run on
EXPOSE 5000

# Run with gunicorn and uvicorn workers for better performance
CMD ["python", "-m", "uvicorn", "codeExecution:app", "--host", "0.0.0.0", "--port", "5000"]