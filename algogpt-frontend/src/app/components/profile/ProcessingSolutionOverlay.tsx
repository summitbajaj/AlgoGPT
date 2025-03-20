import React, { useState, useEffect } from 'react';
import { Code, CheckCircle, Sparkles } from 'lucide-react';

interface ProcessingSolutionOverlayProps {
  isVisible: boolean;
}

const ProcessingSolutionOverlay: React.FC<ProcessingSolutionOverlayProps> = ({ isVisible }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    { label: "Evaluating solution", icon: <Code className="text-blue-600" /> },
    { label: "Analyzing performance", icon: <Sparkles className="text-blue-600" /> },
    { label: "Preparing next challenge", icon: <CheckCircle className="text-blue-600" /> }
  ];

  // Progressive step advancement (never cycles back to beginning)
  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      return;
    }

    // Only advance to the next step, but don't go back to beginning
    let timer: NodeJS.Timeout;
    
    if (currentStep < steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
      }, 4000); // Longer time between steps (4 seconds)
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isVisible, currentStep, steps.length]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full border border-slate-200">
        {/* Title */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-slate-800">Processing Solution</h3>
          <p className="text-slate-500 mt-1">Please wait while we process your code</p>
        </div>

        {/* Current step with subtle loading indicator */}
        <div className="flex items-center justify-center space-x-4 py-6">
          {/* Animated spinner - more subtle */}
          <div className="relative h-12 w-12 flex-shrink-0">
            <div className="absolute inset-0 border-2 border-blue-50 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-transparent border-t-blue-400 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              {steps[currentStep].icon}
            </div>
          </div>
          
          <div className="text-left">
            <p className="font-medium text-slate-900">{steps[currentStep].label}</p>
            <p className="text-sm text-slate-500">Step {currentStep + 1} of {steps.length}</p>
          </div>
        </div>

        {/* Dots indicator - more subtle */}
        <div className="flex justify-center space-x-3 mt-4">
          {steps.map((_, index) => (
            <div 
              key={index} 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === currentStep ? 'bg-blue-400 w-5' : 
                index < currentStep ? 'bg-blue-200 w-1.5' : 'bg-slate-200 w-1.5'
              }`} 
            />
          ))}
        </div>
        
        {/* Optional tip */}
        <div className="mt-8 text-center text-sm text-slate-400 border-t border-slate-100 pt-4">
          <p>This may take a few moments depending on solution complexity</p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingSolutionOverlay;