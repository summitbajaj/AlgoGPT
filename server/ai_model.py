import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.message import add_messages
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from typing import Annotated
from typing_extensions import TypedDict
import json
from langchain_openai import AzureChatOpenAI

# Load environment variables from .env file
load_dotenv()

# Set environment variables for Azure OpenAI
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_VERSION = os.getenv("AZURE_OPENAI_VERSION")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")

# Initialize memory checkpointing
memory = MemorySaver()

# Define the state structure for the chatbot
class ChatState(TypedDict):
    messages: Annotated[list, add_messages]  # List of messages (HumanMessage, AIMessage)
    problem_context: str  # Problem description and context
    user_code: str  # Current user-submitted code

def chatbot(state: ChatState):
    chat = AzureChatOpenAI(
        api_version=AZURE_OPENAI_VERSION,
        api_key=AZURE_OPENAI_KEY,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        azure_deployment=AZURE_OPENAI_DEPLOYMENT,
        temperature=0.4,
    )
    
    chat_messages = []
    for msg in state["messages"]:
        try:
            message_data = json.loads(msg.content)
            if message_data["type"] == "chat":
                chat_messages.append(HumanMessage(content=message_data["content"]))
        except:
            if isinstance(msg, AIMessage):
                chat_messages.append(msg)
    
    system_content = f"""You are an expert AI coding tutor specializing in data structures and algorithms. Your role is to help students who struggle with these topics by guiding them through problem-solving rather than simply providing the full answer. Use the following problem context to prompt them towards logical reasoning and incremental improvements: {state['problem_context']}

    Encourage the student to think critically by asking clarifying questions, offering hints, and explaining the underlying concepts. Your guidance should empower them to understand and work towards an optimal solution on their own, rather than receiving a complete answer upfront."""
    
    if state.get("user_code", ""):
        system_content += f"\n\nThe student's current code is:\n```\n{state['user_code']}\n```\nRefer to this code when they ask about improvements, bugs, or optimizations."
    
    messages = [SystemMessage(content=system_content)] + chat_messages
    
    try:
        ai_response = chat(messages)
        return {
            "messages": state["messages"] + [AIMessage(content=ai_response.content)],
            "problem_context": state["problem_context"],
            "user_code": state["user_code"]
        }
    except Exception as e:
        return {
            "messages": state["messages"] + [AIMessage(content=f"Error: {str(e)}")],
            "problem_context": state["problem_context"],
            "user_code": state["user_code"]
        }

def update_code(state: ChatState):
    last_message = state["messages"][-1]
    try:
        message_data = json.loads(last_message.content)
        if message_data["type"] == "code_update":
            return {
                "messages": state["messages"],
                "problem_context": state["problem_context"],
                "user_code": message_data["code"]
            }
    except:
        pass
    return state

def route(state: ChatState):
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

# Initialize the graph
graph_builder = StateGraph(ChatState)

# Add nodes
graph_builder.add_node("chatbot", chatbot)
graph_builder.add_node("update_code", update_code)

# Define conditional edges from START
graph_builder.add_conditional_edges(
    START,
    route,
    {"chatbot": "chatbot", "update_code": "update_code"}
)

# Define edges to END
graph_builder.add_edge("chatbot", END)
graph_builder.add_edge("update_code", END)

# Compile the graph with memory checkpointing
graph = graph_builder.compile(checkpointer=memory)