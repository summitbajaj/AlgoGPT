from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, BOOLEAN
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