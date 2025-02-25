import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.message import add_messages
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from typing import Annotated
from typing_extensions import TypedDict
from helpers import get_problem_context_for_ai
from langchain_openai import AzureChatOpenAI

# Load environment variables from .env
load_dotenv()

# Set environment variables for Azure OpenAI
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_VERSION = os.getenv("AZURE_OPENAI_VERSION")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_API_ENDPOINT")


# Checkpointing system to store memory
memory = MemorySaver()

# Define the chatbot state
class ChatState(TypedDict):
    messages: Annotated[list, add_messages]  # Stores conversation history
    problem_context: str  # Stores problem description, hints, and solutions

def chatbot(state: ChatState):
    """
    LangGraph node: Processes user input and returns AI response using Azure OpenAI via LangChain.
    """
    # Initialize Azure ChatOpenAI
    chat = AzureChatOpenAI(
        api_version=AZURE_OPENAI_VERSION,
        api_key=AZURE_OPENAI_KEY,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        azure_deployment=AZURE_OPENAI_DEPLOYMENT,
        temperature=0.4,
    )
    
    # Construct messages for the chat, including system message and full conversation history
    messages = [
        SystemMessage(content=f"""You are an expert AI coding tutor specializing in data structures and algorithms. Your role is to help students who struggle with these topics by guiding them through problem-solving rather than simply providing the full answer. Use the following problem context to prompt them towards logical reasoning and incremental improvements: {state['problem_context']}

        Encourage the student to think critically by asking clarifying questions, offering hints, and explaining the underlying concepts. Your guidance should empower them to understand and work towards an optimal solution on their own, rather than receiving a complete answer upfront."""),
    ] + state["messages"]

    try:
        # Get response using LangChain
        ai_response = chat(messages)

        # Append only the AI response, as the user message is already in state["messages"]
        return {
            "messages": state["messages"] + [AIMessage(content=ai_response.content)]
        }
    except Exception as e:
        return {
            "messages": state["messages"] + [AIMessage(content=f"Error: {str(e)}")]
        }

# Define the graph with only the chatbot node
graph_builder = StateGraph(ChatState)

# Add the chatbot node
graph_builder.add_node("chatbot", chatbot)

# Define execution flow: START -> chatbot -> END
graph_builder.add_edge(START, "chatbot")
graph_builder.add_edge("chatbot", END)

# Compile LangGraph with memory checkpointing
graph = graph_builder.compile(checkpointer=memory)