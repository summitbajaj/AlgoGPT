import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, List, Any, Optional
from typing_extensions import TypedDict
from sqlalchemy.orm import Session
from sqlalchemy import select
from database.database import SessionLocal
from database.models import (
    Problem, Topic, StudentProfile, StudentTopicMastery, 
    TopicProgression, DifficultyLevel
)
from utils.embedding_service import find_similar_problems
import logging

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize memory checkpointing
memory = MemorySaver()

# Define the state structure for question selection agent
class QuestionSelectionState(TypedDict):
    student_id: str
    topics_to_focus: List[Dict[str, Any]]  # List of topic objects with id, name, mastery_level
    difficulty_level: str
    recommended_problems: List[Dict[str, Any]]
    feedback: str  # Detailed reasoning for recommendations

# Helper functions
def get_student_topic_mastery(db: Session, student_id: str) -> List[Dict[str, Any]]:
    """Fetch the student's topic mastery information"""
    # Get the student profile
    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == student_id
    ).first()
    
    if not student_profile:
        return []
    
    # Get topic mastery data
    mastery_data = db.query(
        Topic.id,
        Topic.name,
        StudentTopicMastery.mastery_level,
        StudentTopicMastery.problems_attempted,
        StudentTopicMastery.problems_solved
    ).join(
        StudentTopicMastery,
        StudentTopicMastery.topic_id == Topic.id
    ).filter(
        StudentTopicMastery.student_profile_id == student_profile.id
    ).all()
    
    return [
        {
            "id": row[0],
            "name": row[1],
            "mastery_level": row[2],
            "problems_attempted": row[3],
            "problems_solved": row[4]
        }
        for row in mastery_data
    ]

def get_recommended_difficulty(topic_mastery: List[Dict[str, Any]]) -> str:
    """Determine the appropriate difficulty level based on student performance"""
    if not topic_mastery:
        return "Easy"
    
    avg_mastery = sum(topic["mastery_level"] for topic in topic_mastery) / len(topic_mastery)
    
    if avg_mastery < 0.3:
        return "Easy"
    elif avg_mastery < 0.7:
        return "Medium"
    else:
        return "Hard"

def find_problems_by_topic_and_difficulty(
    db: Session, 
    topic_id: int, 
    difficulty: str,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """Find problems matching given topic and difficulty"""
    problems = db.query(Problem).join(
        Problem.topics
    ).filter(
        Topic.id == topic_id,
        Problem.difficulty == difficulty
    ).limit(limit).all()
    
    return [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "difficulty": p.difficulty.value,
            "function_name": p.function_name,
            "starter_code": p.starter_code
        }
        for p in problems
    ]

def get_next_topics_in_progression(db: Session, mastered_topic_ids: List[int]) -> List[Dict[str, Any]]:
    """Get the next topics in the progression based on mastered topics"""
    if not mastered_topic_ids:
        # If no topics mastered, start with the very first ones
        next_topics = db.query(
            Topic.id,
            Topic.name
        ).join(
            TopicProgression,
            Topic.id == TopicProgression.topic_id
        ).filter(
            TopicProgression.prerequisite_topic_id == None
        ).all()
        
        if not next_topics:
            # Fallback if no progression data: get any topics
            next_topics = db.query(Topic.id, Topic.name).limit(3).all()
        
        return [{"id": t[0], "name": t[1]} for t in next_topics]
    
    # Find topics that have prerequisites in the mastered list
    next_topics = db.query(
        Topic.id,
        Topic.name
    ).join(
        TopicProgression,
        Topic.id == TopicProgression.topic_id
    ).filter(
        TopicProgression.prerequisite_topic_id.in_(mastered_topic_ids)
    ).all()
    
    return [{"id": t[0], "name": t[1]} for t in next_topics]

# Agent nodes
def analyze_student_profile(state: QuestionSelectionState):
    """Analyze student profile and determine focus areas"""
    student_id = state["student_id"]
    
    db = SessionLocal()
    try:
        # Get student topic mastery data
        topic_mastery = get_student_topic_mastery(db, student_id)
        
        # Determine focus topics
        if not topic_mastery:
            # New student with no mastery data - start with initial topics
            topics_to_focus = get_next_topics_in_progression(db, [])
        else:
            # Find mastered topics (mastery level > 0.7)
            mastered_topics = [t["id"] for t in topic_mastery if t["mastery_level"] > 0.7]
            
            # Find topics that need work (mastery level < 0.5)
            weak_topics = [t for t in topic_mastery if t["mastery_level"] < 0.5]
            
            if weak_topics:
                # Prioritize weak topics
                topics_to_focus = weak_topics
            else:
                # Move to next topics in progression
                topics_to_focus = get_next_topics_in_progression(db, mastered_topics)
        
        # Get recommended difficulty
        difficulty_level = get_recommended_difficulty(topic_mastery)
        
        return {
            **state,
            "topics_to_focus": topics_to_focus,
            "difficulty_level": difficulty_level
        }
    finally:
        db.close()

def select_problems(state: QuestionSelectionState):
    """Select problems based on student needs"""
    topics_to_focus = state["topics_to_focus"]
    difficulty = state["difficulty_level"]
    
    if not topics_to_focus:
        return {
            **state,
            "recommended_problems": [],
            "feedback": "No appropriate topics found to focus on."
        }
    
    db = SessionLocal()
    try:
        recommended_problems = []
        feedback = []
        
        # Get 1-2 problems for each focus topic
        for topic in topics_to_focus[:3]:  # Limit to top 3 topics
            topic_id = topic["id"]
            topic_name = topic["name"]
            
            # Get problems for this topic
            problems = find_problems_by_topic_and_difficulty(
                db, 
                topic_id, 
                difficulty,
                limit=2
            )
            
            if problems:
                recommended_problems.extend(problems)
                feedback.append(f"Selected {len(problems)} {difficulty} problems for topic '{topic_name}'")
        
        # If we don't have enough problems, find similar ones using vector search
        if len(recommended_problems) < 5 and recommended_problems:
            # Use the description of the first problem to find similar ones
            excluded_ids = [p["id"] for p in recommended_problems]
            query_text = recommended_problems[0]["description"]
            
            # Find similar problems with Azure OpenAI embeddings
            similar_problems = find_similar_problems(
                db=db,
                query_text=query_text,
                limit=5 - len(recommended_problems),
                difficulty=difficulty
            )
            
            # Filter out duplicates
            similar_problems = [p for p in similar_problems if p["id"] not in excluded_ids]
            
            if similar_problems:
                recommended_problems.extend(similar_problems)
                feedback.append(f"Added {len(similar_problems)} similar problems to supplement your learning")
        
        feedback_text = "\n".join(feedback) if feedback else "No suitable problems found."
        
        return {
            **state,
            "recommended_problems": recommended_problems,
            "feedback": feedback_text
        }
    finally:
        db.close()

# Create the LangGraph for the Question Selection Agent
def create_question_selection_graph():
    """Create and return the Question Selection agent graph"""
    # Initialize the graph
    graph_builder = StateGraph(QuestionSelectionState)
    
    # Add nodes
    graph_builder.add_node("analyze_student_profile", analyze_student_profile)
    graph_builder.add_node("select_problems", select_problems)
    
    # Define the flow
    graph_builder.add_edge(START, "analyze_student_profile")
    graph_builder.add_edge("analyze_student_profile", "select_problems")
    graph_builder.add_edge("select_problems", END)
    
    # Compile the graph with memory checkpointing
    return graph_builder.compile(checkpointer=memory)

# Initialize the graph
question_selection_graph = create_question_selection_graph()

# Function to invoke the agent
def recommend_problems_for_student(student_id: str) -> Dict[str, Any]:
    """
    Main entry point to recommend problems for a student
    
    Args:
        student_id: The ID of the student
        
    Returns:
        Dictionary with recommended problems and feedback
    """
    # Initialize state
    initial_state = {
        "student_id": student_id,
        "topics_to_focus": [],
        "difficulty_level": "Easy",
        "recommended_problems": [],
        "feedback": ""
    }
    
    # Configure the thread ID
    config = {"configurable": {"thread_id": f"question_selection_{student_id}"}}
    
    # Run the graph
    result = question_selection_graph.invoke(initial_state, config=config)
    
    return {
        "recommended_problems": result["recommended_problems"],
        "feedback": result["feedback"],
        "topics_to_focus": result["topics_to_focus"],
        "difficulty_level": result["difficulty_level"]
    }