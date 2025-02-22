"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Problem, ExecutionResult } from "./types";
import { ProblemHeader } from "@/app/components/problem/ProblemHeader";
import { ProblemDescription } from "@/app/components/problem/ProblemDescription";
import { CodeSection } from "@/app/components/problem/CodeSection";

export default function ProblemPage() {
  const params = useParams() as { id: string };
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [output, setOutput] = useState<string[]>([]);

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

  const handleCodeExecution = (result: ExecutionResult) => {
    if (!problem) return;
    const newOutput = problem.examples.map((ex, idx) => `Test Case ${idx + 1}:
Input: ${ex.input}
Expected Output: ${ex.output}
Your Output: ${result.output || "No output"}
${result.error ? "Error: " + result.error : "Success"}
Execution Time: ${result.executionTime || "N/A"}ms`);
    setOutput(newOutput);
    setIsRunning(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" /></div>;
  if (!problem) return <div className="p-8 text-center text-lg">Problem not found</div>;

  return (
    <div className="fixed inset-0 bg-white text-black flex flex-col">
      <ProblemHeader problem={problem} />
      
      <div className="flex-1 grid grid-cols-[40%_60%] overflow-hidden">
        <div className="overflow-auto p-4">
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
                <div className="text-center text-gray-400 italic">Solution content here</div>
              </TabsContent>

              <TabsContent value="submissions">
                <div className="text-center text-gray-400 italic">Submissions history here</div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <CodeSection
          problem={problem}
          isRunning={isRunning}
          activeTestCase={activeTestCase}
          output={output}
          onRun={() => setIsRunning(true)}
          onTestCaseChange={setActiveTestCase}
          onExecutionComplete={handleCodeExecution}
        />
      </div>
    </div>
  );
}
