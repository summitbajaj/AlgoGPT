import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, List, Any, Optional
from typing_extensions import TypedDict
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.database import SessionLocal
from database.models import (
    Problem, Topic, TestCase, Example, DifficultyLevel
)
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
import json
import re
import uuid
import logging
from utils.embedding_creator import create_embedding_after_generation

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize memory checkpointing
memory = MemorySaver()

# Initialize Azure OpenAI Chat model
chat_model = AzureChatOpenAI(
    azure_deployment=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    api_version=os.getenv("AZURE_OPENAI_VERSION"),
    temperature=0.7  # Higher temperature for more creativity
)

# Define the state structure for the question generator agent
class QuestionGeneratorState(TypedDict):
    topic_id: int
    topic_name: str
    difficulty: str
    existing_problem_id: Optional[int]  # Optional existing problem to use as inspiration
    diversity_factor: Optional[float]   # Add this field
    generated_problem: Optional[Dict[str, Any]]
    validation_result: Optional[Dict[str, bool]]
    stored_problem_id: Optional[int]
    error: Optional[str]

def generate_problem_prompt(topic_name: str, difficulty: str, existing_problem: Optional[Dict[str, Any]] = None, diversity_factor: float = 0.5):
    """Create the prompt for generating a new problem"""
    
    # Base system prompt
    system_prompt = f"""You are an expert problem creator for a programming practice platform.
        You will create a new problem for the topic "{topic_name}" at {difficulty} difficulty level.

        The problem should:
        1. Be challenging but solvable for someone studying {topic_name}
        2. Require understanding of key concepts in {topic_name}
        3. Include a clear problem description using proper Markdown
        4. Have well-defined test cases with clear examples

        MARKDOWN FORMATTING GUIDELINES:
        - Use inline code formatting with backticks for code elements, variable names, and values: `variable_name`, `function()`, `value`
        - Use asterisks for emphasis: *italics* for important points and **bold** for critical information
        - You can use standard Markdown for lists, paragraphs, and code blocks
        - For mathematical expressions, use LaTeX notation within dollar signs: $O(n)$ for mathematical notation
        - DO use proper whitespace and line breaks for readability

        CONSTRAINTS FORMATTING GUIDELINES:
        - Format constraints as simple newline-separated text
        - DO NOT use bullet points, asterisks, or any Markdown formatting in constraints
        - For array length constraints, use format: 1 <= nums.length <= 10^5
        - For element range constraints, use format: -10^9 <= nums[i] <= 10^9
        - For example:
          1 <= nums.length <= 10^5
          -10^9 <= nums[i] <= 10^9
          -10^9 <= target <= 10^9

        CRITICAL: For the examples, both input_data and expected_output must be proper JSON objects/dictionaries, not arrays or strings. 
        For array inputs, use a dictionary with a key like "nums" or "values" that contains the array.

        Examples of correct format:
        - For array problems: 
          input_data: {{"nums": [1, 2, 3, 4]}}
          expected_output: 10
          
        - For string problems:
          input_data: {{"s": "hello"}}
          expected_output: "olleh"
        
        - For multiple parameters:
          input_data: {{"nums": [1, 2, 3], "target": 5}}
          expected_output: [1, 2]

        Format your response strictly as a JSON object with these fields:
        - title: A concise, descriptive title
        - description: The full problem statement with proper Markdown formatting
        - constraints: Input/output constraints as simple newline-separated text (NOT markdown, NO bullet points)
        - function_name: The name of the function to implement (use snake_case for Python)
        - examples: Array of objects with input_data (dictionary), expected_output, and explanation fields
        - starter_code: Basic Python function definition to get students started
        - time_complexity: Big O notation as a string (e.g., "O(n)")
        - space_complexity: Big O notation as a string (e.g., "O(1)")

        Format your starter code as a class named 'Solution' with a method using the function_name:
    
        ```python
        class Solution:
            def function_name(self, param1, param2):
                # Write your code here
                pass
        ```

        Do not include any text outside of the JSON object.
        """

    # Modify the prompt based on diversity factor
    if diversity_factor > 0.7:
        system_prompt += f"""
        You MUST create a problem that is SUBSTANTIALLY DIFFERENT from any typical {topic_name} problem.
        Use unusual scenarios, rare algorithmic approaches, or creative twists on standard problems.
        Focus on:
        - Using novel problem scenarios not commonly seen in coding problems
        - Requiring a different algorithmic approach than standard {topic_name} problems
        - Embedding the core concept in an unexpected application
        """
    elif diversity_factor > 0.4:
        system_prompt += f"""
        Try to create a problem that approaches {topic_name} from a somewhat different angle than standard problems.
        Consider using slightly unusual scenarios or alternative applications of core concepts.
        """

    # If we have an existing problem, add it as inspiration
    if existing_problem:
        system_prompt += f"""
        For inspiration, here's a similar problem:
        Title: {existing_problem.get('title', '')}
        Description: {existing_problem.get('description', '')}

        Create a DIFFERENT problem, not just a variation of this one. Use completely different scenarios and approaches.
        """

    # Human prompt to specify the generation
    human_prompt = f"""Generate a {difficulty} difficulty problem about {topic_name}. 
    
    IMPORTANT: 
    1. Make sure all example input_data is a JSON object/dictionary, not a string or array. 
    For array inputs, use format: {{"nums": [1, 2, 3]}} not "[1, 2, 3]".
    
    2. For constraints, use ONLY simple newline-separated text - NO bullet points, NO markdown:
    Example:
    1 <= nums.length <= 10^5
    -10^9 <= nums[i] <= 10^9
    -10^9 <= target <= 10^9
    """
    
    return system_prompt, human_prompt

def validate_problem(problem_data: Dict[str, Any]) -> Dict[str, bool]:
    """Validate the generated problem for completeness and correctness"""
    print("Problem data:", problem_data)
    validation = {
        "has_title": len(problem_data.get("title", "")) > 5,
        "has_description": len(problem_data.get("description", "")) > 50,
        "has_function_name": bool(problem_data.get("function_name")),
        "has_examples": len(problem_data.get("examples", [])) >= 2,
        "has_starter_code": bool(problem_data.get("starter_code")),
        "has_complexities": bool(problem_data.get("time_complexity")) and bool(problem_data.get("space_complexity")),
        "has_constraints": bool(problem_data.get("constraints", ""))
    }
    
    # Check if function name appears in starter code
    function_name = problem_data.get("function_name", "")
    starter_code = problem_data.get("starter_code", "")
    
    validation["function_name_matches"] = (
        function_name in starter_code and 
        "def " + function_name in starter_code
    )
    
    # Check for code formatting in description
    description = problem_data.get("description", "")
    validation["has_markdown_formatting"] = "`" in description
    
    # Validate example format - ensure input_data is a dictionary, not a string or list
    examples_valid = True
    for example in problem_data.get("examples", []):
        input_data = example.get("input_data", {})
        if not isinstance(input_data, dict):
            try:
                # If it's a string representation of JSON, try to convert it
                if isinstance(input_data, str):
                    # Use a separate helper function to handle any conversion
                    fixed_input = _fix_input_format(input_data)
                    if fixed_input:
                        example["input_data"] = fixed_input
                    else:
                        examples_valid = False
                else:
                    examples_valid = False
            except Exception:
                examples_valid = False
    
    validation["examples_have_valid_format"] = examples_valid
    
    return validation

def _fix_input_format(input_str):
    """Safely convert string representations to proper dictionary format"""
    try:
        if input_str.startswith('[') and input_str.endswith(']'):
            # Convert array string to dictionary with "nums" key
            array_data = json.loads(input_str)
            return {"nums": array_data}
        elif input_str.startswith('{') and input_str.endswith('}'):
            # It's already a dictionary string, just parse it
            return json.loads(input_str)
        else:
            # Simple string value
            return {"value": input_str}
    except:
        # If anything goes wrong, return None to indicate failure
        return None

def store_problem_in_db(db: Session, problem_data: Dict[str, Any], topic_id: int) -> tuple[int, List[str]]:
    """Store the generated problem and its test cases in the database"""
    try:
        # Extract difficulty from string to enum
        difficulty_map = {
            "Easy": DifficultyLevel.EASY,
            "Medium": DifficultyLevel.MEDIUM,
            "Hard": DifficultyLevel.HARD
        }
        difficulty = difficulty_map.get(problem_data.get("difficulty", "Easy"), DifficultyLevel.EASY)
        
        # Create new problem
        new_problem = Problem(
            title=problem_data["title"],
            description=problem_data["description"],
            constraints=problem_data["constraints"],
            starter_code=problem_data["starter_code"],
            function_name=problem_data["function_name"],
            difficulty=difficulty,
            is_ai_generated=True,
            is_profiling_problem=False  # AI-generated problems not used for profiling by default
        )
        
        # Add topic relationship
        topic_names = []
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        if topic:
            new_problem.topics.append(topic)
            topic_names.append(topic.name)
        
        db.add(new_problem)
        db.flush()  # Get the new problem ID
        
        # Create test cases and examples from the problem data
        for i, example in enumerate(problem_data.get("examples", [])):
            # Create test case
            test_case = TestCase(
                problem_id=new_problem.id,
                input_data=example["input_data"],
                expected_output=example["expected_output"],
                order_sensitive=True  # Default
            )
            
            db.add(test_case)
            db.flush()  # Get the test case ID
            
            # Create example linking to test case
            example_obj = Example(
                problem_id=new_problem.id,
                test_case_id=test_case.id,
                explanation=example["explanation"]
            )
            
            db.add(example_obj)
        
        # Commit changes
        db.commit()
        
        return new_problem.id, topic_names
    except Exception as e:
        db.rollback()
        logger.error(f"Error storing problem: {e}")
        raise

# Agent nodes
def select_topic_and_difficulty(state: QuestionGeneratorState):
    """Select or validate topic and difficulty for problem generation"""
    # If topic_id and difficulty are already set, just pass through
    if state.get("topic_id") and state.get("difficulty"):
        db = SessionLocal()
        try:
            # Get topic name for the topic_id
            topic = db.query(Topic).filter(Topic.id == state["topic_id"]).first()
            if topic:
                return {
                    **state,
                    "topic_name": topic.name
                }
            else:
                return {
                    **state,
                    "error": f"Topic with ID {state['topic_id']} not found"
                }
        finally:
            db.close()
    
    # This shouldn't happen as we expect topic_id and difficulty to be provided
    return {
        **state,
        "error": "Topic ID and difficulty must be provided"
    }

def clean_constraints(constraints_text):
    """
    Clean constraints text from the AI to ensure proper rendering in the frontend.
    Removes bullet points and other formatting that might cause rendering issues.
    """
    if not constraints_text:
        return ""
    
    # Split by newlines or bullet points
    if '\n' in constraints_text:
        lines = constraints_text.split('\n')
    else:
        # Handle potential bullet points or other separators
        lines = constraints_text.split('• ')
    
    # Clean each line
    cleaned_lines = []
    for line in lines:
        # Remove leading/trailing whitespace
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
            
        # Remove bullet points, asterisks, dashes that might be at start of line
        line = line.lstrip('•*-– \t')
        line = line.strip()
        
        # Remove any JSON-like formatting that might be present (quotes, braces)
        line = line.strip('"\'{}')
        
        # Add to cleaned lines if not empty
        if line:
            cleaned_lines.append(line)
    
    # Join with newlines
    return '\n'.join(cleaned_lines)

def generate_problem(state: QuestionGeneratorState):
    """Generate a new problem based on topic and difficulty"""
    if state.get("error"):
        return state
    
    topic_name = state["topic_name"]
    difficulty = state["difficulty"]
    diversity_factor = state.get("diversity_factor", 0.5)  # Get the diversity factor
    existing_problem = None
    
    # If we have an existing problem ID for inspiration, get its details
    if state.get("existing_problem_id"):
        db = SessionLocal()
        try:
            problem = db.query(Problem).filter(Problem.id == state["existing_problem_id"]).first()
            if problem:
                existing_problem = {
                    "title": problem.title,
                    "description": problem.description
                }
        finally:
            db.close()
    
    # Generate the prompt
    system_prompt, human_prompt = generate_problem_prompt(topic_name, difficulty, existing_problem, diversity_factor)
    
    try:
        # Call the LLM to generate the problem
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        # Adjust temperature based on diversity factor
        adjusted_temperature = 0.2 + (diversity_factor * 0.6)  # Maps 0->0.2 and 1->0.8
        response = chat_model(messages, temperature=adjusted_temperature)
        
        # Extract the JSON from the response
        json_match = re.search(r'```json\s*(.*?)\s*```', response.content, re.DOTALL)
        
        if json_match:
            json_str = json_match.group(1)
        else:
            # If no code block, try to use the entire response
            json_str = response.content
        
        try:
            # Parse the JSON
            problem_data = json.loads(json_str)
            
            # Add the difficulty to the problem data
            problem_data["difficulty"] = difficulty
            
            # Clean the constraints format
            if "constraints" in problem_data:
                problem_data["constraints"] = clean_constraints(problem_data["constraints"])
            
            return {
                **state,
                "generated_problem": problem_data
            }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response content: {response.content}")
            return {
                **state,
                "error": f"Failed to parse problem JSON: {str(e)}"
            }
            
    except Exception as e:
        logger.error(f"Error generating problem: {e}")
        return {
            **state,
            "error": f"Failed to generate problem: {str(e)}"
        }

def validate_generated_problem(state: QuestionGeneratorState):
    """Validate the generated problem"""
    if state.get("error") or not state.get("generated_problem"):
        return state
    
    validation_result = validate_problem(state["generated_problem"])
    
    # Check if validation passed
    validation_passed = all(validation_result.values())
    
    if not validation_passed:
        return {
            **state,
            "validation_result": validation_result,
            "error": "Problem validation failed: " + ", ".join(
                [k for k, v in validation_result.items() if not v]
            )
        }
    
    return {
        **state,
        "validation_result": validation_result
    }

def store_problem(state: QuestionGeneratorState):
    """Store the validated problem in the database"""
    if state.get("error") or not state.get("generated_problem"):
        return state
    
    try:
        db = SessionLocal()
        try:
            problem_id, topic_list = store_problem_in_db(
                db, 
                state["generated_problem"], 
                state["topic_id"]
            )
            
            # Create embedding for the new problem
            try:
                embedding_result = create_embedding_after_generation(problem_id)
                if not embedding_result.get("success", False):
                    print(f"Warning: Failed to create embedding: {embedding_result.get('error', 'Unknown error')}")
            except Exception as embed_error:
                # Don't fail the entire process if embedding creation fails
                print(f"Error creating embedding: {str(embed_error)}")
            
            # Add problem_id to the generated_problem
            updated_problem = {
                **state["generated_problem"],
                "problem_id": problem_id,
                "id": problem_id,  # For backward compatibility
                "topics": topic_list
            }
            
            return {
                **state,
                "stored_problem_id": problem_id,
                "generated_problem": updated_problem
            }
        finally:
            db.close()
    except Exception as e:
        return {
            **state,
            "error": f"Failed to store problem: {str(e)}"
        }

# Create the LangGraph for the Question Generator Agent
def create_question_generator_graph():
    """Create and return the Question Generator agent graph"""
    # Initialize the graph
    graph_builder = StateGraph(QuestionGeneratorState)
    
    # Add nodes
    graph_builder.add_node("select_topic_and_difficulty", select_topic_and_difficulty)
    graph_builder.add_node("generate_problem", generate_problem)
    graph_builder.add_node("validate_generated_problem", validate_generated_problem)
    graph_builder.add_node("store_problem", store_problem)
    
    # Define the flow
    graph_builder.add_edge(START, "select_topic_and_difficulty")
    graph_builder.add_edge("select_topic_and_difficulty", "generate_problem")
    graph_builder.add_edge("generate_problem", "validate_generated_problem")
    graph_builder.add_edge("validate_generated_problem", "store_problem")
    graph_builder.add_edge("store_problem", END)
    
    # Compile the graph with memory checkpointing
    return graph_builder.compile(checkpointer=memory)

# Initialize the graph
question_generator_graph = create_question_generator_graph()

# Function to invoke the agent
def generate_new_problem(
    topic_id: int, 
    difficulty: str = "Easy", 
    existing_problem_id: Optional[int] = None,
    diversity_factor: float = 0.5
) -> Dict[str, Any]:
    """
    Generate a new problem based on topic/difficulty, store it, return final data.
    """
    # 1) Initialize state
    initial_state = {
        "topic_id": topic_id,
        "difficulty": difficulty,
        "existing_problem_id": existing_problem_id,
        "diversity_factor": diversity_factor,
        "topic_name": "",
        "generated_problem": None,
        "validation_result": None,
        "stored_problem_id": None,
        "error": None
    }
    
    # 2) Run the question_generator_graph
    config = {"configurable": {"thread_id": f"problem_generation_{uuid.uuid4()}"}}
    result = question_generator_graph.invoke(initial_state, config=config)
    
    # 3) Check errors
    if result.get("error"):
        return {
            "success": False,
            "error": result["error"]
        }
    
    # 4) Return final data from the pipeline
    # By now, result["generated_problem"] already includes "topics"
    return {
        "success": True,
        "problem_id": result["stored_problem_id"],
        "problem_data": {
            **result["generated_problem"],
            "problem_id": result["stored_problem_id"],
            "id": result["stored_problem_id"]   # for backward compatibility
        }
    }
