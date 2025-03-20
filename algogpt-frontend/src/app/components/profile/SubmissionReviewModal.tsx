import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

// Define a type for JSON-serializable values
export type JsonValue = 
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface SubmissionReviewProps {
  review: {
    status: string;
    code: string;
    passed_tests: number;
    total_tests: number;
    failing_test?: {
      input: JsonValue;
      expected_output: JsonValue;
      output: JsonValue;
      error_message?: string;
    };
  };
  onContinue: () => void;
}

const SubmissionReviewModal: React.FC<SubmissionReviewProps> = ({ review, onContinue }) => {
  const isAccepted = review.status === 'Accepted';
  const [animationStep, setAnimationStep] = useState(0);
  
  // Simpler sequence animation that's compatible with the Dialog component
  useEffect(() => {
    // Header animation
    const step1 = setTimeout(() => setAnimationStep(1), 150);
    // Results animation
    const step2 = setTimeout(() => setAnimationStep(2), 300);
    // Details animation
    const step3 = setTimeout(() => setAnimationStep(3), 450);
    // Button animation
    const step4 = setTimeout(() => setAnimationStep(4), 600);
    
    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      clearTimeout(step4);
    };
  }, []);
  
  return (
    <Dialog open={true} onOpenChange={() => onContinue()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className={`transition-all duration-300 ease-out ${animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <DialogTitle className="flex items-center">
            {isAccepted ? (
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500 mr-2" />
            )}
            {isAccepted ? 'Solution Accepted!' : 'Solution Needs Work'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className={`flex items-center justify-between bg-slate-100 p-3 rounded-md transition-all duration-300 ease-out ${animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="text-sm font-medium">
              Test Results: {review.passed_tests}/{review.total_tests} tests passed
            </div>
            <div className={`text-sm font-semibold ${isAccepted ? 'text-green-600' : 'text-red-600'}`}>
              {review.status}
            </div>
          </div>
          
          {!isAccepted && review.failing_test && (
            <div className={`mt-4 border p-3 rounded-md transition-all duration-300 ease-out ${animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="font-medium mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                Failed Test Case
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-1">Input:</div>
                  <div className="bg-slate-50 p-2 rounded-md font-mono text-xs break-all overflow-auto max-h-24">
                    {JSON.stringify(review.failing_test.input, null, 2)}
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-1">Expected Output:</div>
                  <div className="bg-slate-50 p-2 rounded-md font-mono text-xs break-all overflow-auto max-h-24">
                    {JSON.stringify(review.failing_test.expected_output, null, 2)}
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
                <div className="font-medium mb-1">Your Output:</div>
                <div className="bg-slate-50 p-2 rounded-md font-mono text-xs break-all overflow-auto max-h-24">
                  {JSON.stringify(review.failing_test.output, null, 2)}
                </div>
              </div>
              
              {review.failing_test.error_message && (
                <div className="mt-3">
                  <div className="font-medium mb-1 text-red-600">Error:</div>
                  <div className="bg-red-50 text-red-800 p-2 rounded-md font-mono text-xs overflow-auto max-h-24">
                    {review.failing_test.error_message}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {isAccepted && (
            <div className={`mt-4 bg-green-50 text-green-800 p-3 rounded-md transition-all duration-300 ease-out ${animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <p>Great job! Your solution passed all test cases. Now we&apos;ll move on to the next problem.</p>
            </div>
          )}
        </div>
        
        <DialogFooter className={`transition-all duration-300 ease-out ${animationStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Button 
            onClick={onContinue}
            className="relative overflow-hidden group"
          >
            <span className="relative z-10">Continue to Next Problem</span>
            <span className="absolute inset-0 bg-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmissionReviewModal;