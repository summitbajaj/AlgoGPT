import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivityIcon, InfoIcon, X } from "lucide-react";

interface ComplexityData {
  time_complexity: string;
  space_complexity: string;
  message: string;
}

interface ComplexityAnalysisProps {
  submissionId: string;
  isAccepted: boolean;
  complexityData: ComplexityData | null;
  isAnalyzing: boolean;
  onAnalyze: (submissionId: string) => void;
}

// 1) We define each Big-O category + how we sample them:
const COMPLEXITIES = [
  {
    label: "O(1)",
    func: () => 1, // Removed unused x
    maxX: 10,
    color: "#888888",
    scale: "sqrt", // We'll apply sqrt transform
  },
  {
    label: "O(log n)",
    func: (x: number) => Math.log2(x + 1) * 5,
    maxX: 10,
    color: "#888888",
    scale: "sqrt",
  },
  {
    label: "O(n)",
    func: (x: number) => x * 2,
    maxX: 10,
    color: "#888888",
    scale: "sqrt",
  },
  {
    label: "O(n log n)",
    func: (x: number) => x * Math.log2(x + 1),
    maxX: 10,
    color: "#888888",
    scale: "sqrt",
  },
  {
    label: "O(n^2)",
    // We'll keep a small multiplier so it won't overshadow everything.
    // And do *no* sqrt transform for a more parabolic shape.
    func: (x: number) => x * x * 0.4,
    maxX: 10,
    color: "#888888",
    scale: "linear", // special case
  },
  {
    label: "O(2^n)",
    func: (x: number) => Math.pow(2, x) * 0.2,
    maxX: 7,
    color: "#888888",
    scale: "sqrt",
  },
];

/**
 * 2) Build reference lines by:
 *    - sampling x from 0..maxX
 *    - storing (x, f(x)) for each complexity
 *    - finding globalMax among the ones that use sqrt transform
 *      (since O(n^2) is separate)
 */
function buildReferenceLines() {
  // We'll separate the "linear" (n^2) from the "sqrt" ones:
  let globalMaxSqrt = 0; // for curves that use sqrt scale
  let globalMaxN2   = 0; // for the special O(n^2)

  const data = COMPLEXITIES.map(c => {
    const points: [number, number][] = [];
    // sample ~ 20 steps for smoother curve
    const steps = 20;
    for (let i=0; i<=steps; i++) {
      const x = (c.maxX * i)/steps;
      const val = c.func(x);
      points.push([x, val]);
    }
    return { label: c.label, points, color: c.color, scale: c.scale, maxX: c.maxX };
  });

  // find max for sqrt-based complexities
  data.forEach(({ points, scale }) => {
    points.forEach(([ , y]) => {
      if (scale === "sqrt" && y > globalMaxSqrt) globalMaxSqrt = y;
      else if (scale !== "sqrt" && y > globalMaxN2) globalMaxN2 = y;
    });
  });

  // We'll consider an overall X-range up to 10 for the chart.
  const overallXMax = 10;

  // 2a) Transform function for the sqrt-based curves
  function toSvgCoordsSqrt(x: number, y: number): [number, number] {
    // x=0..10 => X=10..90
    const X = 10 + 80*(x/overallXMax);
    // sqrt scale
    const sqrtMax = Math.sqrt(globalMaxSqrt);
    const Y = 60 - 50*(Math.sqrt(y)/sqrtMax);
    return [X, Y];
  }

  // 2b) Transform function for O(n^2) (linear mapping)
  //     so n^2 keeps a more parabolic shape visually
  function toSvgCoordsN2(x: number, y: number): [number, number] {
    const X = 10 + 80*(x/overallXMax);
    // linear scale
    const Y = 60 - 50*(y/globalMaxN2);
    return [X, Y];
  }

  // 3) Build final path strings
  return data.map(({ label, points, color, scale }) => {
    let d = "";
    points.forEach(([xx,yy], i) => {
      let sx=0, sy=0;
      if (scale === "sqrt") {
        [sx, sy] = toSvgCoordsSqrt(xx, yy);
      } else {
        [sx, sy] = toSvgCoordsN2(xx, yy); 
      }

      if (i===0) {
        d = `M ${sx},${sy}`;
      } else {
        d += ` L ${sx},${sy}`;
      }
    });
    return { label, d, color, scale };
  });
}

// We'll build these lines once
const REFERENCE_LINES = buildReferenceLines();

/**
 * classifyToLabel: unify certain complexities under O(n^2) if we want
 */
function classifyToLabel(raw: string): string {
  const c = raw.toLowerCase().replace(/\s+/g,"");
  if (c.includes("2^n") || c.includes("exp")) return "O(2^n)";
  if (c.includes("n^") || c.includes("n²") || c.includes("n³")) {
    return "O(n^2)";
  }
  if (c.includes("nlog") || c.includes("nlg")) return "O(n log n)";
  if (c.includes("logn")) return "O(log n)";
  if (c.includes("n)")) return "O(n)";
  if (c.includes("1)")) return "O(1)";
  return "O(1)";
}

/**
 * The bigger modal
 */
const ComplexityModal = ({
  complexity,
  isOpen,
  onClose,
  type
}: {
  complexity: string;
  isOpen: boolean;
  onClose: () => void;
  type: "time" | "space";
}) => {
  if (!isOpen) return null;

  const highlightColor = (type === "time") ? "#7c3aed" : "#2563eb";
  const mainLabel = classifyToLabel(complexity);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#121212] text-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {type === "time" ? "Time Complexity" : "Space Complexity"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="text-center mb-4">
          <span className="text-2xl font-serif italic">{complexity}</span>
        </div>

        <div className="h-80 mb-6">
          <svg viewBox="0 0 100 70" className="w-full h-full">
            {/* Axes */}
            <line x1="10" y1="60" x2="90" y2="60" stroke="#444" strokeWidth={1} />
            <line x1="10" y1="60" x2="10" y2="10" stroke="#444" strokeWidth={1} />

            {/* Optional labels on axes */}
            <text x="95" y="60" fill="#666" fontSize="3" textAnchor="end">n</text>
            <text x="10" y="7"  fill="#666" fontSize="3" textAnchor="middle">operations</text>

            {/* Draw all reference lines in subtle color */}
            {REFERENCE_LINES.map(ref => (
              <path
                key={ref.label}
                d={ref.d}
                fill="none"
                stroke={ref.color}
                strokeWidth={1}
                opacity={0.3}
              />
            ))}

            {/* Highlight the user’s complexity */}
            {(() => {
              const match = REFERENCE_LINES.find(r => r.label===mainLabel);
              if (!match) return null;
              return (
                <path
                  d={match.d}
                  fill="none"
                  stroke={highlightColor}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })()}
          </svg>
        </div>

        <div className="flex justify-center space-x-3">
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white">
            👍
          </Button>
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white">
            👎
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main complexity analysis component
 */
export const ComplexityAnalysisComponent: React.FC<ComplexityAnalysisProps> = ({
  submissionId,
  isAccepted,
  complexityData,
  isAnalyzing,
  onAnalyze
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"time" | "space">("time");

  if (!isAccepted) return null;

  // small chart
  function renderComplexityChart(complexity: string, color: string) {
    const label = classifyToLabel(complexity);

    return (
      <div className="w-full h-44 flex flex-col items-center">
        <div className="text-center mb-2">
          <span className="font-mono text-xl" style={{ color }}>
            {complexity}
          </span>
        </div>
        <div className="w-full bg-[#0D1117] rounded-md overflow-hidden">
          <svg viewBox="0 0 100 70" preserveAspectRatio="none" className="w-full h-full">
            {/* Axes */}
            <line x1="10" y1="60" x2="90" y2="60" stroke="#444" strokeWidth={1} />
            <line x1="10" y1="60" x2="10" y2="10" stroke="#444" strokeWidth={1} />

            {/* Reference lines */}
            {REFERENCE_LINES.map(ref => (
              <path
                key={ref.label}
                d={ref.d}
                fill="none"
                stroke={ref.color}
                strokeWidth={1}
                opacity={0.3}
              />
            ))}

            {/* highlight user’s complexity */}
            {(() => {
              const match = REFERENCE_LINES.find(r => r.label === label);
              if (!match) return null;
              return (
                <path
                  d={match.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              );
            })()}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Complexity Analysis</h3>
      </div>

      {complexityData ? (
        <Card className="border border-gray-200 rounded-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {/* Time */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Time Complexity</h4>
              {renderComplexityChart(complexityData.time_complexity, "#7c3aed")}
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mt-2">
                <span className="font-mono text-purple-600 font-bold">
                  {complexityData.time_complexity}
                </span>
              </div>
              <Button
                onClick={() => {
                  setModalOpen(true);
                  setModalType("time");
                }}
                variant="outline"
                size="sm"
                className="w-full text-gray-600 mt-2"
              >
                View Detailed Chart
              </Button>
            </div>

            {/* Space */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Space Complexity</h4>
              {renderComplexityChart(complexityData.space_complexity, "#2563eb")}
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mt-2">
                <span className="font-mono text-blue-600 font-bold">
                  {complexityData.space_complexity}
                </span>
              </div>
              <Button
                onClick={() => {
                  setModalOpen(true);
                  setModalType("space");
                }}
                variant="outline"
                size="sm"
                className="w-full text-gray-600 mt-2"
              >
                View Detailed Chart
              </Button>
            </div>
          </div>

          <div className="p-4 border-t">
            <div className="flex items-start">
              <InfoIcon className="w-5 h-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-700">Analysis</h4>
                <div className="mt-2 text-gray-600 text-sm">
                {complexityData.message.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className={idx > 0 ? 'mt-3' : ''}>
                    {paragraph}
                    </p>
                ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 border border-gray-200 rounded-md">
          {isAnalyzing ? (
            <div className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              <span className="ml-3 text-gray-600">Analyzing complexity...</span>
            </div>
          ) : (
            <div className="text-center p-6">
              <div className="text-gray-700 mb-2 font-medium">Code Analysis</div>
              <p className="text-gray-600 mb-4">
                Analyze your solution to see its time and space complexity.
              </p>
              <Button 
                onClick={() => onAnalyze(submissionId)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <ActivityIcon className="w-4 h-4 mr-2" />
                Analyze Complexity
              </Button>
            </div>
          )}
        </Card>
      )}

      {complexityData && (
        <ComplexityModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          complexity={modalType === "time" ? complexityData.time_complexity : complexityData.space_complexity}
          type={modalType}
        />
      )}
    </div>
  );
};

export default ComplexityAnalysisComponent;
