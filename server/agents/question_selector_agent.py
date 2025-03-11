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
    force_generation: bool = False,
    avoid_similar_content: bool = True  # New parameter
) -> Dict[str, Any]:
    """
    Enhanced problem selection with semantic similarity avoidance
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
        
        # Step 1: Get candidate problems
        query = db.query(Problem).filter(
            Problem.topics.any(Topic.id == topic_id),
            Problem.difficulty == difficulty_enum
        )
        
        # Exclude explicitly avoided problems
        if avoided_problem_ids:
            query = query.filter(~Problem.id.in_(avoided_problem_ids))
        
        candidate_problems = query.all()
        
        # Step 2: If avoiding similar content, filter further based on title and content
        if avoid_similar_content and len(avoided_problem_ids) > 0:
            # Get the recent problems to compare against
            recent_problems = db.query(Problem).filter(
                Problem.id.in_(avoided_problem_ids[-3:])  # Compare against last 3 problems
            ).all()
            
            filtered_candidates = []
            for candidate in candidate_problems:
                # Skip if title contains similar keywords to recent problems
                should_skip = False
                for recent in recent_problems:
                    # Simple keyword-based similarity check (enhance with embeddings for better results)
                    candidate_keywords = set(candidate.title.lower().split())
                    recent_keywords = set(recent.title.lower().split())
                    
                    # If >40% of keywords match, consider it similar
                    if len(candidate_keywords.intersection(recent_keywords)) / max(1, len(candidate_keywords)) > 0.4:
                        should_skip = True
                        break
                
                if not should_skip:
                    filtered_candidates.append(candidate)
            
            candidate_problems = filtered_candidates
        
        # If no suitable candidates or forced to generate, create a new problem
        if force_generation or not candidate_problems:
            # Generate a new problem with higher diversity
            result = generate_new_problem(
                topic_id=topic_id, 
                difficulty=difficulty,
                diversity_factor=0.8  # Higher diversity for different problem types
            )
            
            if result.get("success", False):
                problem_data = result["problem_data"]
                problem_data["problem_id"] = result["problem_id"]
                problem_data["id"] = result["problem_id"]  # Add id for backward compatibility
                return {"success": True, "problem": problem_data}
            else:
                return {
                    "success": False, 
                    "errors": [f"Failed to generate problem: {result.get('error', 'Unknown error')}"]
                }
        
        # Select a problem randomly from candidates
        selected_problem = random.choice(candidate_problems)
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
        
        # Clean the title to remove any leading dots
        clean_title = problem.title.lstrip('. ')
        
        # Create complete problem object
        complete_problem = {
            "problem_id": problem.id,  # Ensure problem_id is set
            "id": problem.id,  # Include id as well for backward compatibility
            "title": clean_title,  # Use the cleaned title
            "description": problem.description,
            "difficulty": problem.difficulty.value,
            "constraints": problem.constraints,
            "starter_code": problem.starter_code,
            "function_name": problem.function_name,
            "topics": [topic.name for topic in problem.topics],
            "examples": examples
        }
        
        print(f"Fetched complete problem with ID: {complete_problem['problem_id']} and title: {complete_problem['title']}")
        
        return {
            "success": True,
            "problem": complete_problem
        }
    except Exception as e:
        return {
            "success": False,
            "errors": [f"Error fetching complete problem: {str(e)}"]
        }