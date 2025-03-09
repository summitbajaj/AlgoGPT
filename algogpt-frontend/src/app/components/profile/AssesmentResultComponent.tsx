import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Brain, BarChart, Star, AlertTriangle, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

interface TopicAssessment {
  mastery_level: number;
  problems_attempted: number;
  problems_solved: number;
}

interface Recommendation {
  type: string;
  topic?: string;
  area?: string;
  message: string;
}

interface StruggleArea {
  area: string;
  count: number;
}

interface AssessmentResult {
  skill_level: string;
  topic_assessments: Record<string, TopicAssessment>;
  recommendations: Recommendation[];
  problems_attempted: number;
  problems_solved: number;
  struggle_areas?: StruggleArea[];
}

interface AssessmentResultsProps {
  assessmentResult: AssessmentResult;
}

const AssessmentResults: React.FC<AssessmentResultsProps> = ({ assessmentResult }) => {
  const router = useRouter();
  
  // Group topics by mastery level for better organization
  const groupedTopics = {
    strong: [] as [string, TopicAssessment][],
    medium: [] as [string, TopicAssessment][],
    weak: [] as [string, TopicAssessment][]
  };
  
  Object.entries(assessmentResult.topic_assessments || {}).forEach(([topic, data]) => {
    if (data.mastery_level >= 70) groupedTopics.strong.push([topic, data]);
    else if (data.mastery_level >= 40) groupedTopics.medium.push([topic, data]);
    else groupedTopics.weak.push([topic, data]);
  });
  
  // Calculate problem success rate
  const successRate = assessmentResult.problems_solved / 
    (assessmentResult.problems_attempted || 1) * 100;
  
  const handleBackToProfile = () => {
    router.push('/profile');
  };
  
  const handleStartPracticing = () => {
    router.push('/problems');
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Assessment Complete</h1>
              <p className="text-blue-100">
                Your personalized learning profile has been created
              </p>
            </div>
            <Brain className="h-12 w-12 text-blue-100" />
          </div>
        </div>
        
        <Tabs defaultValue="overview" className="p-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="topics">Topic Analysis</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Skill Level Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <Star className="h-5 w-5 mr-2 text-yellow-500" />
                    Overall Skill Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-center py-2">
                    {assessmentResult.skill_level}
                  </div>
                  <p className="text-center text-gray-500 text-sm">
                    Based on {assessmentResult.problems_attempted} problems
                  </p>
                </CardContent>
              </Card>
              
              {/* Performance Statistics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <BarChart className="h-5 w-5 mr-2 text-blue-500" />
                    Performance Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{assessmentResult.problems_solved}</div>
                      <div className="text-xs text-gray-500">Problems Solved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{Math.round(successRate)}%</div>
                      <div className="text-xs text-gray-500">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Object.keys(assessmentResult.topic_assessments || {}).length}
                      </div>
                      <div className="text-xs text-gray-500">Topics Assessed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Strength & Weaknesses Summary */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <Card className={groupedTopics.strong.length > 0 ? "" : "hidden"}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                    Your Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {groupedTopics.strong.map(([topic]) => (
                      <li key={topic} className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              {/* Weaknesses */}
              <Card className={groupedTopics.weak.length > 0 ? "" : "hidden"}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {groupedTopics.weak.map(([topic]) => (
                      <li key={topic} className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              {/* Struggle Areas */}
              {assessmentResult.struggle_areas && assessmentResult.struggle_areas.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <XCircle className="h-5 w-5 mr-2 text-red-500" />
                      Common Challenges
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assessmentResult.struggle_areas.slice(0, 4).map((struggle) => (
                        <div key={struggle.area} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{struggle.area}</span>
                            <span className="text-sm text-muted-foreground">{struggle.count} times</span>
                          </div>
                          <Progress value={Math.min(100, struggle.count * 20)} className="h-1"/>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="topics">
            <div className="space-y-6">
              <h3 className="font-medium text-lg mb-3">Topic Mastery Breakdown</h3>
              
              {Object.entries(assessmentResult.topic_assessments || {}).map(([topic, data]) => (
                <div key={topic} className="border rounded-lg p-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{topic}</span>
                    <span className="text-sm">{Math.round(data.mastery_level)}%</span>
                  </div>
                  <Progress 
                    value={data.mastery_level} 
                    className={`h-2 ${
                      data.mastery_level >= 70 ? "bg-green-500" : 
                      data.mastery_level >= 40 ? "bg-blue-500" : 
                      "bg-amber-500"
                    }`}
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Problems: {data.problems_solved}/{data.problems_attempted}</span>
                    <span>
                      {data.mastery_level >= 70 ? "Strong" : 
                       data.mastery_level >= 40 ? "Intermediate" : "Needs Work"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="recommendations">
            <h3 className="font-medium text-lg mb-3">Personalized Recommendations</h3>
            <div className="space-y-4">
              {assessmentResult.recommendations.map((rec, index) => (
                <Card key={index} className={
                  rec.type === "improvement" ? "border-l-4 border-l-amber-500" :
                  rec.type === "next_topic" ? "border-l-4 border-l-blue-500" :
                  rec.type === "practice" ? "border-l-4 border-l-green-500" :
                  rec.type === "skill_gap" ? "border-l-4 border-l-red-500" : ""
                }>
                  <CardContent className="p-4">
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        {rec.type === "improvement" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                        {rec.type === "next_topic" && <Brain className="h-5 w-5 text-blue-500" />}
                        {rec.type === "practice" && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {rec.type === "skill_gap" && <XCircle className="h-5 w-5 text-red-500" />}
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {rec.topic || rec.area || "Recommendation"}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{rec.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="border-t p-4 flex justify-between">
          <Button variant="outline" onClick={handleBackToProfile}>
            Back to Profile
          </Button>
          <Button 
            onClick={handleStartPracticing}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
          >
            Start Practicing
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResults;