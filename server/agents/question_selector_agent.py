from typing import Dict, List, Any, Optional
import uuid
import random
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.database import SessionLocal
from database.models import Problem, Topic, TestCase, Example, DifficultyLevel, ProblemEmbedding
from agents.question_generator_agent import generate_new_problem
import numpy as np
from pgvector.sqlalchemy import Vector

def select_problem(
    topic_id: int,
    difficulty: str = "Easy",
    avoided_problem_ids: List[int] = None,
    is_profiling: bool = False,
    student_id: str = None,
    force_generation: bool = False
) -> Dict[str, Any]:
    """
    Hybrid problem selection - uses vector embeddings to find similar problems
    or generates new ones when needed.
    
    Args:
        topic_id: ID of the topic
        difficulty: Difficulty level ("Easy", "Medium", or "Hard")
        avoided_problem_ids: IDs of problems to avoid
        is_profiling: Whether this is for profiling or regular practice
        student_id: ID of the student (optional)
        force_generation: Whether to force generation of a new problem
        
    Returns:
        Selected problem or error information
    """
    if avoided_problem_ids is None:
        avoided_problem_ids = []
    
    db = SessionLocal()
    try:
        # Map difficulty string to enum
        difficulty_map = {
            "Easy": DifficultyLevel.EASY,
            "Medium": DifficultyLevel.MEDIUM,
            "Hard": DifficultyLevel.HARD
        }
        difficulty_enum = difficulty_map.get(difficulty, DifficultyLevel.EASY)
        
        # Get topic for reference
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        if not topic:
            return {
                "success": False,
                "errors": [f"Topic with ID {topic_id} not found"]
            }
        
        # Step 1: Try vector database first for semantic matching
        vector_problems = find_similar_problems_via_embeddings(
            db, 
            topic_id, 
            difficulty_enum, 
            avoided_problem_ids
        )
        
        # Step 2: If vector search fails or returns no results, try direct SQL query
        if not vector_problems:
            sql_problems = find_problems_via_sql(
                db, 
                topic_id, 
                difficulty_enum, 
                avoided_problem_ids
            )
            candidate_problems = sql_problems
        else:
            candidate_problems = vector_problems
        
        # Step 3: Decide whether to use existing problem or generate new
        # Use force_generation parameter or strategy decision
        should_generate_new = force_generation or decide_generation_strategy(
            candidate_problems,
            is_profiling
        )
        
        # Step 4: Either select existing problem or generate new one
        if should_generate_new:
            result = generate_new_problem_with_fallback(
                db, 
                topic_id, 
                difficulty, 
                candidate_problems
            )
            return result
        else:
            # Use an existing problem
            selected_problem = select_best_problem(candidate_problems)
            return fetch_complete_problem(db, selected_problem.id)
    
    except Exception as e:
        return {
            "success": False,
            "errors": [f"Error selecting problem: {str(e)}"]
        }
    finally:
        db.close()

def find_similar_problems_via_embeddings(
    db: Session, 
    topic_id: int, 
    difficulty: DifficultyLevel,
    avoided_problem_ids: List[int]
) -> List[Problem]:
    """
    Find problems using vector embeddings for semantic similarity.
    
    This function attempts to find problems with embeddings that are 
    similar to the concept represented by the topic.
    """
    try:
        # Try to get topic embedding (assuming you have this)
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        
        # Join problems with their embeddings
        problems_with_embeddings = (
            db.query(Problem)
            .join(ProblemEmbedding, Problem.id == ProblemEmbedding.problem_id)
            .filter(Problem.topics.any(Topic.id == topic_id))
            .filter(Problem.difficulty == difficulty)
        )
        
        # Exclude already seen problems
        if avoided_problem_ids:
            problems_with_embeddings = problems_with_embeddings.filter(
                ~Problem.id.in_(avoided_problem_ids)
            )
        
        # Get all matching problems
        return problems_with_embeddings.all()
    
    except Exception as e:
        # If vector search fails for any reason, return empty list and fall back to SQL
        return []

def find_problems_via_sql(
    db: Session, 
    topic_id: int, 
    difficulty: DifficultyLevel,
    avoided_problem_ids: List[int]
) -> List[Problem]:
    """
    Find problems using direct SQL query without embeddings.
    """
    query = db.query(Problem).filter(
        Problem.topics.any(Topic.id == topic_id),
        Problem.difficulty == difficulty
    )
    
    # Exclude already seen problems
    if avoided_problem_ids:
        query = query.filter(~Problem.id.in_(avoided_problem_ids))
    
    return query.all()

def decide_generation_strategy(
    candidate_problems: List[Problem],
    is_profiling: bool
) -> bool:
    """
    Decide whether to generate a new problem or use an existing one.
    """
    # If no candidates, must generate new
    if not candidate_problems:
        return True
    
    # For profiling sessions, we should prioritize generating new problems
    # to give a varied assessment experience
    if is_profiling:
        # Always generate new problems during profiling
        return True
    
    # Regular logic for non-profiling sessions
    if len(candidate_problems) < 3:
        return random.random() < 0.4
    else:
        return random.random() < 0.2

def generate_new_problem_with_fallback(
    db: Session,
    topic_id: int,
    difficulty: str,
    fallback_problems: List[Problem]
) -> Dict[str, Any]:
    """
    Generate a new problem, with fallback to existing problems if generation fails.
    """
    # Find any problem in this topic for inspiration
    inspiration_problem = db.query(Problem).filter(
        Problem.topics.any(Topic.id == topic_id)
    ).first()
    
    inspiration_id = inspiration_problem.id if inspiration_problem else None
    
    # Generate a new problem
    result = generate_new_problem(
        topic_id=topic_id,
        difficulty=difficulty,
        existing_problem_id=inspiration_id
    )
    
    if not result.get("success", False) and result.get("error"):
        if fallback_problems:
            selected_problem = random.choice(fallback_problems)
            return fetch_complete_problem(db, selected_problem.id)
        else:
            return {
                "success": False,
                "errors": [f"Failed to generate problem: {result.get('error', 'Unknown error')}"]
            }
    
    # Successfully generated a new problem
    generated_problem_id = result["problem_id"]
    return fetch_complete_problem(db, generated_problem_id)

def select_best_problem(candidate_problems: List[Problem]) -> Problem:
    """
    Select the best problem from candidates.
    Currently uses random selection, but could be enhanced with more logic.
    """
    return random.choice(candidate_problems)

def fetch_complete_problem(db: Session, problem_id: int) -> Dict[str, Any]:
    """
    Fetch complete problem details including examples.
    
    Args:
        db: Database session
        problem_id: ID of the problem to fetch
        
    Returns:
        Complete problem data
    """
    try:
        # Query the complete problem with examples
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        
        if not problem:
            return {
                "success": False,
                "errors": [f"Problem with ID {problem_id} not found"]
            }
        
        # Get examples
        examples = []
        for example in problem.examples:
            test_case = example.test_case
            examples.append({
                "test_case_id": test_case.id,
                "input_data": test_case.input_data,
                "expected_output": test_case.expected_output,
                "explanation": example.explanation
            })
        
        # Create complete problem object
        complete_problem = {
            "problem_id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "difficulty": problem.difficulty.value,
            "constraints": problem.constraints,
            "starter_code": problem.starter_code,
            "function_name": problem.function_name,
            "topics": [topic.name for topic in problem.topics],
            "examples": examples
        }
        
        return {
            "success": True,
            "problem": complete_problem
        }
    except Exception as e:
        return {
            "success": False,
            "errors": [f"Error fetching complete problem: {str(e)}"]
        }