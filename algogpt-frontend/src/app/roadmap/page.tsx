"use client"

import { useRef, useEffect, useState, useMemo, useCallback } from "react"

// --- Types ---
interface Topic {
  id: string
  text: string
  x: number
  y: number
  questions: {
    id: string
    title: string
    difficulty: string
  }[]
  completed?: number
  total?: number
  level?: number
}

export default function InteractiveRoadmapPage() {
  // Canvas reference
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Container reference for scrolling
  const containerRef = useRef<HTMLDivElement>(null)

  // State: which topic is active in side panel
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null)

  // State: which topic is hovered on the canvas
  const [hoverTopicId, setHoverTopicId] = useState<string | null>(null)

  // Store bounding boxes for each node
  const topicBoxesRef = useRef<
    { topicId: string; x: number; y: number; width: number; height: number }[]
  >([])

  // Track which questions are completed
  const [completedQuestions, setCompletedQuestions] = useState<Record<string, boolean>>({})

  // Canvas dimensions
  const canvasWidth = 1400;
  const canvasHeight = 800;

  // Single node color (all nodes same color)
  const NODE_COLOR = "#4C6FFF"

  // Colors for different difficulties - bolder colors
  const DIFFICULTY_COLORS = {
    Easy: { bg: "#5cb85c", text: "white" },    // Bolder green
    Medium: { bg: "#f0ad4e", text: "white" },  // Bolder yellow/orange
    Hard: { bg: "#d9534f", text: "white" }     // Bolder red
  }

  // Our roadmap topics (complete set from screenshots)
  const topics = useMemo<Topic[]>(() => [
    {
      id: "1",
      text: "Arrays & Hashing",
      x: 600,
      y: 100,
      level: 1,
      questions: [
        { id: "Q1", title: "Two Sum", difficulty: "Easy" },
        { id: "Q2", title: "Valid Anagram", difficulty: "Easy" },
        { id: "Q3", title: "Group Anagrams", difficulty: "Medium" },
        { id: "Q4", title: "Top K Frequent", difficulty: "Medium" },
      ]
    },
    {
      id: "2",
      text: "Two Pointers",
      x: 450,
      y: 200,
      level: 2,
      questions: [
        { id: "Q5", title: "Valid Palindrome", difficulty: "Easy" },
        { id: "Q6", title: "3Sum", difficulty: "Medium" },
        { id: "Q7", title: "Container With Most Water", difficulty: "Medium" },
      ]
    },
    {
      id: "3",
      text: "Stack",
      x: 750,
      y: 200,
      level: 2,
      questions: [
        { id: "Q8", title: "Valid Parentheses", difficulty: "Easy" },
        { id: "Q9", title: "Min Stack", difficulty: "Medium" },
        { id: "Q10", title: "Evaluate Reverse Polish Notation", difficulty: "Medium" },
      ]
    },
    {
      id: "4",
      text: "Binary Search",
      x: 300,
      y: 300,
      level: 3,
      questions: [
        { id: "Q11", title: "Binary Search", difficulty: "Easy" },
        { id: "Q12", title: "Search in Rotated Sorted Array", difficulty: "Medium" },
        { id: "Q13", title: "Find Minimum in Rotated Sorted Array", difficulty: "Medium" },
      ]
    },
    {
      id: "5",
      text: "Sliding Window",
      x: 600,
      y: 300,
      level: 3,
      questions: [
        { id: "Q14", title: "Best Time to Buy & Sell Stock", difficulty: "Easy" },
        { id: "Q15", title: "Longest Substring Without Repeating", difficulty: "Medium" },
        { id: "Q16", title: "Minimum Window Substring", difficulty: "Hard" },
      ]
    },
    {
      id: "6",
      text: "Linked List",
      x: 900,
      y: 300,
      level: 3,
      questions: [
        { id: "Q17", title: "Reverse Linked List", difficulty: "Easy" },
        { id: "Q18", title: "Merge Two Sorted Lists", difficulty: "Easy" },
        { id: "Q19", title: "Remove Nth Node From End", difficulty: "Medium" },
      ]
    },
    {
      id: "7",
      text: "Trees",
      x: 600,
      y: 400,
      level: 4,
      questions: [
        { id: "Q20", title: "Invert Binary Tree", difficulty: "Easy" },
        { id: "Q21", title: "Maximum Depth of Binary Tree", difficulty: "Easy" },
        { id: "Q22", title: "Same Tree", difficulty: "Easy" },
      ]
    },
    {
      id: "8",
      text: "Tries",
      x: 200,
      y: 500,
      level: 5,
      questions: [
        { id: "Q23", title: "Implement Trie", difficulty: "Medium" },
        { id: "Q24", title: "Design Add and Search Words", difficulty: "Medium" },
        { id: "Q25", title: "Word Search II", difficulty: "Hard" },
      ]
    },
    {
      id: "9",
      text: "Heap / Priority Queue",
      x: 400,
      y: 500,
      level: 5,
      questions: [
        { id: "Q26", title: "Kth Largest Element", difficulty: "Medium" },
        { id: "Q27", title: "Find Median from Data Stream", difficulty: "Hard" },
      ]
    },
    {
      id: "14",
      text: "Graphs",
      x: 600,
      y: 500,
      level: 5,
      questions: [
        { id: "Q37", title: "Number of Islands", difficulty: "Medium" },
        { id: "Q38", title: "Clone Graph", difficulty: "Medium" },
        { id: "Q39", title: "Pacific Atlantic Water Flow", difficulty: "Medium" },
      ]
    },
    {
      id: "13",
      text: "Backtracking",
      x: 800,
      y: 500,
      level: 5,
      questions: [
        { id: "Q34", title: "Subsets", difficulty: "Medium" },
        { id: "Q35", title: "Combination Sum", difficulty: "Medium" },
        { id: "Q36", title: "Permutations", difficulty: "Medium" },
      ]
    },
    {
      id: "15",
      text: "1-D DP",
      x: 1000,
      y: 500,
      level: 5,
      questions: [
        { id: "Q40", title: "Climbing Stairs", difficulty: "Easy" },
        { id: "Q41", title: "House Robber", difficulty: "Medium" },
        { id: "Q42", title: "Coin Change", difficulty: "Medium" },
      ]
    },
    {
      id: "10",
      text: "Intervals",
      x: 200,
      y: 600,
      level: 6,
      questions: [
        { id: "Q28", title: "Merge Intervals", difficulty: "Medium" },
        { id: "Q29", title: "Non-overlapping Intervals", difficulty: "Medium" },
      ]
    },
    {
      id: "11",
      text: "Greedy",
      x: 400,
      y: 600,
      level: 6,
      questions: [
        { id: "Q30", title: "Jump Game", difficulty: "Medium" },
        { id: "Q31", title: "Gas Station", difficulty: "Medium" },
      ]
    },
    {
      id: "12",
      text: "Advanced Graphs",
      x: 700,
      y: 600,
      level: 6,
      questions: [
        { id: "Q32", title: "Alien Dictionary", difficulty: "Hard" },
        { id: "Q33", title: "Network Delay Time", difficulty: "Medium" },
      ]
    },
    {
      id: "16",
      text: "2-D DP",
      x: 900,
      y: 650,
      level: 7,
      questions: [
        { id: "Q43", title: "Unique Paths", difficulty: "Medium" },
        { id: "Q44", title: "Longest Common Subsequence", difficulty: "Medium" },
      ]
    },
    {
      id: "17",
      text: "Bit Manipulation",
      x: 1100,
      y: 650,
      level: 7,
      questions: [
        { id: "Q45", title: "Single Number", difficulty: "Easy" },
        { id: "Q46", title: "Number of 1 Bits", difficulty: "Easy" },
        { id: "Q47", title: "Counting Bits", difficulty: "Easy" },
      ]
    },
    {
      id: "18",
      text: "Math & Geometry",
      x: 1000,
      y: 750,
      level: 8,
      questions: [
        { id: "Q48", title: "Rotate Image", difficulty: "Medium" },
        { id: "Q49", title: "Spiral Matrix", difficulty: "Medium" },
        { id: "Q50", title: "Set Matrix Zeroes", difficulty: "Medium" },
      ]
    }
  ], [])

  // Complete connections for roadmap
  const connections = useMemo<[string, string][]>(() => [
    // Level 1 to 2
    ["1", "2"], // Arrays -> Two Pointers
    ["1", "3"], // Arrays -> Stack
    
    // Level 2 to 3
    ["2", "4"], // Two Pointers -> Binary Search
    ["2", "5"], // Two Pointers -> Sliding Window
    ["2", "6"], // Two Pointers -> Linked List
    ["3", "6"], // Stack -> Linked List
    
    // Level 3 to 4
    ["4", "7"], // Binary Search -> Trees
    ["5", "7"], // Sliding Window -> Trees
    ["6", "7"], // Linked List -> Trees
    
    // Level 4 to 5
    ["7", "8"],  // Trees -> Tries
    ["7", "9"],  // Trees -> Heap
    ["7", "14"], // Trees -> Graphs
    ["7", "13"], // Trees -> Backtracking
    ["7", "15"], // Trees -> 1-D DP
    
    // Level 5 to 6
    ["8", "10"],  // Tries -> Intervals
    ["9", "11"],  // Heap -> Greedy
    ["14", "12"], // Graphs -> Advanced Graphs
    
    // Level 6 to 7
    ["12", "16"], // Advanced Graphs -> 2-D DP
    ["15", "16"], // 1-D DP -> 2-D DP
    ["15", "17"], // 1-D DP -> Bit Manipulation
    
    // Level 7 to 8
    ["16", "18"], // 2-D DP -> Math & Geometry
    ["17", "18"], // Bit Manipulation -> Math & Geometry
  ], [])

  // Calculate how many questions each topic has completed
  const topicsWithStats = useMemo(() => {
    return topics.map(topic => {
      const completed = topic.questions.filter(q => completedQuestions[q.id]).length
      return {
        ...topic,
        completed,
        total: topic.questions.length
      }
    })
  }, [topics, completedQuestions])

  // Helper to find the active topic object
  const activeTopic = useMemo(() => {
    if (!activeTopicId) return null
    return topicsWithStats.find(t => t.id === activeTopicId) || null
  }, [activeTopicId, topicsWithStats])

  // Toggle completion for a question
  const toggleQuestionCompletion = (questionId: string) => {
    setCompletedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }))
  }

  // Function to draw everything on the canvas
  const drawRoadmap = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear the canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Draw connections
    connections.forEach(([fromId, toId]) => {
      const fromTopic = topicsWithStats.find(t => t.id === fromId)
      const toTopic = topicsWithStats.find(t => t.id === toId)
      if (!fromTopic || !toTopic) return

      const isHovered = hoverTopicId === fromId || hoverTopicId === toId
      ctx.strokeStyle = isHovered ? "#7285FF" : "#d1d5ff"
      ctx.lineWidth = isHovered ? 2 : 1.5

      ctx.beginPath()
      ctx.moveTo(fromTopic.x, fromTopic.y)

      const dx = toTopic.x - fromTopic.x
      const dy = toTopic.y - fromTopic.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const curve = dist * 0.3

      // Curved line
      if (Math.abs(dy) > Math.abs(dx)) {
        ctx.bezierCurveTo(
          fromTopic.x, fromTopic.y + curve,
          toTopic.x, toTopic.y - curve,
          toTopic.x, toTopic.y
        )
      } else {
        ctx.bezierCurveTo(
          fromTopic.x + curve, fromTopic.y,
          toTopic.x - curve, toTopic.y,
          toTopic.x, toTopic.y
        )
      }
      ctx.stroke()

      // Optional dot at the end
      if (isHovered) {
        ctx.fillStyle = "#7285FF"
        ctx.beginPath()
        ctx.arc(toTopic.x, toTopic.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Prepare new bounding boxes
    const newBoxes: {
      topicId: string
      x: number
      y: number
      width: number
      height: number
    }[] = []

    // Uniform node size
    const nodeWidth = 150
    const nodeHeight = 50

    // Draw topics
    topicsWithStats.forEach(topic => {
      const isActive = topic.id === activeTopicId
      const isHovered = topic.id === hoverTopicId

      const x = topic.x - nodeWidth / 2
      const y = topic.y - nodeHeight / 2

      // Shadow if active/hovered
      if (isActive || isHovered) {
        ctx.shadowColor = "rgba(0,0,0,0.1)"
        ctx.shadowBlur = 6
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 2
      }

      // Updated node background colour logic:
      let fillColor = NODE_COLOR;
      if (topic.total && topic.completed >= topic.total) {
        fillColor = "#28a745" // completed (green)
      } else if (isActive) {
        fillColor = "#3955D3"
      } else if (isHovered) {
        fillColor = "#5a7bff"
      }
      ctx.fillStyle = fillColor

      ctx.beginPath()
      const r = 6 // corner radius
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + nodeWidth - r, y)
      ctx.quadraticCurveTo(x + nodeWidth, y, x + nodeWidth, y + r)
      ctx.lineTo(x + nodeWidth, y + nodeHeight - r)
      ctx.quadraticCurveTo(x + nodeWidth, y + nodeHeight, x + nodeWidth - r, y + nodeHeight)
      ctx.lineTo(x + r, y + nodeHeight)
      ctx.quadraticCurveTo(x, y + nodeHeight, x, y + nodeHeight - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
      ctx.fill()

      // Reset shadow
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // Draw topic text
      ctx.fillStyle = "#ffffff"
      ctx.font = "600 14px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(topic.text, topic.x, topic.y - 5)

      // Progress bar (no text: purely visual)
      const progressBarWidth = nodeWidth - 24
      const progressBarHeight = 4
      const barX = x + 12
      const barY = y + nodeHeight - 12

      // BG
      ctx.fillStyle = "rgba(255,255,255,0.3)"
      ctx.fillRect(barX, barY, progressBarWidth, progressBarHeight)

      // Fill portion
      const fraction = topic.total ? (topic.completed || 0) / topic.total : 0
      ctx.fillStyle = "#4aeecc" // Teal color for progress
      ctx.fillRect(barX, barY, progressBarWidth * fraction, progressBarHeight)

      newBoxes.push({ topicId: topic.id, x, y, width: nodeWidth, height: nodeHeight })
    })

    topicBoxesRef.current = newBoxes
  }, [topicsWithStats, hoverTopicId, activeTopicId, connections, NODE_COLOR])

  // Re-draw the canvas whenever relevant data changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const scale = window.devicePixelRatio || 1
    canvas.width = canvasWidth * scale
    canvas.height = canvasHeight * scale
    ctx.scale(scale, scale)

    drawRoadmap(ctx)

    // Mouse events
    const handleClick = (evt: MouseEvent) => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = (evt.clientX - rect.left) * (canvas.width / rect.width / scale)
      const mouseY = (evt.clientY - rect.top) * (canvas.height / rect.height / scale)

      let found = false
      for (const box of topicBoxesRef.current) {
        if (
          mouseX >= box.x && mouseX <= box.x + box.width &&
          mouseY >= box.y && mouseY <= box.y + box.height
        ) {
          setActiveTopicId(box.topicId)
          found = true
          break
        }
      }
      if (!found) {
        setActiveTopicId(null)
      }
    }

    const handleMouseMove = (evt: MouseEvent) => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = (evt.clientX - rect.left) * (canvas.width / rect.width / scale)
      const mouseY = (evt.clientY - rect.top) * (canvas.height / rect.height / scale)

      let foundHover = false
      for (const box of topicBoxesRef.current) {
        if (
          mouseX >= box.x && mouseX <= box.x + box.width &&
          mouseY >= box.y && mouseY <= box.y + box.height
        ) {
          setHoverTopicId(box.topicId)
          canvas.style.cursor = "pointer"
          foundHover = true
          break
        }
      }
      if (!foundHover) {
        setHoverTopicId(null)
        canvas.style.cursor = "default"
      }
      drawRoadmap(ctx)
    }

    const handleMouseLeave = () => {
      setHoverTopicId(null)
      canvas.style.cursor = "default"
      drawRoadmap(ctx)
    }

    canvas.addEventListener("click", handleClick)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      canvas.removeEventListener("click", handleClick)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [drawRoadmap, topicsWithStats, activeTopicId, canvasWidth, canvasHeight])

  // Scroll to center active topic when it changes
  useEffect(() => {
    if (activeTopicId && containerRef.current) {
      const activeTopic = topicsWithStats.find(t => t.id === activeTopicId);
      if (activeTopic) {
        // Calculate the scroll position to center the active topic
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        const scrollX = Math.max(0, activeTopic.x - containerWidth / 2);
        const scrollY = Math.max(0, activeTopic.y - containerHeight / 2);
        
        containerRef.current.scrollTo({
          left: scrollX,
          top: scrollY,
          behavior: 'smooth'
        });
      }
    }
  }, [activeTopicId, topicsWithStats]);

  // Render side panel
  return (
    <div className="container max-w-6xl py-6">
      <div className="bg-white rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-2 text-slate-700">Learning Roadmap</h1>
        <p className="text-slate-500 mb-4 text-sm">
          Click on a topic to view problems. Mark as complete to track progress.
        </p>
        
        <div className="flex flex-col md:flex-row">
          {/* Canvas container with scrolling */}
          <div 
            ref={containerRef}
            className="w-full md:w-2/3 border-r border-slate-200 pr-6 overflow-auto"
            style={{ 
              maxHeight: '70vh', 
              position: 'relative' 
            }}
          >
            <canvas
              ref={canvasRef}
              className="bg-white rounded"
              style={{ 
                width: `${canvasWidth}px`, 
                height: `${canvasHeight}px`, 
                display: "block"
              }}
            />
          </div>

          {/* Side panel - wider */}
          <div className="w-full md:w-1/3 bg-white p-4 rounded pl-6">
            {activeTopic ? (
              <div>
                {/* Topic Title with colored dot */}
                <div className="flex items-center mb-3">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ 
                      backgroundColor: NODE_COLOR 
                    }}
                  ></div>
                  <h2 className="font-semibold text-xl text-slate-700">
                    {activeTopic.text}
                  </h2>
                </div>
                
                {/* Progress bar (side panel) - larger, lighter bg */}
                <div className="mb-6">
                  <div className="bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#4aeecc]"
                      style={{
                        width: `${
                          activeTopic.total
                            ? (activeTopic.completed || 0) / activeTopic.total * 100
                            : 0
                        }%`
                      }}
                    />
                  </div>
                  <p className="text-slate-400 text-base mt-2">
                    {activeTopic.completed || 0} of {activeTopic.total || 0} completed
                  </p>
                </div>

                {/* Problems list with bold header */}
                <h3 className="font-bold text-slate-600 mb-4 text-base">PROBLEMS</h3>
                <div className="space-y-4">
                  {activeTopic.questions.map(q => {
                    const isChecked = !!completedQuestions[q.id];
                    const difficultyColor = DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS] || 
                                           { bg: "#94a3b8", text: "white" };
                    
                    return (
                      <div key={q.id} className="flex items-start">
                        <input
                          type="checkbox"
                          id={`question-${q.id}`}
                          checked={isChecked}
                          onChange={() => toggleQuestionCompletion(q.id)}
                          className="mt-1.5 rounded text-blue-500 focus:ring-blue-500 h-4 w-4 border-2"
                        />
                        <label
                          htmlFor={`question-${q.id}`}
                          className="flex flex-col ml-3 cursor-pointer"
                        >
                          <span
                            className={`${
                              isChecked ? "line-through text-slate-400" : "text-slate-700"
                            }`}
                          >
                            {isChecked ? <span className="opacity-70">{q.title}</span> : q.title}
                          </span>
                          
                          <span 
                            className="text-xs px-3 py-1 rounded-full font-medium inline-block mt-2 w-24 text-center"
                            style={{ 
                              backgroundColor: difficultyColor.bg, 
                              color: difficultyColor.text 
                            }}
                          >
                            {q.difficulty}
                          </span>
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 opacity-50">
                <svg
                  className="mx-auto h-8 w-8 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <p className="mt-2 text-slate-400 text-xs">
                  Select a topic to view problems
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}