import React, { useState, useEffect } from 'react';
import { Achievement } from '../types';

interface AchievementToastProps {
    achievement: Achievement;
    onComplete: () => void;
}

const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onComplete }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true); // Animate in
        const timer = setTimeout(() => {
            setVisible(false); // Animate out
        }, 4000);

        const completeTimer = setTimeout(() => {
            onComplete();
        }, 4500); // Remove from DOM after animation

        return () => {
            clearTimeout(timer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div 
            className={`fixed bottom-12 right-4 w-72 bg-gradient-to-r from-fuchsia-800 via-purple-800 to-blue-800 border-2 border-cyan-400 p-3 shadow-lg shadow-fuchsia-500/30 flex items-center gap-3 z-[100] transition-all duration-300 ease-out ${visible ? 'translate-x-0 opacity-100' : 'translate-x-16 opacity-0'}`}
        >
            <div className="text-3xl">{achievement.icon}</div>
            <div className="flex-grow">
                <p className="text-sm text-cyan-300 font-bold tracking-wider">Achievement Unlocked!</p>
                <p className="text-xs text-white">{achievement.name}</p>
            </div>
        </div>
    );
};

export default AchievementToast;
