"use client"

import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

const problems = [
  { id: 1, title: "Two Sum", difficulty: "Easy", category: "Arrays & Hashing" },
  { id: 2, title: "Valid Parentheses", difficulty: "Easy", category: "Stack" },
  { id: 3, title: "Merge Two Sorted Lists", difficulty: "Easy", category: "Linked List" },
  { id: 4, title: "Best Time to Buy and Sell Stock", difficulty: "Easy", category: "Two Pointers" },
  // Add more problems...
]

const categories = [
  { name: "Arrays & Hashing", count: 15, completed: 3 },
  { name: "Two Pointers", count: 10, completed: 1 },
  { name: "Stack", count: 8, completed: 2 },
  { name: "Binary Search", count: 12, completed: 0 },
  { name: "Sliding Window", count: 6, completed: 0 },
  { name: "Linked List", count: 11, completed: 1 },
  // Add more categories...
]

export default function ProblemsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="container py-6">
      <Tabs defaultValue="problems" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="problems">
          <div className="flex gap-4">
            {/* Categories Sidebar */}
            <Card className="w-64 p-4">
              <h2 className="font-bold mb-4">Categories</h2>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.name}
                    className="flex items-center justify-between hover:bg-accent rounded p-2 cursor-pointer"
                  >
                    <span>{category.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {category.completed}/{category.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Problems List */}
            <div className="flex-1">
              <div className="relative mb-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Title</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map((problem) => (
                    <tr key={problem.id} className="border-b hover:bg-accent">
                      <td className="p-2">
                        <Link href={`/problems/${problem.id}`} className="text-blue-500 hover:underline">
                          {problem.title}
                        </Link>
                      </td>
                      <td className="p-2">{problem.category}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            problem.difficulty === "Easy"
                              ? "bg-green-100 text-green-800"
                              : problem.difficulty === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {problem.difficulty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roadmap">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Learning Roadmap</h2>
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <canvas id="roadmapCanvas" width="800" height="800" className="bg-[#1a1a1a]" />
            </div>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Card key={category.name} className="p-4">
                  <h3 className="font-semibold">{category.name}</h3>
                  <div className="mt-2 flex justify-between text-sm">
                    <span>{category.completed} completed</span>
                    <span className="text-muted-foreground">{category.count} total</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(category.completed / category.count) * 100}%`,
                      }}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

