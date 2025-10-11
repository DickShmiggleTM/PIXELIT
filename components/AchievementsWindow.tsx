import React from 'react';
import DraggableWindow from './DraggableWindow';
import { UnlockedAchievement } from '../types';
import { ALL_ACHIEVEMENTS } from '../data/achievements';

interface AchievementsWindowProps {
    title: string;
    onClose: () => void;
    unlockedAchievements: UnlockedAchievement[];
}

const AchievementsWindow: React.FC<AchievementsWindowProps> = ({ title, onClose, unlockedAchievements }) => {
    const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[450px]" height="h-[500px]">
            <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto p-1">
                    {ALL_ACHIEVEMENTS.map(achievement => {
                        const isUnlocked = unlockedIds.has(achievement.id);
                        const unlockedInfo = isUnlocked 
                            ? unlockedAchievements.find(ua => ua.achievementId === achievement.id) 
                            : null;
                        
                        return (
                            <div 
                                key={achievement.id}
                                className={`p-3 border-2 flex flex-col items-center justify-center text-center gap-2 aspect-square transition-all duration-300 ${isUnlocked ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-cyan-400/50 bg-black/30'}`}
                                title={isUnlocked && unlockedInfo ? `Unlocked on ${new Date(unlockedInfo.timestamp).toLocaleDateString()}` : achievement.description}
                            >
                                <div className={`text-4xl transition-transform duration-300 ${isUnlocked ? 'scale-110' : 'grayscale'}`}>
                                    {achievement.icon}
                                </div>
                                <h4 className={`font-bold ${isUnlocked ? 'text-fuchsia-400' : 'text-cyan-600'}`}>
                                    {achievement.name}
                                </h4>
                                <p className={`text-[10px] ${isUnlocked ? 'text-cyan-300' : 'text-cyan-700'}`}>
                                    {achievement.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default AchievementsWindow;
