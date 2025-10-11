import React from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { getDailyPrompt } from '../data/prompts';
import { AchievementID } from '../types';

interface DailyChallengeWindowProps {
    title: string;
    onClose: () => void;
    unlockAchievement: (id: AchievementID) => void;
}

const DailyChallengeWindow: React.FC<DailyChallengeWindowProps> = ({ title, onClose, unlockAchievement }) => {
    const prompt = getDailyPrompt();

    const handleStart = () => {
        unlockAchievement(AchievementID.CHALLENGER);
        onClose();
    }

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[380px]" height="h-auto">
            <div className="bg-transparent h-full flex flex-col p-4 gap-4 text-center text-cyan-300">
                <h3 className="text-lg font-bold text-fuchsia-400 tracking-wider">Today's Challenge</h3>
                <p className="text-base leading-relaxed p-4 border-2 border-cyan-400/50 bg-black/30">
                    "{prompt}"
                </p>
                <PixelatedButton onClick={handleStart} className="w-full">
                    Start Challenge!
                </PixelatedButton>
            </div>
        </DraggableWindow>
    );
};

export default DailyChallengeWindow;
