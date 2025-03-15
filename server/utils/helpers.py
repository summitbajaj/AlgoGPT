from sqlalchemy.orm import Session
from fastapi import HTTPException
from database.models import TestCase, Problem, Example, Solution, Submission, SubmissionTestResult, SubmissionStatus, StudentProfile
from shared_resources.schemas import SubmitCodeTestCase
from typing import List, Dict, Any, Optional
import uuid

def get_all_test_cases(session: Session, problem_id: int) -> List[SubmitCodeTestCase]:
    """Fetches test cases for a given problem ID."""
    test_cases = session.query(TestCase).filter_by(problem_id=problem_id).all()
    return [{"test_case_id": tc.id, 
             "input": tc.input_data, 
             "expected_output": tc.expected_output, 
             "order_sensitive": tc.order_sensitive} for tc in test_cases]

def get_function_name(session: Session, problem_id: int) -> str:
    """Gets the function name for a problem."""
    problem = session.query(Problem).filter_by(id=problem_id).first()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    return problem.function_name

def get_benchmark_test_cases(session: Session, problem_id: int) -> List[Dict[str, Any]]:
    """Fetches benchmark test cases with varying input sizes for a given problem."""
    benchmark_test_cases = session.query(TestCase).filter_by(
        problem_id=problem_id, 
        benchmark_test_case=True
    ).all()
    
    return [
        {
            "input_data": tc.input_data, 
            "expected_output": tc.expected_output, 
            "size": tc.test_case_size
        } 
        for tc in benchmark_test_cases
    ]

def verify_submission_success(session: Session, submission_id: str) -> Dict[str, Any]:
    """
    Verifies that a submission exists and all tests passed.
    Returns the submission details if successful.
    """
    submission = session.query(Submission).filter_by(id=submission_id).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.status.value != "Accepted":
        raise HTTPException(
            status_code=400, 
            detail=f"Submission has not passed all tests. Status: {submission.status.value}"
        )
    
    return {
        "submission_id": str(submission.id),
        "problem_id": submission.problem_id,
        "source_code": submission.source_code
    }

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


def convert_to_uuid(user_id_str: str) -> uuid.UUID:
    print(f"Attempting to convert '{user_id_str}' to UUID")
    try:
        result = uuid.UUID(user_id_str)
        print(f"Successfully converted '{user_id_str}' to UUID: {result}")
        return result
    except ValueError as e:
        print(f"Failed to convert '{user_id_str}' with error: {e}")
        namespace = uuid.NAMESPACE_DNS
        new_uuid = uuid.uuid5(namespace, user_id_str)
        print(f"Converted '{user_id_str}' to deterministic UUID: {new_uuid}")
        return new_uuid

def initialize_student_profile(db: Session, student_id_str: str) -> StudentProfile:
        # Convert the student_id string to a UUID (using your helper logic)
        try:
            uuid_student_id = uuid.UUID(student_id_str)
        except ValueError:
            uuid_student_id = uuid.uuid5(uuid.NAMESPACE_DNS, student_id_str)
        
        # Check if the student profile exists
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == uuid_student_id
        ).first()
        
        # Create the profile if it doesn't exist
        if not student_profile:
            student_profile = StudentProfile(user_id=uuid_student_id)
            db.add(student_profile)
            db.flush()  # Get the ID assigned
            # Optionally, initialize other related records here
            db.commit()
            print(f"Created new student profile for {uuid_student_id}")
        else:
            print(f"Found existing student profile for {uuid_student_id}")
        return student_profile