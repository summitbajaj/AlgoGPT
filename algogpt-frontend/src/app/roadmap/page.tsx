"use client"

import { useRef, useEffect, useCallback, useState, useMemo } from "react"

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
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null)
  const topicBoxesRef = useRef<{ topic: Topic; x: number; y: number; width: number; height: number }[]>([])

  // Memoized topics array
  const topics = useMemo(() => [
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
  ], []) // Dependencies array is empty since these values are static

  // Memoized connections array
  const connections = useMemo(() => [
    ["arrays", "twopointers"],
  ], [])

  // The actual draw function
  const drawRoadmap = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

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

    ctx.font = "14px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const newTopicBoxes: { topic: Topic; x: number; y: number; width: number; height: number }[] = []
    topics.forEach((topic) => {
      const padding = 20
      const textWidth = ctx.measureText(topic.text).width
      const width = textWidth + padding
      const height = 30
      const x = topic.x - width / 2
      const y = topic.y - height / 2

      ctx.fillStyle = topic.color
      ctx.beginPath()
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, width, height, 5)
      } else {
        ctx.fillRect(x, y, width, height)
      }
      ctx.fill()

      ctx.fillStyle = "#ffffff"
      ctx.fillText(topic.text, topic.x, topic.y)

      newTopicBoxes.push({ topic, x, y, width, height })
    })

    topicBoxesRef.current = newTopicBoxes
  }, [topics, connections]) // Now only depends on memoized values

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 600
    canvas.height = 400
    drawRoadmap(ctx)

    const handleClick = (evt: MouseEvent) => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = evt.clientX - rect.left
      const mouseY = evt.clientY - rect.top

      for (const box of topicBoxesRef.current) {
        if (mouseX >= box.x && mouseX <= box.x + box.width && mouseY >= box.y && mouseY <= box.y + box.height) {
          setActiveTopic(box.topic)
          return
        }
      }
      setActiveTopic(null)
    }

    canvas.addEventListener("click", handleClick)
    return () => canvas.removeEventListener("click", handleClick)
  }, [drawRoadmap])

  return (
    <div className="flex flex-row">
      <div className="p-4">
        <canvas 
          ref={canvasRef} 
          className="bg-[#1a1a1a]"
          style={{ border: "1px solid #444", width: "600px", height: "400px" }}
        />
      </div>

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
