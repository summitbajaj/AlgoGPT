from shared_resources.schemas import SubmitCodeTestCase, SubmitCodeTestResult
from typing import List

def run_code_using_user_tests(user_code, test_cases, function_name):
    """
    Executes the user code against provided test cases.

    Expects the code to define a class named 'Solution'.
    """
    results = []
    global_namespace = {}

    try:
        exec(user_code, global_namespace)
    except Exception as e:
        return {"error": f"Error in user code: {e}"}

    if 'Solution' not in global_namespace:
        return {"error": "No class named 'Solution' found in the submitted code."}

    sol_instance = global_namespace['Solution']()

    for tc in test_cases:
        input_data = tc.input
        test_case_id = tc.test_case_id

        # If input_data is a dict, assume it's keyword arguments
        if isinstance(input_data, dict):
            try:
                output = getattr(sol_instance, function_name)(**input_data)
            except Exception as e:
                results.append({
                    "test_case_id": test_case_id,
                    "input": input_data,
                    "output": f"Error during execution: {e}",
                })
                continue
        else:
            # Otherwise treat input_data as positional arguments
            args = input_data if isinstance(input_data, (list, tuple)) else [input_data]
            try:
                output = getattr(sol_instance, function_name)(*args)
            except Exception as e:
                results.append({
                    "test_case_id": test_case_id,
                    "input": input_data,
                    "output": f"Error during execution: {e}",
                })
                continue

        results.append({
            "test_case_id": test_case_id,
            "input": input_data,
            "output": output
        })

    return {"test_results": results}


from typing import Dict, List
from shared_resources.schemas import SubmitCodeTestCase, SubmitCodeTestResult

def submit_user_code_tests(user_code: str, test_cases: List[SubmitCodeTestCase], function_name: str) -> Dict[str, List[SubmitCodeTestResult]]:
    """
    Executes the user code against provided test cases.
    
    Expects the code to define a class named 'Solution'.
    Returns a dictionary with test_results containing a list of SubmitCodeTestResult objects.
    """
    results = []
    global_namespace = {}

    try:
        exec(user_code, global_namespace)
    except Exception as e:
        # For code compilation errors, mark all test cases as failed
        for tc in test_cases:
            results.append(SubmitCodeTestResult(
                test_case_id=tc.test_case_id,
                input=tc.input,
                expected_output=tc.expected_output,
                output=f"Error in code: {e}",
                passed=False
            ))
        return {"test_results": results}

    if 'Solution' not in global_namespace:
        # For missing Solution class, mark all test cases as failed
        for tc in test_cases:
            results.append(SubmitCodeTestResult(
                test_case_id=tc.test_case_id,
                input=tc.input,
                expected_output=tc.expected_output,
                output="No class named 'Solution' found in the submitted code.",
                passed=False
            ))
        return {"test_results": results}

    try:
        sol_instance = global_namespace['Solution']()
    except Exception as e:
        # For Solution class instantiation errors, mark all test cases as failed
        for tc in test_cases:
            results.append(SubmitCodeTestResult(
                test_case_id=tc.test_case_id,
                input=tc.input,
                expected_output=tc.expected_output,
                output=f"Error instantiating Solution class: {e}",
                passed=False
            ))
        return {"test_results": results}

    # Rest of the function remains the same
    for tc in test_cases:
        test_case_id = tc.test_case_id
        input_data = tc.input
        expected_output = tc.expected_output
        order_sensitive = tc.order_sensitive

        # If input_data is a dict, assume it's keyword arguments
        if isinstance(input_data, dict):
            try:
                output = getattr(sol_instance, function_name)(**input_data)
            except Exception as e:
                results.append(SubmitCodeTestResult(
                    test_case_id=test_case_id,
                    input=input_data,
                    expected_output=expected_output,
                    output=f"Error during execution: {e}",
                    passed=False
                ))
                continue
        else:
            # Otherwise treat input_data as positional arguments
            args = input_data if isinstance(input_data, (list, tuple)) else [input_data]
            try:
                output = getattr(sol_instance, function_name)(*args)
            except Exception as e:
                results.append(SubmitCodeTestResult(
                    test_case_id=test_case_id,
                    input=input_data,
                    expected_output=expected_output,
                    output=f"Error during execution: {e}",
                    passed=False
                ))
                continue

        # Compare output with expected output, considering order sensitivity
        if (not order_sensitive and 
            isinstance(output, list) and isinstance(expected_output, list)):
            passed = sorted(output) == sorted(expected_output)
        else:
            passed = output == expected_output

        results.append(SubmitCodeTestResult(
            test_case_id=test_case_id,
            input=input_data,
            expected_output=expected_output,
            output=output,
            passed=passed
        ))

    return {"test_results": results}