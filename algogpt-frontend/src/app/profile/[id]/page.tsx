"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Brain, BarChart, Clock } from "lucide-react";

import { Problem, PostRunCodeResponse, SubmitCodeResponse } from "@/app/utils/api/types";
import { ProblemDescription } from "@/app/components/problem/ProblemDescription";
import { CodeSection } from "@/app/components/problem/CodeSection";
import { InputData } from "@/app/components/problem/InteractiveInput";
import { parseInputValue } from "@/app/utils/utils";
import { JsonValue } from "@/app/components/profile/SubmissionReviewModal";

import SubmissionReviewModal from "@/app/components/profile/SubmissionReviewModal";
import AssessmentResults, { AssessmentResult } from "@/app/components/profile/AssesmentResultComponent";

interface SubmissionReview {
  status: string;
  code: string;
  passed_tests: number;
  total_tests: number;
  failing_test?: {
    input: JsonValue;
    expected_output: JsonValue;
    output: JsonValue;  // Note the property name change from just 'output'
    error_message?: string;
  };
}

interface ProblemExample {
  input_data: InputData;
  expected_output?: unknown;
  explanation?: string;
}

export default function ProfilingPage() {
  const router = useRouter();

  // Basic problem states
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [testCaseInputs, setTestCaseInputs] = useState<InputData[]>([]);

  // Profiling states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [profilingStatus, setProfilingStatus] = useState<"initializing" | "in_progress" | "completed">(
    "initializing"
  );
  const [attemptedProblems, setAttemptedProblems] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilingError, setProfilingError] = useState<string | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  // Submission review modal
  const [showSubmissionReview, setShowSubmissionReview] = useState(false);
  const [submissionReview, setSubmissionReview] = useState<SubmissionReview | null>(null);

  // Single progress bar below code submission
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const userId = "user129";
  const mounted = useRef(true);

  // ----------------------------------
  // 1. Fetch the first profiling problem
  // ----------------------------------
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const startProfiling = async () => {
      try {
        const resp = await fetch("http://localhost:8000/api/profiling/start-profiling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: userId }),
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to start profiling session: ${resp.status} - ${text}`);
        }
        const data = await resp.json();

        if (isMounted) {
          setSessionId(data.session_id);
          setProblem(data.problem);
          setProfilingStatus("in_progress");

          if (data.problem?.examples) {
            setTestCaseInputs(data.problem.examples.map((ex: ProblemExample) => ex.input_data));
            setOutput(Array(data.problem.examples.length).fill(""));
          } else {
            setTestCaseInputs([]);
            setOutput([]);
          }
        }
      } catch (error) {
        if (isMounted) {
          setProfilingError(String(error));
          setProblem(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    startProfiling();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // ----------------------------------
  // 2. Local "Run Code"
  // ----------------------------------
  const handleRun = () => {
    const transformed = testCaseInputs.map((tc) => {
      const res: Record<string, unknown> = {};
      for (const key in tc) {
        res[key] = parseInputValue(tc[key]);
      }
      return res;
    });
    setTestCaseInputs(transformed);
    setIsRunning(true);
  };

  const handleRunCodeExecution = (result: PostRunCodeResponse) => {
    setIsRunning(false);
    if (!problem) return;

    const newOutput = testCaseInputs.map((_, idx) => {
      const found = result.test_results.find((r) => r.test_case_id === idx);
      return found?.output ? JSON.stringify(found.output) : "No output";
    });
    setOutput(newOutput);
  };

  // ----------------------------------
  // 3. Submit code (profiling)
  // ----------------------------------
  const handleSubmit = () => {
    setIsSubmitting(true);
  };

  const handleSubmitComplete = async (submissionResult: SubmitCodeResponse) => {
    if (!mounted.current) return;

    try {
      setSubmissionReview({
        status: submissionResult.status,
        code: submissionResult.user_code,
        passed_tests: submissionResult.passed_tests,
        total_tests: submissionResult.total_tests,
        failing_test: submissionResult.failing_test ? {
          input: submissionResult.failing_test.input as JsonValue,
          expected_output: submissionResult.failing_test.expected_output as JsonValue,
          output: submissionResult.failing_test.output as JsonValue,
          // The 'message' property doesn't exist in the failing_test object
          error_message: undefined // Provide a default value since it's optional
        } : undefined
      });

      // Build the data for /submit-profiling-answer
      const submissionWithUser = {
        ...submissionResult,
        problem_id: problem?.problem_id,
        student_id: userId,
      };

      // Show the single progress bar below code section
      setShowProgressBar(true);
      setProgressPercent(20);

      // Send to profiling
      const resp = await fetch("http://localhost:8000/api/profiling/submit-profiling-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          submission_result: submissionWithUser,
        }),
      });

      setProgressPercent(50);
      if (!resp.ok) {
        throw new Error(`Failed to submit answer: ${resp.status}`);
      }

      const data = await resp.json();
      setProgressPercent(80);

      if (!mounted.current) return;

      if (data.status === "completed") {
        // Show submission review
        setShowSubmissionReview(true);
        window.sessionStorage.setItem("assessmentResult", JSON.stringify(data.assessment_result));
        window.sessionStorage.setItem("pendingAction", "completeAssessment");
      } else if (data.status === "in_progress" && data.next_problem) {
        setShowSubmissionReview(true);
        window.sessionStorage.setItem("nextProblem", JSON.stringify(data.next_problem));
        window.sessionStorage.setItem("pendingAction", "nextProblem");
      } else {
        setProfilingError(data.error || "Unknown error from profiling");
      }
    } catch (error) {
      if (mounted.current) {
        setProfilingError(String(error));
      }
    } finally {
      if (mounted.current) {
        setIsSubmitting(false);
        // If no review shown, hide progress bar
        if (!showSubmissionReview) {
          setTimeout(() => {
            setShowProgressBar(false);
            setProgressPercent(0);
          }, 600);
        }
      }
    }
  };

  // ----------------------------------
  // 4. Next problem flow or final assessment
  // ----------------------------------
  const handleReviewContinue = () => {
    setShowSubmissionReview(false);

    const pendingAction = window.sessionStorage.getItem("pendingAction");
    if (pendingAction === "completeAssessment") {
      // Show final results
      const savedResult = window.sessionStorage.getItem("assessmentResult");
      if (savedResult) {
        setAssessmentResult(JSON.parse(savedResult));
        setProfilingStatus("completed");
      }
    } else if (pendingAction === "nextProblem") {
      // Load next problem
      const nextProblemData = window.sessionStorage.getItem("nextProblem");
      if (nextProblemData) {
        const nextProblem = JSON.parse(nextProblemData);
        setProblem(null);

        setTimeout(() => {
          setProblem(nextProblem);
          setAttemptedProblems((prev) => prev + 1);

          if (nextProblem.examples) {
            setOutput(Array(nextProblem.examples.length).fill(""));
            setTestCaseInputs(nextProblem.examples.map((ex: ProblemExample) => ex.input_data));
          } else {
            setOutput([]);
            setTestCaseInputs([]);
          }
          setActiveTestCase(0);
        }, 50);
      }
    }

    window.sessionStorage.removeItem("pendingAction");
    window.sessionStorage.removeItem("assessmentResult");
    window.sessionStorage.removeItem("nextProblem");

    setProgressPercent(100);
    setTimeout(() => {
      setShowProgressBar(false);
      setProgressPercent(0);
    }, 600);
  };

  // ----------------------------------
  // 5. Test Case Management
  // ----------------------------------
  const handleTestCaseInputChange = (index: number, newData: InputData) => {
    setTestCaseInputs((prev) => {
      const updated = [...prev];
      updated[index] = newData;
      return updated;
    });
  };

  const handleAddTestCase = () => {
    if (testCaseInputs.length === 0) return;
    const first = testCaseInputs[0];
    const newTC: InputData = {};

    for (const key of Object.keys(first)) {
      const val = first[key];
      if (Array.isArray(val)) {
        newTC[key] = [];
      } else if (typeof val === "number") {
        newTC[key] = 0;
      } else if (typeof val === "string") {
        newTC[key] = "";
      } else if (typeof val === "boolean") {
        newTC[key] = false;
      } else if (val === null) {
        newTC[key] = null;
      } else if (typeof val === "object") {
        newTC[key] = {};
      }
    }

    setTestCaseInputs((prev) => [...prev, newTC]);
    setOutput((prev) => [...prev, ""]);
    setActiveTestCase(testCaseInputs.length);
  };

  const handleRemoveTestCase = (index: number) => {
    if (testCaseInputs.length <= 1) return;
    setTestCaseInputs((prev) => prev.filter((_, i) => i !== index));
    setOutput((prev) => prev.filter((_, i) => i !== index));
    if (activeTestCase >= index) {
      setActiveTestCase(Math.max(0, activeTestCase - 1));
    }
  };

  // ----------------------------------
  // Render
  // ----------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
      </div>
    );
  }

  if (profilingError) {
    return (
      <div className="p-8 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{profilingError}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/profile")} className="mt-4">
          Return to Profile
        </Button>
      </div>
    );
  }

  if (!problem) {
    return <div className="p-8 text-center text-lg">Problem not found</div>;
  }

  if (profilingStatus === "completed" && assessmentResult) {
    return <AssessmentResults assessmentResult={assessmentResult} />;
  }

  // If your server doesn't provide topics, you'll see "General"
  const displayedTopic = problem.topics && problem.topics.length > 0
    ? (problem.topics as string[]).join(", ")
    : "General";

  // Calculate how many are done out of 12, or remove if not relevant
  const progressFraction = ((attemptedProblems + 1) / 12) * 100;

  return (
    <>
      {/* Full-screen overlay if isSubmitting = true, more opaque */}
      {isSubmitting && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/90 z-50">
          <div className="flex items-center mb-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3" />
            <span className="text-lg font-semibold">
              Analyzing your solution and preparing the next question...
            </span>
          </div>
          {showProgressBar && (
            <div className="w-48 bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-blue-600 h-full transition-all duration-500 ease-in-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div className="fixed inset-0 bg-white text-black flex flex-col pt-[60px]">
        {/* 
          Header with:
          - Title
          - Topic 
          - Problem # 
          - Horizontal progress bar for "out of 12"
        */}
        <div className="bg-slate-100 py-2 px-4 flex flex-col">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Brain className="h-5 w-5 text-purple-500 mr-2" />
              <h2 className="font-medium">Profiling Assessment</h2>
            </div>
            <div className="flex items-center space-x-4">
              {/* Show the real topic from your data */}
              <div className="flex items-center">
                <BarChart className="h-4 w-4 text-blue-600 mr-1" />
                <span className="text-sm">
                  Topic: <span className="font-medium">{displayedTopic}</span>
                </span>
              </div>
              {/* Problem X/12 */}
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm">Problem {attemptedProblems + 1}/12</span>
              </div>
            </div>
          </div>

          {/* Add a small progress bar to visualize progress out of 12 */}
          <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${Math.min(100, progressFraction)}%` }}
            />
          </div>
        </div>

        {/* Main layout: left (description) + right (code editor) */}
        <PanelGroup direction="horizontal" className="flex-1">
          <Panel defaultSize={40} minSize={20}>
            <div className="h-full overflow-auto p-4">
              <Card className="p-2">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-0">
                    <TabsTrigger value="description">Description</TabsTrigger>
                  </TabsList>
                  <TabsContent value="description">
                    <ProblemDescription problem={problem} />
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 h-full bg-gray-200 hover:bg-gray-300 transition-colors" />

          <Panel minSize={30}>
            <CodeSection
              key={`profiling_problem_${problem.problem_id}_attempt_${attemptedProblems}`}
              problem={problem}
              isRunning={isRunning}
              activeTestCase={activeTestCase}
              output={output}
              onRun={handleRun}
              onSubmit={handleSubmit}
              onSubmitComplete={handleSubmitComplete}
              onTestCaseChange={setActiveTestCase}
              onExecutionComplete={handleRunCodeExecution}
              onTestCaseInputChange={handleTestCaseInputChange}
              testCaseInputs={testCaseInputs}
              onAddTestCase={handleAddTestCase}
              onRemoveTestCase={handleRemoveTestCase}
              disableWebSocket={true}
            />

            {/* Local progress bar below code if not overlaying */}
            {showProgressBar && !isSubmitting && (
              <div className="mx-4 mt-2 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-500 ease-in-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Debug or remove */}
            <div className="px-4 py-2 text-xs text-gray-500">
              Problem ID: {problem.problem_id}
            </div>
          </Panel>
        </PanelGroup>

        {/* Submission review modal */}
        {showSubmissionReview && submissionReview && (
          <SubmissionReviewModal review={submissionReview} onContinue={handleReviewContinue} />
        )}
      </div>
    </>
  );
}