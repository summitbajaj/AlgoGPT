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
        - edge_cases: Any edge cases where complexity differs
        - explanation: A short technical explanation of your assessment
        """
        
        # Create user prompt with the code
        user_prompt = f"""
        Function name: {function_name}
        
        ```python
        {source_code}
        ```
        
        Analyze this code's complexity in JSON format.
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
                json_str = re.sub(r'```.*?```', '', json_str, flags=re.DOTALL)
                ai_insights = json.loads(json_str)
                
                # Ensure all fields have the correct types for Pydantic validation
                # Convert lists to strings if needed
                for field in ['edge_cases', 'optimization_suggestions', 'explanation']:
                    if field in ai_insights and isinstance(ai_insights[field], list):
                        ai_insights[field] = ' '.join(ai_insights[field])
                        
            except:
                # Fallback if JSON parsing fails
                ai_insights = {
                    "ai_time_complexity": time_complexity,
                    "space_complexity": "Not determined",
                    "edge_cases": "None identified",
                    "optimization_suggestions": "None provided",
                    "explanation": "Could not parse AI response"
                }
            
            # Merge AI insights with current analysis
            enhanced_analysis = current_analysis.copy()
            enhanced_analysis["ai_analysis"] = ai_insights
            
            # If AI and current analysis disagree on time complexity, note it
            if ai_insights.get("ai_time_complexity") != time_complexity:
                enhanced_analysis["complexity_mismatch"] = True
                enhanced_analysis["ai_time_complexity"] = ai_insights.get("ai_time_complexity")
            
            # Add space complexity from AI analysis
            enhanced_analysis["space_complexity"] = ai_insights.get("space_complexity", "Not determined")
            
            # Generate improved message that includes AI insights
            time_complexity = enhanced_analysis.get("time_complexity")
            ai_time = ai_insights.get("ai_time_complexity")
            space_complexity = ai_insights.get("space_complexity")
            explanation = ai_insights.get("explanation", "")
            optimization = ai_insights.get("optimization_suggestions", "")
            
            # Create more detailed message
            message = f"Your solution has {time_complexity} time complexity"
            
            if ai_time and ai_time != time_complexity:
                message += f" (our AI suggests it might be {ai_time})"
            
            if space_complexity:
                message += f" and {space_complexity} space complexity."
            else:
                message += "."
                
            if explanation:
                message += f" {explanation}"
                
            if optimization:
                message += f" Optimization tip: {optimization}"
                
            enhanced_analysis["message"] = message
            
            return enhanced_analysis
            
        except Exception as e:
            # If AI analysis fails, return original analysis with error note
            current_analysis["ai_analysis_error"] = str(e)
            return current_analysis

# Helper function to check if AI enhancement should be used
def should_enhance_with_ai() -> bool:
    """Check if AI enhancement is enabled via environment variable."""
    return os.getenv("ENABLE_AI_COMPLEXITY_ANALYSIS", "false").lower() == "true"