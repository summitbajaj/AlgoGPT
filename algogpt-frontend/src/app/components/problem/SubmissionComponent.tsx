import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitCodeResponse, SubmitCodeTestCaseResult, ComplexityAnalysisResponse } from "@/app/utils/api/types";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { CSSProperties } from 'react';
import { BeakerIcon } from 'lucide-react';
import { ComplexityAnalysisComponent } from './ComplexityAnalysisComponent';

interface TestCaseViewProps {
  testCase: SubmitCodeTestCaseResult; 
  onUseTestCase?: (testCase: SubmitCodeTestCaseResult) => void;
}

const TestCaseView: React.FC<TestCaseViewProps> = ({ testCase, onUseTestCase }) => {
  return (
    <div className="space-y-4">
      {/* Input Section */}
      <div>
        <h3 className="text-lg font-medium">Input</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-2">
          {Object.entries(testCase.input).map(([key, value]) => (
            <div key={key} className="mb-1">
              <span className="font-mono text-blue-600">{key}</span>
              <span className="font-mono text-gray-600"> = </span>
              <span className="font-mono text-amber-700">{JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Output Section */}
      <div>
        <h3 className="text-lg font-medium">Output</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-2">
          <span className="font-mono text-red-500">{JSON.stringify(testCase.output)}</span>
        </div>
      </div>
      
      {/* Expected Section */}
      <div>
        <h3 className="text-lg font-medium">Expected</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-2">
          <span className="font-mono text-green-600">{JSON.stringify(testCase.expected_output)}</span>
        </div>
      </div>
      
      {/* Comparison message (only shown if failing) */}
      <div className="mt-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
        <p className="text-sm">
          Your output <span className="font-mono text-red-500 bg-red-50 px-1 rounded border border-red-100">{JSON.stringify(testCase.output)}</span> doesn&apos;t match 
          the expected output <span className="font-mono text-green-600 bg-green-50 px-1 rounded border border-green-100">{JSON.stringify(testCase.expected_output)}</span>.
        </p>
      </div>

      {/* Button to use this test case */}
      {onUseTestCase && (
        <div className="mt-2">
          <Button 
            variant="outline" 
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
            onClick={() => onUseTestCase(testCase)}
          >
            <BeakerIcon className="w-4 h-4 mr-1" />
            Use Testcase
          </Button>
        </div>
      )}
    </div>
  );
};

const SubmissionCodeView: React.FC<{ code: string }> = ({ code }) => {
  // Modified version of vs style with higher contrast colors
  const customStyle = {
    ...vs,
    'comment': { color: '#4b5563' } as CSSProperties,
    'keyword': { color: '#7c3aed' } as CSSProperties,
    'string': { color: '#059669' } as CSSProperties,
    'function': { color: '#2563eb' } as CSSProperties,
    'number': { color: '#d97706' } as CSSProperties,
    'operator': { color: '#4b5563' } as CSSProperties,
    'punctuation': { color: '#4b5563' } as CSSProperties,
    'class-name': { color: '#ea580c' } as CSSProperties,
    'tag': { color: '#dc2626' } as CSSProperties,
    'boolean': { color: '#db2777' } as CSSProperties,
    'property': { color: '#2563eb' } as CSSProperties,
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Code | Python3</h3>
      </div>
      <Card className="overflow-hidden border border-gray-200 rounded-md">
        <SyntaxHighlighter 
          language="python" 
          style={customStyle}
          customStyle={{ 
            margin: 0, 
            borderRadius: '0.375rem',
            background: '#f8fafc', 
            fontSize: '0.95rem',
            lineHeight: '1.5',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
          wrapLines={true}
          showLineNumbers={true}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            textAlign: 'right',
            color: '#71717a', 
            background: '#f4f4f5', 
            borderRight: '1px solid #e4e4e7', 
            userSelect: 'none'
          }}
        >
          {code}
        </SyntaxHighlighter>
      </Card>
    </div>
  );
};

interface SubmissionDetailsProps {
  submission: SubmitCodeResponse | null;
  onUseTestCase?: (testCase: SubmitCodeTestCaseResult) => void;
  complexityData: ComplexityAnalysisResponse | null;
  isAnalyzing: boolean;
  onAnalyzeComplexity: (submissionId: string) => void;
}

export const SubmissionDetails: React.FC<SubmissionDetailsProps> = ({ 
  submission, 
  onUseTestCase,
  complexityData,
  isAnalyzing,
  onAnalyzeComplexity
}) => {
  if (!submission) {
    return (
      <div className="text-center text-gray-400 italic p-4">
        No submission data available
      </div>
    );
  }

  const isAccepted = submission.status === 'Accepted';
  const statusColor = isAccepted ? 'text-emerald-600' : 'text-rose-600';
  const statusBgColor = isAccepted ? 'bg-emerald-50' : 'bg-rose-50';
  const statusBorderColor = isAccepted ? 'border-emerald-200' : 'border-rose-200';

  return (
    <div className="flex flex-col space-y-4">
      {/* Submission Header */}
      <div className={`p-4 rounded-md ${statusBgColor} ${statusBorderColor} border`}>
        <div className={`text-2xl font-bold ${statusColor}`}>
          {submission.status} 
          <span className="text-base ml-2">
            <span className="font-bold">{submission.passed_tests}</span>{" / "}<span className="font-bold">{submission.total_tests}</span> testcases passed
          </span>
        </div>
      </div>

      {/* Failing Test Case (if any) */}
      {submission.failing_test && (
        <Card className="p-4 border border-gray-200">
          <TestCaseView 
            testCase={submission.failing_test} 
            onUseTestCase={onUseTestCase}
          />
        </Card>
      )}

      {/* Code View (if available) */}
      {submission.user_code && (
        <SubmissionCodeView code={submission.user_code} />
      )}
      
      {/* Complexity Analysis (only for accepted submissions) */}
      {isAccepted && (
        <ComplexityAnalysisComponent
          submissionId={submission.submission_id}
          isAccepted={isAccepted}
          complexityData={complexityData}
          isAnalyzing={isAnalyzing}
          onAnalyze={onAnalyzeComplexity}
        />
      )}
      
      {/* Message when code is not available */}
      {!submission.user_code && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">
            Code details are not available for this submission.
          </p>
        </div>
      )}
    </div>
  );
};

interface SubmissionsTabProps {
  submissions: SubmitCodeResponse[];
  selectedSubmission: SubmitCodeResponse | null;
  onSelectSubmission?: (submission: SubmitCodeResponse) => void;
  onUseTestCase?: (testCase: SubmitCodeTestCaseResult) => void; 
  complexityData: ComplexityAnalysisResponse | null;
  isAnalyzing: boolean;
  onAnalyzeComplexity: (submissionId: string) => void;
}

export const SubmissionsTab: React.FC<SubmissionsTabProps> = ({ 
  submissions,
  selectedSubmission,
  onSelectSubmission,
  onUseTestCase,
  complexityData,
  isAnalyzing,
  onAnalyzeComplexity
}) => {

  // Simply call the parent callback if a user clicks a submission
  const handleSelectSubmission = (submission: SubmitCodeResponse) => {
    if (onSelectSubmission) {
      onSelectSubmission(submission);
    }
  };

  return (
    <div className="h-full overflow-auto p-4">
      {submissions.length === 0 ? (
        <div className="text-center text-gray-400 italic p-8">
          No submissions yet. Submit your solution to see results.
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          {/* Submissions list */}
          <div className="flex flex-wrap gap-2 mb-4">
            {submissions.map((sub) => {
              const isSelected = selectedSubmission?.submission_id === sub.submission_id;
              const isAccepted = sub.status === 'Accepted';
              
              return (
                <Button
                  key={sub.submission_id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => handleSelectSubmission(sub)}
                  className={`
                    ${isAccepted 
                      ? isSelected ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                   : 'text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-300' 
                      : isSelected ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                                   : 'text-rose-600 hover:text-rose-700 border-rose-200 hover:border-rose-300'
                    }
                    transition-colors
                  `}
                >
                  {sub.status} (<span className="font-bold">{sub.passed_tests}/{sub.total_tests}</span>)
                </Button>
              );
            })}
          </div>
          
          {/* Selected submission details */}
          <SubmissionDetails 
            submission={selectedSubmission} 
            onUseTestCase={onUseTestCase}
            complexityData={complexityData}
            isAnalyzing={isAnalyzing}
            onAnalyzeComplexity={onAnalyzeComplexity}
          />
        </div>
      )}
    </div>
  );
};