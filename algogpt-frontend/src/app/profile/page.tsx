"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ChevronRight, 
  Award, 
  BookOpen, 
  BarChart, 
  Clock, 
  User,
  Calendar,
  Code 
} from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const [skills, setSkills] = useState([
    { name: "Arrays", progress: 75, completed: 15, total: 20 },
    { name: "Linked Lists", progress: 60, completed: 9, total: 15 },
    { name: "Trees", progress: 40, completed: 8, total: 20 },
    { name: "Graphs", progress: 30, completed: 3, total: 10 },
    { name: "Dynamic Programming", progress: 20, completed: 2, total: 10 },
    { name: "Sorting", progress: 80, completed: 8, total: 10 },
  ])

  const recentActivities = [
    { date: "Mar 05, 2025", activity: "Solved 'Find Maximum Sum Subarray'", type: "problem" },
    { date: "Mar 04, 2025", activity: "Completed Profiling Assessment", type: "profiling" },
    { date: "Mar 02, 2025", activity: "Submitted solution to 'Merge K Sorted Lists'", type: "problem" },
    { date: "Feb 28, 2025", activity: "Started learning Trees", type: "learning" }
  ]

  const handleStartProfiling = () => {
    // Navigate to the profile ID page with problem ID 9 hardcoded for now
    router.push("/profile/9")
  }

  return (
    <div className="container py-6">
      <div className="flex items-start gap-6 flex-col md:flex-row">
        {/* Left Section - User Profile */}
        <div className="w-full md:w-1/3">
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>My Profile</CardTitle>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center pb-6">
                <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                  <User className="h-12 w-12 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold">Jane Smith</h2>
                <p className="text-sm text-muted-foreground">Student at University of Technology</p>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-medium">Problems Solved</p>
                    <p className="text-2xl font-bold">42</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Current Streak</p>
                    <p className="text-2xl font-bold">7 days</p>
                  </div>
                </div>
                
                <div className="bg-slate-100 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Skill Level</span>
                    <span className="font-medium">Intermediate</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "65%" }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Profiling</CardTitle>
              <CardDescription>
                Take an assessment to help us tailor your learning journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">
                Our AI-powered profiling will assess your current skills and recommend a personalized learning path.
              </p>
              <Button 
                onClick={handleStartProfiling} 
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                Start Profiling Assessment
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Section - Skills & Activity */}
        <div className="w-full md:w-2/3">
          <Tabs defaultValue="skills" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            {/* Skills Tab */}
            <TabsContent value="skills">
              <Card>
                <CardHeader>
                  <CardTitle>Skills Progress</CardTitle>
                  <CardDescription>
                    Track your progress across different data structures and algorithms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {skills.map((skill) => (
                      <div key={skill.name}>
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">{skill.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {skill.completed}/{skill.total} completed
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full">
                          <div 
                            className={`h-2 rounded-full ${
                              skill.progress > 70 ? "bg-green-500" : 
                              skill.progress > 40 ? "bg-yellow-500" : 
                              "bg-red-500"
                            }`}
                            style={{ width: `${skill.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start p-3 rounded-lg hover:bg-slate-50">
                        <div className="mr-4 mt-1">
                          {activity.type === "problem" ? (
                            <Code className="h-5 w-5 text-blue-500" />
                          ) : activity.type === "profiling" ? (
                            <BarChart className="h-5 w-5 text-purple-500" />
                          ) : (
                            <BookOpen className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p>{activity.activity}</p>
                          <p className="text-sm text-muted-foreground flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {activity.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle>AI Recommendations</CardTitle>
                  <CardDescription>
                    Personalized learning recommendations based on your progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">Next Problem: Depth-First Search</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Build on your graph understanding with this medium difficulty problem
                          </p>
                        </div>
                        <Link href="/problems/12">
                          <Button size="sm" variant="outline">
                            Start <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">Review: Linked List Concepts</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your recent solutions show some confusion with pointers
                          </p>
                        </div>
                        <Link href="/learn/linked-lists">
                          <Button size="sm" variant="outline">
                            Review <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">Try: Dynamic Programming Challenges</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your weakest area - we recommend focused practice
                          </p>
                        </div>
                        <Link href="/problems?category=dynamic-programming">
                          <Button size="sm" variant="outline">
                            Explore <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}