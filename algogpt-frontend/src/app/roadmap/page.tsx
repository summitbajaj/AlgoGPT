"use client"

import { useRef, useEffect, useCallback, useState } from "react"

// Types for clarity
interface Topic {
  id: string
  text: string
  x: number
  y: number
  color: string
  questions: string[]  // list of questions or details
}

export default function InteractiveRoadmapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // State that holds the topic the user most recently clicked
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null)

  // A place to store bounding boxes after we draw
  const topicBoxesRef = useRef<
    { topic: Topic; x: number; y: number; width: number; height: number }[]
  >([])

  // Define your topics (with example “questions” or details):
  const topics: Topic[] = [
    {
      id: "arrays",
      text: "Arrays & Hashing",
      x: 200,
      y: 100,
      color: "#E91E63",
      questions: ["Q1: Two Sum", "Q2: Valid Anagram", "Q3: Top K Frequent"],
    },
    {
      id: "twopointers",
      text: "Two Pointers",
      x: 400,
      y: 200,
      color: "#3F51B5",
      questions: ["Q1: Valid Palindrome", "Q2: 3Sum", "Q3: Container With Water"],
    },
    // ... add more topics with their x,y and question arrays ...
  ]

  // Connections: which topics are linked by lines
  const connections: [string, string][] = [
    ["arrays", "twopointers"],
    // ... more connections ...
  ]

  // The actual draw function
  const drawRoadmap = useCallback((ctx: CanvasRenderingContext2D) => {
    // 1) Fill background
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // 2) Draw lines between topics
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    connections.forEach(([fromId, toId]) => {
      const fromTopic = topics.find((t) => t.id === fromId)
      const toTopic = topics.find((t) => t.id === toId)
      if (fromTopic && toTopic) {
        ctx.beginPath()
        ctx.moveTo(fromTopic.x, fromTopic.y)
        ctx.lineTo(toTopic.x, toTopic.y)
        ctx.stroke()
      }
    })

    // 3) Draw each topic "node"
    ctx.font = "14px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // We'll refill topicBoxesRef from scratch each time
    const newTopicBoxes: {
      topic: Topic
      x: number
      y: number
      width: number
      height: number
    }[] = []

    topics.forEach((topic) => {
      const padding = 20
      const textWidth = ctx.measureText(topic.text).width
      const width = textWidth + padding
      const height = 30
      const x = topic.x - width / 2
      const y = topic.y - height / 2

      // Rounded corners if supported, else fillRect
      ctx.fillStyle = topic.color
      ctx.beginPath()
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, width, height, 5)
      } else {
        ctx.fillRect(x, y, width, height)
      }
      ctx.fill()

      // Draw text in the center
      ctx.fillStyle = "#ffffff"
      ctx.fillText(topic.text, topic.x, topic.y)

      // Save the bounding box so we can detect clicks
      newTopicBoxes.push({ topic, x, y, width, height })
    })

    topicBoxesRef.current = newTopicBoxes
  }, [connections, topics])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 600
    canvas.height = 400

    // Initial draw
    drawRoadmap(ctx)

    // On click, figure out if we clicked inside a bounding box
    const handleClick = (evt: MouseEvent) => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      // Mouse position relative to canvas
      const mouseX = evt.clientX - rect.left
      const mouseY = evt.clientY - rect.top

      // Check each bounding box for a hit
      for (let box of topicBoxesRef.current) {
        if (
          mouseX >= box.x &&
          mouseX <= box.x + box.width &&
          mouseY >= box.y &&
          mouseY <= box.y + box.height
        ) {
          // We clicked this topic
          setActiveTopic(box.topic)
          return
        }
      }
      // If we didn't hit any topics, clear active
      setActiveTopic(null)
    }

    canvas.addEventListener("click", handleClick)
    return () => canvas.removeEventListener("click", handleClick)
  }, [drawRoadmap])

  return (
    <div className="flex flex-row">
      {/* Left side: the canvas */}
      <div className="p-4">
        <canvas 
          ref={canvasRef} 
          className="bg-[#1a1a1a]"
          style={{ border: "1px solid #444", width: "600px", height: "400px" }}
        />
      </div>

      {/* Right side: details panel (for the clicked topic) */}
      <div className="p-4 w-64 border-l border-gray-700">
        {activeTopic ? (
          <div>
            <h2 className="font-bold text-lg mb-2">{activeTopic.text}</h2>
            <ul className="list-disc list-inside">
              {activeTopic.questions.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-gray-400 italic">Click a topic to see questions</p>
        )}
      </div>
    </div>
  )
}
