import ast
import time
import numpy as np
from typing import List, Dict, Any, Tuple
from scipy.optimize import curve_fit

# ------------------------------------------------------------------------------
# Complexity Classification Constants
# ------------------------------------------------------------------------------

class ComplexityClass:
    """Constants for different complexity classes"""
    CONSTANT = "O(1)"
    LOGARITHMIC = "O(log n)"
    LINEAR = "O(n)"
    LINEARITHMIC = "O(n log n)"
    QUADRATIC = "O(n²)"
    CUBIC = "O(n³)"
    POLYNOMIAL = "O(n^{})"  # Format with power
    EXPONENTIAL = "O(2^n)"
    FACTORIAL = "O(n!)"
    UNKNOWN = "Unknown"

# ------------------------------------------------------------------------------
# Static Analysis Using AST
# ------------------------------------------------------------------------------

class CodeComplexityAnalyzer(ast.NodeVisitor):
    """
    AST NodeVisitor that computes various complexity metrics:
    - Maximum nested loop depth
    - Recursive function calls
    - Presence of certain high-complexity patterns
    """
    def __init__(self, function_name: str):
        self.function_name = function_name
        self.max_loop_depth = 0
        self.current_loop_depth = 0
        self.is_recursive = False
        self.has_sorting = False
        self.has_recursion = False
        self.variable_updates = {}  # Track variable updates within loops
        self.has_binary_search_pattern = False
        self.context_stack = []  # Track current context (loop, function, etc.)
    
    def visit_FunctionDef(self, node):
        """Visit function definition nodes"""
        self.context_stack.append("function")
        self.generic_visit(node)
        self.context_stack.pop()
    
    def visit_For(self, node):
        """Visit for loop nodes"""
        self.current_loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.current_loop_depth)
        self.context_stack.append("loop")
        self.generic_visit(node)
        self.context_stack.pop()
        self.current_loop_depth -= 1

    def visit_While(self, node):
        """Visit while loop nodes"""
        self.current_loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.current_loop_depth)
        
        # Check for binary search pattern (e.g., while left <= right:)
        if isinstance(node.test, ast.Compare):
            if any(isinstance(op, (ast.LtE, ast.GtE)) for op in node.test.ops):
                self.has_binary_search_pattern = True
                
        self.context_stack.append("loop")
        self.generic_visit(node)
        self.context_stack.pop()
        self.current_loop_depth -= 1
    
    def visit_Call(self, node):
        """Visit function call nodes"""
        # Check for recursive calls
        if isinstance(node.func, ast.Name) and node.func.id == self.function_name:
            self.is_recursive = True
            self.has_recursion = True
        
        # Check for sorting calls
        if isinstance(node.func, ast.Attribute):
            if node.func.attr == 'sort' or node.func.attr == 'sorted':
                self.has_sorting = True
                
        self.generic_visit(node)


def analyze_static_complexity(source_code: str, function_name: str) -> Dict[str, Any]:
    """
    Analyzes the source code using AST and returns complexity metrics.

    Parameters:
        source_code (str): The user's submitted code.
        function_name (str): The name of the function to analyze.

    Returns:
        dict: Complexity metrics including loop_depth, is_recursive, etc.
    """
    try:
        tree = ast.parse(source_code)
    except SyntaxError as e:
        return {"error": f"Syntax Error: {e}"}

    analyzer = CodeComplexityAnalyzer(function_name)
    analyzer.visit(tree)
    
    # Determine the static complexity class based on the metrics
    complexity_class = determine_static_complexity_class(
        analyzer.max_loop_depth,
        analyzer.is_recursive,
        analyzer.has_sorting,
        analyzer.has_binary_search_pattern
    )
    
    return {
        "loop_depth": analyzer.max_loop_depth,
        "is_recursive": analyzer.is_recursive,
        "has_sorting": analyzer.has_sorting,
        "has_binary_search_pattern": analyzer.has_binary_search_pattern,
        "static_complexity": complexity_class
    }


def determine_static_complexity_class(
    loop_depth: int,
    is_recursive: bool,
    has_sorting: bool,
    has_binary_search: bool
) -> str:
    """
    Determines the complexity class based on static analysis metrics.
    
    Args:
        loop_depth: Maximum depth of nested loops
        is_recursive: Whether the function calls itself
        has_sorting: Whether the function uses sorting operations
        has_binary_search: Whether binary search pattern was detected
        
    Returns:
        String representing the complexity class
    """
    # Binary search pattern
    if has_binary_search:
        return ComplexityClass.LOGARITHMIC
    
    # Sorting operations typically have O(n log n) complexity
    if has_sorting:
        return ComplexityClass.LINEARITHMIC
    
    # Recursive functions are complex to analyze statically
    if is_recursive:
        # This is a simplification - proper recursion analysis 
        # would need to examine the recursion structure
        return ComplexityClass.UNKNOWN
    
    # Classify based on loop nesting depth
    if loop_depth == 0:
        return ComplexityClass.CONSTANT
    elif loop_depth == 1:
        return ComplexityClass.LINEAR
    elif loop_depth == 2:
        return ComplexityClass.QUADRATIC
    elif loop_depth == 3:
        return ComplexityClass.CUBIC
    elif loop_depth > 3:
        return ComplexityClass.POLYNOMIAL.format(loop_depth)
    
    return ComplexityClass.UNKNOWN

# ------------------------------------------------------------------------------
# Benchmark-based Empirical Analysis
# ------------------------------------------------------------------------------

def measure_runtime_with_benchmarks(
    func,
    benchmark_cases: List[Dict[str, Any]],
    repeats: int = 5
) -> Tuple[List[int], List[float]]:
    """Measures the runtime of a function using benchmark test cases."""
    sizes = []
    timings = []
    
    # Ensure we have at least 3 different sizes for meaningful curve fitting
    if len(benchmark_cases) < 3:
        return sizes, timings
        
    for case in benchmark_cases:
        # Get input size
        size = case.get("size")
        if size is None:
            input_data = case.get("input_data")
            if isinstance(input_data, dict) and "nums" in input_data:
                size = len(input_data["nums"])
            elif isinstance(input_data, dict) and "arr" in input_data:
                size = len(input_data["arr"])
            elif isinstance(input_data, list):
                size = len(input_data)
            else:
                continue
                
        sizes.append(size)
        test_input = case.get("input_data")
        
        # Run multiple times and take the maximum to better capture worst-case behavior
        max_duration = 0
        for _ in range(repeats):
            start = time.perf_counter()
            
            if isinstance(test_input, dict):
                func(**test_input)
            elif isinstance(test_input, (list, tuple)):
                func(*test_input)
            else:
                func(test_input)
                
            end = time.perf_counter()
            max_duration = max(max_duration, end - start)
            
        # Use max duration to better capture worst-case complexity
        timings.append(max_duration)
        
    return sizes, timings

# ------------------------------------------------------------------------------
# Curve Fitting and Model Selection
# ------------------------------------------------------------------------------

def fit_complexity_models(
    sizes: List[int],
    timings: List[float]
) -> Dict[str, Any]:
    """
    Fits various time complexity models to the empirical timing data.
    
    Parameters:
        sizes: List of input sizes
        timings: List of corresponding runtimes
        
    Returns:
        Dictionary with fitted models and their parameters
    """
    if len(sizes) < 3:
        return {"error": "Not enough data points for curve fitting"}
        
    results = {}
    sizes_arr = np.array(sizes)
    timings_arr = np.array(timings)
    
    # Define the complexity functions
    def constant_func(n, a):
        return a * np.ones_like(n)
        
    def log_func(n, a, b):
        return a * np.log(n) + b
        
    def linear_func(n, a, b):
        return a * n + b
        
    def linearithmic_func(n, a, b):
        return a * n * np.log(n) + b
        
    def quadratic_func(n, a, b):
        return a * n**2 + b
        
    def cubic_func(n, a, b):
        return a * n**3 + b
        
    def exponential_func(n, a, b, c):
        return a * np.exp(b * n) + c
    
    # Models to test
    models = {
        "constant": (constant_func, [1]),  # Initial guess
        "logarithmic": (log_func, [1, 0]),
        "linear": (linear_func, [1, 0]),
        "linearithmic": (linearithmic_func, [1, 0]),
        "quadratic": (quadratic_func, [1, 0]),
        "cubic": (cubic_func, [1, 0]),
        "exponential": (exponential_func, [0.1, 0.01, 0])
    }
    
    # Fit each model and calculate R² value
    for name, (func, p0) in models.items():
        try:
            # Skip exponential for large inputs to avoid overflow
            if name == "exponential" and max(sizes_arr) > 1000:
                continue
                
            popt, _ = curve_fit(func, sizes_arr, timings_arr, p0=p0, maxfev=5000)
            predictions = func(sizes_arr, *popt)
            
            # Calculate R² (coefficient of determination)
            ss_total = np.sum((timings_arr - np.mean(timings_arr))**2)
            ss_residual = np.sum((timings_arr - predictions)**2)
            r_squared = 1 - (ss_residual / ss_total) if ss_total > 0 else 0
            
            # Calculate normalized root mean square error
            rmse = np.sqrt(np.mean((timings_arr - predictions)**2))
            nrmse = rmse / (np.max(timings_arr) - np.min(timings_arr)) if np.max(timings_arr) > np.min(timings_arr) else rmse
            
            results[name] = {
                "parameters": popt.tolist(),
                "r_squared": r_squared,
                "rmse": rmse,
                "nrmse": nrmse,
                "predictions": predictions.tolist()
            }
        except Exception as e:
            results[name] = {"error": str(e)}
    
    return results

def check_theoretical_growth(
    sizes: List[int],
    timings: List[float],
    model_name: str,
    predictions: List[float]
) -> bool:
    """
    Checks if timing data follows the theoretical growth rate for the given model.
    Returns True if the growth pattern matches theoretical expectations.
    """
    if len(sizes) < 3 or len(timings) < 3:
        return False
        
    # Get growth ratios of actual timings
    timing_ratios = []
    for i in range(1, len(timings)):
        if timings[i-1] > 0:
            timing_ratios.append(timings[i] / timings[i-1])
    
    # Get size ratios
    size_ratios = []
    for i in range(1, len(sizes)):
        size_ratios.append(sizes[i] / sizes[i-1])
    
    # Expected growth factors for different complexity classes
    if model_name == "constant":
        # Constant time: O(1) - timing should not change with size
        expected_ratios = [1.0] * len(timing_ratios)
    elif model_name == "logarithmic":
        # Logarithmic time: O(log n) - timing should grow slower than linear
        expected_ratios = [max(1.0, np.log(size_ratios[i]) / np.log(2)) for i in range(len(size_ratios))]
    elif model_name == "linear":
        # Linear time: O(n) - timing should grow proportionally to size
        expected_ratios = size_ratios
    elif model_name == "linearithmic":
        # Linearithmic time: O(n log n) - timing should grow slightly faster than linear
        expected_ratios = [size_ratios[i] * max(1.0, np.log(size_ratios[i]) / np.log(2)) for i in range(len(size_ratios))]
    elif model_name == "quadratic":
        # Quadratic time: O(n²) - timing should grow with square of size
        expected_ratios = [ratio**2 for ratio in size_ratios]
    elif model_name == "cubic":
        # Cubic time: O(n³) - timing should grow with cube of size
        expected_ratios = [ratio**3 for ratio in size_ratios]
    elif model_name == "exponential":
        # Exponential time: O(2^n) - timing should grow exponentially
        expected_ratios = [2**(size_ratios[i] - 1) for i in range(len(size_ratios))]
    else:
        return False
    
    # Check if actual ratios are close to expected ratios
    # Use a tolerance factor since real-world timing has noise
    match_count = 0
    for i in range(len(timing_ratios)):
        # Allow larger tolerance for exponential due to its rapid growth
        tolerance = 2.0 if model_name == "exponential" else 0.5
        
        # For small expected ratios, use absolute tolerance
        if expected_ratios[i] < 1.2:
            if abs(timing_ratios[i] - expected_ratios[i]) < 0.3:
                match_count += 1
        else:
            # For larger ratios, use relative tolerance
            relative_diff = abs(timing_ratios[i] - expected_ratios[i]) / expected_ratios[i]
            if relative_diff < tolerance:
                match_count += 1
    
    # Consider it a match if majority of growth ratios match theoretical expectations
    return match_count >= len(timing_ratios) // 2

def select_best_complexity_model(
    fit_results: Dict[str, Any],
    sizes: List[int],
    timings: List[float],
    static_analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """Selects the best complexity model with improved validation."""
    best_model = None
    best_score = -float('inf')
    
    # Define complexity classes for each model
    complexity_map = {
        "constant": ComplexityClass.CONSTANT,
        "logarithmic": ComplexityClass.LOGARITHMIC,
        "linear": ComplexityClass.LINEAR,
        "linearithmic": ComplexityClass.LINEARITHMIC,
        "quadratic": ComplexityClass.QUADRATIC,
        "cubic": ComplexityClass.CUBIC,
        "exponential": ComplexityClass.EXPONENTIAL
    }
    
    # Check if timing data shows meaningful variation
    min_timing = min(timings)
    max_timing = max(timings)
    timing_range_ratio = max_timing / min_timing if min_timing > 0 else 1.0
    
    # If timings don't vary much (less than 20% difference between min and max),
    # empirical analysis is unreliable
    if timing_range_ratio < 1.2:
        # Empirical analysis unreliable, return static analysis result
        static_complexity = static_analysis.get("static_complexity", ComplexityClass.UNKNOWN)
        return {
            "model": "static_only",
            "complexity": static_complexity,
            "confidence": 0.6,  # Medium confidence for static-only
            "details": {
                "timing_variation_insufficient": True,
                "timing_range_ratio": timing_range_ratio
            }
        }
    
    # Enhanced model selection with complexity penalties
    complexity_penalty = {
        "constant": 0,
        "logarithmic": 0.05,
        "linear": 0.1,
        "linearithmic": 0.15,
        "quadratic": 0.2,
        "cubic": 0.3,
        "exponential": 0.4
    }
    
    # Check if model predictions match the theoretical growth rate
    for name, result in fit_results.items():
        if "error" in result:
            continue
            
        r_squared = result["r_squared"]
        penalty = complexity_penalty.get(name, 0)
        
        # Theoretical growth checks
        theoretical_match = check_theoretical_growth(
            sizes, timings, name, result.get("predictions", [])
        )
        
        # Bonus for theoretical match
        theory_bonus = 0.2 if theoretical_match else 0
        
        # Calculate score
        score = r_squared - penalty + theory_bonus
        
        if score > best_score:
            best_score = score
            best_model = name
    
    if best_model is None:
        return {
            "model": "unknown",
            "complexity": ComplexityClass.UNKNOWN,
            "confidence": 0.0
        }
    
    # Calculate confidence with more factors
    base_confidence = min(1.0, max(0.0, fit_results[best_model]["r_squared"]))
    
    # Reduce confidence if timing range ratio is small
    confidence_multiplier = min(1.0, timing_range_ratio / 5.0)
    confidence = base_confidence * confidence_multiplier
    
    # If static and empirical match, boost confidence
    if complexity_map.get(best_model) == static_analysis.get("static_complexity"):
        confidence = min(0.95, confidence + 0.2)
    
    return {
        "model": best_model,
        "complexity": complexity_map.get(best_model, ComplexityClass.UNKNOWN),
        "confidence": confidence,
        "details": fit_results[best_model]
    }


# ------------------------------------------------------------------------------
# Visualization Data Preparation
# ------------------------------------------------------------------------------

def prepare_visualization_data(
    sizes: List[int],
    timings: List[float],
    fit_results: Dict[str, Any],
    best_model: str
) -> Dict[str, Any]:
    """
    Prepares data for visualization of the complexity analysis.
    
    Parameters:
        sizes: List of input sizes
        timings: List of measured runtimes
        fit_results: Dictionary of fitted models
        best_model: Name of the best model
        
    Returns:
        Dictionary with visualization data
    """
    # Generate more points for smoother curves
    if len(sizes) >= 2:
        min_size, max_size = min(sizes), max(sizes)
        smooth_sizes = np.linspace(min_size, max_size, 100).tolist()
    else:
        smooth_sizes = sizes
        
    visualization_data = {
        "raw_data": {
            "sizes": sizes,
            "timings": timings
        },
        "models": {}
    }
    
    # Add fitted curves for each model
    for name, result in fit_results.items():
        if "error" in result or "parameters" not in result:
            continue
            
        # Mark the best model
        is_best = (name == best_model)
        
        visualization_data["models"][name] = {
            "is_best": is_best,
            "r_squared": result["r_squared"],
            "predictions": result["predictions"]
        }
    
    return visualization_data


# ------------------------------------------------------------------------------
# Final Complexity Determination
# ------------------------------------------------------------------------------

def combine_complexity_analysis(
    static_complexity: str,
    empirical_complexity: str,
    static_analysis: Dict[str, Any],
    empirical_analysis: Dict[str, Any]
) -> Tuple[str, float]:
    """
    Combines static and empirical analysis results with improved heuristics.
    """
    # Static analysis takes precedence for certain patterns
    if static_analysis.get("has_binary_search_pattern", False):
        return ComplexityClass.LOGARITHMIC, 0.8
        
    if static_analysis.get("has_sorting", False):
        return ComplexityClass.LINEARITHMIC, 0.8
    
    # Check if empirical analysis has timing_variation_insufficient flag
    if (empirical_analysis.get("details", {}).get("timing_variation_insufficient", False) or
        empirical_analysis.get("confidence", 0) < 0.3):
        # Insufficient empirical data, rely on static analysis
        return static_complexity, 0.6
    
    # If they agree, high confidence
    if static_complexity == empirical_complexity:
        return static_complexity, 0.9

    # Loop-based complexity cases
    loop_depth = static_analysis.get("loop_depth", 0)
    if loop_depth >= 1:
        # For code with loops, prefer static analysis unless empirical is very confident
        if empirical_analysis.get("confidence", 0) > 0.8:
            return empirical_complexity, empirical_analysis.get("confidence", 0.7)
        else:
            # For nested loops, static analysis is often more reliable
            return static_complexity, 0.7
    
    # Prefer the more pessimistic estimate for general cases
    complexity_rank = {
        ComplexityClass.CONSTANT: 1,
        ComplexityClass.LOGARITHMIC: 2,
        ComplexityClass.LINEAR: 3,
        ComplexityClass.LINEARITHMIC: 4,
        ComplexityClass.QUADRATIC: 5,
        ComplexityClass.CUBIC: 6,
        ComplexityClass.EXPONENTIAL: 7,
        ComplexityClass.FACTORIAL: 8,
        ComplexityClass.UNKNOWN: 9
    }
    
    static_rank = complexity_rank.get(static_complexity, 9)
    empirical_rank = complexity_rank.get(empirical_complexity, 9)
    
    if static_rank >= empirical_rank:
        return static_complexity, 0.7
    else:
        return empirical_complexity, 0.7

def generate_complexity_message(
    complexity: str,
    confidence: float
) -> str:
    """
    Generates a human-readable message about the complexity.
    
    Parameters:
        complexity: The determined complexity class
        confidence: Confidence level (0.0 to 1.0)
        
    Returns:
        String message
    """
    confidence_str = "high" if confidence > 0.7 else "moderate" if confidence > 0.4 else "low"
    
    complexity_explanations = {
        ComplexityClass.CONSTANT: "constant time regardless of input size",
        ComplexityClass.LOGARITHMIC: "logarithmic time (typical of binary search algorithms)",
        ComplexityClass.LINEAR: "linear time (scales directly with input size)",
        ComplexityClass.LINEARITHMIC: "linearithmic time (typical of efficient sorting algorithms)",
        ComplexityClass.QUADRATIC: "quadratic time (typical of nested loops)",
        ComplexityClass.CUBIC: "cubic time (typical of triple nested loops)",
        ComplexityClass.EXPONENTIAL: "exponential time (may be inefficient for large inputs)",
        ComplexityClass.FACTORIAL: "factorial time (typically inefficient for all but small inputs)",
        ComplexityClass.UNKNOWN: "unknown time complexity"
    }
    
    explanation = complexity_explanations.get(complexity, "")
    
    if confidence > 0.7:
        message = f"Your solution has {complexity} time complexity ({explanation})."
    else:
        message = f"Your solution appears to have {complexity} time complexity ({explanation}), but our confidence is {confidence_str}."
    
    return message


# ------------------------------------------------------------------------------
# Main Analysis Function
# ------------------------------------------------------------------------------

def analyze_complexity(
    source_code: str,
    problem_id: int,
    function_name: str,
    benchmark_cases: List[Dict[str, Any]],
    repeats: int = 5
) -> Dict[str, Any]:
    """
    Enhanced complexity analysis with better reliability.
    """
    # 1. Static analysis
    static_analysis = analyze_static_complexity(source_code, function_name)
    if "error" in static_analysis:
        return {"error": static_analysis["error"]}
    
    # Extract the function from the code
    global_vars = {"__builtins__": __builtins__}
    try:
        exec(source_code, global_vars)
    except Exception as e:
        return {"error": f"Error executing code: {e}"}
    
    if "Solution" not in global_vars:
        return {"error": "No Solution class found in the code"}
    
    try:
        solution_instance = global_vars["Solution"]()
        func = getattr(solution_instance, function_name)
    except Exception as e:
        return {"error": f"Error accessing function {function_name}: {e}"}
    
    # 2. Empirical analysis (if we have benchmark cases)
    if benchmark_cases and len(benchmark_cases) >= 3:
        sizes, timings = measure_runtime_with_benchmarks(func, benchmark_cases, repeats)
        
        if len(sizes) >= 3:  # Need at least 3 points for meaningful curve fitting
            # 3. Fit complexity models
            fit_results = fit_complexity_models(sizes, timings)
            
            if "error" not in fit_results:
                # 4. Select best model with enhanced validation
                empirical_model = select_best_complexity_model(
                    fit_results, sizes, timings, static_analysis
                )
                
                # 5. Prepare visualization data
                visualization_data = prepare_visualization_data(
                    sizes, 
                    timings, 
                    fit_results, 
                    empirical_model["model"]
                )
                
                # 6. Combined analysis with improved heuristics
                time_complexity, confidence = combine_complexity_analysis(
                    static_analysis["static_complexity"],
                    empirical_model["complexity"],
                    static_analysis,
                    empirical_model
                )
                
                return {
                    "problem_id": problem_id,
                    "time_complexity": time_complexity,
                    "space_complexity": "Not analyzed",
                    "confidence": confidence,
                    "static_analysis": static_analysis,
                    "empirical_analysis": empirical_model,
                    "visualization_data": visualization_data,
                    "message": generate_complexity_message(time_complexity, confidence)
                }
    
    # Fallback to static analysis only
    return {
        "problem_id": problem_id,
        "time_complexity": static_analysis["static_complexity"],
        "space_complexity": "Not analyzed",
        "confidence": 0.6,
        "static_analysis": static_analysis,
        "empirical_analysis": None,
        "visualization_data": None,
        "message": generate_complexity_message(static_analysis["static_complexity"], 0.6)
    }