"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface Problem {
  id: number
  title: string
  description: string
  difficulty: string
  topics: string[]
}

export default function ProblemsPage() {
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [problems, setProblems] = useState<Problem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchProblems = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("http://localhost:8000/problems")
        const data: Problem[] = await response.json()
        setProblems(data)

        // Extract categories (topics) from problems data
        const topicSet = new Set<string>()
        data.forEach((problem) => {
          if (problem.topics) {
            problem.topics.forEach((topic) => topicSet.add(topic))
          }
        })
        const categoriesArray = Array.from(topicSet).sort()
        setCategories(categoriesArray)
      } catch (error) {
        console.error("Error fetching problems:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProblems()
  }, [])

  // Filter problems based on search query and selected category
  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = problem.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory
      ? problem.topics && problem.topics.includes(selectedCategory)
      : true
    return matchesSearch && matchesCategory
  })

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
                {/* 'All Categories' option */}
                <div
                  className={`flex items-center justify-between hover:bg-accent rounded p-2 cursor-pointer ${
                    selectedCategory === null ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedCategory(null)}
                >
                  <span>All Categories</span>
                </div>
                {categories.map((category) => (
                  <div
                    key={category}
                    className={`flex items-center justify-between hover:bg-accent rounded p-2 cursor-pointer ${
                      selectedCategory === category ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <span>{category}</span>
                    {/* Count of problems in this category */}
                    <span className="text-sm text-muted-foreground">
                      {problems.filter((problem) => problem.topics.includes(category)).length}
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

              {isLoading ? (
                <p>Loading problems...</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProblems.length > 0 ? (
                      filteredProblems.map((problem) => (
                        <tr key={problem.id} className="border-b hover:bg-accent">
                          <td className="p-2">
                            <Link href={`/problems/${problem.id}`} className="text-blue-500 hover:underline">
                              {problem.title}
                            </Link>
                          </td>
                          <td className="p-2">
                            {problem.topics && problem.topics.length > 0
                              ? problem.topics.join(", ")
                              : "Uncategorized"}
                          </td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-1 rounded text-sm ${
                                problem.difficulty === "Easy"
                                  ? "bg-green-100 text-green-800"
                                  : problem.difficulty === "Medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : problem.difficulty === "Hard"
                                  ? "bg-red-100 text-red-800"
                                  : ""
                              }`}
                            >
                              {problem.difficulty}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center p-4">
                          No problems found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Roadmap Tab Content */}
        <TabsContent value="roadmap">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Learning Roadmap</h2>
            {/* Roadmap content using categories */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => {
                const categoryProblems = problems.filter((problem) =>
                  problem.topics.includes(category)
                )
                const totalProblems = categoryProblems.length
                const completedProblems = 0 // Placeholder since we don't have completion data

                return (
                  <Card key={category} className="p-4">
                    <h3 className="font-semibold">{category}</h3>
                    <div className="mt-2 flex justify-between text-sm">
                      <span>{completedProblems} completed</span>
                      <span className="text-muted-foreground">{totalProblems} total</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: totalProblems > 0 ? `${(completedProblems / totalProblems) * 100}%` : "0%",
                        }}
                      />
                    </div>
                  </Card>
                )
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}