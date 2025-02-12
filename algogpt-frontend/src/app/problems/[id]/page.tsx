"use client";

import React, { useState, useEffect, DetailedHTMLProps, HTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { PlayIcon, CheckIcon, Maximize2Icon } from "lucide-react";
import { PythonEditorComponent } from "@/app/components/PythonEditor";
import { useParams } from "next/navigation";
import ReactMarkdown, {Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Problem, ExecutionResult } from "./types";

type MarkdownComponentProps<T extends HTMLElement> = DetailedHTMLProps<HTMLAttributes<T>, T>;


// Helper functions
const parseConstraints = (constraintsStr: string): string[] => {
  if (!constraintsStr) return [];
  return constraintsStr
    .split(/[\n,]/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 0);
};

const processConstraintText = (text: string) => {
  // Replace 10^n with proper math notation
  return text.replace(/(\d+)\^(\d+)/g, '$$$1^{$2}$$');
};

const processDescriptionText = (text: string) => {
  return text
    // Add spaces around text between backticks if missing
    .replace(/(\S)`([^`]+)`(\S)/g, '$1 `$2` $3');
};

// Custom markdown components
const MarkdownComponents: Components = {
  p: (props: MarkdownComponentProps<HTMLParagraphElement>) => (
    <p className="mb-4 leading-7" {...props} />
  ),
  pre: (props: MarkdownComponentProps<HTMLPreElement>) => (
    <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-auto my-4" {...props} />
  ),
  code: ({ inline, ...props }: MarkdownComponentProps<HTMLElement> & { inline?: boolean }) => (
    inline ? 
      <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} /> :
      <code {...props} />
  ),
  ul: (props: MarkdownComponentProps<HTMLUListElement>) => (
    <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />
  ),
  ol: (props: MarkdownComponentProps<HTMLOListElement>) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />
  ),
  li: (props: MarkdownComponentProps<HTMLLIElement>) => (
    <li className="mb-1" {...props} />
  ),
  blockquote: (props: MarkdownComponentProps<HTMLQuoteElement>) => (
    <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-4 my-4 italic" {...props} />
  ),
  h1: (props: MarkdownComponentProps<HTMLHeadingElement>) => (
    <h1 className="text-3xl font-bold mb-4 mt-6" {...props} />
  ),
  h2: (props: MarkdownComponentProps<HTMLHeadingElement>) => (
    <h2 className="text-2xl font-bold mb-3 mt-5" {...props} />
  ),
  h3: (props: MarkdownComponentProps<HTMLHeadingElement>) => (
    <h3 className="text-xl font-bold mb-2 mt-4" {...props} />
  ),
};

export default function ProblemPage() {
  const params = useParams() as { id: string };
  const [problem, setProblem] = useState<Problem | null>(null);
  const [activeTab, setActiveTab] = useState<string>("description");
  const [activeTestCase, setActiveTestCase] = useState<number>(0);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const response = await fetch(`http://localhost:8000/problems/${params.id}`);
        if (!response.ok) {
          throw new Error("Problem not found");
        }
        const data = await response.json() as Problem;
        setProblem(data);
        setOutput(Array(data.examples.length).fill(""));
      } catch (error) {
        console.error("Error fetching problem:", error);
        setProblem(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchProblem();
    }
  }, [params.id]);

  const handleCodeExecution = (result: ExecutionResult) => {
    if (!problem) return;

    const newOutput = problem.examples.map((example, index) => {
      return `Test Case ${index + 1}:
Input: ${example.input}
Expected Output: ${example.output}
Your Output: ${result.output || "No output"}
Execution Result: ${result.error ? "Error" : "Success"}
${result.error ? `Error: ${result.error}` : ""}
Execution Time: ${result.executionTime || "N/A"}ms`;
    });

    setOutput(newOutput);
    setIsRunning(false);
  };

  const handleRun = async () => {
    setIsRunning(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Problem not found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 h-[calc(100vh-4rem)]">
      {/* Left Panel */}
      <div className="flex flex-col h-full overflow-auto pr-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">
            {problem.id}. {problem.title}
          </h1>
          <span
            className={`px-2 py-1 text-sm rounded ${
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

        <Card className="flex-grow overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="sticky top-0 z-10 w-full bg-background border-b rounded-none">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="solution">Solution</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="p-4">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={MarkdownComponents}
                >
                  {processDescriptionText(problem.description)}
                </ReactMarkdown>

                {/* Examples */}
                {problem.examples.map((example, index) => (
                  <div key={index} className="mb-6">
                    <h3 className="text-lg font-medium mb-2">
                      Example {index + 1}:
                    </h3>
                    <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-auto text-sm">
                      <div className="mb-2">
                        <strong>Input:</strong>{" "}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {example.input}
                        </ReactMarkdown>
                      </div>
                      <div className="mb-2">
                        <strong>Output:</strong>{" "}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {example.output}
                        </ReactMarkdown>
                      </div>
                      {example.explanation && (
                        <div>
                          <strong>Explanation:</strong>{" "}
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {example.explanation}
                          </ReactMarkdown>
                        </div>
                      )}
                    </pre>
                  </div>
                ))}

                {/* Constraints */}
                {problem.constraints && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Constraints:</h3>
                    <div className="bg-slate-950 p-4 rounded-lg">
                      <ul className="list-none text-slate-50 text-sm space-y-1">
                        {parseConstraints(problem.constraints).map(
                          (constraint, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span className="font-mono">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                >
                                  {processConstraintText(constraint)}
                                </ReactMarkdown>
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Topics */}
                {problem.topics && problem.topics.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Topics:</h3>
                    <div className="flex flex-wrap gap-2">
                      {problem.topics.map((topic, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="solution" className="p-4">
              <div className="prose dark:prose-invert">
                <p>Solution will be available after you submit your answer.</p>
              </div>
            </TabsContent>

            <TabsContent value="submissions" className="p-4">
              <div className="prose dark:prose-invert">
                <p>Your submission history will appear here.</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Right Panel */}
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-end mb-4">
          <div className="flex gap-2">
            <Button
              id="button-run"
              size="sm"
              onClick={handleRun}
              disabled={isRunning}
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Run
            </Button>
            <Button size="sm" variant="default">
              <CheckIcon className="w-4 h-4 mr-2" />
              Submit
            </Button>
          </div>
        </div>

        <Card className="flex-grow flex flex-col h-[500px]">
          <div className="flex-grow">
            <div id="monaco-editor-root" style={{ height: "100%" }}>
              <PythonEditorComponent 
              onExecutionComplete={handleCodeExecution}
              initialCode={problem.starter_code} />
            </div>
          </div>
        </Card>

        <Card className="h-[200px] flex flex-col">
          <div className="flex items-center justify-between border-b p-2">
            <Tabs
              value={`testcase-${activeTestCase}`}
              onValueChange={(value) =>
                setActiveTestCase(Number(value.split("-")[1]))
              }
            >
              <TabsList>
                {problem.examples.map((_, index) => (
                  <TabsTrigger key={index} value={`testcase-${index}`}>
                    Case {index + 1}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button variant="ghost" size="sm">
              <Maximize2Icon className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-grow p-4 font-mono text-sm overflow-auto bg-black text-white">
            <pre className="whitespace-pre-wrap m-0">
              {isRunning
                ? "Running test cases..."
                : output[activeTestCase] || 'Click "Run" to execute the code.'}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}