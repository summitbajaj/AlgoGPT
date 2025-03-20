from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from enum import Enum

# generic schemas
class RunCodeTestCase(BaseModel):
    test_case_id: int
    input: Dict[str, Any] 
class SubmitCodeTestCase(RunCodeTestCase):
    expected_output: Any
    order_sensitive: bool
class TestCaseSchema(BaseModel):
    input_data: str
    expected_output: str
class SubmitCodeTestResult(RunCodeTestCase):
    output: Any
    passed: bool
    expected_output: Any

# @app.post("/submit-code") endpoint
class SubmitCodeRequest(BaseModel):
    user_id: str
    source_code: str
    problem_id: int
class SubmitCodeExecutionPayload(BaseModel):
    source_code: str
    problem_id: int
    function_name: str
    test_cases: List[SubmitCodeTestCase] 
class SubmitCodeResponse(BaseModel):
    submission_id: str
    status: str
    passed_tests: int
    total_tests: int
    user_code: str
    # Only present if a test failed
    failing_test: Optional[SubmitCodeTestResult] = None  

# @app.post("/analyze_complexity) endpoint
class ComplexityAnalysisRequest(BaseModel):
    code: str
    problem_id: int

class ComplexityAnalysisResponse(BaseModel):
    combined_complexity: str 
    feedback: str
class ExampleTestCaseModel(BaseModel):
    test_case_id: int
    input_data: Dict[str, Any] 
    expected_output: Any
    explanation: str
class GetProblemResponse(BaseModel):
    problem_id: int
    title: str
    description: str
    difficulty: str
    constraints: str
    topics: List[str]
    examples: List[ExampleTestCaseModel]
    starter_code: str

# @app.post("/run-code") endpoint
class RunCodeTestCaseResult(RunCodeTestCase):
    output: Any

class PostRunCodeRequest(BaseModel):
    source_code: str
    problem_id: int
    test_cases: List[RunCodeTestCase]

class PostRunCodeResponse(BaseModel):
    test_results: List[RunCodeTestCaseResult]
    
class RunCodeExecutionPayload(PostRunCodeRequest):
    function_name: str

# @app.websocket("/ws/chat/{user_id}/{problem_id}") endpoint
class ChatRequest(BaseModel):
    user_id: str
    problem_id: int
    user_message: str

# @app.post("/analyze-complexity") endpoint# Request for the main FastAPI service
class ComplexityAnalysisRequest(BaseModel):
    submission_id: str  # The ID of the submission to analyze
class AIComplexityInsights(BaseModel):
    ai_time_complexity: str
    space_complexity: str
    edge_cases: Optional[str] = None
    explanation: Optional[str] = None
# Payload for forwarding to code-runner service
class ComplexityAnalysisPayload(BaseModel):
    source_code: str  # The submitted code to analyze
    problem_id: int  # The problem ID
    function_name: str  # The name of the function to analyze
    benchmark_cases: List[Dict[str, Any]]  # Test cases with varying input sizes
# Response model for the analysis
class ComplexityAnalysisResponse(BaseModel):
    submission_id: str
    problem_id: int
    time_complexity: str  # The determined time complexity (e.g., "O(n)", "O(n log n)")
    space_complexity: str  # The determined space complexity
    message: str  # Human-readable explanation (includes AI insights)

# Request and response models for problem generation
class GenerateProblemRequest(BaseModel):
    topic_id: int
    difficulty: str = "Easy"
    existing_problem_id: Optional[int] = None

class GeneratedProblemResponse(BaseModel):
    success: bool
    problem_id: Optional[int] = None
    problem_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class TopicListResponse(BaseModel):
    topics: List[Dict[str, Any]]

class StartProfilingRequest(BaseModel):
    student_id: str

class StartProfilingResponse(BaseModel):
    session_id: str
    problem: Dict[str, Any]

class SubmitProfilingAnswerRequest(BaseModel):
    session_id: str
    submission_result: Dict[str, Any]

class SubmitProfilingAnswerResponse(BaseModel):
    status: str
    next_problem: Optional[Dict[str, Any]] = None
    assessment_result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# for profiling_api
class ProfilingStatusRequest(BaseModel):
    session_id: str

class ProfilingStatusResponse(BaseModel):
    status: str
    completed: bool
    problems_attempted: int
    current_topic: Optional[str] = None
    current_difficulty: Optional[str] = None

class StudentAssessmentResponse(BaseModel):
    student_id: str
    skill_level: str
    overall_mastery: float
    topic_masteries: List[Dict[str, Any]]
    recent_attempts: List[Dict[str, Any]]
    struggle_patterns: List[Dict[str, Any]]

# Roadmap API
# Difficulty enum (matches your DB model)
class DifficultyLevel(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

# Problem in roadmap
class RoadmapProblemModel(BaseModel):
    id: str
    title: str
    difficulty: str

# Topic in roadmap
class RoadmapTopicModel(BaseModel):
    id: str
    text: str
    x: int
    y: int
    questions: List[RoadmapProblemModel]
    total: int
    has_questions: bool = True
    
    class Config:
        orm_mode = True

# Connection between topics
class TopicConnectionModel(BaseModel):
    from_id: str
    to_id: str
    
    class Config:
        orm_mode = True

# Complete roadmap data
class RoadmapResponse(BaseModel):
    topics: List[RoadmapTopicModel]
    connections: List[TopicConnectionModel]
    
    class Config:
        orm_mode = True

# List of topics
class TopicListResponse(BaseModel):
    topics: List[RoadmapTopicModel]
    
    class Config:
        orm_mode = True