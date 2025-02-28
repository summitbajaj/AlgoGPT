import { Problem } from "@/app/utils/api/types";

export function ProblemHeader({ problem }: { problem: Problem }) {
  return (
    <div>
      {/* Title & Difficulty Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
        <h1 className="text-2xl font-bold">
          {problem.problem_id}. {problem.title}
        </h1>
        <div className="sm:ml-auto">
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
      </div>

      {/* Topics below */}
      {problem.topics && problem.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {problem.topics.map((topic, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-200 rounded"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
