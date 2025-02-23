import { Problem } from "@/app/utils/api/types";

export function ProblemHeader({ problem }: { problem: Problem }) {
    return (
      <div className="p-4 border-b shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <h1 className="text-2xl font-bold">
            {problem.problem_id}. {problem.title}
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
    );
}