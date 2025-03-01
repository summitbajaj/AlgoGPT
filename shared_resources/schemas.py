from pydantic import BaseModel
from typing import List, Dict, Any, Optional

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
    source_code: str
    problem_id: int
class SubmitCodeExecutionPayload(SubmitCodeRequest):
    function_name: str
    test_cases: List[SubmitCodeTestCase] 
class SubmitCodeResponse(BaseModel):
    submission_id: str
    status: str
    passed_tests: int
    total_tests: int
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