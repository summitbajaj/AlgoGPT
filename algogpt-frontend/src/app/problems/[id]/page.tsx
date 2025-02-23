"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Problem } from "@/app/utils/api/types";
import { ProblemHeader } from "@/app/components/problem/ProblemHeader";
import { ProblemDescription } from "@/app/components/problem/ProblemDescription";
import { CodeSection } from "@/app/components/problem/CodeSection";
import { CodeExecutionResponse } from "@/app/utils/api/types";

export default function ProblemPage() {
  const params = useParams() as { id: string };
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [output, setOutput] = useState<string[]>([]);

  const handleRun = () => {
    setIsRunning(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:8000/problems/${params.id}`);
        if (!res.ok) throw new Error("Problem not found");
        const data: Problem = await res.json();
        setProblem(data);
        setOutput(Array(data.examples.length).fill(""));
      } catch (err) {
        console.error(err);
        setProblem(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) fetchData();
  }, [params.id]);

  const handleCodeExecution = (result: CodeExecutionResponse) => {
    setIsRunning(false);
    setOutput([JSON.stringify(result, null, 2)]);
    if (!problem) return;

    const newOutput = problem.examples.map((ex, idx) => {
      const testCaseResult = result.test_results[idx] || {};
      const output = testCaseResult.output || "No output";
      const error = testCaseResult.error ? `Error: ${testCaseResult.error}` : "Success";

      return `Test Case ${idx + 1}:
Input: ${ex.input_data}
Expected Output: ${ex.expected_output}
Your Output: ${output}
${error}
Execution Time: ${result.execution_time || "N/A"}ms`;
    });

    console.log(newOutput);
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
    <div className="fixed inset-0 bg-white text-black flex flex-col">
      <ProblemHeader problem={problem} />
      
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={40} minSize={20}>
          <div className="h-full overflow-auto p-4">
            <Card className="p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="solution">Solution</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                </TabsList>

                <TabsContent value="description">
                  <ProblemDescription problem={problem} />
                </TabsContent>

                <TabsContent value="solution">
                  <div className="text-center text-gray-400 italic">
                    Solution content here
                  </div>
                </TabsContent>

                <TabsContent value="submissions">
                  <div className="text-center text-gray-400 italic">
                    Submissions history here
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 h-full bg-gray-200 hover:bg-gray-300 transition-colors" />

        <Panel minSize={30}>
          <CodeSection
            problem={problem}
            isRunning={isRunning}
            activeTestCase={activeTestCase}
            output={output}
            onRun={handleRun}
            onTestCaseChange={setActiveTestCase}
            onExecutionComplete={handleCodeExecution}
            problemId={params.id}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}