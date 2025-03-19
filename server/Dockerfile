FROM python:3.9-slim

WORKDIR /server

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install uvicorn

# Copy *everything* in /server (including the newly-copied /server/shared_resources)
COPY . /server

# Create non-root user
RUN useradd -m appuser
RUN chown -R appuser:appuser /server
USER appuser

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]