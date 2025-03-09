"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ChevronRight, 
  Award, 
  BookOpen, 
  BarChart, 
  Clock, 
  User,
  Calendar,
  Code,
  Brain,
  AlertTriangle,
  CheckCircle,
  Star
} from "lucide-react"

interface TopicMastery {
  topic_name: string;
  mastery_level: number;
  problems_attempted: number;
  problems_solved: number;
  last_attempted_at: string;
}

interface Attempt {
  problem_id: number;
  problem_title: string;
  problem_difficulty: string;
  topics: string[];
  start_time: string;
  completed: boolean;
  submission_count: number;
}

interface StrugglePattern {
  area: string;
  count: number;
}

interface AssessmentData {
  student_id: string;
  skill_level: string;
  overall_mastery: number;
  topic_masteries: TopicMastery[];
  recent_attempts: Attempt[];
  struggle_patterns: StrugglePattern[];
}

const recentActivities = [
  { date: "Mar 05, 2025", activity: "Solved 'Find Maximum Sum Subarray'", type: "problem" },
  { date: "Mar 04, 2025", activity: "Completed Profiling Assessment", type: "profiling" },
  { date: "Mar 02, 2025", activity: "Submitted solution to 'Merge K Sorted Lists'", type: "problem" },
  { date: "Feb 28, 2025", activity: "Started learning Trees", type: "learning" }
];

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);

  useEffect(() => {
    const fetchAssessmentData = async () => {
      setIsLoading(true);
      try {
        // Replace with your actual API endpoint and student ID
        const userId = "user123"; // This should come from your auth system
        const response = await fetch(`http://localhost:8000/api/profiling/student/${userId}/assessment`);        
        if (response.ok) {
          const data = await response.json();
          setAssessmentData(data);
        } else {
          console.error("Failed to fetch assessment data");
        }
      } catch (error) {
        console.error("Error fetching assessment data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssessmentData();
  }, []);

  const handleStartProfiling = () => {
    // Navigate to the profiling assessment page
    router.push("/profile/profiling");
  };

  // Group topics by mastery level for better visualization
  const groupedTopics = {
    strong: [] as TopicMastery[],
    medium: [] as TopicMastery[],
    weak: [] as TopicMastery[]
  };
  
  if (assessmentData) {
    assessmentData.topic_masteries.forEach(topic => {
      if (topic.mastery_level >= 70) {
        groupedTopics.strong.push(topic);
      } else if (topic.mastery_level >= 40) {
        groupedTopics.medium.push(topic);
      } else {
        groupedTopics.weak.push(topic);
      }
    });
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
                {isLoading ? (
                  <>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium">Problems Solved</p>
                        <Skeleton className="h-8 w-16 mt-1" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Current Streak</p>
                        <Skeleton className="h-8 w-16 mt-1" />
                      </div>
                    </div>
                    
                    <div className="bg-slate-100 rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Skill Level</span>
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium">Problems Solved</p>
                        <p className="text-2xl font-bold">
                          {assessmentData ? assessmentData.topic_masteries.reduce(
                            (sum, topic) => sum + topic.problems_solved, 0) : 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Current Streak</p>
                        <p className="text-2xl font-bold">7 days</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-100 rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Skill Level</span>
                        <span className="font-medium">
                          {assessmentData?.skill_level || "Beginner"}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ 
                            width: `${assessmentData ? assessmentData.overall_mastery : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <CardTitle>Skill Assessment</CardTitle>
              </div>
              <CardDescription>
                Take an assessment to help us tailor your learning journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">
                Our AI-powered assessment will analyze your current skills and create a personalized learning path.
              </p>
              <Button 
                onClick={handleStartProfiling} 
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                Start Skill Assessment
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
              <TabsTrigger value="struggles">Challenges</TabsTrigger>
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
                  {isLoading ? (
                    <div className="space-y-6">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i}>
                          <div className="flex justify-between mb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                          <Skeleton className="h-2 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {assessmentData?.topic_masteries.map((topic) => (
                        <div key={topic.topic_name}>
                          <div className="flex justify-between mb-2">
                            <span className="font-medium">{topic.topic_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {topic.problems_solved}/{topic.problems_attempted} solved
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full">
                            <div 
                              className={`h-2 rounded-full ${
                                topic.mastery_level > 70 ? "bg-green-500" : 
                                topic.mastery_level > 40 ? "bg-yellow-500" : 
                                "bg-red-500"
                              }`}
                              style={{ width: `${topic.mastery_level}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-start p-3 rounded-lg">
                          <Skeleton className="h-6 w-6 mr-4" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assessmentData?.recent_attempts.map((attempt, index) => (
                        <div key={index} className="flex items-start p-3 rounded-lg hover:bg-slate-50">
                          <div className="mr-4 mt-1">
                            <Code className={`h-5 w-5 ${attempt.completed ? "text-green-500" : "text-blue-500"}`} />
                          </div>
                          <div className="flex-1">
                            <p>
                              {attempt.completed ? "Solved" : "Attempted"} '{attempt.problem_title}'
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                                {attempt.problem_difficulty}
                              </span>
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(attempt.start_time).toLocaleDateString()}
                              <span className="mx-2">•</span>
                              Topics: {attempt.topics.join(", ")}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {/* Include recentActivities from the mock data when we have fewer real activities */}
                      {(assessmentData?.recent_attempts.length || 0) < 2 && recentActivities.map((activity, index) => (
                        <div key={`mock-${index}`} className="flex items-start p-3 rounded-lg hover:bg-slate-50">
                          <div className="mr-4 mt-1">
                            {activity.type === "problem" ? (
                              <Code className="h-5 w-5 text-blue-500" />
                            ) : activity.type === "profiling" ? (
                              <Brain className="h-5 w-5 text-purple-500" />
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2 text-yellow-500" />
                    Personalized Recommendations
                  </CardTitle>
                  <CardDescription>
                    Based on your assessment results and learning history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <Skeleton className="h-5 w-40 mb-2" />
                          <Skeleton className="h-4 w-full" />
                          <div className="flex justify-end mt-2">
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Topic recommendations based on mastery */}
                      {groupedTopics.weak.length > 0 && (
                        <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors border-l-4 border-l-amber-500">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                                Improve {groupedTopics.weak[0].topic_name}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                This is one of your weakest areas with {Math.round(groupedTopics.weak[0].mastery_level)}% mastery.
                                Focus on basic concepts first.
                              </p>
                            </div>
                            <Link href={`/learn/${groupedTopics.weak[0].topic_name.toLowerCase().replace(/ /g, '-')}`}>
                              <Button size="sm" variant="outline">
                                Start <ChevronRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}

                      {groupedTopics.medium.length > 0 && (
                        <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors border-l-4 border-l-blue-500">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium flex items-center">
                                <Code className="h-4 w-4 mr-2 text-blue-500" />
                                Practice {groupedTopics.medium[0].topic_name}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                You're making good progress. Try some medium difficulty problems to improve further.
                              </p>
                            </div>
                            <Link href={`/problems?topic=${groupedTopics.medium[0].topic_name.toLowerCase().replace(/ /g, '-')}&difficulty=medium`}>
                              <Button size="sm" variant="outline">
                                Practice <ChevronRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Struggle-based recommendation */}
                      {assessmentData?.struggle_patterns && assessmentData.struggle_patterns.length > 0 && (
                        <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors border-l-4 border-l-purple-500">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium flex items-center">
                                <Brain className="h-4 w-4 mr-2 text-purple-500" />
                                Focus on {assessmentData.struggle_patterns[0].area}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                You've struggled with this concept in {assessmentData.struggle_patterns[0].count} problems.
                                Review our tutorial material.
                              </p>
                            </div>
                            <Link href={`/learn/concepts/${assessmentData.struggle_patterns[0].area.toLowerCase().replace(/ /g, '-')}`}>
                              <Button size="sm" variant="outline">
                                Review <ChevronRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* "Next level" recommendation */}
                      <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors border-l-4 border-l-green-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                              Challenge Yourself
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Ready for a challenge? Try some harder problems to push your skills further.
                            </p>
                          </div>
                          <Link href="/problems?difficulty=hard">
                            <Button size="sm" variant="outline">
                              Explore <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Struggles/Challenges Tab */}
            <TabsContent value="struggles">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                    Learning Challenges
                  </CardTitle>
                  <CardDescription>
                    Areas where you've faced difficulty based on your problem-solving patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <Skeleton className="h-5 w-48 mb-2" />
                          <Skeleton className="h-2 w-full mb-2" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : assessmentData?.struggle_patterns && assessmentData.struggle_patterns.length > 0 ? (
                    <div className="space-y-6">
                      {assessmentData.struggle_patterns.map((struggle, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between mb-2">
                            <h3 className="font-medium">{struggle.area}</h3>
                            <span className="text-sm text-muted-foreground">
                              {struggle.count} occurrences
                            </span>
                          </div>
                          
                          <Progress 
                            value={Math.min(100, struggle.count * 10)} 
                            className="h-2 mb-3"
                          />
                          
                          <p className="text-sm text-muted-foreground">
                            {getStruggleAdvice(struggle.area)}
                          </p>
                          
                          <div className="mt-3">
                            <Link href={`/learn/concepts/${struggle.area.toLowerCase().replace(/ /g, '-')}`}>
                              <Button size="sm" variant="outline">
                                Review Tutorial
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      </div>
                      <h3 className="font-medium text-lg mb-2">No Significant Challenges Detected</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        We haven't detected any specific patterns of struggle in your work yet.
                        This may change as you solve more problems.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// Helper function to provide advice for different struggle areas
function getStruggleAdvice(area: string): string {
  const adviceMap: Record<string, string> = {
    "Algorithm Selection": "Practice identifying which algorithmic technique to apply to different problem types. Review our 'Algorithm Selection Guide'.",
    "Data Structure Usage": "Focus on understanding which data structures are most efficient for different operations. Review our data structure efficiency cheat sheet.",
    "Edge Case Handling": "Make a habit of systematically checking for edge cases before submitting your solutions. Consider creating a personal edge case checklist.",
    "Code Efficiency": "Study time and space complexity to identify optimization opportunities in your code. Work through our 'Optimization Patterns' module.",
    "Logic Implementation": "Break down your solutions into smaller steps and verify each part independently. Our step-by-step debugging guide may help.",
    "Algorithm Understanding": "Review fundamental algorithms in depth and trace through their execution manually on sample inputs."
  };
  
  return adviceMap[area] || "Review this concept in our learning materials to strengthen your understanding.";
}