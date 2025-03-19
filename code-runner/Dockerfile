FROM python:3.9-slim

WORKDIR /code-runner

# Install minimal requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared_resources directory first
COPY shared_resources/ ./shared_resources/

# Copy the rest of the application files
COPY . .

# Expose the port FastAPI will run on
EXPOSE 5000

# Run with uvicorn
CMD ["python", "-m", "uvicorn", "codeExecution:app", "--host", "0.0.0.0", "--port", "5000"]