import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle, AlertTriangle, Star, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// Define our curriculum structure
const dsaCurriculum = [
  { id: 'fundamentals', name: 'Fundamentals', topics: ['Arrays & Hashing', 'Two Pointers', 'Stack', 'Binary Search'] },
  { id: 'intermediate', name: 'Intermediate', topics: ['Sliding Window', 'Linked List', 'Trees', 'Tries'] },
  { id: 'advanced', name: 'Advanced', topics: ['Heap / Priority Queue', 'Graphs', 'Advanced Graphs'] },
  { id: 'expert', name: 'Expert', topics: ['1-D DP', '2-D DP', 'Bit Manipulation', 'Math & Geometry'] }
];

// Type definitions
interface TopicMasteries {
  [key: string]: number;
}

interface CurriculumData {
  topicMasteries: TopicMasteries;
  nextRecommendedTopic: string;
  currentSkillLevel: string;
}

interface CurriculumProgressProps {
  data?: CurriculumData;
}

// Default data for preview purposes
const defaultData: CurriculumData = {
  topicMasteries: {
    'Arrays & Hashing': 35,
    'Two Pointers': 42,
    'Stack': 28,
    'Binary Search': 15,
    'Sliding Window': 5,
    'Linked List': 0,
    'Trees': 0,
    'Tries': 0,
    'Heap / Priority Queue': 0,
    'Graphs': 0,
    'Advanced Graphs': 0,
    '1-D DP': 0,
    '2-D DP': 0,
    'Bit Manipulation': 0,
    'Math & Geometry': 0
  },
  nextRecommendedTopic: 'Binary Search',
  currentSkillLevel: 'Beginner'
};

const CurriculumProgress: React.FC<CurriculumProgressProps> = ({ data = defaultData }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('fundamentals');
  
  const calculateSectionProgress = (section: typeof dsaCurriculum[0]) => {
    const topics = section.topics;
    const totalMastery = topics.reduce((sum, topic) => sum + (data.topicMasteries[topic] || 0), 0);
    return Math.round(totalMastery / (topics.length * 100) * 100);
  };
  
  const isCurrentFocus = (section: typeof dsaCurriculum[0]) => {
    return section.topics.includes(data.nextRecommendedTopic);
  };
  
  const getTopicStatus = (topic: string) => {
    const mastery = data.topicMasteries[topic] || 0;
    if (mastery >= 70) return 'mastered';
    if (mastery >= 40) return 'learning';
    if (mastery > 0) return 'started';
    return 'not-started';
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
          DSA Learning Journey
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {dsaCurriculum.map(section => (
            <div key={section.id} className="border rounded-lg overflow-hidden">
              <div 
                className={`p-4 flex justify-between items-center cursor-pointer ${
                  isCurrentFocus(section) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              >
                <div className="flex-1">
                  <h3 className="font-medium flex items-center">
                    {isCurrentFocus(section) && (
                      <Star className="h-4 w-4 mr-2 text-yellow-500" />
                    )}
                    {section.name}
                    {isCurrentFocus(section) && (
                      <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">Current Focus</Badge>
                    )}
                  </h3>
                  <div className="mt-2">
                    <Progress value={calculateSectionProgress(section)} className="h-2" />
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  {expandedSection === section.id ? 'Hide' : 'Show'} Topics
                </Button>
              </div>
              
              {expandedSection === section.id && (
                <div className="p-4 pt-0 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {section.topics.map(topic => {
                      const status = getTopicStatus(topic);
                      const mastery = data.topicMasteries[topic] || 0;
                      
                      return (
                        <div 
                          key={topic} 
                          className={`p-3 border rounded ${topic === data.nextRecommendedTopic ? 'border-blue-300 bg-blue-50' : ''}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                              {status === 'mastered' && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
                              {status === 'learning' && <BookOpen className="h-4 w-4 mr-2 text-[#4863f7]" />}
                              {status === 'started' && <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />}
                              <span className="font-medium">{topic}</span>
                            </div>
                            <span className="text-sm">{Math.round(mastery)}%</span>
                          </div>
                          
                          <Progress 
                            value={mastery} 
                            className={`h-1.5 ${
                              mastery >= 70 ? "bg-green-500" : 
                              mastery >= 40 ? "bg-[#4863f7]" : 
                              mastery > 0 ? "bg-amber-500" : "bg-gray-200"
                            }`}
                          />
                          
                          {topic === data.nextRecommendedTopic && (
                            <div className="mt-2 flex">
                              <Link href="/problems">
                                <Button size="sm" className="text-xs h-7 px-2">
                                  Start Learning <ChevronRight className="ml-1 h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CurriculumProgress;