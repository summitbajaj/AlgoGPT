"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Problem } from "@/app/utils/api/types";
import { ProblemDescription } from "@/app/components/problem/ProblemDescription";
import { CodeSection } from "@/app/components/problem/CodeSection";
import { PostRunCodeResponse, RunCodeTestCaseResult } from "@/app/utils/api/types";
import { InputData } from "@/app/components/problem/InteractiveInput";
import { parseInputValue } from "@/app/utils/utils";
import { AIChat } from "@/app/components/problem/AIChat";
import { WebSocketProvider } from "@/app/context/WebSocketContext";

export default function ProblemPage() {
  const params = useParams<{ id: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [testCaseInputs, setTestCaseInputs] = useState<InputData[]>([]);
  
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
    setTestCaseInputs(transformedTestCases)
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
    setIsRunning(false);
    if (!problem) return;
  
    // Create an output array for each test case based on its test_case_id.
    const newOutput = problem.examples.map((ex, idx) => {
      // Find the corresponding test result and cast it to the proper type
      const testCaseResult = result.test_results.find(
        (tr) => tr.test_case_id === idx
      ) as RunCodeTestCaseResult | undefined;
      const outputValue = testCaseResult?.output ?? "No output";
    
      return `${JSON.stringify(outputValue)}`;
    });

    setOutput(newOutput);
  };
  

  // new callback for updating test case inputs
  const handleTestCaseInputChange = (index: number, newData: InputData) => {
    setTestCaseInputs((prev) => {
      const updated = [...prev];
      updated[index] = newData;
      return updated;
    });
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
                    <TabsTrigger value="solution">Solution</TabsTrigger>
                    <TabsTrigger value="ai-chat">AI Chat</TabsTrigger>
                  </TabsList>

                  <TabsContent value="description">
                    <ProblemDescription problem={problem} />
                  </TabsContent>

                  <TabsContent value="solution">
                    <div className="text-center text-gray-400 italic">
                      Solution content here
                    </div>
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
              onTestCaseChange={setActiveTestCase}
              onExecutionComplete={handleRunCodeExecution}
              problemId={params.id}
              onTestCaseInputChange={handleTestCaseInputChange}
              testCaseInputs={testCaseInputs}
            />
          </Panel>
        </PanelGroup>
      </div>
    </WebSocketProvider>
  );
}