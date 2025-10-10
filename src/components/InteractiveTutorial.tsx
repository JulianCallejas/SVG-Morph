import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'highlight' | 'click' | 'upload' | 'animate';
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to SVG Morph!',
    content: 'This interactive tutorial will guide you through creating beautiful morphing animations between SVG files.',
    position: 'center'
  },
  {
    id: 'upload-source',
    title: 'Upload Source SVG',
    content: 'Start by uploading your first SVG file. This will be the starting point of your animation.',
    target: '[data-tutorial="upload-source"]',
    position: 'bottom',
    action: 'highlight'
  },
  {
    id: 'upload-target',
    title: 'Upload Target SVG',
    content: 'Now upload your second SVG file. This will be the end point of your morphing animation.',
    target: '[data-tutorial="upload-target"]',
    position: 'bottom',
    action: 'highlight'
  },
  {
    id: 'node-matching',
    title: 'Node Matching',
    content: 'SVG Morph automatically matches corresponding points between your SVGs. You can also manually adjust these matches for better results.',
    target: '[data-tutorial="node-matching"]',
    position: 'left',
    action: 'highlight'
  },
  {
    id: 'animation-controls',
    title: 'Animation Controls',
    content: 'Use these controls to play, pause, and adjust your animation. You can change duration, easing, and other settings.',
    target: '[data-tutorial="animation-controls"]',
    position: 'top',
    action: 'highlight'
  },
  {
    id: 'export-options',
    title: 'Export Your Animation',
    content: 'When you\'re happy with your animation, export it in various formats including SVG, CSS, or video.',
    target: '[data-tutorial="export-panel"]',
    position: 'left',
    action: 'highlight'
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    content: 'That\'s it! You now know the basics of creating SVG morphing animations. Experiment with different settings and have fun!',
    position: 'center'
  }
];

interface InteractiveTutorialProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  isVisible,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const step = tutorialSteps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightedElement(null);
    }
  }, [currentStep, isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setHighlightedElement(null);
      return;
    }

    // Add tutorial overlay class to body
    document.body.classList.add('tutorial-active');
    
    return () => {
      document.body.classList.remove('tutorial-active');
    };
  }, [isVisible]);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
    setCurrentStep(0);
  };

  const handleSkip = () => {
    onClose();
    setCurrentStep(0);
  };

  if (!isVisible) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <>
      {/* Tutorial Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 tutorial-overlay">
        {/* Highlight spotlight for targeted elements */}
        {highlightedElement && (
          <div
            className="absolute border-4 border-blue-400 rounded-lg shadow-lg pointer-events-none animate-pulse"
            style={{
              top: highlightedElement.getBoundingClientRect().top - 8,
              left: highlightedElement.getBoundingClientRect().left - 8,
              width: highlightedElement.getBoundingClientRect().width + 16,
              height: highlightedElement.getBoundingClientRect().height + 16,
              zIndex: 60
            }}
          />
        )}
      </div>

      {/* Tutorial Card */}
      <div className={`fixed z-[70] bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 ${getPositionClasses(step.position, highlightedElement)}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {getStepIcon(step)}
            <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <p className="text-gray-600 mb-6 leading-relaxed">{step.content}</p>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
            <span>{Math.round(((currentStep + 1) / tutorialSteps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Skip Tutorial
            </button>
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <span>{isLastStep ? 'Complete' : 'Next'}</span>
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

function getPositionClasses(position: string, highlightedElement: Element | null): string {
  if (!highlightedElement) {
    return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
  }

  const rect = highlightedElement.getBoundingClientRect();
  const cardHeight = 300; // Approximate card height
  const cardWidth = 400; // Approximate card width

  switch (position) {
    case 'top':
      return `top-[${Math.max(20, rect.top - cardHeight - 20)}px] left-[${Math.max(20, rect.left + rect.width / 2 - cardWidth / 2)}px]`;
    case 'bottom':
      return `top-[${rect.bottom + 20}px] left-[${Math.max(20, rect.left + rect.width / 2 - cardWidth / 2)}px]`;
    case 'left':
      return `top-[${Math.max(20, rect.top + rect.height / 2 - cardHeight / 2)}px] left-[${Math.max(20, rect.left - cardWidth - 20)}px]`;
    case 'right':
      return `top-[${Math.max(20, rect.top + rect.height / 2 - cardHeight / 2)}px] left-[${rect.right + 20}px]`;
    default:
      return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
  }
}

function getStepIcon(step: TutorialStep) {
  switch (step.action) {
    case 'upload':
      return <Upload className="w-5 h-5 text-blue-500" />;
    case 'animate':
      return <Play className="w-5 h-5 text-green-500" />;
    case 'click':
      return <Settings className="w-5 h-5 text-purple-500" />;
    default:
      return <div className="w-5 h-5 bg-blue-500 rounded-full" />;
  }
}

// Tutorial Manager Hook
export const useTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('svg-morph-tutorial-completed');
    const hasCompleted = completed === 'true';
    setHasCompletedTutorial(hasCompleted);
    
    // Show tutorial for first-time users
    if (!hasCompleted) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTutorial = () => {
    setShowTutorial(true);
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  const completeTutorial = () => {
    localStorage.setItem('svg-morph-tutorial-completed', 'true');
    setHasCompletedTutorial(true);
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem('svg-morph-tutorial-completed');
    setHasCompletedTutorial(false);
  };

  return {
    showTutorial,
    hasCompletedTutorial,
    startTutorial,
    closeTutorial,
    completeTutorial,
    resetTutorial
  };
};
