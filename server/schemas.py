from pydantic import BaseModel
from typing import List, Dict, Any

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