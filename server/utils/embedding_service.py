import os
from dotenv import load_dotenv
from langchain_openai import AzureOpenAIEmbeddings
from sqlalchemy.orm import Session
from sqlalchemy import select
from database.database import SessionLocal
from database.models import Problem, ProblemEmbedding
import logging
from tqdm import tqdm

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Azure OpenAI embeddings
embeddings = AzureOpenAIEmbeddings(
    azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    api_version=os.getenv("AZURE_OPENAI_VERSION")
)

def generate_embedding(text):
    """Generate an embedding vector using LangChain with Azure OpenAI"""
    try:
        # LangChain embeddings return numpy arrays
        embedding_vector = embeddings.embed_query(text)
        return embedding_vector
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return None

def generate_problem_embedding(db: Session, problem_id: int):
    """Generate and store embedding for a specific problem"""
    # Get the problem
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    
    if not problem:
        logger.error(f"Problem ID {problem_id} not found")
        return False
    
    # Generate embedding from problem description
    embedding_text = f"{problem.title} {problem.description}"
    embedding = generate_embedding(embedding_text)
    
    if not embedding:
        return False
    
    # Store or update embedding
    problem_embedding = db.query(ProblemEmbedding).filter(ProblemEmbedding.problem_id == problem_id).first()
    
    if problem_embedding:
        problem_embedding.embedding = embedding
    else:
        problem_embedding = ProblemEmbedding(
            problem_id=problem_id,
            embedding=embedding
        )
        db.add(problem_embedding)
    
    db.commit()
    logger.info(f"Embedding generated and stored for problem ID {problem_id}")
    return True

def find_similar_problems(db: Session, query_text: str, limit: int = 5, difficulty: str = None):
    """
    Find semantically similar problems using pgvector with LangChain embeddings
    
    This uses direct SQL queries with pgvector operators since the PGVector
    collection approach requires a different setup
    """
    # Generate embedding for query
    query_embedding = generate_embedding(query_text)
    
    if not query_embedding:
        return []
    
    try:
        # Build query with cosine distance
        query = """
        SELECT p.id, p.title, p.description, p.difficulty, p.function_name, p.starter_code,
               1 - (pe.embedding <=> :embedding) as similarity
        FROM problem_embeddings pe
        JOIN problems p ON p.id = pe.problem_id
        WHERE 1=1
        """
        
        params = {"embedding": query_embedding}
        
        # Add difficulty filter if provided
        if difficulty:
            query += " AND p.difficulty = :difficulty"
            params["difficulty"] = difficulty
        
        # Add ordering and limit
        query += """
        ORDER BY pe.embedding <=> :embedding
        LIMIT :limit
        """
        params["limit"] = limit
        
        # Execute query
        result = db.execute(query, params)
        
        # Process results
        problems = []
        for row in result:
            problems.append({
                "id": row[0],
                "title": row[1],
                "description": row[2],
                "difficulty": row[3],
                "function_name": row[4],
                "starter_code": row[5],
                "similarity": float(row[6])
            })
        
        return problems
    except Exception as e:
        logger.error(f"Error in similarity search: {e}")
        return []

def initialize_selective_embeddings():
    """Initialize embeddings only for profiling and AI-generated problems"""
    db = SessionLocal()
    try:
        # Get only profiling/AI-generated problems without embeddings
        stmt = select(Problem.id).outerjoin(
            ProblemEmbedding, 
            Problem.id == ProblemEmbedding.problem_id
        ).where(
            ProblemEmbedding.problem_id == None,
            (Problem.is_profiling_problem == True) | (Problem.is_ai_generated == True)
        )
        
        problems_without_embeddings = db.execute(stmt).scalars().all()
        
        if not problems_without_embeddings:
            logger.info("All profiling/AI-generated problems already have embeddings")
            return
        
        logger.info(f"Generating embeddings for {len(problems_without_embeddings)} profiling/AI-generated problems")
        
        # Process in batches for efficiency
        batch_size = 20
        for i in range(0, len(problems_without_embeddings), batch_size):
            batch = problems_without_embeddings[i:i+batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}/{(len(problems_without_embeddings)-1)//batch_size + 1}")
            
            # Get problems for this batch
            problems = db.query(Problem).filter(Problem.id.in_(batch)).all()
            
            # Create texts for embedding
            texts = [f"{p.title} {p.description}" for p in problems]
            
            # Generate embeddings in batch
            try:
                embeddings_batch = embeddings.embed_documents(texts)
                
                # Store embeddings
                for j, embedding_vector in enumerate(embeddings_batch):
                    problem_id = problems[j].id
                    
                    problem_embedding = ProblemEmbedding(
                        problem_id=problem_id,
                        embedding=embedding_vector
                    )
                    db.add(problem_embedding)
                
                db.commit()
            except Exception as e:
                logger.error(f"Error processing batch: {e}")
                db.rollback()
                # If batch fails, try one by one
                for problem in problems:
                    try:
                        generate_problem_embedding(db, problem.id)
                    except Exception as e2:
                        logger.error(f"Error processing problem {problem.id}: {e2}")
            
        logger.info("Embedding initialization complete")
    finally:
        db.close()

if __name__ == "__main__":
    initialize_selective_embeddings()