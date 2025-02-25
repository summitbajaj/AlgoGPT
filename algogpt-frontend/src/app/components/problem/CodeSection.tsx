import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlayIcon, CheckIcon, Maximize2Icon } from "lucide-react";
import { PythonEditorComponent } from "@/app/components/PythonEditor";
import { Problem } from "@/app/utils/api/types";
import { PostRunCodeResponse } from "@/app/utils/api/types";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import InteractiveInput, { InputData } from "./InteractiveInput";
import { parseInputValue } from "@/app/utils/utils";

interface CodeSectionProps {
  problem: Problem;
  isRunning: boolean;
  activeTestCase: number;
  output: string[];
  onRun: () => void;
  onTestCaseChange: (index: number) => void;
  onExecutionComplete: (result: PostRunCodeResponse ) => void;
  problemId: string;
  onTestCaseInputChange?: (index: number, newData: InputData) => void;
  testCaseInputs: InputData[];
}

// local state to track whether the user has run the code

export function CodeSection({
  problem,
  isRunning,
  activeTestCase,
  output,
  onRun,
  onTestCaseChange,
  onExecutionComplete,
  onTestCaseInputChange,
  testCaseInputs,
}: CodeSectionProps) {

  const [hasRun, setHasRun] = useState(false);

  return (
    <div className="h-full w-full flex flex-col p-4">
      {/* Run/Submit buttons */}
      <div className="mb-4 flex justify-end gap-2">
      <Button
          id="button-run"
          onClick={() => {
            // Mark that the user has now run the code
            setHasRun(true);
            // Then call the parent-provided onRun logic
            onRun();
          }}
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

      {/* Container with resizable panels */}
      <div className="flex-grow min-h-0 flex flex-col w-full">
        <PanelGroup direction="vertical" className="flex-1">
          <Panel defaultSize={70} minSize={30}>
            <Card className="h-full overflow-hidden">
              <div className="h-full w-full" id="monaco-editor-root">
                <PythonEditorComponent
                  initialCode={problem.starter_code}
                  onRunCodeComplete={onExecutionComplete}
                  problemId={problem.problem_id}
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
                />
              </div>
            </Card>
          </Panel>

          <PanelResizeHandle className="w-full h-2 bg-gray-200 hover:bg-gray-300 cursor-row-resize" />

          <Panel defaultSize={30} minSize={20}>
            <Card className="h-full overflow-hidden">
              <Tabs
                value={`case-${activeTestCase}`}
                onValueChange={(val) =>
                  onTestCaseChange(parseInt(val.replace("case-", ""), 10))
                }
                className="flex flex-col h-full"
              >
                <div className="border-b p-2 flex items-center justify-between">
                  <TabsList className="rounded-md">
                    {problem.examples.map((_, i) => (
                      <TabsTrigger key={i} value={`case-${i}`} className="rounded-md">
                        Case {i + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <button
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Maximize"
                  >
                    <Maximize2Icon className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-grow overflow-auto p-4 bg-gray-100 text-black rounded-b-lg">
                  {problem.examples.map((example, i) => {
                    return (
                      <TabsContent key={i} value={`case-${i}`}>
                        <div className="mb-2">
                          <strong className="block mb-1">Input:</strong>
                          <InteractiveInput
                            inputData={testCaseInputs[i] || example.input_data}
                            onChange={(newData) => {
                              onTestCaseInputChange?.(i, newData);
                            }}
                          />
                        </div>
                        {hasRun && (
                          <div className="mb-2">
                            <strong className="block mb-1">Your Output:</strong>
                            <pre className="bg-white p-2 rounded border">
                              {isRunning 
                                ? "Running test case..." 
                                : output[i] || ""}
                            </pre>
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </div>
              </Tabs>
            </Card>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}