"use client"

import { useCallback, useEffect, useRef } from "react"

export default function RoadmapPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawRoadmap = useCallback((ctx: CanvasRenderingContext2D) => {
    const topics = [
      { id: "arrays", text: "Arrays & Hashing", x: 350, y: 50, color: "#E91E63" },
      { id: "twopointers", text: "Two Pointers", x: 200, y: 150, color: "#3F51B5" },
      { id: "stack", text: "Stack", x: 500, y: 150, color: "#3F51B5" },
      { id: "binarysearch", text: "Binary Search", x: 100, y: 250, color: "#3F51B5" },
      { id: "slidingwindow", text: "Sliding Window", x: 250, y: 250, color: "#3F51B5" },
      { id: "linkedlist", text: "Linked List", x: 400, y: 250, color: "#3F51B5" },
      { id: "trees", text: "Trees", x: 350, y: 350, color: "#3F51B5" },
      { id: "tries", text: "Tries", x: 150, y: 450, color: "#3F51B5" },
      { id: "backtracking", text: "Backtracking", x: 500, y: 450, color: "#3F51B5" },
      { id: "heap", text: "Heap / Priority Queue", x: 200, y: 550, color: "#3F51B5" },
      { id: "graphs", text: "Graphs", x: 400, y: 550, color: "#3F51B5" },
      { id: "1ddp", text: "1-D DP", x: 600, y: 550, color: "#3F51B5" },
      { id: "intervals", text: "Intervals", x: 100, y: 650, color: "#3F51B5" },
      { id: "greedy", text: "Greedy", x: 250, y: 650, color: "#3F51B5" },
      { id: "advgraphs", text: "Advanced Graphs", x: 400, y: 650, color: "#3F51B5" },
      { id: "2ddp", text: "2-D DP", x: 550, y: 650, color: "#3F51B5" },
      { id: "bit", text: "Bit Manipulation", x: 700, y: 650, color: "#3F51B5" },
      { id: "math", text: "Math & Geometry", x: 450, y: 750, color: "#3F51B5" },
    ]

    // Clear canvas with a dark background
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Draw connections between topics
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2

    const connections = [
      ["arrays", "twopointers"],
      ["arrays", "stack"],
      ["twopointers", "binarysearch"],
      ["twopointers", "slidingwindow"],
      ["twopointers", "linkedlist"],
      ["binarysearch", "trees"],
      ["slidingwindow", "trees"],
      ["linkedlist", "trees"],
      ["trees", "tries"],
      ["trees", "backtracking"],
      ["backtracking", "heap"],
      ["backtracking", "graphs"],
      ["backtracking", "1ddp"],
      ["heap", "intervals"],
      ["heap", "greedy"],
      ["graphs", "advgraphs"],
      ["graphs", "2ddp"],
      ["1ddp", "bit"],
      ["advgraphs", "math"],
      ["2ddp", "math"],
      ["bit", "math"],
    ]

    connections.forEach(([from, to]) => {
      const fromTopic = topics.find((t) => t.id === from)
      const toTopic = topics.find((t) => t.id === to)
      if (fromTopic && toTopic) {
        ctx.beginPath()
        ctx.moveTo(fromTopic.x, fromTopic.y)
        ctx.lineTo(toTopic.x, toTopic.y)
        ctx.stroke()
      }
    })

    // Set the font BEFORE measuring text
    ctx.font = "14px Arial"

    // Draw each topic's box and label
    topics.forEach((topic) => {
      const padding = 20
      const textWidth = ctx.measureText(topic.text).width
      const width = textWidth + padding
      const height = 30
      const x = topic.x - width / 2
      const y = topic.y - height / 2

      // Draw rounded rectangle for the topic
      ctx.fillStyle = topic.color
      ctx.beginPath()
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, width, height, 5)
      } else {
        // Fallback for browsers that don't support roundRect
        const r = 5
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + width - r, y)
        ctx.quadraticCurveTo(x + width, y, x + width, y + r)
        ctx.lineTo(x + width, y + height - r)
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
        ctx.lineTo(x + r, y + height)
        ctx.quadraticCurveTo(x, y + height, x, y + height - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
      }
      ctx.fill()

      // Draw the topic's text
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(topic.text, topic.x, topic.y)
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = 800
    canvas.height = 800

    // Initial draw
    drawRoadmap(ctx)

    // Handle mouse move
    const handleMouseMove = () => {
      canvas.style.cursor = "default"
      drawRoadmap(ctx)
    }
    canvas.addEventListener("mousemove", handleMouseMove)
    return () => canvas.removeEventListener("mousemove", handleMouseMove)
  }, [drawRoadmap])

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">Learning Roadmap</h1>
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <canvas 
          ref={canvasRef} 
          className="bg-[#1a1a1a]"
          style={{ width: '800px', height: '800px' }}
        />
      </div>
    </div>
  )
}