import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayIcon, CheckIcon, Maximize2Icon, PlusIcon, XIcon } from "lucide-react";
import { PythonEditorComponent } from "@/app/components/PythonEditor";
import { Problem } from "@/app/utils/api/types";
import { PostRunCodeResponse, SubmitCodeResponse } from "@/app/utils/api/types";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import InteractiveInput, { InputData } from "./InteractiveInput";
import { parseInputValue } from "@/app/utils/utils";

interface CodeSectionProps {
  problem: Problem;
  isRunning: boolean;
  activeTestCase: number;
  output: string[];
  onRun: () => void;
  onSubmit: () => void;
  onTestCaseChange: (index: number) => void;
  onExecutionComplete: (result: PostRunCodeResponse) => void;
  onSubmitComplete?: (result: SubmitCodeResponse) => void;
  onTestCaseInputChange?: (index: number, newData: InputData) => void;
  testCaseInputs: InputData[];
  onAddTestCase?: () => void;
  onRemoveTestCase?: (index: number) => void;
  disableWebSocket?: boolean; 
  userId: string;
}

export function CodeSection({
  problem,
  isRunning,
  activeTestCase,
  output,
  onRun,
  onSubmit,
  onTestCaseChange,
  onExecutionComplete,
  onSubmitComplete,
  onTestCaseInputChange,
  testCaseInputs,
  onAddTestCase,
  onRemoveTestCase,
  disableWebSocket = false, // Default to false,
  userId,
}: CodeSectionProps) {

  const [hasRun, setHasRun] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonCooldown, setButtonCooldown] = useState(false);
  const [activeTab, setActiveTab] = useState<"testcase" | "output">("testcase");
  
  // Store the test cases that were actually run (for the output tab)
  const [runTestCases, setRunTestCases] = useState<InputData[]>([]);
  const [runActiveTestCase, setRunActiveTestCase] = useState(0);
  
  // Handle switching the active test case in output tab
  const handleOutputTestCaseChange = (index: number) => {
    if (index < runTestCases.length) {
      setRunActiveTestCase(index);
    }
  };

  // Switch to output tab when running code
  const handleRunClick = () => {
    // Mark that the user has now run the code
    setHasRun(true);
    // Enable cooldown to prevent rapid button pressing
    setButtonCooldown(true);
    // Set a timeout to re-enable the button after 3 seconds
    setTimeout(() => {
      setButtonCooldown(false);
    }, 3000);
    
    // Store the current test cases for output tab
    setRunTestCases([...testCaseInputs]);
    setRunActiveTestCase(activeTestCase);
    
    // Switch to output tab
    setActiveTab("output");
    // Then call the parent-provided onRun logic
    onRun();
  };

  return (
    <div className="h-full w-full flex flex-col p-4">
      {/* Run/Submit buttons */}
      <div className="mb-4 flex justify-end gap-2">
        <Button
          id="button-run"
          onClick={handleRunClick}
          disabled={isRunning || isSubmitting || buttonCooldown}
          className="bg-black text-white hover:bg-neutral-800"
        > 
          <PlayIcon className="w-4 h-4 mr-2" />
          Run
        </Button>
        <Button 
          id="button-submit"
          onClick={() => {
            setIsSubmitting(true);
            // Set a timeout to re-enable the button after 5 seconds as a fallback
            setTimeout(() => {
              setIsSubmitting(false);
            }, 5000);
            
            // Store the current test cases for output tab
            setRunTestCases([...testCaseInputs]);
            setRunActiveTestCase(activeTestCase);
            
            // Switch to output tab
            setActiveTab("output");
            onSubmit();
          }}
          disabled={isRunning || isSubmitting || buttonCooldown}
          className="bg-black text-white hover:bg-neutral-800"
        >
          <CheckIcon className="w-4 h-4 mr-2" />
          Submit
        </Button>
      </div>

      {/* Container with resizable panels */}
      <div className="flex-grow min-h-0 flex flex-col w-full">
        <PanelGroup direction="vertical" className="flex-1">
          <Panel defaultSize={70} minSize={30}>
            <Card className="h-full overflow-hidden">
              <div className="h-full w-full" id="monaco-editor-root">
                <PythonEditorComponent
                  key={problem.problem_id}
                  initialCode={problem.starter_code}
                  onRunCodeComplete={onExecutionComplete}
                  onSubmitCodeComplete={onSubmitComplete}
                  problemId={problem.problem_id}
                  disableWebSocket={disableWebSocket} // Pass the prop to PythonEditor
                  testCaseInputs={testCaseInputs.map((tc, index) => {
                    // Transform each key in the test case input
                    const parsed: Record<string, unknown> = {};
                    for (const key in tc) {
                      parsed[key] = parseInputValue(tc[key]);
                    }
                    return {
                      test_case_id: index,
                      input: parsed as Record<string, never>,
                    };
                  })}
                  userId = {userId}
                />
              </div>
            </Card>
          </Panel>

          <PanelResizeHandle className="w-full h-2 bg-gray-200 hover:bg-gray-300 cursor-row-resize" />

          <Panel defaultSize={30} minSize={20}>
            <div className="h-full border rounded-md overflow-hidden">
              {/* Main Tabs: Test Case / Output */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab("testcase")}
                  className={`flex-1 py-3 px-6 text-center ${
                    activeTab === "testcase" ? "border-b-2 border-black font-medium" : "text-gray-500"
                  }`}
                >
                  Test Case
                </button>
                <button
                  onClick={() => setActiveTab("output")}
                  className={`flex-1 py-3 px-6 text-center ${
                    activeTab === "output" ? "border-b-2 border-black font-medium" : "text-gray-500"
                  }`}
                >
                  Output
                </button>
                <button className="px-3 text-gray-500 hover:text-gray-700">
                  <Maximize2Icon className="w-4 h-4" />
                </button>
              </div>

              {/* Test Case Tab Content */}
              {activeTab === "testcase" && (
                <div className="h-[calc(100%-49px)] flex flex-col">
                  <div className="border-b">
                    <div className="flex items-center overflow-x-auto px-4 py-3">
                      {testCaseInputs.map((_, i) => (
                        <div
                          key={i}
                          className={`relative group px-4 py-2 mr-2 rounded-lg cursor-pointer ${
                            i === activeTestCase 
                              ? 'bg-black text-white' 
                              : 'bg-white border border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => onTestCaseChange(i)}
                        >
                          Case {i + 1}
                          {/* Remove test case button */}
                          {(testCaseInputs.length > 1) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveTestCase?.(i);
                              }}
                              className="absolute -top-1 -right-1 bg-gray-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XIcon className="w-3 h-3 text-gray-600" />
                            </button>
                          )}
                        </div>
                      ))}
                      {/* Add new test case button - only show if less than max cases */}
                      {testCaseInputs.length < 6 && (
                        <button
                          onClick={onAddTestCase}
                          className="text-gray-500 hover:text-gray-700 mr-2"
                        >
                          <PlusIcon className="w-5 h-5" />
                        </button>
                      )}
                      
                      {/* Reset button - aligned to the right */}
                      <div className="ml-auto">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            // Reset test cases to their original values from the problem
                            const originalInputs = problem.examples.map(ex => ex.input_data);
                            testCaseInputs.forEach((_, index) => {
                              if (index < originalInputs.length) {
                                onTestCaseInputChange?.(index, originalInputs[index]);
                              }
                            });
                            // Reset active test case to the first one
                            onTestCaseChange(0);
                          }}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Reset Test Cases
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-grow overflow-auto">
                    <div className="p-6">
                      <div>
                        <div className="text-lg font-bold mb-4">Input:</div>
                        <div>
                          <InteractiveInput
                            inputData={testCaseInputs[activeTestCase]}
                            onChange={(newData) => {
                              onTestCaseInputChange?.(activeTestCase, newData);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Output Tab Content */}
              {activeTab === "output" && (
                <div className="h-[calc(100%-49px)] flex flex-col">
                  <div className="border-b">
                    <div className="flex items-center overflow-x-auto px-4 py-3">
                      {runTestCases.map((_, i) => (
                        <div
                          key={i}
                          className={`px-4 py-2 mr-2 rounded-lg cursor-pointer ${
                            i === runActiveTestCase 
                              ? 'bg-black text-white' 
                              : 'bg-white border border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleOutputTestCaseChange(i)}
                        >
                          Case {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-grow overflow-auto">
                    {hasRun && runTestCases.length > 0 && (
                      <div className="p-6">
                        <div className="mb-6">
                          <div className="text-lg font-bold mb-4">Input:</div>
                          <div className="bg-white p-4 rounded border">
                            {Object.entries(runTestCases[runActiveTestCase] || {}).map(([key, value]) => (
                              <div key={key} className="mb-1 font-mono">
                                <span className="text-blue-600">{key}</span>
                                <span className="text-gray-600"> = </span>
                                <span className="text-amber-700">{JSON.stringify(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-lg font-bold mb-4">Your Output:</div>
                          <pre className="bg-white p-4 rounded border font-mono">
                            {isRunning 
                              ? "Running test case..." 
                              : (runActiveTestCase < output.length ? output[runActiveTestCase] : "")}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {(!hasRun || runTestCases.length === 0) && (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-gray-500">Run your code to see the output</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}