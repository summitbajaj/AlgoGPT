"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { PlayIcon, CheckIcon } from "lucide-react"
import Editor from "@monaco-editor/react"
import { PythonEditorComponent } from "@/app/components/PythonEditor"

const problem = {
  id: 1790,
  title: "Check if One String Swap Can Make Strings Equal",
  difficulty: "Easy",
  description: `You are given two strings s1 and s2 of equal length. A string swap is an operation where you choose two indices in a string (not necessarily different) and swap the characters at these indices.

Return true if it is possible to make both strings equal by performing at most one string swap on exactly one of the strings. Otherwise, return false.`,
  examples: [
    {
      input: 's1 = "bank", s2 = "kanb"',
      output: "true",
      explanation: 'For example, swap the first character with the last character of s2 to make "bank".',
    },
    {
      input: 's1 = "attack", s2 = "defend"',
      output: "false",
      explanation: "It is impossible to make them equal with one string swap.",
    },
  ],
  constraints: [
    "1 <= s1.length, s2.length <= 100",
    "s1.length == s2.length",
    "s1 and s2 consist of only lowercase English letters.",
  ],
  starterCode: {
    python: `class Solution:
    def areAlmostEqual(self, s1: str, s2: str) -> bool:
        # Write your code here
        pass`,
    javascript: `/**
 * @param {string} s1
 * @param {string} s2
 * @return {boolean}
 */
var areAlmostEqual = function(s1, s2) {
    // Write your code here
};`,
  },
}

export default function ProblemPage() {
  const [language, setLanguage] = useState("python")
  const [code, setCode] = useState(problem.starterCode.python)
  const [activeTab, setActiveTab] = useState("description")
  const [testCase, setTestCase] = useState({ s1: '"bank"', s2: '"kanb"' })

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
    setCode(problem.starterCode[lang as keyof typeof problem.starterCode])
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
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="solution">Solution</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="p-4">
              <div className="prose dark:prose-invert">
                <p>{problem.description}</p>

                <h3>Example 1:</h3>
                <pre className="bg-white text-black p-2 rounded border border-gray-300 overflow-auto text-sm">
                <div>Input: {problem.examples[0].input}</div>
                  <div>Output: {problem.examples[0].output}</div>
                  <div>Explanation: {problem.examples[0].explanation}</div>
                </pre>

                <h3>Example 2:</h3>
                <pre className="bg-white text-black p-2 rounded border border-gray-300 overflow-auto text-sm">
                <div>Input: {problem.examples[1].input}</div>
                  <div>Output: {problem.examples[1].output}</div>
                  <div>Explanation: {problem.examples[1].explanation}</div>
                </pre>

                <h3>Constraints:</h3>
                <ul>
                  {problem.constraints.map((constraint, index) => (
                    <li key={index}>{constraint}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Right Panel */}
      <div className="flex flex-col h-full">
        {/* Header with language select and run/submit buttons */}
        <div className="flex items-center justify-between mb-4">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="px-2 py-1 border rounded"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>
          <div className="flex gap-2">
            {/* The run button is given an id so the PythonEditorComponent can attach its listener */}
            <Button id="button-run" size="sm">
              <PlayIcon className="w-4 h-4 mr-2" />
              Run
            </Button>
            <Button size="sm" variant="default">
              <CheckIcon className="w-4 h-4 mr-2" />
              Submit
            </Button>
          </div>
        </div>

        {/* Editor Card */}
        <Card className="flex flex-col flex-grow overflow-hidden">
          {language === "python" ? (
            <>
              {/* The container now uses flex-grow and min-h-0 to fill available space */}
              <div id="monaco-editor-root" className="flex-grow min-h-0" />
              <PythonEditorComponent />
            </>
          ) : (
            <Editor
              height="100%"
              defaultLanguage={language}
              value={code}
              onChange={(value) => setCode(value || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                automaticLayout: true,
              }}
            />
          )}
        </Card>

        {/* Test Case Card */}
        <Card className="mt-4 p-4">
          <h3 className="font-medium mb-2">Test Case</h3>
          <div className="grid gap-2">
            <div>
              <label className="text-sm text-gray-600">s1 = </label>
              <input
                type="text"
                value={testCase.s1}
                onChange={(e) =>
                  setTestCase({ ...testCase, s1: e.target.value })
                }
                className="ml-2 px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">s2 = </label>
              <input
                type="text"
                value={testCase.s2}
                onChange={(e) =>
                  setTestCase({ ...testCase, s2: e.target.value })
                }
                className="ml-2 px-2 py-1 border rounded"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
