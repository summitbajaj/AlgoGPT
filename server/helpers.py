from sqlalchemy.orm import Session
from database.models import TestCase, Problem, Example, Solution

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

def get_problem_context_for_ai(session: Session, problem_id: int):
    """
    Fetches problem statement, constraints, examples, and example test cases from the database.
    """
    problem = session.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        return None

    # Fetch relevant problem details
    problem_details = f"Title: {problem.title}\n"
    problem_details += f"Description: {problem.description}\n"
    if problem.constraints:
        problem_details += f"Constraints: {problem.constraints}\n"

    # Fetch examples (which include test cases)
    examples = session.query(Example).filter(Example.problem_id == problem_id).all()
    if examples:
        problem_details += "\nExamples:\n"
        for example in examples:
            test_case = session.query(TestCase).filter(TestCase.id == example.test_case_id).first()
            if test_case:
                problem_details += f"- Explanation: {example.explanation}\n"
                problem_details += f"  Test Case: Input: {test_case.input_data}, Expected Output: {test_case.expected_output}\n"

    # Fetch solutions
    solutions = session.query(Solution).filter(Solution.problem_id == problem_id).all()
    if solutions:
        problem_details += "\nOptimal Solutions:\n"
        for solution in solutions:
            problem_details += f"Code:\n{solution.code}\n"
            if solution.description:
                problem_details += f"Explanation: {solution.description}\n"
            if solution.time_complexity:
                problem_details += f"Time Complexity: {solution.time_complexity}\n"
            if solution.space_complexity:
                problem_details += f"Space Complexity: {solution.space_complexity}\n"
            problem_details += "-" * 40 + "\n"

    return problem_details

