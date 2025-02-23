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