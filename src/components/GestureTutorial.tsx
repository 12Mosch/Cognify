import { useState, useEffect } from 'react';
import { isTouchDevice } from '../lib/gestureUtils';

interface GestureTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  studyMode: 'basic' | 'spaced-repetition';
}

/**
 * GestureTutorial Component - Interactive tutorial for mobile gesture controls
 * 
 * Shows users how to use swipe gestures for flashcard navigation and rating.
 * Only displays on touch devices and can be dismissed permanently.
 */
export function GestureTutorial({ isOpen, onClose, studyMode }: GestureTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Don't show tutorial on non-touch devices
  if (!isTouchDevice() || !isOpen) {
    return null;
  }

  const basicModeSteps = [
    {
      title: 'Welcome to Touch Controls!',
      description: 'Learn how to navigate flashcards with simple gestures.',
      gesture: '👋',
      instruction: 'Swipe gestures make studying faster and more intuitive.',
    },
    {
      title: 'Flip Cards',
      description: 'Swipe left or tap anywhere to flip the card and see the answer.',
      gesture: '👈',
      instruction: 'Try swiping left on any flashcard to reveal the answer.',
    },
    {
      title: 'Next Card',
      description: 'Swipe right to move to the next card in your deck.',
      gesture: '👉',
      instruction: 'Swipe right when you\'re ready for the next question.',
    },
  ];

  const spacedRepetitionSteps = [
    {
      title: 'Welcome to Smart Study!',
      description: 'Learn gesture controls for spaced repetition study mode.',
      gesture: '🧠',
      instruction: 'Gestures help you rate cards quickly during study sessions.',
    },
    {
      title: 'Flip Cards',
      description: 'Swipe left or tap to reveal the answer.',
      gesture: '👈',
      instruction: 'Swipe left to see the answer and rate your knowledge.',
    },
    {
      title: 'Rate Easy',
      description: 'Swipe right when you knew the answer perfectly.',
      gesture: '👉',
      instruction: 'Right swipe = "Easy" - you knew this perfectly!',
    },
    {
      title: 'Rate Again',
      description: 'Swipe down when you didn\'t know the answer.',
      gesture: '👇',
      instruction: 'Down swipe = "Again" - study this card more.',
    },
  ];

  const steps = studyMode === 'basic' ? basicModeSteps : spacedRepetitionSteps;
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // Mark tutorial as completed in localStorage
    localStorage.setItem(`gesture-tutorial-completed-${studyMode}`, 'true');
    onClose();
  };

  const handleSkip = () => {
    handleFinish();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-500 dark:bg-blue-600 text-white p-6 text-center">
          <div className="text-4xl mb-2">{currentStepData.gesture}</div>
          <h2 className="text-xl font-bold">{currentStepData.title}</h2>
          <p className="text-blue-100 mt-2">{currentStepData.description}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              {currentStepData.instruction}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-500'
                      : index < currentStep
                      ? 'bg-blue-300'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-sm"
            >
              Skip Tutorial
            </button>

            <div className="flex space-x-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-sm"
                >
                  Previous
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors font-medium"
              >
                {currentStep === steps.length - 1 ? 'Get Started!' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GestureTutorial;
