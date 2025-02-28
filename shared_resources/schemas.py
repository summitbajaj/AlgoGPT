from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class TestCaseSchema(BaseModel):
    input_data: str
    expected_output: str

class CodeExecutionRequest(BaseModel):
    code: str
    problem_id: int

class CodeExecutionResponse(BaseModel):
    test_results: List[Dict[str, Any]]
    execution_time: float

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

class RunCodeTestCase(BaseModel):
    test_case_id: int
    input: Dict[str, Any] 

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
class ChatRequest(BaseModel):
    user_id: str
    problem_id: int
    user_message: str