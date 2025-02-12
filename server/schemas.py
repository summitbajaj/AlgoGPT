from pydantic import BaseModel
from typing import List, Dict, Any

class TestCaseSchema(BaseModel):
    input_data: str
    expected_output: str

class ExecutionRequest(BaseModel):
    code: str
    problem_id: int

class ExecutionResponse(BaseModel):
    test_results: List[Dict[str, Any]]
    execution_time: float