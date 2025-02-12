from sqlalchemy.orm import Session
from database.models import TestCase

def get_test_cases(session: Session, problem_id: int):
    """Fetches test cases for a given problem ID."""
    test_cases = session.query(TestCase).filter_by(problem_id=problem_id).all()
    return [{"input_data": tc.input_data, "expected_output": tc.expected_output} for tc in test_cases]
