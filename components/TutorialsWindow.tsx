import React from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { Tutorial } from '../types';
import { TUTORIALS } from '../data/tutorials';

interface TutorialsWindowProps {
    title: string;
    onClose: () => void;
    onStartTutorial: (tutorial: Tutorial) => void;
}

const TutorialsWindow: React.FC<TutorialsWindowProps> = ({ title, onClose, onStartTutorial }) => {

    const handleStart = (tutorial: Tutorial) => {
        onClose();
        onStartTutorial(tutorial);
    };

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[400px]" height="h-auto">
            <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
                <h3 className="text-center font-bold text-fuchsia-400">Available Tutorials</h3>
                {TUTORIALS.map(tutorial => (
                    <div key={tutorial.id} className="p-3 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-2">
                        <h4 className="font-bold">{tutorial.title}</h4>
                        <p className="text-cyan-400 text-[10px] flex-grow">{tutorial.description}</p>
                        <PixelatedButton onClick={() => handleStart(tutorial)}>
                            Start Tutorial
                        </PixelatedButton>
                    </div>
                ))}
            </div>
        </DraggableWindow>
    );
};

export default TutorialsWindow;
