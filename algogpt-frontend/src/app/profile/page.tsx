"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { 
  ChevronRight, 
  BookOpen, 
  Code,
  Brain,
  AlertTriangle, 
  TrendingUp
} from "lucide-react"
import CurriculumProgress from "@/app/components/profile/CurriculumProgress"
import ProtectedRoute from "@/app/components/ProtectedRoute"
import { useAuth } from "@/firebase/AuthContext"

// Types
interface TopicMastery {
  topic_name: string;
  mastery_level: number;
  problems_attempted: number;
  problems_solved: number;
  problems_solved_non_ai: number;
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
  is_profiling_problem: boolean;
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

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);

  useEffect(() => {
    const fetchAssessmentData = async () => {
      setIsLoading(true);
      try {
        const userId = user?.uid || "anonymous";
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profiling/student/${userId}/assessment`);        
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

    if (user) {
      fetchAssessmentData();
    }
  }, [user]);

  const handleStartProfiling = () => {
    router.push("/profile/profiling");
  };

  // Group topics by mastery level
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

  // Helper functions for stats calculations
  const calculateStats = (assessmentData: AssessmentData) => {
    const problemsAttempted = assessmentData.recent_attempts.filter(a => !a.is_profiling_problem).length;
    const problemsSolved = assessmentData.recent_attempts.filter(a => a.completed && !a.is_profiling_problem).length;
    const successRate = problemsAttempted > 0 
      ? Math.round((problemsSolved / problemsAttempted) * 100) 
      : 0;
    const streak = calculateCurrentStreak(assessmentData.recent_attempts);
    
    return {
      problemsAttempted,
      problemsSolved,
      successRate,
      streak
    };
  };

  const calculateCurrentStreak = (attempts: Attempt[]) => {
    const sortedAttempts = [...attempts]
      .filter(a => a.completed)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    
    if (sortedAttempts.length === 0) return 0;
    
    const uniqueDates = new Set();
    sortedAttempts.forEach(attempt => {
      const date = new Date(attempt.start_time).toLocaleDateString();
      uniqueDates.add(date);
    });
    
    const dates = Array.from(uniqueDates) as string[];
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    
    if (dates[0] !== today && dates[0] !== yesterday) {
      return 0;
    }
    
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const current = new Date(dates[i-1]);
      const prev = new Date(dates[i]);
      const diffTime = current.getTime() - prev.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Function to get user's initials for avatar
  const getUserInitials = () => {
    if (user?.displayName) {
      return user.displayName.split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    } else if (user?.email) {
      return user.email.split('@')[0].substring(0, 2).toUpperCase();
    }
    return "SB";
  };

  return (
    <div className="container max-w-6xl py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Profile info & stats */}
        <div>
          <Card className="overflow-hidden mb-6 border-none">
            <div className="bg-[#4863f7] p-6 text-white text-center">
              <div className="flex flex-col items-center">
                {/* Updated avatar with gradient */}
                <div className="h-24 w-24 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mb-3 font-bold text-3xl text-white">
                  {getUserInitials()}
                </div>
                <h2 className="text-xl font-bold">
                  {user?.displayName || user?.email?.split('@')[0] || "Summit Bajaj"}
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  {user?.email || "bajajsummit@gmail.com"}
                </p>
              </div>
            </div>

            <CardContent className="p-6 bg-white">
              <div className="mb-6">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Skill Level</span>
                  <span className="text-sm font-medium">
                    {assessmentData?.skill_level || "Beginner"}
                  </span>
                </div>
                <Progress 
                  value={assessmentData?.overall_mastery || 18} 
                  className="h-2 mb-1 bg-slate-100" 
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Mastery: {Math.round(assessmentData?.overall_mastery || 18)}%</span>
                  <span>{assessmentData?.topic_masteries.length || 5} Topics</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-start mb-1">
                    <Code className="h-4 w-4 text-[#4863f7] mr-2 mt-0.5" />
                    <p className="text-sm font-medium">Problems Solved</p>
                  </div>
                  <p className="text-center text-2xl font-bold mt-1">
                    {assessmentData ? assessmentData.topic_masteries.reduce(
                      (sum, topic) => sum + (topic.problems_solved_non_ai || topic.problems_solved), 0) : 3}
                  </p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-start mb-1">
                    <TrendingUp className="h-4 w-4 text-[#4863f7] mr-2 mt-0.5" />
                    <p className="text-sm font-medium">Current Streak</p>
                  </div>
                  <p className="text-center text-2xl font-bold mt-1">
                    {assessmentData ? calculateStats(assessmentData).streak : 0} days
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={handleStartProfiling} 
                className="w-full bg-[#4863f7] hover:bg-[#3a50d9] text-white font-medium"
              >
                <Brain className="h-4 w-4 mr-2" />
                Take Skill Assessment
              </Button>
              
              <p className="text-xs text-center text-slate-500 mt-2">
                Our AI will analyze your skills and create a personal learning path
              </p>
            </CardContent>
          </Card>
          
          <Card className="mb-6 border border-slate-200">
            <CardHeader className="pb-0">
              <CardTitle className="text-base flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                Areas to Focus On
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {!isLoading && assessmentData?.struggle_patterns && assessmentData.struggle_patterns.length > 0 ? (
                <div className="space-y-3">
                  {assessmentData.struggle_patterns.slice(0, 3).map((struggle, i) => {
                    const areaName = struggle.area === "algorithm_understanding" ? "Algorithm Pattern Recognition" :
                                     struggle.area === "edge_case_handling" ? "Edge Case Handling" :
                                     struggle.area === "code_efficiency" ? "Time/Space Optimization" :
                                     struggle.area;
                    
                    return (
                      <div key={i} className="py-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{areaName}</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-2 w-full">
                          <div 
                            className="bg-slate-700 rounded-full h-2" 
                            style={{ width: `${Math.min(100, struggle.count * 10)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-500 py-2">
                  Complete skill assessment to see areas for improvement
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="skills" className="w-full">
            <TabsList className="bg-slate-100 mb-6">
              <TabsTrigger value="skills" className="data-[state=active]:bg-white">Skills</TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-white">Recent Activity</TabsTrigger>
              <TabsTrigger value="recommendations" className="data-[state=active]:bg-white">Recommendations</TabsTrigger>
              <TabsTrigger value="learning" className="data-[state=active]:bg-white">Learning Path</TabsTrigger>
            </TabsList>

            {/* Skills Tab */}
            <TabsContent value="skills">
              <Card className="border border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle>Skills Progress</CardTitle>
                  <p className="text-sm text-slate-500">
                    Track your progress across different data structures and algorithms
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-6 py-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i}>
                          <div className="flex justify-between mb-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                          <Skeleton className="h-2 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6 py-2">
                      {assessmentData?.topic_masteries.map((topic) => {
                        const showWarningIcon = topic.mastery_level < 40;
                        const roundedMastery = Math.round(topic.mastery_level);
                        
                        return (
                          <div key={topic.topic_name}>
                            <div className="flex justify-between mb-2">
                              <div className="flex items-center">
                                {showWarningIcon && (
                                  <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                                )}
                                <span className="font-medium">{topic.topic_name}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-sm text-slate-500 mr-2">
                                  {topic.problems_solved}/{topic.problems_attempted} problems
                                </span>
                                <Badge 
                                  className={`${
                                    roundedMastery >= 70 ? "bg-green-100 text-green-800" : 
                                    roundedMastery >= 40 ? "bg-[#4863f7] text-white" : 
                                    roundedMastery > 0 ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-800"
                                  }`}
                                >
                                  {roundedMastery}%
                                </Badge>
                              </div>
                            </div>
                            
                            {topic.mastery_level > 0 ? (
                              <div className="h-2 bg-slate-100 rounded-full">
                                <div 
                                  className={`h-2 rounded-full ${
                                    roundedMastery >= 70 ? "bg-green-500" : 
                                    roundedMastery >= 40 ? "bg-[#4863f7]" : 
                                    "bg-amber-500"
                                  }`}
                                  style={{ width: `${topic.mastery_level}%` }}
                                />
                              </div>
                            ) : (
                              <div className="h-2 bg-slate-100 rounded-full" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card className="border border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle>Recent Activity</CardTitle>
                  <p className="text-sm text-slate-500">
                    Your recent problem-solving and learning activities
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4 py-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-start p-3">
                          <Skeleton className="h-8 w-8 rounded-full mr-3" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : assessmentData && assessmentData.recent_attempts.length > 0 ? (
                    <div className="space-y-1 py-2">
                      {assessmentData.recent_attempts.map((attempt, index) => (
                        <div key={index} className="flex items-start p-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            attempt.completed ? "bg-green-100" : "bg-blue-100"
                          }`}>
                            <Code className={`h-4 w-4 ${
                              attempt.completed ? "text-green-600" : "text-[#4863f7]"
                            }`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">
                              {attempt.completed ? "Solved" : "Attempted"} &apos;{attempt.problem_title}&apos;
                            </p>
                            <div className="flex items-center text-sm text-slate-500 mt-1">
                              <span className="mr-2">{new Date(attempt.start_time).toLocaleDateString()}</span>
                              
                              <Badge variant="outline" className="mr-2 text-xs">
                                {attempt.problem_difficulty}
                              </Badge>
                              
                              {attempt.is_profiling_problem && (
                                <Badge variant="outline" className="text-xs bg-purple-50">
                                  Assessment
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-500">No recent activities found</p>
                      <Button 
                        variant="outline" 
                        className="mt-4 text-[#4863f7] hover:text-[#3a50d9] border-[#4863f7] hover:border-[#3a50d9] hover:bg-blue-50"
                        onClick={() => router.push('/problems')}
                      >
                        Start Solving Problems
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations">
              <Card className="border border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    Personalized Recommendations
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Based on your assessment results and learning patterns
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-5 py-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <Skeleton className="h-5 w-40 mb-2" />
                          <Skeleton className="h-4 w-full" />
                          <div className="flex justify-end mt-2">
                            <Skeleton className="h-8 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4 py-2">
                      {assessmentData && groupedTopics.weak.length > 0 && (
                        <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors border-l-4 border-l-amber-500">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                                Improve {groupedTopics.weak[0].topic_name}
                              </h3>
                              <p className="text-sm text-slate-500 mt-1">
                                This is one of your weakest areas with {Math.round(groupedTopics.weak[0].mastery_level)}% mastery.
                                Focus on understanding the fundamentals.
                              </p>
                            </div>
                            <Link href={`/learn/${groupedTopics.weak[0].topic_name.toLowerCase().replace(/ /g, '-')}`}>
                              <Button size="sm" className="bg-[#4863f7] hover:bg-[#3a50d9] text-white">
                                Start Learning <ChevronRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}

                      <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors border-l-4 border-l-[#4863f7]">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium flex items-center">
                              <BookOpen className="h-4 w-4 mr-2 text-[#4863f7]" />
                              Next Learning Topic
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                              Based on your progress, we recommend focusing on{" "}
                              {assessmentData && assessmentData.topic_masteries.length > 0 
                                ? getNextRecommendedTopic(assessmentData.topic_masteries) 
                                : "Two Pointers"} techniques next.
                            </p>
                          </div>
                          <Link href={`/learn/${assessmentData && assessmentData.topic_masteries.length > 0 
                            ? getNextRecommendedTopic(assessmentData.topic_masteries).toLowerCase().replace(/ /g, '-')
                            : "two-pointers"}`}>
                            <Button size="sm" className="bg-[#4863f7] hover:bg-[#3a50d9] text-white">
                              Start Learning <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Learning Path Tab */}
            <TabsContent value="learning">
              {isLoading ? (
                <Card className="border border-slate-200">
                  <CardHeader>
                    <Skeleton className="h-6 w-40 mb-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <Skeleton className="h-5 w-32 mb-3" />
                          <Skeleton className="h-2 w-full mb-4" />
                          <div className="grid grid-cols-2 gap-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <CurriculumProgress data={{
                  topicMasteries: Object.fromEntries(
                    assessmentData?.topic_masteries.map(topic => [
                      topic.topic_name, topic.mastery_level
                    ]) || []
                  ),
                  nextRecommendedTopic: getNextRecommendedTopic(assessmentData?.topic_masteries || []),
                  currentSkillLevel: assessmentData?.skill_level || "Beginner"
                }} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Helper function to determine next recommended topic
function getNextRecommendedTopic(topicMasteries: TopicMastery[]): string {
  const topicProgression = [
    "Arrays & Hashing", 
    "Two Pointers", 
    "Stack", 
    "Binary Search", 
    "Sliding Window", 
    "Linked List", 
    "Trees", 
    "Tries", 
    "Heap / Priority Queue", 
    "Graphs",
    "1-D DP",
    "2-D DP"
  ];
  
  const lowMasteryTopics = topicMasteries.filter(t => t.mastery_level < 40);
  
  if (lowMasteryTopics.length > 0) {
    return lowMasteryTopics[0].topic_name;
  }
  
  const masteredTopicNames = topicMasteries
    .filter(t => t.mastery_level >= 40)
    .map(t => t.topic_name);
  
  for (const topic of topicProgression) {
    if (!masteredTopicNames.includes(topic)) {
      return topic;
    }
  }
  
  return "Two Pointers";
}