// Onboarding Tour component for new users
import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from './ui';

interface TourStep {
    target: string; // CSS selector
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
    {
        target: '.tenant-selector',
        title: 'Select Your Tenant',
        content: 'Choose which business you want to manage content for. Each tenant has its own settings and content.',
        position: 'right',
    },
    {
        target: '[href="/content"]',
        title: 'Content Queue',
        content: 'View and manage all your content in the queue. Add new topics and track their progress.',
        position: 'right',
    },
    {
        target: '[href="/calendar"]',
        title: 'Content Calendar',
        content: 'Schedule and visualize your content publishing calendar. Drag and drop to reschedule.',
        position: 'right',
    },
    {
        target: '[href="/images"]',
        title: 'Image Library',
        content: 'Access all your uploaded and AI-generated images. Search by tags or filename.',
        position: 'right',
    },
    {
        target: '[href="/analytics"]',
        title: 'Analytics Dashboard',
        content: 'Track your content performance, token usage, and costs across all tenants.',
        position: 'right',
    },
    {
        target: '.global-search',
        title: 'Quick Search',
        content: 'Press ⌘K (or Ctrl+K) anytime to quickly search across all content, tenants, and images.',
        position: 'bottom',
    },
];

interface OnboardingTourProps {
    onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const step = TOUR_STEPS[currentStep];
        const element = document.querySelector(step.target);

        if (element) {
            const rect = element.getBoundingClientRect();
            const scrollTop = window.scrollY;
            const scrollLeft = window.scrollX;

            let top = rect.top + scrollTop;
            let left = rect.left + scrollLeft;

            switch (step.position) {
                case 'right':
                    left = rect.right + scrollLeft + 16;
                    top = rect.top + scrollTop;
                    break;
                case 'bottom':
                    left = rect.left + scrollLeft;
                    top = rect.bottom + scrollTop + 16;
                    break;
                case 'top':
                    left = rect.left + scrollLeft;
                    top = rect.top + scrollTop - 200;
                    break;
                case 'left':
                    left = rect.left + scrollLeft - 320;
                    top = rect.top + scrollTop;
                    break;
            }

            setPosition({ top, left });

            // Highlight the target element
            element.classList.add('tour-highlight');

            return () => {
                element.classList.remove('tour-highlight');
            };
        }
    }, [currentStep]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem('onboarding_completed', 'true');
        setIsVisible(false);
        onComplete();
    };

    const handleSkip = () => {
        localStorage.setItem('onboarding_skipped', 'true');
        setIsVisible(false);
        onComplete();
    };

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];
    const isLast = currentStep === TOUR_STEPS.length - 1;

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 z-40" />

            {/* Tooltip */}
            <div
                className="fixed z-50 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4"
                style={{ top: position.top, left: position.left }}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-600 rounded text-xs font-medium">
                            {currentStep + 1} / {TOUR_STEPS.length}
                        </span>
                    </div>
                    <button
                        onClick={handleSkip}
                        className="text-gray-500 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{step.content}</p>

                <div className="flex items-center justify-between">
                    <button
                        onClick={handleSkip}
                        className="text-gray-500 hover:text-white text-sm"
                    >
                        Skip tour
                    </button>
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <Button variant="ghost" size="sm" onClick={handlePrev}>
                                <ArrowLeft size={14} /> Back
                            </Button>
                        )}
                        <Button size="sm" onClick={handleNext}>
                            {isLast ? (
                                <>
                                    <Check size={14} /> Finish
                                </>
                            ) : (
                                <>
                                    Next <ArrowRight size={14} />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <style>{`
        .tour-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.5);
          border-radius: 8px;
        }
      `}</style>
        </>
    );
}
