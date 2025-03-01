"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Problem } from "@/app/utils/api/types";
import { ProblemDescription } from "@/app/components/problem/ProblemDescription";
import { CodeSection } from "@/app/components/problem/CodeSection";
import { PostRunCodeResponse, RunCodeTestCaseResult, SubmitCodeResponse, SubmitCodeTestCaseResult } from "@/app/utils/api/types";
import { InputData } from "@/app/components/problem/InteractiveInput";
import { parseInputValue } from "@/app/utils/utils";
import { AIChat } from "@/app/components/problem/AIChat";
import { WebSocketProvider } from "@/app/context/WebSocketContext";
import { SubmissionsTab } from "@/app/components/problem/SubmissionComponent";

export default function ProblemPage() {
  const params = useParams<{ id: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [testCaseInputs, setTestCaseInputs] = useState<InputData[]>([]);
  
  // Add state for submissions
  const [submissions, setSubmissions] = useState<SubmitCodeResponse[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmitCodeResponse | null>(null);
  
  // Replace with your actual user authentication
  const dummyUserId = "user123";

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
    // The actual submission is handled by the PythonEditor component
  };

  // Updated function to handle submission completion
  const handleSubmitComplete = (result: SubmitCodeResponse) => {
    // Add the submission to our state
    setSubmissions((prev) => [result, ...prev]);
    setSelectedSubmission(result);
    
    // Switch to submissions tab
    setActiveTab("submissions");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:8000/problems/${params.id}`);
        if (!res.ok) throw new Error("Problem not found");
        const data: Problem = await res.json();
        setProblem(data);
        setOutput(Array(data.examples.length).fill(""));
        // initialize testCaseInputs state
        setTestCaseInputs(data.examples.map((ex) => ex.input_data));
      } catch (err) {
        console.error(err);
        setProblem(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) fetchData();
  }, [params.id]);

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

  // Add new function to use a test case from a submission
  const handleUseTestCase = (testCase: SubmitCodeTestCaseResult) => {
    // Create a new test case from the submission's test case
    const newTestCase: InputData = { ...testCase.input };
    
    // Add the new test case
    setTestCaseInputs(prev => {
      const updatedTestCases = [...prev, newTestCase];
      // Switch to the new test case (note we need to use the new length)
      setTimeout(() => {
        setActiveTestCase(updatedTestCases.length - 1);
      }, 0);
      return updatedTestCases;
    });
    
    // Add an empty output for this test case
    setOutput(prev => [...prev, ""]);
    
    // Switch to description tab
    setActiveTab("description");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
      </div>
    );
  }

  if (!problem) {
    return <div className="p-8 text-center text-lg">Problem not found</div>;
  }

  return (
    <WebSocketProvider userId={dummyUserId} problemId={params.id}>
      <div className="fixed inset-0 bg-white text-black flex flex-col pt-[60px]">
        <PanelGroup direction="horizontal" className="flex-1">
          <Panel defaultSize={40} minSize={20}>
            <div className="h-full overflow-auto p-4">
              <Card className="p-2">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-0">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="submissions">Submissions</TabsTrigger>
                    <TabsTrigger value="ai-chat">AI Chat</TabsTrigger>
                  </TabsList>

                  <TabsContent value="description">
                    <ProblemDescription problem={problem} />
                  </TabsContent>

                  <TabsContent value="submissions">
                    <SubmissionsTab 
                      submissions={submissions} 
                      selectedSubmission={selectedSubmission}
                      onSelectSubmission={setSelectedSubmission}
                      onUseTestCase={handleUseTestCase} // Add the new prop
                    />
                  </TabsContent>

                  <TabsContent value="ai-chat" className="h-[calc(100vh-220px)]">
                    <AIChat problemInfo={{problemId: params.id, problemTitle: problem.title}} />
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 h-full bg-gray-200 hover:bg-gray-300 transition-colors" />

          <Panel minSize={30}>
            <CodeSection
              key={params.id}
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
            />
          </Panel>
        </PanelGroup>
      </div>
    </WebSocketProvider>
  );
}