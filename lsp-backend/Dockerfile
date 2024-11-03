FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Expose the application port
EXPOSE 30001

# Set environment variables
ENV PORT 30001

# Start the application
CMD ["npm", "start"]
