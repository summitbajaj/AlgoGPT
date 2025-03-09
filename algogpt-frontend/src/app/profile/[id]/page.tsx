"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Problem } from "@/app/utils/api/types";
import { ProblemDescription } from "@/app/components/problem/ProblemDescription";
import { CodeSection } from "@/app/components/problem/CodeSection";
import { PostRunCodeResponse, RunCodeTestCaseResult, SubmitCodeResponse, SubmitCodeTestCaseResult } from "@/app/utils/api/types";
import { InputData } from "@/app/components/problem/InteractiveInput";
import { parseInputValue } from "@/app/utils/utils";
import { Brain, BarChart, Clock, AlertCircle } from "lucide-react";
import AssessmentResults from "@/app/components/profile/AssesmentResultComponent";

// This interface represents the profiling assessment result
interface AssessmentResult {
  skill_level: string;
  topic_assessments: Record<string, {
    mastery_level: number;
    problems_attempted: number;
    problems_solved: number;
  }>;
  recommendations: Array<{
    type: string;
    topic?: string;
    area?: string;
    message: string;
  }>;
  problems_attempted: number;
  problems_solved: number;
  struggle_areas?: Array<{
    area: string;
    count: number;
  }>;
}

export default function ProfilingPage() {
  const router = useRouter();
  
  // Regular problem states
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [testCaseInputs, setTestCaseInputs] = useState<InputData[]>([]);
  
  // Profiling specific state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [profilingStatus, setProfilingStatus] = useState<'initializing' | 'in_progress' | 'completed'>('initializing');
  const [attemptedProblems, setAttemptedProblems] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilingError, setProfilingError] = useState<string | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  // User ID - replace with your authentication system
  const userId = "user123";

  // Add this near the top of your component, with the other state variables
  const mounted = React.useRef(true);

  // First, declare all your event handlers and functions
  const handleRun = () => {
    // Transform each test case input
    const transformedTestCases = testCaseInputs.map((tc) => {
      const transformed: Record<string, unknown> = {};
      for (const key in tc) {
        transformed[key] = parseInputValue(tc[key]);
      }
      return transformed;
    });

    // Send test cases to CodeSection which will forward to PythonEditor
    setTestCaseInputs(transformedTestCases);
    // Set running state
    setIsRunning(true);
  };

  const handleSubmit = () => {
    console.log("Submitting code...");
    setIsSubmitting(true);
    // The actual submission is handled by the PythonEditor component
  };

  // Updated function to handle submission completion
  const handleSubmitComplete = async (result: SubmitCodeResponse) => {
    if (!mounted.current) return; // Early return if component is unmounted
    
    try {
      // Add user ID for profiling
      const submissionWithUser = {
        ...result,
        student_id: userId
      };
      
      // Show progress bar
      setShowProgressBar(true);
      setProgressPercent(20);
      
      // Submit to profiling system
      const response = await fetch('http://localhost:8000/api/profiling/submit-profiling-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          submission_result: submissionWithUser
        })
      });
      
      setProgressPercent(50);
      
      if (!response.ok) throw new Error("Failed to submit answer");
      const data = await response.json();
      
      setProgressPercent(80);
      
      if (!mounted.current) return; // Check again after async operation
      
      if (data.status === 'completed') {
        // Assessment is complete
        setProgressPercent(100);
        setProfilingStatus('completed');
        setAssessmentResult(data.assessment_result);
      } else if (data.status === 'in_progress' && data.next_problem) {
        // Continue with next problem
        setProgressPercent(100);
        setProblem(data.next_problem);
        setAttemptedProblems(prev => prev + 1);
        
        // Initialize test cases for the new problem
        setOutput(Array(data.next_problem.examples.length).fill(""));
        setTestCaseInputs(data.next_problem.examples.map((ex: any) => ex.input_data));
        setActiveTestCase(0);
      } else {
        setProfilingError(data.error || "An error occurred during profiling");
      }
    } catch (error) {
      console.error("Error in profiling submission:", error);
      if (mounted.current) {
        setProfilingError("Failed to process your submission. Please try again.");
      }
    } finally {
      if (mounted.current) {
        setIsSubmitting(false);
        // Hide progress bar after a delay
        setTimeout(() => {
          setShowProgressBar(false);
          setProgressPercent(0);
        }, 600);
      }
    }
  };

  const handleRunCodeExecution = (result: PostRunCodeResponse) => {
    // Reset running state
    setIsRunning(false);
    
    // Log detailed results for debugging
    console.log('Run code result:', JSON.stringify(result, null, 2));
    
    if (!problem) return;
  
    // Create an output array for each test case based on its test_case_id.
    const newOutput = testCaseInputs.map((_, idx) => {
      // Find the corresponding test result and cast it to the proper type
      const testCaseResult = result.test_results.find(
        (tr) => tr.test_case_id === idx
      ) as RunCodeTestCaseResult | undefined;
      const outputValue = testCaseResult?.output ?? "No output";
    
      return `${JSON.stringify(outputValue)}`;
    });

    setOutput(newOutput);
  };
  
  // callback for updating test case inputs
  const handleTestCaseInputChange = (index: number, newData: InputData) => {
    setTestCaseInputs((prev) => {
      const updated = [...prev];
      updated[index] = newData;
      return updated;
    });
  };

  // Add new function to handle adding a test case
  const handleAddTestCase = () => {
    // Create a new empty test case with the same structure as existing ones
    const firstTestCase = testCaseInputs[0];
    
    // Create a new test case with the same keys but empty values
    const newTestCase: InputData = {};
    Object.keys(firstTestCase).forEach(key => {
      // Initialize with the same type but "empty" values
      const existingValue = firstTestCase[key];
      if (Array.isArray(existingValue)) {
        newTestCase[key] = [];
      } else if (typeof existingValue === 'number') {
        newTestCase[key] = 0;
      } else if (typeof existingValue === 'string') {
        newTestCase[key] = "";
      } else if (typeof existingValue === 'boolean') {
        newTestCase[key] = false;
      } else if (existingValue === null) {
        newTestCase[key] = null;
      } else if (typeof existingValue === 'object') {
        newTestCase[key] = {};
      }
    });
    
    // Add the new test case
    setTestCaseInputs(prev => [...prev, newTestCase]);
    
    // Update the output array to match
    setOutput(prev => [...prev, ""]);
    
    // Switch to the new test case
    setActiveTestCase(testCaseInputs.length);
  };

  // Add new function to handle removing a test case
  const handleRemoveTestCase = (index: number) => {
    // Don't allow removing all test cases
    if (testCaseInputs.length <= 1) return;
    
    // Remove the test case at the specified index
    setTestCaseInputs(prev => prev.filter((_, i) => i !== index));
    
    // Also remove the corresponding output
    setOutput(prev => prev.filter((_, i) => i !== index));
    
    // If we're removing the active test case, switch to the previous one
    if (activeTestCase >= index) {
      setActiveTestCase(Math.max(0, activeTestCase - 1));
    }
  };

  // Then, define all your useEffect hooks
  useEffect(() => {
    let isMounted = true; // Add a mounted flag

    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Profiling mode - initialize a profiling session
        console.log("Initializing profiling session");
        // In useEffect
        const response = await fetch('http://localhost:8000/api/profiling/start-profiling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: userId })
        });
        
        if (!response.ok) throw new Error("Failed to start profiling session");
        
        const data = await response.json();
        console.log("Profiling session started:", data);
        
        // Only update state if component is still mounted
        if (isMounted) {
          // Save session ID and initialize with first problem
          setSessionId(data.session_id);
          setProblem(data.problem);
          setProfilingStatus('in_progress');
          
          // Initialize test cases and output for the problem
          setOutput(Array(data.problem.examples.length).fill(""));
          setTestCaseInputs(data.problem.examples.map((ex: any) => ex.input_data));
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setProblem(null);
          setProfilingError("Failed to start profiling session. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Add this useEffect after your other useEffect hooks
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
      </div>
    );
  }

  // Render error states
  if (profilingError) {
    return (
      <div className="p-8 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{profilingError}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/profile')} className="mt-4">
          Return to Profile
        </Button>
      </div>
    );
  }

  if (!problem) {
    return <div className="p-8 text-center text-lg">Problem not found</div>;
  }

  // Render completed profiling assessment
  if (profilingStatus === 'completed' && assessmentResult) {
    return <AssessmentResults assessmentResult={assessmentResult} />;
  }

  // Main problem-solving interface
  return (
    <div className="fixed inset-0 bg-white text-black flex flex-col pt-[60px]">
      {/* Profiling header */}
      <div className="bg-slate-100 py-2 px-4 mb-2 flex justify-between items-center">
        <div className="flex items-center">
          <Brain className="h-5 w-5 text-purple-500 mr-2" />
          <h2 className="font-medium">Profiling Assessment</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <BarChart className="h-4 w-4 text-blue-600 mr-1" />
            <span className="text-sm">
              Topic: <span className="font-medium">{problem.topics?.[0] || "General"}</span>
            </span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span className="text-sm">Problem {attemptedProblems + 1}</span>
          </div>
        </div>
      </div>
      
      {/* Progress bar for transitions */}
      {showProgressBar && (
        <div className="h-1 bg-slate-200 w-full">
          <div 
            className="h-1 bg-blue-600 transition-all duration-500 ease-in-out" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      )}
      
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={40} minSize={20}>
          <div className="h-full overflow-auto p-4">
            <Card className="p-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-0">
                  <TabsTrigger value="description">Description</TabsTrigger>
                </TabsList>

                <TabsContent value="description">
                  <ProblemDescription problem={problem} />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 h-full bg-gray-200 hover:bg-gray-300 transition-colors" />

        <Panel minSize={30}>
          <CodeSection
            key={`profiling_${attemptedProblems}`}
            problem={problem}
            isRunning={isRunning}
            activeTestCase={activeTestCase}
            output={output}
            onRun={handleRun}
            onSubmit={handleSubmit}
            onSubmitComplete={handleSubmitComplete} 
            onTestCaseChange={setActiveTestCase}
            onExecutionComplete={handleRunCodeExecution}
            onTestCaseInputChange={handleTestCaseInputChange}
            testCaseInputs={testCaseInputs}
            onAddTestCase={handleAddTestCase} 
            onRemoveTestCase={handleRemoveTestCase}
            disableWebSocket={true} 
          />
          
          {/* Submission status indicator */}
          {isSubmitting && (
            <Alert className="mt-4 mx-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span>Analyzing your solution and preparing the next question...</span>
              </div>
            </Alert>
          )}
          
          {/* Profiling progress indicator */}
          <div className="p-4">
            <div className="text-sm text-gray-500 flex justify-between mb-1">
              <span>Assessment Progress</span>
              <span>{Math.min(12, attemptedProblems + 1)} / 12</span>
            </div>
            <Progress value={Math.min(100, ((attemptedProblems + 1) / 12) * 100)} className="h-2" />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}