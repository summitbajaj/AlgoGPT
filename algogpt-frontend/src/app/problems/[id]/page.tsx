"use client";

import React, { useState, useEffect, DetailedHTMLProps, HTMLAttributes } from "react";
import { useParams } from "next/navigation";

// Your UI components (shadcn/UI or your own)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

// Icons
import { PlayIcon, CheckIcon, Maximize2Icon } from "lucide-react";

// Editor + Types
import { PythonEditorComponent } from "@/app/components/PythonEditor";
import { Problem, ExecutionResult } from "./types";

// Markdown packages
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/** ---------------------------
 *  Custom Markdown Components
 * --------------------------- */
type MarkdownComponentProps<T extends HTMLElement> = DetailedHTMLProps<
  HTMLAttributes<T>,
  T
>;

const MarkdownComponents: Components = {
  code: ({ inline, children, ...props }: any) => {
    if (inline) {
      return (
        <code
          className="
            bg-gray-100 
            text-gray-900
            font-mono 
            text-sm
            px-1 
            py-[2px]
            rounded-md
            whitespace-nowrap
            align-middle
            border
            border-gray-200
          "
          {...props}
        >
          {children}
        </code>
      );
    }

    // For content-width code blocks
    return (
      <span className="inline-block">
        <pre className="bg-gray-100 text-gray-900 rounded-md px-2 py-[2px] font-mono text-sm">
          <code {...props}>{children}</code>
        </pre>
      </span>
    );
  },

  p: ({ children, ...props }: MarkdownComponentProps<HTMLParagraphElement>) => (
    <p 
      className="
        text-base 
        leading-7 
        mb-4
        [&_code]:align-middle
        [&_code]:relative
        [&_code]:top-[-1px]
      " 
      {...props}
    >
      {children}
    </p>
  ),

  pre: ({ children, ...props }: MarkdownComponentProps<HTMLPreElement>) => (
    <span className="inline-block">
      {children}
    </span>
  )
};


/** ---------------------------
 *  Helper Functions
 * --------------------------- */
const parseConstraints = (constraintsStr: string): string[] => {
  if (!constraintsStr) return [];
  return constraintsStr
    .split(/[\n,]/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 0);
};

const processConstraintText = (text: string) => {
  // Example: "10^4" => "$$10^{4}$$"
  return text.replace(/(\d+)\^(\d+)/g, "$$$1^{$2}$$");
};

/** ---------------------------
 *  Main Page Component
 * --------------------------- */
export default function ProblemPage() {
  const params = useParams() as { id: string };
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState("description");
  // Output tabs for testcases
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [output, setOutput] = useState<string[]>([]);

  // Fetch problem from your API
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

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  // Called when user code finishes execution
  const handleCodeExecution = (result: ExecutionResult) => {
    if (!problem) return;
    const newOutput = problem.examples.map((ex, idx) => {
      return `Test Case ${idx + 1}:
Input: ${ex.input}
Expected Output: ${ex.output}
Your Output: ${result.output || "No output"}
${result.error ? "Error: " + result.error : "Success"}
Execution Time: ${result.executionTime || "N/A"}ms`;
    });
    setOutput(newOutput);
    setIsRunning(false);
  };

  // "Run" button
  const handleRun = () => {
    setIsRunning(true);
    // Actual code running is handled inside <PythonEditorComponent />
  };

  // Loading states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
      </div>
    );
  }
  if (!problem) {
    return (
      <div className="p-8 text-center text-lg">Problem not found</div>
    );
  }

  return (
    /** 
     * We fix the entire layout so there's no page scroll.
     * Each column can scroll internally.
     */
    <div className="fixed inset-0 bg-white text-black flex flex-col">
      {/* (Optional) If you have a nav bar, you can place it here with shrink-0 */}
      {/* Title row */}
      <div className="p-4 border-b shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <h1 className="text-2xl font-bold">
            {problem.id}. {problem.title}
          </h1>
          <span
            className={`px-2 py-1 text-sm rounded mt-2 sm:mt-0 ${
              problem.difficulty === "Easy"
                ? "bg-green-200 text-green-800"
                : problem.difficulty === "Medium"
                ? "bg-yellow-200 text-yellow-800"
                : "bg-red-200 text-red-800"
            }`}
          >
            {problem.difficulty}
          </span>
        </div>
      </div>

      {/* Main content area: 2 columns, each scrollable */}
      <div className="flex-1 grid grid-cols-[40%_60%] overflow-hidden">
        {/* Left Column (Problem) */}
        <div className="overflow-auto p-4">
          <Card className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="solution">Solution</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
              </TabsList>

              {/* Description tab */}
              <TabsContent value="description">
                <div className="problem-container">
                  <div className="prose prose-slate max-w-full">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={MarkdownComponents}
                    >
                      {problem.description}
                    </ReactMarkdown>
                  </div>

                  {/* Examples */}
                  {problem.examples.map((ex, idx) => (
                    <div key={idx} className="mt-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Example {idx + 1}:
                      </h3>
                      <div className="bg-white border border-gray-200 p-4 rounded text-sm">
                        <p className="mb-2">
                          <strong>Input:</strong> {ex.input}
                        </p>
                        <p className="mb-2">
                          <strong>Output:</strong> {ex.output}
                        </p>
                        {ex.explanation && (
                          <p>
                            <strong>Explanation:</strong> {ex.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Constraints */}
                  {problem.constraints && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Constraints:
                      </h3>
                      <div className="bg-white border border-gray-200 p-4 rounded text-sm">
                        <ul className="list-none space-y-1">
                          {parseConstraints(problem.constraints).map((c, i) => (
                            <li key={i} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span className="font-mono">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                >
                                  {processConstraintText(c)}
                                </ReactMarkdown>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Solution tab */}
              <TabsContent value="solution">
                <div className="text-center text-gray-400 italic">
                  Solution content here
                </div>
              </TabsContent>

              {/* Submissions tab */}
              <TabsContent value="submissions">
                <div className="text-center text-gray-400 italic">
                  Submissions history here
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right Column (Editor + Output) */}
        <div className="overflow-auto p-4 flex flex-col">
          {/* Run / Submit */}
          <div className="mb-4 flex justify-end gap-2">
            <Button
              onClick={handleRun}
              disabled={isRunning}
              className="bg-black text-white hover:bg-neutral-800"
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Run
            </Button>
            <Button className="bg-black text-white hover:bg-neutral-800">
              <CheckIcon className="w-4 h-4 mr-2" />
              Submit
            </Button>
          </div>

          {/* Editor */}
          <Card className="flex-1 mb-4 overflow-hidden">
            <div className="h-full" id="monaco-editor-root">
              <PythonEditorComponent
                initialCode={problem.starter_code}
                onExecutionComplete={handleCodeExecution}
              />
            </div>
          </Card>

          {/* Output (test‐case tabs) */}
          <Card className="shrink-0">
            <div className="border-b p-2 flex items-center justify-between">
              <Tabs
                value={`case-${activeTestCase}`}
                onValueChange={(val) =>
                  setActiveTestCase(parseInt(val.replace("case-", ""), 10))
                }
              >
                <TabsList>
                  {problem.examples.map((_, i) => (
                    <TabsTrigger key={i} value={`case-${i}`}>
                      Case {i + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <button
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Maximize"
              >
                <Maximize2Icon className="w-4 h-4" />
              </button>
            </div>
            <div className="h-32 bg-black text-white p-4 font-mono text-sm overflow-auto">
              <pre className="whitespace-pre-wrap">
                {isRunning
                  ? "Running test cases..."
                  : output[activeTestCase] || 'Click "Run" to execute.'}
              </pre>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
