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
