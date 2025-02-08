"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { PlayIcon, CheckIcon, Maximize2Icon } from "lucide-react"
import { PythonEditorComponent } from "@/app/components/PythonEditor"

// Define a more specific interface instead of `any`.
interface ExecutionResult {
  error?: string;
  output?: string | null;
  executionTime?: number | null;
}

const problem = {
  id: 1790,
  title: "Check if One String Swap Can Make Strings Equal",
  difficulty: "Easy",
  description: `You are given two strings s1 and s2 of equal length. A string swap is an operation where you choose two indices in a string (not necessarily different) and swap the characters at these indices.

Return true if it is possible to make both strings equal by performing at most one string swap on exactly one of the strings. Otherwise, return false.`,
  examples: [
    {
      input: { s1: "bank", s2: "kanb" },
      output: "true",
      explanation: 'For example, swap the first character with the last character of s2 to make "bank".',
    },
    {
      input: { s1: "attack", s2: "defend" },
      output: "false",
      explanation: "It is impossible to make them equal with one string swap.",
    },
  ],
  constraints: [
    "1 <= s1.length, s2.length <= 100",
    "s1.length == s2.length",
    "s1 and s2 consist of only lowercase English letters.",
  ],
  starterCode: `class Solution:
    def areAlmostEqual(self, s1: str, s2: str) -> bool:
        # Write your code here
        pass`,
}

export default function ProblemPage() {
  const [activeTab, setActiveTab] = useState("description")
  const [activeTestCase, setActiveTestCase] = useState(0)
  const [output, setOutput] = useState(Array(problem.examples.length).fill(""))
  const [isRunning, setIsRunning] = useState(false)

  // Handler for receiving code execution results
  const handleCodeExecution = (result: ExecutionResult) => {
    console.log('Code execution result:', result)

    // Update the output for all test cases with the actual execution result
    const newOutput = problem.examples.map((example, index) => (
      `Test Case ${index + 1}:
      Input: s1 = "${example.input.s1}", s2 = "${example.input.s2}"
      Expected Output: ${example.output}
      Your Output: ${result.output || 'No output'}
      Execution Result: ${result.error ? 'Error' : 'Success'}
      ${result.error ? `Error: ${result.error}` : ''}
      Execution Time: ${result.executionTime || 'N/A'}`
    ))

    setOutput(newOutput)
    setIsRunning(false)
  }

  const handleRun = async () => {
    setIsRunning(true)
    // The actual execution will be handled by PythonEditorComponent
    // We just need to show "Running..." state
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 h-[calc(100vh-4rem)]">
      {/* Left Panel */}
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">
            {problem.id}. {problem.title}
          </h1>
          <span className="px-2 py-1 text-sm rounded bg-green-200 text-green-800">
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
              <div className="prose dark:prose-invert">
                <p>{problem.description}</p>

                {problem.examples.map((example, index) => (
                  <div key={index}>
                    <h3>Example {index + 1}:</h3>
                    <pre className="bg-white text-black p-2 rounded border border-gray-300 overflow-auto text-sm">
                      {/* Escape quotes using &quot; */}
                      <div>Input: s1 = &quot;{example.input.s1}&quot;, s2 = &quot;{example.input.s2}&quot;</div>
                      <div>Output: {example.output}</div>
                      <div>Explanation: {example.explanation}</div>
                    </pre>
                  </div>
                ))}

                <h3>Constraints:</h3>
                <ul>
                  {problem.constraints.map((constraint, index) => (
                    <li key={index}>{constraint}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="solution" className="p-4">
              <div className="prose dark:prose-invert">
                {/* You could add some editorial or solution steps here */}
                <p>Solution tab content goes here.</p>
              </div>
            </TabsContent>

            <TabsContent value="submissions" className="p-4">
              <div className="prose dark:prose-invert">
                {/* You could list past submissions or results here */}
                <p>Submissions tab content goes here.</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Right Panel */}
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-end mb-4">
          <div className="flex gap-2">
            <Button id="button-run" size="sm" onClick={handleRun} disabled={isRunning}>
              <PlayIcon className="w-4 h-4 mr-2" />
              Run
            </Button>
            <Button size="sm" variant="default">
              <CheckIcon className="w-4 h-4 mr-2" />
              Submit
            </Button>
          </div>
        </div>

        <div className="flex flex-col flex-grow">
          {/* Code Editor */}
          <Card className="flex-grow mb-4">
            <div id="monaco-editor-root" className="h-full" />
            <PythonEditorComponent onExecutionComplete={handleCodeExecution} />
          </Card>

          {/* Console Output */}
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
              {isRunning ? (
                <div>Running test cases...</div>
              ) : (
                <pre className="whitespace-pre-wrap">
                  {output[activeTestCase] || 'Click "Run" to execute the code.'}
                </pre>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
