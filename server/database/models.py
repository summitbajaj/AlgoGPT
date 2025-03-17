from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, Table, DateTime, Float, UniqueConstraint
from pgvector.sqlalchemy import Vector
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, BOOLEAN, UUID
import uuid
from . import Base
import enum

# ----- 1) DIFFICULTY ENUM ------------------------------------------------
class DifficultyLevel(str, enum.Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

# ----- 2) ASSOCIATION TABLE FOR PROBLEM <-> TOPIC ------------------------
problem_topics = Table(
    "problem_topics",           # name for the join table
    Base.metadata,
    Column("problem_id", ForeignKey("problems.id"), primary_key=True),
    Column("topic_id", ForeignKey("topics.id"), primary_key=True)
)

# ----- 3) TOPIC MODEL ----------------------------------------------------
class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    # Relationship back to Problem
    # Many-to-many: we list Problems that contain this Topic
    problems = relationship("Problem", secondary=problem_topics, back_populates="topics")

# ----- 4) PROBLEM MODEL --------------------------------------------------
class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(Enum(DifficultyLevel), nullable=False)
    constraints = Column(Text, nullable=True)
    starter_code = Column(Text, nullable=True)
    function_name = Column(String, nullable=False)

    # fields for the profiling and AI generation
    is_profiling_problem = Column(BOOLEAN, default=False, nullable=False)  # Used for profiling/assessment
    is_ai_generated = Column(BOOLEAN, default=False, nullable=False)  # Generated by AI vs human-authored

    # Relationship to user-visible Examples
    examples = relationship("Example", back_populates="problem")

    # Relationship to hidden/official TestCases
    test_cases = relationship("TestCase", back_populates="problem")

    # Many-to-many relationship to Topic
    topics = relationship("Topic", secondary=problem_topics, back_populates="problems")

    # One-to-many relationship to Solution
    solutions = relationship("Solution", back_populates="problem")

# ----- 5) TEST CASE MODEL -----------------------------------------------
class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    input_data = Column(JSONB, nullable=False)
    expected_output = Column(JSONB, nullable=False)
    order_sensitive = Column(BOOLEAN, nullable=False, default=True)
    benchmark_test_case = Column(BOOLEAN, nullable=False, default=False)
    test_case_size = Column(Integer, nullable=True)

    # Relationship back to Problem
    problem = relationship("Problem", back_populates="test_cases")

    # Relationship to Example (one-to-many)
    examples = relationship("Example", back_populates="test_case")

# ----- 6) EXAMPLE MODEL --------------------------------------------------
class Example(Base):
    __tablename__ = "examples"

    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False, unique=True)
    
    explanation = Column(Text, nullable=False)

    # Relationship back to Problem
    problem = relationship("Problem", back_populates="examples")

    # Relationship to TestCase (many-to-one)
    # NOTE: no 'unique=True' here, so multiple Example rows can share a single test_case_id
    test_case = relationship("TestCase", back_populates="examples")

# ----- 6) SOLUTION MODEL --------------------------------------------------
class Solution(Base):
    __tablename__ = "solutions"

    id = Column(Integer, primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    code = Column(Text, nullable=False) 
    description = Column(Text, nullable=True)
    time_complexity = Column(Text, nullable=True) 
    space_complexity = Column(Text, nullable=True)

    # Relationship back to Problem
    problem = relationship("Problem", back_populates="solutions")

# ----- 7) SUBMISSION MODEL --------------------------------------------------
class SubmissionStatus(str, enum.Enum):
    ACCEPTED = "Accepted"
    WRONG_ANSWER = "Wrong Answer"
    RUNTIME_ERROR = "Runtime Error"
    TIME_LIMIT_EXCEEDED = "Time Limit Exceeded"
    COMPILATION_ERROR = "Compilation Error"

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    problem_id = Column(Integer, ForeignKey("problems.id"), index=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source_code = Column(Text, nullable=False)
    submission_time = Column(DateTime, default=datetime.utcnow)

    # Overall submission result
    status = Column(Enum(SubmissionStatus), nullable=False)  
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)

    # Relationship to problem (optional, if you need it)
    problem = relationship("Problem")

    # One-to-many relationship to SubmissionTestResult
    test_results = relationship(
        "SubmissionTestResult",
        back_populates="submission",
        cascade="all, delete-orphan"
    )


# ----- 8) SUBMISSION TEST RESULT MODEL -----------------------------------
class SubmissionTestResult(Base):
    __tablename__ = "submission_test_results"

    id = Column(Integer, primary_key=True, index=True)
    
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), index=True, nullable=False)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False)
    
    # Simple pass/fail or more detailed status
    passed = Column(BOOLEAN, default=False)
    status = Column(Enum(SubmissionStatus), nullable=False)

    # For reference and debugging
    input_data = Column(JSONB, nullable=True)
    expected_output = Column(JSONB, nullable=True)
    actual_output = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)

    # Relationship back to Submission
    submission = relationship("Submission", back_populates="test_results")

    # Relationship to the TestCase (handy if you need quick access)
    test_case = relationship("TestCase")

# Student profile
class StudentProfile(Base):
    __tablename__ = "student_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Foreign key to your users table
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    topic_mastery = relationship("StudentTopicMastery", back_populates="student_profile", cascade="all, delete-orphan")

# Topic mastery
class StudentTopicMastery(Base):
    __tablename__ = "student_topic_mastery"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_profile_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    mastery_level = Column(Float, nullable=False, default=0.0)
    problems_attempted = Column(Integer, default=0)
    problems_solved = Column(Integer, default=0)
    last_attempted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student_profile = relationship("StudentProfile", back_populates="topic_mastery")
    topic = relationship("Topic")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('student_profile_id', 'topic_id', name='uix_student_topic'),
    )

# Student attempt tracking
class StudentAttempt(Base):
    __tablename__ = "student_attempts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Your users table ID
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    total_time_seconds = Column(Integer, nullable=True)  # Calculated time to solve
    submission_count = Column(Integer, default=0)  # Number of submissions for this problem
    completed = Column(BOOLEAN, default=False)  # Whether they solved it successfully
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    problem = relationship("Problem")

# Topic progression
class TopicProgression(Base):
    __tablename__ = "topic_progression"
    
    id = Column(Integer, primary_key=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    prerequisite_topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    progression_order = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    topic = relationship("Topic", foreign_keys=[topic_id])
    prerequisite_topic = relationship("Topic", foreign_keys=[prerequisite_topic_id])
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('topic_id', 'prerequisite_topic_id', name='uix_topic_progression'),
    )

# Problem embeddings for vector search
class ProblemEmbedding(Base):
    __tablename__ = "problem_embeddings"
    
    problem_id = Column(Integer, ForeignKey("problems.id"), primary_key=True)
    embedding = Column(Vector(1536)) 
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to Problem
    problem = relationship("Problem", backref="embedding")

# Define status enum for response validation
class ResponseValidationStatus(str, enum.Enum):
    VALID = "Valid"
    INVALID = "Invalid"
    IMPROVED = "Improved"
    ACCEPTED_AFTER_ATTEMPTS = "AcceptedAfterAttempts"

# Define the tables for chatbot response tracking and validation
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    session_summary = Column(Text, nullable=True)  # AI-generated summary of the session
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("StudentProfile")
    problem = relationship("Problem")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    code_snapshots = relationship("CodeSnapshot", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=False)
    is_from_student = Column(BOOLEAN, default=True)  # True if from student, False if from AI
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Fields for AI response validation
    was_validated = Column(BOOLEAN, default=False)  # Whether this message went through validation
    validation_status = Column(Enum(ResponseValidationStatus), nullable=True)
    validation_attempts = Column(Integer, default=0)  # Number of improvement attempts
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    validation_records = relationship("ResponseValidation", back_populates="message", cascade="all, delete-orphan")

class ResponseValidation(Base):
    __tablename__ = "response_validations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("chat_messages.id"), nullable=False)
    attempt_number = Column(Integer, nullable=False)  # Which attempt this was (1, 2, 3)
    original_content = Column(Text, nullable=False)  # The content before validation/improvement
    validation_result = Column(BOOLEAN, nullable=False)  # True if valid, False if needed improvement
    feedback = Column(JSONB, nullable=True)  # Structured feedback from validator
    improved_content = Column(Text, nullable=True)  # The improved content if any
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    message = relationship("ChatMessage", back_populates="validation_records")
    prompt_improvements = relationship("PromptImprovement", back_populates="validation", cascade="all, delete-orphan")

class PromptImprovement(Base):
    __tablename__ = "prompt_improvements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    validation_id = Column(UUID(as_uuid=True), ForeignKey("response_validations.id"), nullable=False)
    instruction = Column(Text, nullable=False)  # The prompt improvement instruction
    is_active = Column(BOOLEAN, default=True)  # Whether this improvement is currently in use
    effectiveness_score = Column(Float, default=0.0)  # Score based on subsequent validations
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relationships
    validation = relationship("ResponseValidation", back_populates="prompt_improvements")

class CodeSnapshot(Base):
    __tablename__ = "code_snapshots"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=False)
    code = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ai_feedback = Column(Text, nullable=True)  # Any feedback the AI provided on this code version
    
    # Relationships
    session = relationship("ChatSession", back_populates="code_snapshots")