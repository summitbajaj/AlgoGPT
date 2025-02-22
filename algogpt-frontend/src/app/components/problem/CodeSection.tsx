import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayIcon, CheckIcon, Maximize2Icon } from "lucide-react";
import { PythonEditorComponent } from "@/app/components/PythonEditor";
import { Problem } from "../../problems/[id]/types";
import { CodeExecutionResponse } from "@/app/utils/api/types";

interface CodeSectionProps {
  problem: Problem;
  isRunning: boolean;
  activeTestCase: number;
  output: string[];
  onRun: () => void;
  onTestCaseChange: (index: number) => void;
  onExecutionComplete: (result: CodeExecutionResponse) => void;
  problemId: string;
}

export function CodeSection({
  problem,
  isRunning,
  activeTestCase,
  output,
  onRun,
  onTestCaseChange,
  onExecutionComplete,
}: CodeSectionProps) {
  return (
    <div className="overflow-auto p-4 flex flex-col">
      {/* Run/Submit buttons */}
      <div className="mb-4 flex justify-end gap-2">
        <Button
          id = "button-run"
          onClick={onRun}
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
            onExecutionComplete={onExecutionComplete}
            problemId={problem.id}
          />
        </div>
      </Card>

      {/* Output section */}
      <Card className="shrink-0">
        <div className="border-b p-2 flex items-center justify-between">
          <Tabs
            value={`case-${activeTestCase}`}
            onValueChange={(val) =>
              onTestCaseChange(parseInt(val.replace("case-", ""), 10))
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
              : output[0] || 'Click "Run" to execute.'}
          </pre>
        </div>
      </Card>
    </div>
  );
}
