# Create this as ai_complexity_analyzer.py in your main service

import os
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI
from typing import Dict, Any, List
import json
import re

# Load environment variables from .env file
load_dotenv('.env')

class AIComplexityAnalyzer:
    """
    Uses LLM to analyze code complexity and provide deeper insights
    beyond standard static and empirical analysis.
    """
    
    def __init__(self):
        """Initialize the AI analyzer with Azure OpenAI client."""
        # Use the same environment variables as in ai_model.py
        self.chat = AzureChatOpenAI(
            api_version=os.getenv("AZURE_OPENAI_VERSION"),
            api_key=os.getenv("AZURE_OPENAI_KEY"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            azure_deployment="gpt-4o-mini",
            temperature=0.1,  # Lower temperature for more precise analysis
        )
    
    def analyze_complexity(
    self, 
    source_code: str, 
    function_name: str,
    current_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Enhance complexity analysis with AI insights.
        
        Args:
            source_code: The code to analyze
            function_name: The name of the function being analyzed
            current_analysis: Results from static/empirical analysis
            
        Returns:
            Enhanced analysis results with AI insights
        """
        # Extract key information from current analysis
        time_complexity = current_analysis.get("time_complexity", "Unknown")
        static_complexity = current_analysis.get("static_analysis", {}).get("static_complexity", "Unknown")
        confidence = current_analysis.get("confidence", 0.0)
        loop_depth = current_analysis.get("static_analysis", {}).get("loop_depth", 0)
        
        # Create system prompt for analysis
        system_prompt = f"""
        You are an expert algorithm analyzer. Examine the provided code and assess its time and space complexity.
        
        Current analysis information:
        - Static analysis determined: {static_complexity}
        - Overall time complexity determined: {time_complexity}
        - Loop nesting depth: {loop_depth}
        - Analysis confidence: {confidence}
        
        Based on the code's structure and algorithms used, determine:
        1. Is the current time complexity assessment accurate? If not, what should it be?
        2. What is the space complexity of this solution?
        3. Are there any edge cases where the complexity would be different?
        
        Provide your analysis in a structured JSON format with these keys:
        - ai_time_complexity: Your assessment of the time complexity
        - space_complexity: Your assessment of the space complexity
        - edge_cases: Any edge cases where complexity differs (can be a string or a detailed array)
        - explanation: A detailed technical explanation of your assessment that thoroughly explains the complexity
        """
        
        # Create user prompt with the code
        user_prompt = f"""
        Function name: {function_name}
        
        ```python
        {source_code}
        ```
        
        Analyze this code's complexity in JSON format as specified.
        """
        
        # Generate AI response
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        try:
            ai_response = self.chat(messages)
            
            # Find JSON content in the response
            json_match = re.search(r'```json\s*(.*?)\s*```', ai_response.content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = ai_response.content
            
            # Clean up the string and parse JSON
            try:
                # Remove any triple backticks and language identifiers
                json_str = re.sub(r'```.*?```', '', json_str, flags=re.DOTALL)
                
                # Log the cleaned JSON string for debugging
                print(f"Attempting to parse JSON: {json_str}")
                
                # Parse the JSON
                ai_insights = json.loads(json_str)
                
                # Handle edge_cases field which might be a list, object, or string
                if "edge_cases" in ai_insights:
                    edge_cases = ai_insights["edge_cases"]
                    
                    # If edge_cases is a list of dictionaries, convert to string
                    if isinstance(edge_cases, list):
                        # Try to convert to a readable string format
                        try:
                            edge_cases_str = ""
                            for case in edge_cases:
                                if isinstance(case, dict):
                                    case_desc = case.get("case", "")
                                    case_complexity = case.get("complexity", "")
                                    if case_desc and case_complexity:
                                        edge_cases_str += f"{case_desc}: {case_complexity}. "
                                    else:
                                        edge_cases_str += str(case) + ". "
                                else:
                                    edge_cases_str += str(case) + ". "
                            ai_insights["edge_cases"] = edge_cases_str.strip()
                        except:
                            # If conversion fails, use json.dumps to get a string representation
                            ai_insights["edge_cases"] = json.dumps(edge_cases)
                    
                    # If it's any other non-string type, convert to string
                    elif not isinstance(edge_cases, str):
                        ai_insights["edge_cases"] = str(edge_cases)
                        
                # Convert explanation from list to string if needed
                if "explanation" in ai_insights and isinstance(ai_insights["explanation"], list):
                    ai_insights["explanation"] = ' '.join(ai_insights["explanation"])
                    
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                # Fallback if JSON parsing fails
                ai_insights = {
                    "ai_time_complexity": time_complexity,
                    "space_complexity": "Not determined",
                    "edge_cases": "None identified",
                    "explanation": "Could not parse AI response"
                }
            
            # Merge AI insights with current analysis
            enhanced_analysis = current_analysis.copy()
            enhanced_analysis["ai_analysis"] = ai_insights
            
            # Generate a comprehensive message that includes AI insights
            ai_time = ai_insights.get("ai_time_complexity", time_complexity)
            space_complexity = ai_insights.get("space_complexity", "Not analyzed")
            explanation = ai_insights.get("explanation", "")
            edge_cases = ai_insights.get("edge_cases", "")
            
            # Create a comprehensive message that serves as the main explanation
            message = f"Your solution has {ai_time} time complexity"

            if space_complexity and space_complexity != "Not determined":
                message += f" and {space_complexity} space complexity"

            message += ". "

            if explanation:
                message += f"{explanation} "
                    
            if edge_cases and edge_cases != "None identified":
                message += f"Edge cases: {edge_cases}"
                    
            enhanced_analysis["message"] = message.strip()

            # With this updated version:

            # Create a comprehensive message with proper paragraphing
            message_parts = []

            # First paragraph - time and space complexity summary
            complexity_summary = f"Your solution has {ai_time} time complexity"
            if space_complexity and space_complexity != "Not determined":
                complexity_summary += f" and {space_complexity} space complexity"
            complexity_summary += "."
            message_parts.append(complexity_summary)

            # Second paragraph - detailed explanation
            if explanation:
                # Clean up the explanation text
                cleaned_explanation = explanation.strip()
                # Ensure it doesn't start with redundant complexity info
                redundant_prefixes = [
                    f"the time complexity is {ai_time}",
                    f"time complexity is {ai_time}",
                    f"the time complexity of this solution is {ai_time}"
                ]
                
                for prefix in redundant_prefixes:
                    if cleaned_explanation.lower().startswith(prefix.lower()):
                        # Remove the redundant prefix
                        cleaned_explanation = cleaned_explanation[len(prefix):].strip()
                        if cleaned_explanation.startswith("."):
                            cleaned_explanation = cleaned_explanation[1:].strip()
                            
                if cleaned_explanation:
                    message_parts.append(cleaned_explanation)

            # Third paragraph - edge cases if any
            if edge_cases and edge_cases != "None identified":
                message_parts.append(f"Edge cases: {edge_cases}")

            # Join the paragraphs with double newlines for proper separation
            enhanced_analysis["message"] = "\n\n".join(message_parts).strip()
            
            return enhanced_analysis
                
        except Exception as e:
            # If AI analysis fails, return original analysis with error note
            print(f"AI analysis error: {str(e)}")
            current_analysis["ai_analysis_error"] = str(e)
            return current_analysis

# Helper function to check if AI enhancement should be used
def should_enhance_with_ai() -> bool:
    """Check if AI enhancement is enabled via environment variable."""
    return os.getenv("ENABLE_AI_COMPLEXITY_ANALYSIS", "false").lower() == "true"