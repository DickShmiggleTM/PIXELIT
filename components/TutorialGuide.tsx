import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Tutorial, AchievementID } from '../types';
import PixelatedButton from './PixelatedButton';

interface TutorialGuideProps {
    tutorial: Tutorial;
    onNext: () => void;
    onPrev: () => void;
    onEnd: () => void;
    currentStepIndex: number;
    unlockAchievement: (id: AchievementID) => void;
}

const TutorialGuide: React.FC<TutorialGuideProps> = ({ tutorial, onNext, onPrev, onEnd, currentStepIndex, unlockAchievement }) => {
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

    const currentStep = tutorial.steps[currentStepIndex];

    useLayoutEffect(() => {
        const targetElement = currentStep.targetId ? document.getElementById(currentStep.targetId) : null;
        
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            setHighlightStyle({
                position: 'fixed',
                left: `${rect.left - 4}px`,
                top: `${rect.top - 4}px`,
                width: `${rect.width + 8}px`,
                height: `${rect.height + 8}px`,
                boxShadow: '0 0 20px 10px #f0f, inset 0 0 10px 5px #f0f',
                border: '2px solid white',
                borderRadius: '4px',
                pointerEvents: 'none',
                transition: 'all 0.3s ease-in-out',
                zIndex: 9998,
            });

            const placement = currentStep.placement || 'bottom';
            let top = 0, left = 0, transform = '';

            switch (placement) {
                case 'top':
                    top = rect.top - 8;
                    left = rect.left + rect.width / 2;
                    transform = 'translate(-50%, -100%)';
                    break;
                case 'bottom':
                    top = rect.bottom + 8;
                    left = rect.left + rect.width / 2;
                    transform = 'translate(-50%, 0)';
                    break;
                case 'left':
                    top = rect.top + rect.height / 2;
                    left = rect.left - 8;
                    transform = 'translate(-100%, -50%)';
                    break;
                case 'right':
                    top = rect.top + rect.height / 2;
                    left = rect.right + 8;
                    transform = 'translate(0, -50%)';
                    break;
            }
            
            setTooltipStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                transform: transform,
            });

        } else {
            setHighlightStyle({});
            setTooltipStyle({
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            });
        }
    }, [currentStep]);

    const handleEnd = () => {
        unlockAchievement(AchievementID.LEARNER);
        onEnd();
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9997]"></div>

            {/* Highlight */}
            {currentStep.targetId && <div style={highlightStyle}></div>}

            {/* Tooltip/Guide Box */}
            <div
                style={tooltipStyle}
                className="z-[9999] w-72 bg-black/80 border-2 border-fuchsia-500 p-4 flex flex-col gap-3 text-cyan-300 text-sm transition-all duration-300 ease-in-out"
            >
                <h3 className="font-bold text-lg text-fuchsia-400">{currentStep.title}</h3>
                <p className="text-white">{currentStep.content}</p>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-xs">{currentStepIndex + 1} / {tutorial.steps.length}</span>
                    <div className="flex gap-2">
                        {currentStepIndex > 0 && <PixelatedButton onClick={onPrev}>Prev</PixelatedButton>}
                        {currentStepIndex < tutorial.steps.length - 1 
                            ? <PixelatedButton onClick={onNext}>Next</PixelatedButton>
                            : <PixelatedButton onClick={handleEnd}>Finish</PixelatedButton>
                        }
                    </div>
                </div>
            </div>
        </>
    );
};

export default TutorialGuide;
