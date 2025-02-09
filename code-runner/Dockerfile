FROM python:3.9-slim

WORKDIR /code-runner

# Install minimal requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the necessary files
COPY . .

# Expose the port Flask will run on
EXPOSE 5000

# Run with gunicorn for better security and performance
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]