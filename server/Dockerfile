FROM python:3.9-slim

WORKDIR /server

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN pip install uvicorn

# Copy the rest of the application
COPY . .

# Run as non-root user
RUN useradd -m appuser
# Change ownership of the application files to appuser
RUN chown -R appuser:appuser /server
USER appuser

# Run the FastAPI server
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]