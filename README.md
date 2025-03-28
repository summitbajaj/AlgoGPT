# AlgoGPT

## 🌟 Overview

AlgoGPT is an intelligent coding platform designed to help students learn and master algorithms and data structures. It combines the power of modern AI with traditional programming practice to create a personalized learning experience.

The platform features an interactive code editor, real-time code execution, AI-powered tutoring, automated skill assessment, and a structured learning roadmap to guide your algorithmic journey.

## ✨ Key Features

- **Interactive Code Environment**: Write, run, and test code directly in the browser with syntax highlighting and autocomplete
- **AI Tutor**: Get personalized guidance from an AI tutor that helps you understand concepts instead of just giving answers
- **Real-time Code Analysis**: Instant feedback on your code's time and space complexity
- **Skill Assessment**: Automatic profiling of your algorithmic strengths and weaknesses
- **Learning Roadmap**: Structured path through algorithm topics from basics to advanced
- **Problem Generator**: AI-powered problem creation for unlimited practice opportunities
- **Dark/Light Mode**: Choose your preferred theme for comfortable coding sessions

## 🛠️ Architecture

AlgoGPT uses a microservice architecture with the following components:

- **Frontend**: Next.js React application with TypeScript and Tailwind CSS
- **API Server**: FastAPI Python backend handling business logic
- **Code Runner**: Isolated service for secure code execution
- **LSP Backend**: Language Server Protocol support for code editor features
- **Database**: PostgreSQL with pgvector extensions for embeddings

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for local development)
- Firebase project (for authentication)
- PostgreSQL database

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/algogpt.git
   cd algogpt
   ```

2. Create environment variables:
   ```bash
   # Create a .env file with the following variables
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
   DATABASE_URL=postgresql://username:password@hostname:5432/database_name
   ```

3. Start the application using Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Access the application at `http://localhost:3000`

### Local Development

For frontend development:
```bash
cd algogpt-frontend
npm install
npm run dev
```

For backend development:
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## 📋 Project Structure

```
algogpt/
├── algogpt-frontend/      # Next.js frontend application
├── server/                # FastAPI backend API server
├── code-runner/           # Code execution service
├── lsp-backend/           # Language server for code editor
├── shared_resources/      # Shared code between services
└── scripts/               # Deployment and build scripts
```

## 🧠 AI Components

AlgoGPT leverages several AI technologies:
- **LangGraph**: For orchestrating conversation and tutoring workflows
- **Azure OpenAI**: For powering the AI tutor and code analysis
- **LangChain**: For chat models and embedding workflows
- **Vector Embeddings**: For semantic search of programming problems

## 🔒 Security

- Code execution happens in an isolated container environment
- User authentication via Firebase
- All communications between services are secured
- Input validation and sanitization across all endpoints

## 🙏 Acknowledgements

- Monaco Editor for the code editing experience
- TypeFox for Monaco-related tooling and language server protocol implementation
- OpenAI and Azure for AI capabilities
- All the open-source libraries that made this project possible
