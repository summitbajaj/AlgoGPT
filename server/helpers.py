from sqlalchemy.orm import Session
from database.models import TestCase, Problem

def get_all_test_cases(session: Session, problem_id: int):
    """Fetches test cases for a given problem ID."""
    test_cases = session.query(TestCase).filter_by(problem_id=problem_id).all()
    return [{"input_data": tc.input_data, "expected_output": tc.expected_output, "order_sensitive": tc.order_sensitive} for tc in test_cases]

def get_function_name(session: Session, problem_id: int):
    """Fetches the function name for a given problem ID."""
    problem = session.query(Problem).filter_by(id=problem_id).first()
    return problem.function_name

def get_benchmark_test_cases(session: Session, problem_id: int):
    """Fetches benchmark test cases for a given problem ID."""
    benchmark_test_cases = session.query(TestCase).filter_by(problem_id=problem_id, benchmark_test_case=True).all()
    return [{"input_data": tc.input_data, "expected_output": tc.expected_output, "size": tc.test_case_size} for tc in benchmark_test_cases]
