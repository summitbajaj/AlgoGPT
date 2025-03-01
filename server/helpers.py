from sqlalchemy.orm import Session
from database.models import TestCase, Problem, Example, Solution
from shared_resources.schemas import SubmitCodeTestCase
from typing import List, Dict, Any, Optional
from database.models import Submission, SubmissionTestResult, SubmissionStatus
import uuid

def get_all_test_cases(session: Session, problem_id: int) -> List[SubmitCodeTestCase]:
    """Fetches test cases for a given problem ID."""
    test_cases = session.query(TestCase).filter_by(problem_id=problem_id).all()
    return [{"test_case_id": tc.id, 
             "input": tc.input_data, 
             "expected_output": tc.expected_output, 
             "order_sensitive": tc.order_sensitive} for tc in test_cases]

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

def determine_submission_status(test_results: List[Dict[str, Any]]) -> SubmissionStatus:
    """
    Determines the overall submission status based on test results.
    
    Args:
        test_results: List of test result dictionaries
        
    Returns:
        SubmissionStatus enum value
    """
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results if result.get("passed", False))
    
    # Check for compilation errors (should appear in the first test case)
    if total_tests > 0 and "Error in code" in str(test_results[0].get("output", "")):
        return SubmissionStatus.COMPILATION_ERROR
        
    # Check if there are no test cases
    if total_tests == 0:
        return SubmissionStatus.RUNTIME_ERROR
        
    # Check if all tests passed
    if passed_tests == total_tests:
        return SubmissionStatus.ACCEPTED
        
    # Default case: some tests failed
    return SubmissionStatus.WRONG_ANSWER

def determine_test_case_status(result: Dict[str, Any]) -> SubmissionStatus:
    """
    Determines the status for an individual test case result.
    
    Args:
        result: Dictionary containing test case result
        
    Returns:
        SubmissionStatus enum value
    """
    output = result.get("output", "")
    passed = result.get("passed", False)
    
    if isinstance(output, str):
        if "Error during execution" in output:
            return SubmissionStatus.RUNTIME_ERROR
        elif "Error in code" in output:
            return SubmissionStatus.COMPILATION_ERROR
            
    if passed:
        return SubmissionStatus.ACCEPTED
        
    return SubmissionStatus.WRONG_ANSWER

def get_first_failing_test(test_results: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Returns the first failing test case, or None if all passed.
    """
    for result in test_results:
        if not result.get("passed", False):
            return result
    return None



def store_submission_results(
    db: Session, 
    problem_id: int, 
    source_code: str, 
    test_results: List[Dict[str, Any]], 
    status: SubmissionStatus
) -> Submission:
    """
    Stores submission results in the database.
    
    Args:
        db: Database session
        problem_id: ID of the problem
        source_code: Source code submitted by the user
        test_results: List of test case results
        status: Overall submission status
        
    Returns:
        The created Submission object
    """
    # Calculate statistics
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results if result.get("passed", False))
    
    # Create submission record
    submission = Submission(
        problem_id=problem_id,
        source_code=source_code,
        status=status,
        total_tests=total_tests,
        passed_tests=passed_tests
    )
    
    db.add(submission)
    db.flush()  # Flush to get the submission ID
    
    # Create test result records for each test case
    for result in test_results:
        test_case_id = result.get("test_case_id")
        passed = result.get("passed", False)
        
        # Determine status for this specific test result
        test_status = determine_test_case_status(result)
        
        # Extract error message if applicable
        error_message = None
        output = result.get("output", "")
        if isinstance(output, str) and ("Error" in output or "error" in output):
            error_message = output
        
        # Create test result record
        test_result = SubmissionTestResult(
            submission_id=submission.id,
            test_case_id=test_case_id,
            passed=passed,
            status=test_status,
            input_data=result.get("input"),
            expected_output=result.get("expected_output"),
            actual_output=result.get("output"),
            error_message=error_message
        )
        
        db.add(test_result)
    
    # Commit all changes to the database
    db.commit()
    
    return submission