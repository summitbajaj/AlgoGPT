FROM node:18-alpine

# 1) Install system Python & pip
RUN apk add --update --no-cache python3 py3-pip

# 2) Create a working directory
WORKDIR /app

# 3) Copy and install Node dependencies (unchanged from your original)
COPY package*.json ./
RUN npm install

# 4) Copy the rest of your code
COPY . .

# 5) Create a Python virtual environment and install libraries
#    We install inside /venv so it doesn't collide with system packages
COPY requirements.txt .
RUN python3 -m venv /venv \
    && /venv/bin/pip install --no-cache-dir -r requirements.txt

# 6) Make sure subsequent commands (and Pyright) use the venv Python
ENV PATH="/venv/bin:$PATH"

# 7) Expose port and start
EXPOSE 30001
CMD ["npm", "start"]