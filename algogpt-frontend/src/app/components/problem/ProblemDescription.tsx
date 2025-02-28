import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Problem, ExampleTestCaseModel } from "@/app/utils/api/types";
import { MarkdownComponents } from "./MarkdownComponent";
import { ProblemHeader } from "./ProblemHeader";
import { parseConstraints, processConstraintText } from "./helper";

export function ProblemDescription({ problem }: { problem: Problem }) {
  return (
    // Single wrapper to keep the title & text flush-left
    <div className="p-4">
      {/* Header (title, difficulty, topics) */}
      <ProblemHeader problem={problem} />

      {/* Main description text */}
      <div className="prose prose-slate max-w-full mt-2">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={MarkdownComponents}
        >
          {problem.description}
        </ReactMarkdown>
      </div>

      {/* Examples */}
      {problem.examples.map((ex: ExampleTestCaseModel, idx) => (
        <div key={idx} className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Example {idx + 1}:</h3>
          <div className="bg-white border border-gray-200 p-4 rounded text-sm">
            <p className="mb-2">
              <strong>Input:</strong>{" "}
              {Object.entries(ex.input_data as Record<string, unknown>)
                .map(([key, value]) =>
                  `${key} = ${
                    typeof value === "string"
                      ? `"${value}"`
                      : Array.isArray(value)
                      ? `[${(value as unknown[]).join(",")}]`
                      : value
                  }`
                )
                .join(", ")}
            </p>
            <p className="mb-2">
              <strong>Output:</strong>{" "}
              {Array.isArray(ex.expected_output)
                ? `[${(ex.expected_output as unknown[]).join(",")}]`
                : String(ex.expected_output)}
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
          <h3 className="text-lg font-semibold mb-2">Constraints:</h3>
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
  );
}
