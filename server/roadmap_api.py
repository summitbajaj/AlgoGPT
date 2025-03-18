# roadmap_api.py
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.database import SessionLocal
from database.models import Topic, Problem, problem_topics, TopicProgression
from shared_resources.schemas import RoadmapResponse, RoadmapTopicModel, TopicConnectionModel, RoadmapProblemModel, TopicListResponse

# Create router
roadmap_router = APIRouter()

# Function to register the router with the main app
def register_roadmap_api(app):
    # Remove the prefix "/api" here since your frontend is already using "/api/roadmap"
    app.include_router(roadmap_router, tags=["roadmap"])

# Get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@roadmap_router.get("/api/roadmap", response_model=RoadmapResponse)
def get_roadmap(db: Session = Depends(get_db)):
    """
    Get the complete roadmap with topics and connections.
    """
    # Get all topics
    topics_query = db.query(Topic).all()
    
    # Get topic connections from progression table
    connections_query = db.query(TopicProgression).all()
    
    # Format connections for frontend
    connections = []
    for conn in connections_query:
        if conn.prerequisite_topic_id and conn.topic_id:  # Make sure both IDs exist
            connections.append(TopicConnectionModel(
                from_id=str(conn.prerequisite_topic_id),
                to_id=str(conn.topic_id)
            ))
    
    # If there are no connections from the database, add default ones
    if not connections:
        default_connections = [
            {"from_id": "1", "to_id": "2"},  # Arrays -> Stack
            {"from_id": "1", "to_id": "3"},  # Arrays -> Two Pointers
            {"from_id": "3", "to_id": "4"},  # Two Pointers -> Binary Search
            {"from_id": "3", "to_id": "5"},  # Two Pointers -> Sliding Window
            {"from_id": "2", "to_id": "6"},  # Stack -> Linked List
            {"from_id": "3", "to_id": "6"},  # Two Pointers -> Linked List
            {"from_id": "6", "to_id": "7"},  # Linked List -> Trees
            {"from_id": "4", "to_id": "7"},  # Binary Search -> Trees
            {"from_id": "5", "to_id": "7"},  # Sliding Window -> Trees
            {"from_id": "7", "to_id": "8"},  # Trees -> Tries
            {"from_id": "7", "to_id": "9"},  # Trees -> Heap
            {"from_id": "7", "to_id": "14"}, # Trees -> Graphs
            {"from_id": "7", "to_id": "13"}, # Trees -> Backtracking
            {"from_id": "7", "to_id": "15"}, # Trees -> 1-D DP
            {"from_id": "8", "to_id": "10"}, # Tries -> Intervals
            {"from_id": "9", "to_id": "11"}, # Heap -> Greedy
            {"from_id": "14", "to_id": "12"}, # Graphs -> Advanced Graphs
            {"from_id": "12", "to_id": "16"}, # Advanced Graphs -> 2-D DP
            {"from_id": "15", "to_id": "16"}, # 1-D DP -> 2-D DP
            {"from_id": "15", "to_id": "17"}, # 1-D DP -> Bit Manipulation
            {"from_id": "16", "to_id": "18"}, # 2-D DP -> Math & Geometry
            {"from_id": "17", "to_id": "18"}, # Bit Manipulation -> Math & Geometry
        ]
        for conn in default_connections:
            connections.append(TopicConnectionModel(**conn))
    
    # Process topics and count questions per topic
    result_topics = []
    
    for topic in topics_query:
        # Count questions in this topic
        question_count = db.query(func.count(problem_topics.c.problem_id)).\
            join(Problem, Problem.id == problem_topics.c.problem_id).\
            filter(problem_topics.c.topic_id == topic.id).\
            scalar()
        
        # Create topic response with default positions (will be calculated in frontend)
        topic_response = RoadmapTopicModel(
            id=str(topic.id),
            text=topic.name,
            x=0,  # Default value, will be calculated in frontend
            y=0,  # Default value, will be calculated in frontend
            questions=[],  # Will be populated below
            total=question_count,
            has_questions=question_count > 0
        )
        
        # If there are questions for this topic, populate them
        if question_count > 0:
            problems = db.query(Problem).\
                join(problem_topics).\
                filter(problem_topics.c.topic_id == topic.id).\
                all()
                
            for problem in problems:
                topic_response.questions.append(RoadmapProblemModel(
                    id=str(problem.id),
                    title=problem.title,
                    difficulty=problem.difficulty.value
                ))
        
        result_topics.append(topic_response)
    
    return RoadmapResponse(
        topics=result_topics,
        connections=connections
    )

@roadmap_router.get("/api/topics", response_model=TopicListResponse)
def get_topics(db: Session = Depends(get_db)):
    """
    Get list of all topics with question counts.
    """
    topics_query = db.query(Topic).all()
    result_topics = []
    
    for topic in topics_query:
        # Count questions in this topic
        question_count = db.query(func.count(problem_topics.c.problem_id)).\
            join(Problem, Problem.id == problem_topics.c.problem_id).\
            filter(problem_topics.c.topic_id == topic.id).\
            scalar()
        
        # Create topic response
        topic_response = RoadmapTopicModel(
            id=str(topic.id),
            text=topic.name,
            x=0,  # Position doesn't matter for list view
            y=0,
            questions=[],  # Not including individual questions here
            total=question_count,
            has_questions=question_count > 0
        )
        
        result_topics.append(topic_response)
    
    return TopicListResponse(
        topics=result_topics
    )