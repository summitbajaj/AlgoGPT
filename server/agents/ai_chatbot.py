import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.message import add_messages
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from typing import Annotated, List, Dict, Any, Optional
from typing_extensions import TypedDict
import json
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from langchain_openai import AzureChatOpenAI
from utils.helpers import initialize_student_profile
from utils.chat_operations import ChatbotDBOperations
from database.models import ResponseValidationStatus, StudentProfile

# Load environment variables from .env file
load_dotenv('.env')

AZURE_OPENAI_DEPLOYMENT = "gpt-4o"
# Set environment variables for Azure OpenAI
AZURE_OPENAI_VERSION = os.getenv("AZURE_OPENAI_VERSION")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")

# Initialize memory checkpointing
memory = MemorySaver()

# Define the state structure for the chatbot
class ChatState(TypedDict):
    messages: Annotated[list, add_messages]  # List of messages (HumanMessage, AIMessage)
    problem_context: str  # Problem description and context
    user_code: str  # Current user-submitted code
    code_history: List[Dict[str, str]]  # History of code versions with timestamps
    current_response: Optional[str]  # Current generated response before validation
    validation_attempts: int  # Number of attempts to improve the response
    validation_feedback: Optional[Dict[str, Any]]  # Feedback from validator
    session_id: Optional[str]  # Database session ID
    student_id: Optional[str]  # Student ID for the session
    problem_id: Optional[int]  # Problem ID for the session
    db_session: Optional[Any]  # Database session (SQLAlchemy)

class AITutorChatbot:
    def __init__(self, db: Session = None):
        self.db = db
        self.db_ops = ChatbotDBOperations(db) if db else None
        self.graph = self._create_graph()
    
    def _get_llm(self, temperature=0.3):
        """Initialize the Azure OpenAI client with the specified temperature."""
        return AzureChatOpenAI(
            api_version=AZURE_OPENAI_VERSION,
            api_key=AZURE_OPENAI_KEY,
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            azure_deployment=AZURE_OPENAI_DEPLOYMENT,
            temperature=temperature,
        )
    
    def _create_system_prompt(self, state: ChatState):
        """Create the system prompt using problem context and code history."""
        system_content = f"""You are an expert AI coding tutor for AlgoGPT specializing in data structures and algorithms. Your role is to help students who struggle with these topics by guiding them through problem-solving rather than simply providing the full answer. Use the following problem context to prompt them towards logical reasoning and incremental improvements: {state['problem_context']}

        The student's current code is:\n```\n{state['user_code']}\n```\nRefer to this code when they ask about improvements, bugs, or optimizations. Additionally, the student has a history of code versions, which you can use to provide feedback on their progress. Here is the code history (from oldest to newest):\n"""
        
        if state.get("code_history", []):
            system_content += "Code History:\n"
            for i, version in enumerate(state["code_history"], 1):
                system_content += f"Version {i} (at {version['timestamp']}):\n```\n{version['code']}\n```\n"
        
        base_instructions = """Encourage the student to think critically by asking clarifying questions, offering hints, and explaining the underlying concepts. Your guidance should empower them to understand and work towards an optimal solution on their own, rather than receiving a complete answer upfront. When providing feedback, compare the current code to previous versions to highlight improvements, regressions, or areas for optimization."""
        
        # Add active prompt improvements from the database
        if self.db_ops:
            active_improvements = self.db_ops.get_active_prompt_improvements()
            for improvement in active_improvements:
                base_instructions += f"\n\n{improvement.instruction}"
        
        system_content += base_instructions
        return system_content
    
    def _initialize_state(self, state: ChatState):
        if not state.get("session_id") and self.db_ops and state.get("student_id") and state.get("problem_id"):
            print(f"Initializing session with student_id: {state['student_id']} and problem_id: {state['problem_id']}")
            # Ensure the student profile exists
            student_profile = initialize_student_profile(self.db, state["student_id"])
            
            # Use the student profile's primary key (id) for creating the session
            student_uuid = student_profile.id
            print(f"Using student_uuid: {student_uuid}")
            
            session = self.db_ops.create_chat_session(student_uuid, state["problem_id"])
            state["session_id"] = str(session.id)
            print(f"Chat session created with session_id: {state['session_id']}")
        
        if "validation_attempts" not in state:
            state["validation_attempts"] = 0
        
        if "code_history" not in state:
            state["code_history"] = []
        
        return state

    def _chatbot_node(self, state: ChatState):
        """Generate an AI tutor response."""
        chat = self._get_llm()
        
        # Extract human messages
        chat_messages = []
        for msg in state["messages"]:
            try:
                message_data = json.loads(msg.content)
                if message_data["type"] == "chat":
                    chat_messages.append(HumanMessage(content=message_data["content"]))
                    
                    # Store student message in DB if we have a session
                    if self.db_ops and state.get("session_id"):
                        self.db_ops.add_student_message(
                            uuid.UUID(state["session_id"]), 
                            message_data["content"]
                        )
            except:
                if isinstance(msg, AIMessage):
                    chat_messages.append(msg)
        
        # Create system prompt
        system_content = self._create_system_prompt(state)
        messages = [SystemMessage(content=system_content)] + chat_messages
        
        try:
            ai_response = chat(messages)
            return {
                **state,
                "current_response": ai_response.content,
                "validation_attempts": 0,
                "validation_feedback": None
            }
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            
            # If we have a DB connection, store the error response
            if self.db_ops and state.get("session_id"):
                self.db_ops.add_ai_message(
                    uuid.UUID(state["session_id"]),
                    error_msg,
                    was_validated=False
                )
                
            return {
                **state,
                "messages": state["messages"] + [AIMessage(content=error_msg)],
                "current_response": None
            }
    
    def _validator_node(self, state: ChatState):
        """Validate the quality of the generated response."""
        # Skip validation after too many attempts
        if state.get("validation_attempts", 0) >= 3:
            # Accept the response as is after 3 attempts
            response = state["current_response"]
            
            # Store in DB with validation info
            if self.db_ops and state.get("session_id"):
                message = self.db_ops.add_ai_message(
                    uuid.UUID(state["session_id"]),
                    response,
                    was_validated=True,
                    validation_status=ResponseValidationStatus.ACCEPTED_AFTER_ATTEMPTS,
                    validation_attempts=state["validation_attempts"]
                )
            
            return {
                **state,
                "messages": state["messages"] + [AIMessage(content=response)],
                "current_response": None,
                "validation_attempts": 0
            }
        
        # Initialize the LLM with lower temperature for more consistent validation
        chat = self._get_llm(temperature=0.1)
        
        # Create validation prompt
        validation_prompt = f"""You are an educational content validator for a coding tutor chatbot. 
            Evaluate the following response to a student's question about data structures and algorithms.

            Problem context: {state['problem_context']}

            Student's current code: ```{state['user_code']}```

            Tutor's response: {state['current_response']}

            Is this response:
            1. Relevant to the problem context?
            2. Educational without giving away complete solutions?
            3. Accurate in explaining concepts?
            4. Helpful for the student's learning?

            Respond with a JSON object containing:
            1. "valid": boolean (true if response passes all criteria, false otherwise)
            2. "reasons": list of strings explaining why the response fails any criteria
            3. "improvement_suggestions": list of specific suggestions to improve the response
            4. "prompt_improvement": a suggestion for a rule to add to future prompts to avoid similar issues
            """
        
        # Get validation result
        validation_result = chat([SystemMessage(content=validation_prompt)])
        
        try:
            result = json.loads(validation_result.content)
            
            # If we have a DB connection, store validation info
            if self.db_ops and state.get("session_id"):
                # Store validation details
                message_id = None
                if result.get("valid", False):
                    # Valid response - add to messages
                    message = self.db_ops.add_ai_message(
                        uuid.UUID(state["session_id"]),
                        state["current_response"],
                        was_validated=True,
                        validation_status=ResponseValidationStatus.VALID,
                        validation_attempts=state["validation_attempts"]
                    )
                    message_id = message.id
                
                if message_id:
                    # Record validation attempt
                    validation_record = self.db_ops.record_response_validation(
                        message_id=message_id,
                        attempt_number=state["validation_attempts"] + 1,
                        original_content=state["current_response"],
                        validation_result=result.get("valid", False),
                        feedback=result
                    )
                    
                    # Store prompt improvement if provided
                    if result.get("prompt_improvement"):
                        self.db_ops.add_prompt_improvement(
                            validation_id=validation_record.id,
                            instruction=result["prompt_improvement"]
                        )
            
            if result.get("valid", False):
                # Response is valid, send it to the user
                return {
                    **state,
                    "messages": state["messages"] + [AIMessage(content=state["current_response"])],
                    "current_response": None,
                    "validation_attempts": 0,
                    "validation_feedback": None
                }
            else:
                # Response needs improvement
                return {
                    **state,
                    "validation_attempts": state.get("validation_attempts", 0) + 1,
                    "validation_feedback": result
                }
        except Exception as e:
            # If validation fails, accept the response
            if self.db_ops and state.get("session_id"):
                self.db_ops.add_ai_message(
                    uuid.UUID(state["session_id"]),
                    state["current_response"],
                    was_validated=False
                )
            
            return {
                **state,
                "messages": state["messages"] + [AIMessage(content=state["current_response"])],
                "current_response": None,
                "validation_attempts": 0,
                "validation_feedback": None
            }
    
    def _improve_response_node(self, state: ChatState):
        """Improve the response based on validation feedback."""
        chat = self._get_llm()
        
        feedback = state.get("validation_feedback", {})
        reasons = feedback.get("reasons", ["Unknown issues with the response"])
        suggestions = feedback.get("improvement_suggestions", ["Make the response more educational"])
        
        improvement_prompt = f"""You are an expert AI coding tutor specializing in data structures and algorithms.
            Your previous response to a student's question needs improvement. 

            Original response: {state['current_response']}

            Issues identified:
            {' '.join([f'- {reason}' for reason in reasons])}

            Suggestions for improvement:
            {' '.join([f'- {suggestion}' for suggestion in suggestions])}

            Problem context: {state['problem_context']}

            Student's current code: ```{state['user_code']}```

            Please provide an improved response that addresses these issues while maintaining your role as a helpful coding tutor.
            """
        
        improved_response = chat([SystemMessage(content=improvement_prompt)])
        
        # If we have a DB connection, store the improved response for analysis
        if self.db_ops and state.get("session_id") and state.get("validation_feedback"):
            # We'll only log this improvement attempt but not create a message yet
            # The final message will be created after validation
            
            # If we already had a message ID from a previous attempt, use it to record this improvement
            validation_attempt = state["validation_attempts"]
            if validation_attempt > 1:
                # TODO: Update any existing validation records with the improved content
                pass
        
        return {
            **state,
            "current_response": improved_response.content
        }
    
    def _update_code_node(self, state: ChatState):
        """Update the student's code in the state."""
        last_message = state["messages"][-1]
        try:
            message_data = json.loads(last_message.content)
            if message_data["type"] == "code_update":
                new_code = message_data["code"]
                
                # Only add to history if the code is different
                if new_code != state["user_code"]:
                    timestamp = datetime.now().isoformat()
                    new_history = state["code_history"] + [{"code": new_code, "timestamp": timestamp}]
                    
                    # Store code snapshot in database if possible
                    if self.db_ops and state.get("session_id"):
                        self.db_ops.add_code_snapshot(
                            uuid.UUID(state["session_id"]),
                            new_code
                        )
                else:
                    new_history = state["code_history"]
                
                return {
                    **state,
                    "user_code": new_code,
                    "code_history": new_history
                }
        except:
            pass
        return state
    
    def _route_node(self, state: ChatState):
        """Route messages through the graph based on their type and state."""
        # If we have a current response, it needs validation
        if state.get("current_response"):
            return "validator"
        
        # If we have validation feedback but the response is still invalid
        if state.get("validation_feedback") and state.get("validation_attempts", 0) < 3:
            return "improve_response"
        
        # Regular message routing
        if not state["messages"]:
            return "chatbot"
            
        last_message = state["messages"][-1]
        try:
            message_data = json.loads(last_message.content)
            message_type = message_data.get("type")
            if message_type == "chat":
                return "chatbot"
            elif message_type == "code_update":
                return "update_code"
        except:
            return "chatbot"
        return "chatbot"
    
    def _create_graph(self):
        """Create the LangGraph flow."""
        # Initialize the graph
        graph_builder = StateGraph(ChatState)
        
        # Add nodes
        graph_builder.add_node("initialize", self._initialize_state)
        graph_builder.add_node("chatbot", self._chatbot_node)
        graph_builder.add_node("validator", self._validator_node)
        graph_builder.add_node("improve_response", self._improve_response_node)
        graph_builder.add_node("update_code", self._update_code_node)
        
        # Define edges
        graph_builder.add_edge(START, "initialize")
        graph_builder.add_edge("initialize", "chatbot")
        
        # Define conditional edges for routing
        graph_builder.add_conditional_edges(
            "chatbot",
            self._route_node,
            {
                "validator": "validator",
                "chatbot": "chatbot",
                "update_code": "update_code"
            }
        )
        
        graph_builder.add_conditional_edges(
            "validator",
            self._route_node,
            {
                "improve_response": "improve_response",
                "chatbot": END
            }
        )
        
        graph_builder.add_conditional_edges(
            "improve_response",
            self._route_node,
            {
                "validator": "validator",
                "chatbot": "chatbot"
            }
        )
        
        graph_builder.add_edge("update_code", END)
        
        # Compile the graph without the checkpointer - this is the key change
        return graph_builder.compile()
    
    def invoke(self, state: ChatState):
        """Process a message through the graph."""
        # Ensure the DB session is available
        if self.db:
            state["db_session"] = self.db
        
        # Process through the graph
        result = self.graph.invoke(state)
        
        # Clean up any DB references before returning
        if "db_session" in result:
            del result["db_session"]
        
        return result
