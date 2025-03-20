"use client"

import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchRoadmap } from "../utils/api/api";
import { RoadmapResponse } from "../utils/api/types";

// Define types for our component's internal use
type TopicWithStats = RoadmapResponse['topics'][0] & {
  completed?: number;
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

  // State: loading state for API data
  const [loading, setLoading] = useState<boolean>(true)
  
  // State: roadmap data from API
  const [roadmapData, setRoadmapData] = useState<RoadmapResponse | null>(null)

  // Store bounding boxes for each node
  const topicBoxesRef = useRef<
    { topicId: string; x: number; y: number; width: number; height: number }[]
  >([])

  // Track which questions are completed
  const [completedQuestions, setCompletedQuestions] = useState<Record<string, boolean>>({})

  // Canvas dimensions
  const canvasWidth = 1400
  const canvasHeight = 800

  const NODE_COLORS = useMemo(() => ({
    DEFAULT: "#4C6FFF",
    ACTIVE: "#3955D3",
    HOVER: "#5a7bff",
    COMPLETED: "#28a745",
    COMING_SOON: "#94a3b8" // Gray color for topics without questions
  }), []);

  const DIFFICULTY_COLORS = useMemo(() => ({
    Easy: { bg: "#5cb85c", text: "white" }, 
    Medium: { bg: "#f0ad4e", text: "white" },  
    Hard: { bg: "#d9534f", text: "white" }     
  }), []);

  // Fetch roadmap data from API
  useEffect(() => {
    const getRoadmapData = async () => {
      try {
        setLoading(true)
        
        // Use the fetchRoadmap function from your API
        const data = await fetchRoadmap()
        
        // Define positions for tree layout
        const treePositions: Record<string, {x: number, y: number}> = {
          // Level 1 (Root)
          "1": {x: 600, y: 100},  // Arrays & Hashing
          
          // Level 2
          "2": {x: 400, y: 200},  // Stack
          "3": {x: 800, y: 200},  // Two Pointers
          
          // Level 3
          "4": {x: 300, y: 300},  // Binary Search
          "5": {x: 600, y: 300},  // Sliding Window
          "6": {x: 900, y: 300},  // Linked List
          
          // Level 4
          "7": {x: 600, y: 400},  // Trees
          
          // Level 5
          "8": {x: 200, y: 500},  // Tries
          "9": {x: 400, y: 500},  // Heap/Priority Queue
          "14": {x: 600, y: 500}, // Graphs
          "13": {x: 800, y: 500}, // Backtracking
          "15": {x: 1000, y: 500}, // 1-D DP
          
          // Level 6
          "10": {x: 200, y: 600}, // Intervals
          "11": {x: 400, y: 600}, // Greedy
          "12": {x: 700, y: 600}, // Advanced Graphs
          
          // Level 7
          "16": {x: 900, y: 650}, // 2-D DP
          "17": {x: 1100, y: 650}, // Bit Manipulation
          
          // Level 8
          "18": {x: 1000, y: 750} // Math & Geometry
        };

        // Apply positions to topics
        data.topics.forEach(topic => {
          if (topic.id in treePositions) {
            topic.x = treePositions[topic.id].x;
            topic.y = treePositions[topic.id].y;
          } else {
            // Fallback for any topics not in our mapping
            const index = parseInt(topic.id);
            topic.x = 200 + (index % 5) * 200;
            topic.y = 100 + Math.floor(index / 5) * 150;
          }
        });

        // If there are no connections, add default ones
        if (data.connections.length === 0) {
          data.connections = [
            { from_id: "1", to_id: "2" },
            { from_id: "1", to_id: "3" },
            { from_id: "3", to_id: "4" },
            { from_id: "3", to_id: "5" },
            { from_id: "2", to_id: "6" },
            { from_id: "3", to_id: "6" },
            { from_id: "6", to_id: "7" },
            { from_id: "4", to_id: "7" },
            { from_id: "5", to_id: "7" },
            { from_id: "7", to_id: "8" },
            { from_id: "7", to_id: "9" },
            { from_id: "7", to_id: "14" },
            { from_id: "7", to_id: "13" },
            { from_id: "7", to_id: "15" },
            { from_id: "8", to_id: "10" },
            { from_id: "9", to_id: "11" },
            { from_id: "14", to_id: "12" },
            { from_id: "12", to_id: "16" },
            { from_id: "15", to_id: "16" },
            { from_id: "15", to_id: "17" },
            { from_id: "16", to_id: "18" },
            { from_id: "17", to_id: "18" }
          ];
        }
        
        setRoadmapData(data)
      } catch (error) {
        console.error("Failed to fetch roadmap data:", error)
        
        // Create minimal data with all topics showing as "Coming Soon"
        setRoadmapData({
          topics: [
            {
              id: "1", text: "Arrays & Hashing", x: 600, y: 100,
              questions: [], total: 0, has_questions: false
            },
            {
              id: "2", text: "Two Pointers", x: 450, y: 200,
              questions: [], total: 0, has_questions: false
            },
            {
              id: "3", text: "Stack", x: 750, y: 200,
              questions: [], total: 0, has_questions: false
            },
            {
              id: "4", text: "Binary Search", x: 300, y: 300,
              questions: [], total: 0, has_questions: false
            },
            {
              id: "5", text: "Sliding Window", x: 600, y: 300,
              questions: [], total: 0, has_questions: false
            },
            {
              id: "6", text: "Linked List", x: 900, y: 300,
              questions: [], total: 0, has_questions: false
            },
            {
              id: "7", text: "Trees", x: 600, y: 400,
              questions: [], total: 0, has_questions: false
            }
          ],
          connections: [
            { from_id: "1", to_id: "2" },
            { from_id: "1", to_id: "3" },
            { from_id: "2", to_id: "4" },
            { from_id: "2", to_id: "5" },
            { from_id: "2", to_id: "6" },
            { from_id: "3", to_id: "6" },
            { from_id: "4", to_id: "7" },
            { from_id: "5", to_id: "7" },
            { from_id: "6", to_id: "7" }
          ]
        })
      } finally {
        setLoading(false)
      }
    }

    getRoadmapData()
  }, [])

  // Helper to get topic statistics
  const topicsWithStats = useMemo(() => {
    if (!roadmapData) return []
    
    return roadmapData.topics.map(topic => {
      const completed = topic.questions
        .filter(q => completedQuestions[q.id])
        .length
      
      return {
        ...topic,
        completed,
        // If API didn't return total, use the length of questions array
        total: topic.total || topic.questions.length
      }
    }) as TopicWithStats[]
  }, [roadmapData, completedQuestions])

  // Helper to find the active topic object
  const activeTopic = useMemo(() => {
    if (!activeTopicId || !topicsWithStats.length) return null
    return topicsWithStats.find(t => t.id === activeTopicId) || null
  }, [activeTopicId, topicsWithStats])

  // Toggle completion for a question
  const toggleQuestionCompletion = (questionId: string) => {
    setCompletedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }))
    
    // In a production app, you might want to call an API to persist this change
    // Example of implementing this function in your api.ts:
    // export const toggleQuestionComplete = async (questionId: string, completed: boolean) => {
    //   // Implementation similar to your other API functions
    // }
  }

  // Function to draw everything on the canvas
  const drawRoadmap = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!roadmapData) return
    
    // Clear the canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Draw connections
    roadmapData.connections.forEach(({ from_id, to_id }) => {
      const fromTopic = topicsWithStats.find(t => t.id === from_id)
      const toTopic = topicsWithStats.find(t => t.id === to_id)
      if (!fromTopic || !toTopic) return

      const isHovered = hoverTopicId === from_id || hoverTopicId === to_id
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
      const hasQuestions = topic.has_questions

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
      let fillColor = NODE_COLORS.DEFAULT
      
      if (!hasQuestions) {
        // If no questions, use the "coming soon" color
        fillColor = NODE_COLORS.COMING_SOON
      } else if (topic.total && (topic.completed || 0) >= topic.total) {
        // If all questions completed
        fillColor = NODE_COLORS.COMPLETED
      } else if (isActive) {
        // If topic is active
        fillColor = NODE_COLORS.ACTIVE
      } else if (isHovered) {
        // If topic is hovered
        fillColor = NODE_COLORS.HOVER
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

      // Draw progress bar only if topic has questions
      if (hasQuestions) {
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
      } else {
        // Draw "Coming Soon" indicator
        ctx.fillStyle = "rgba(255,255,255,0.7)"
        ctx.font = "italic 10px Inter, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("Coming Soon", topic.x, topic.y + 10)
      }

      newBoxes.push({ topicId: topic.id, x, y, width: nodeWidth, height: nodeHeight })
    })

    topicBoxesRef.current = newBoxes
  }, [topicsWithStats, hoverTopicId, activeTopicId, roadmapData, NODE_COLORS])

  // Re-draw the canvas whenever relevant data changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !roadmapData) return

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
  }, [drawRoadmap, topicsWithStats, activeTopicId, canvasWidth, canvasHeight, roadmapData])

  // Scroll to center active topic when it changes
  useEffect(() => {
    if (activeTopicId && containerRef.current && roadmapData) {
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
  }, [activeTopicId, topicsWithStats, roadmapData]);

  // Render loading state
  if (loading) {
    return (
      <div className="container max-w-6xl py-6">
        <div className="bg-white rounded-lg p-6">
          <h1 className="text-xl font-semibold mb-2 text-slate-700">Learning Roadmap</h1>
          <p className="text-slate-500 mb-4 text-sm">
            Loading your personalized learning roadmap...
          </p>
          
          <div className="flex flex-col md:flex-row">
            {/* Canvas loading skeleton */}
            <div className="w-full md:w-2/3 border-r border-slate-200 pr-6">
              <Skeleton className="h-96 w-full" />
            </div>
            
            {/* Side panel loading skeleton */}
            <div className="w-full md:w-1/3 p-4 pl-6">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-4/5 mb-6" />
              
              <Skeleton className="h-6 w-1/3 mb-4" />
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <Skeleton className="h-4 w-4 mr-3" />
                  <div className="w-full">
                    <Skeleton className="h-5 w-4/5 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex items-start">
                  <Skeleton className="h-4 w-4 mr-3" />
                  <div className="w-full">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
                      backgroundColor: activeTopic.has_questions 
                        ? NODE_COLORS.DEFAULT 
                        : NODE_COLORS.COMING_SOON
                    }}
                  ></div>
                  <h2 className="font-semibold text-xl text-slate-700">
                    {activeTopic.text}
                  </h2>
                </div>
                
                {activeTopic.has_questions ? (
                  <>
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
                            className="flex flex-col ml-3 cursor-pointer w-full"
                          >
                            <a 
                              href={`/problems/${q.id}`}
                              className={`${
                                isChecked ? "line-through text-slate-400" : "text-slate-700 hover:text-blue-500"
                              } transition-colors`}
                              onClick={(e) => {
                                // Prevent checkbox behavior when clicking the link
                                e.stopPropagation();
                              }}
                            >
                              {isChecked ? <span className="opacity-70">{q.title}</span> : q.title}
                            </a>
                            
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
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-slate-700">Coming Soon</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      We&apos;re working on adding problems for this topic.
                      Please check back later!
                    </p>
                  </div>
                )}
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