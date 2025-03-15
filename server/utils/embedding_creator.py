from typing import Dict, Any, Optional
import os
from sqlalchemy.orm import Session
from database.models import Problem, ProblemEmbedding
from database.database import SessionLocal
import numpy as np
from pgvector.sqlalchemy import Vector
from langchain_openai import AzureOpenAIEmbeddings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize embeddings model
embedding_model = AzureOpenAIEmbeddings(
    azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    api_version=os.getenv("AZURE_OPENAI_VERSION")
)

def create_problem_embedding(problem_id: int) -> Dict[str, Any]:
    """
    Create and store an embedding for a problem.
    This should be called whenever a new problem is created.
    
    Args:
        problem_id: ID of the problem to create an embedding for
        
    Returns:
        Result of the embedding creation
    """
    db = SessionLocal()
    try:
        # Get the problem
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            return {
                "success": False,
                "error": f"Problem with ID {problem_id} not found"
            }
        
        # Check if embedding already exists
        existing_embedding = db.query(ProblemEmbedding).filter(
            ProblemEmbedding.problem_id == problem_id
        ).first()
        
        if existing_embedding:
            return {
                "success": True,
                "message": f"Embedding for problem {problem_id} already exists"
            }
        
        # Create text to embed (combine relevant problem fields)
        embedding_text = f"""
        Title: {problem.title}
        Description: {problem.description}
        Difficulty: {problem.difficulty.value}
        Topics: {', '.join([topic.name for topic in problem.topics])}
        Constraints: {problem.constraints}
        """
        
        # Generate embedding
        embedding_vector = embedding_model.embed_query(embedding_text)
        
        # Store embedding in database
        new_embedding = ProblemEmbedding(
            problem_id=problem_id,
            embedding=embedding_vector
        )
        
        db.add(new_embedding)
        db.commit()
        
        return {
            "success": True,
            "message": f"Created embedding for problem {problem_id}"
        }
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "error": f"Error creating embedding: {str(e)}"
        }
    finally:
        db.close()

def update_embedding_for_problem(problem_id: int) -> Dict[str, Any]:
    """
    Update the embedding for an existing problem.
    Call this when a problem's content is updated.
    
    Args:
        problem_id: ID of the problem to update embedding for
        
    Returns:
        Result of the embedding update
    """
    db = SessionLocal()
    try:
        # Delete existing embedding
        db.query(ProblemEmbedding).filter(
            ProblemEmbedding.problem_id == problem_id
        ).delete()
        
        db.commit()
        
        # Create new embedding
        return create_problem_embedding(problem_id)
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "error": f"Error updating embedding: {str(e)}"
        }
    finally:
        db.close()

# Function to integrate with the question generator
def create_embedding_after_generation(problem_id: int) -> None:
    """
    Create an embedding after a problem is generated.
    This should be called by the question generator after a problem is created.
    
    Args:
        problem_id: ID of the newly created problem
    """
    result = create_problem_embedding(problem_id)
    if not result.get("success", False):
        print(f"Warning: Failed to create embedding: {result.get('error', 'Unknown error')}")