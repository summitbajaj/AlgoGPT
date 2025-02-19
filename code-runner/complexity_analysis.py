import ast
import time
import numpy as np
from textwrap import dedent
from scipy.optimize import curve_fit

# ------------------------------------------------------------------------------
# Static Analysis Using AST
# ------------------------------------------------------------------------------

class ComplexityAnalyzer(ast.NodeVisitor):
    """
    AST NodeVisitor that computes the maximum nested loop depth.
    """
    def __init__(self):
        self.max_loop_depth = 0
        self.current_loop_depth = 0

    def visit_For(self, node):
        self.current_loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.current_loop_depth)
        self.generic_visit(node)
        self.current_loop_depth -= 1

    def visit_While(self, node):
        self.current_loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.current_loop_depth)
        self.generic_visit(node)
        self.current_loop_depth -= 1


def analyze_complexity(source_code):
    """
    Analyzes the source code using AST and returns the maximum loop nesting depth.

    Parameters:
        source_code (str): The user's submitted code.

    Returns:
        dict: {"loop_depth": int} or {"error": message}
    """
    try:
        tree = ast.parse(source_code)
    except SyntaxError as e:
        return {"error": f"Syntax Error: {e}"}

    analyzer = ComplexityAnalyzer()
    analyzer.visit(tree)
    return {"loop_depth": analyzer.max_loop_depth}


# ------------------------------------------------------------------------------
# Empirical Testing Using Benchmark Test Cases (from the DB)
# ------------------------------------------------------------------------------

# def get_benchmark_test_cases(problem_id):
#     """
#     Fetch benchmark test cases for the given problem from the database.
    
#     Each test case is expected to be a dictionary with keys:
#       - "input": a list (or tuple) of arguments (positional) for the function.
#       - "size": an integer representing the input size.
      
#     Note: This is pseudocode. Replace with your actual DB retrieval logic.
#     """
#     # Example benchmark cases (replace with real DB calls)
#     return [
#         {"input": [list(range(10))], "size": 10},
#         {"input": [list(range(100))], "size": 100},
#         {"input": [list(range(1000))], "size": 1000},
#         # Add additional benchmark cases as needed.
#     ]


def measure_runtime_with_benchmarks(func, benchmark_cases, repeats=3):
    """
    Measures the average runtime of a function using benchmark test cases.
    
    Each benchmark test case is expected to be a dictionary with keys:
      - "input_data": the input for the function. If it's a dict, the function is called with keyword arguments.
                      If it's a list/tuple, the function is called with positional arguments.
      - "size": an integer representing the input size.
      
    Parameters:
        func (callable): The function to test.
        benchmark_cases (list): List of benchmark test cases.
        repeats (int): Number of repetitions per test case.
        
    Returns:
        tuple: (sizes, timings)
          - sizes (list): List of test case sizes.
          - timings (list): Average runtime for each test case.
    """
    sizes = []
    timings = []
    for case in benchmark_cases:
        # Get the size, or attempt to derive it if missing.
        size = case.get("size")
        if size is None:
            input_data = case.get("input_data")
            if isinstance(input_data, list):
                size = len(input_data)
            else:
                size = 0
        sizes.append(size)
        
        test_input = case.get("input_data")
        start = time.perf_counter()
        for _ in range(repeats):
            # If input_data is a dict, call with keyword arguments.
            if isinstance(test_input, dict):
                func(**test_input)
            # If it's a list or tuple, call with positional arguments.
            elif isinstance(test_input, (list, tuple)):
                func(*test_input)
            # Otherwise, call with a single argument.
            else:
                func(test_input)
        end = time.perf_counter()
        avg_time = (end - start) / repeats
        timings.append(avg_time)
    return sizes, timings




# ------------------------------------------------------------------------------
# Multi-Model Fitting to Estimate Empirical Complexity
# ------------------------------------------------------------------------------

def fit_models(sizes, timings):
    """
    Attempts to fit several candidate models to the empirical timing data.
    
    Models:
      - Poly (power law): T(n) = a * n^b
      - Linearithmic:    T(n) = a * n * log(n) + c
      - Logarithmic:     T(n) = a * log(n) + c
      - Constant:        T(n) = c
      - Exponential:     T(n) = a * exp(b * n)
    
    Returns:
        dict: A dictionary with model names as keys. Each entry contains
              parameters, RMSE (root-mean-square error), and predictions.
    """
    results = {}
    sizes_arr = np.array(sizes)
    timings_arr = np.array(timings)

    # --- Poly model via log-log linear regression ---
    # T(n) = a * n^b  => log T(n) = log a + b * log n
    log_sizes = np.log(sizes_arr)
    log_timings = np.log(timings_arr)
    poly_coeffs = np.polyfit(log_sizes, log_timings, 1)
    b = poly_coeffs[0]
    a = np.exp(poly_coeffs[1])
    poly_pred = a * sizes_arr**b
    rmse_poly = np.sqrt(np.mean((timings_arr - poly_pred)**2))
    results['poly'] = {
        'model': 'poly',
        'parameters': {'a': a, 'b': b},
        'rmse': rmse_poly,
        'prediction': poly_pred.tolist()
    }

    # --- Linearithmic model: T(n) = a * n * log(n) + c ---
    def linlog_model(n, a, c):
        return a * n * np.log(n) + c

    try:
        popt_linlog, _ = curve_fit(linlog_model, sizes_arr, timings_arr, maxfev=10000)
        linlog_pred = linlog_model(sizes_arr, *popt_linlog)
        rmse_linlog = np.sqrt(np.mean((timings_arr - linlog_pred)**2))
        results['linlog'] = {
            'model': 'linlog',
            'parameters': {'a': popt_linlog[0], 'c': popt_linlog[1]},
            'rmse': rmse_linlog,
            'prediction': linlog_pred.tolist()
        }
    except Exception as e:
        results['linlog'] = {'error': str(e)}

    # --- Logarithmic model: T(n) = a * log(n) + c ---
    def log_model(n, a, c):
        return a * np.log(n) + c

    try:
        popt_log, _ = curve_fit(log_model, sizes_arr, timings_arr, maxfev=10000)
        log_pred = log_model(sizes_arr, *popt_log)
        rmse_log = np.sqrt(np.mean((timings_arr - log_pred)**2))
        results['log'] = {
            'model': 'log',
            'parameters': {'a': popt_log[0], 'c': popt_log[1]},
            'rmse': rmse_log,
            'prediction': log_pred.tolist()
        }
    except Exception as e:
        results['log'] = {'error': str(e)}

    # --- Constant model: T(n) = c ---
    def const_model(n, c):
        return c * np.ones_like(n)

    try:
        popt_const, _ = curve_fit(const_model, sizes_arr, timings_arr, maxfev=10000)
        const_pred = const_model(sizes_arr, *popt_const)
        rmse_const = np.sqrt(np.mean((timings_arr - const_pred)**2))
        results['const'] = {
            'model': 'const',
            'parameters': {'c': popt_const[0]},
            'rmse': rmse_const,
            'prediction': const_pred.tolist()
        }
    except Exception as e:
        results['const'] = {'error': str(e)}

    # --- Exponential model: T(n) = a * exp(b * n) ---
        # --- Exponential model: T(n) = a * exp(b * n) ---
    def exp_model(n, a, b):
        return a * np.exp(b * n)

    try:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            # Provide an initial guess for a and b.
            popt_exp, _ = curve_fit(exp_model, sizes_arr, timings_arr, p0=[1e-6, 1e-3], maxfev=10000)
        exp_pred = exp_model(sizes_arr, *popt_exp)
        rmse_exp = np.sqrt(np.mean((timings_arr - exp_pred)**2))
        results['exp'] = {
            'model': 'exp',
            'parameters': {'a': popt_exp[0], 'b': popt_exp[1]},
            'rmse': rmse_exp,
            'prediction': exp_pred.tolist()
        }
    except Exception as e:
        results['exp'] = {'error': str(e)}


    return results


# ------------------------------------------------------------------------------
# Combined Complexity Analysis Function
# ------------------------------------------------------------------------------

def combine_complexity_analysis(source_code, problem_id, function_name, benchmark_cases, repeats=3):
    """
    Combines static analysis (AST-based) and empirical testing using benchmark test cases.
    
    The function first obtains a static estimate from the code (e.g. loop depth) and then
    fits several candidate models to the timing data. If the fitted exponent (from a poly model)
    appears unrealistic (e.g. negative or near zero), it falls back to a static baseline:
      - Loop depth 0: O(1)
      - Loop depth 1: O(n)
      - Loop depth 2: O(n²)
      - etc.
    
    Parameters:
        source_code (str): The user's submitted code.
        function_name (str): The name of the function in the Solution class.
        problem_id (int): The problem ID used to fetch benchmark test cases.
        benchmark_cases (list): Benchmark test cases to use for empirical analysis.
        repeats (int): Number of repetitions per test case.
        
    Returns:
        dict: {
            "loop_depth": int,
            "static_complexity": str,   # Complexity inferred from static analysis.
            "empirical_complexity": str,# Complexity inferred from model fitting.
            "combined_complexity": str, # Final classification combining both.
            "best_model": str,          # The key of the best-fitting model.
            "model_fits": dict,         # Detailed fit results for each candidate model.
            "timings": list,            # Measured runtimes for benchmark cases.
            "problem_id": int           # The problem ID.
        }
        or {"error": message} if an error occurs.
    """
    # --- Static Analysis ---
    analysis_result = analyze_complexity(source_code)
    if "error" in analysis_result:
        return analysis_result
    loop_depth = analysis_result["loop_depth"]
    
    # Infer a static complexity baseline from loop depth.
    if loop_depth == 0:
        static_complexity = "O(1) (constant)"
    elif loop_depth == 1:
        static_complexity = "O(n) (linear)"
    elif loop_depth == 2:
        static_complexity = "O(n²) (quadratic)"
    else:
        static_complexity = f"Approximately O(n^{loop_depth})"
    
    # --- Execute User Code to Extract Function ---
    global_vars = {"__builtins__": __builtins__}
    try:
        exec(source_code, global_vars)
    except Exception as e:
        return {"error": f"Error executing submitted code: {e}"}
    
    if "Solution" not in global_vars:
        return {"error": "No class named 'Solution' found in the submitted code."}
    
    sol_instance = global_vars["Solution"]()
    if not hasattr(sol_instance, function_name):
        return {"error": f"Function '{function_name}' not found in Solution class."}
    func = getattr(sol_instance, function_name)
    
    # --- Empirical Testing using Benchmark Cases ---
    sizes, timings = measure_runtime_with_benchmarks(func, benchmark_cases, repeats)
    
    # --- Multi-Model Fitting ---
    model_fits = fit_models(sizes, timings)
    
    # Select best model based on lowest RMSE (ignoring models that errored)
    best_model = None
    best_rmse = float('inf')
    for key, fit in model_fits.items():
        if 'rmse' in fit and fit['rmse'] < best_rmse:
            best_rmse = fit['rmse']
            best_model = key
    
    # --- Empirical Complexity Classification ---
    # Start by using the poly (power law) model if available.
    empirical_complexity = None
    if best_model == 'poly':
        exponent = model_fits['poly']['parameters']['b']
        # If the fitted exponent is negative or near zero, it's likely noise.
        if exponent <= 0.1:
            empirical_complexity = static_complexity
        elif abs(exponent - 1) < 0.3:
            empirical_complexity = "O(n) (linear)"
        elif abs(exponent - 2) < 0.5:
            empirical_complexity = "O(n²) (quadratic)"
        else:
            empirical_complexity = f"Approximately O(n^{exponent:.2f})"
    elif best_model == 'linlog':
        empirical_complexity = "O(n log n) (linearithmic)"
    elif best_model == 'log':
        empirical_complexity = "O(log n) (logarithmic)"
    elif best_model == 'const':
        empirical_complexity = "O(1) (constant)"
    elif best_model == 'exp':
        empirical_complexity = "Exponential time"
    else:
        empirical_complexity = "Unable to determine complexity"
    
    # --- Combine the Two Approaches ---
    # If the empirical complexity seems unrealistic (e.g. negative exponent) then default to static.
    if empirical_complexity is None or empirical_complexity.startswith("Approximately O(n^-"):
        combined_complexity = static_complexity
    else:
        # For now, we can provide both. You might decide on rules to choose one over the other.
        combined_complexity = f"{empirical_complexity} (empirical), {static_complexity} (static)"
    
    return {
        "loop_depth": loop_depth,
        "static_complexity": static_complexity,
        "empirical_complexity": empirical_complexity,
        "combined_complexity": combined_complexity,
        "best_model": best_model,
        "model_fits": model_fits,
        "timings": timings,
        "problem_id": problem_id
    }


