


import React from 'react';
import { WindowType } from '../types';

interface StartMenuProps {
  isOpen: boolean;
  onOpenWindow: (window: WindowType) => void;
}

const MenuItem: React.FC<{ onClick: () => void, children: React.ReactNode, active?: boolean }> = ({ onClick, children, active }) => (
  <button onClick={onClick} className={`w-full text-left px-4 py-2 hover:bg-fuchsia-500/50 hover:text-white ${active ? 'bg-fuchsia-500/50 text-white' : 'text-cyan-300'}`}>
    {children}
  </button>
);


const StartMenu: React.FC<StartMenuProps> = ({ isOpen, onOpenWindow }) => {
  return (
    <div className={`absolute bottom-full left-0 w-60 bg-black/50 backdrop-blur-sm border-2 border-cyan-400 flex flex-col text-sm shadow-lg shadow-cyan-500/20 transition-all duration-200 ease-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="p-2 bg-gradient-to-r from-fuchsia-800 via-purple-800 to-blue-800 text-white text-lg tracking-widest text-center border-b-2 border-cyan-400">
            PIXELIT
        </div>
        <div className="flex-grow py-1">
            <MenuItem onClick={() => onOpenWindow(WindowType.FILE_BROWSER)}>File Browser</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.VERSION_CONTROL)}>Version Control</MenuItem>
            <div className="h-px bg-cyan-400/50 my-1"></div>
            <MenuItem onClick={() => onOpenWindow(WindowType.AI_CHAT)}>AI Chat</MenuItem>
            <MenuItem id="animation-window-button" onClick={() => onOpenWindow(WindowType.ANIMATION_TIMELINE)}>Animation Timeline</MenuItem>
            <MenuItem id="layers-window-button" onClick={() => onOpenWindow(WindowType.LAYERS)}>Layers</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.REFERENCE_IMAGE)}>Reference Image</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.FILTERS)}>Filters & Effects</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.PREVIEW)}>Interactive Preview</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.MACROS_AND_SCRIPTS)}>Macros & Scripts</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.CHIPTUNE_SFX)}>Chiptune SFX Generator</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.MUSIC_VISUALIZER)}>Music Visualizer</MenuItem>
            <div className="h-px bg-cyan-400/50 my-1"></div>
            <MenuItem onClick={() => onOpenWindow(WindowType.TUTORIALS)}>Tutorials</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.DAILY_CHALLENGE)}>Daily Challenge</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.ACHIEVEMENTS)}>Achievements</MenuItem>
            <div className="h-px bg-cyan-400/50 my-1"></div>
            <MenuItem onClick={() => onOpenWindow(WindowType.AI_PALETTE)}>AI Palette Generator</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.AI_UPSCALE)}>AI Upscaler</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.AI_SPRITE_SHEET)}>AI Sprite Sheet Gen</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.AI_STYLE_TUNER)}>AI Style Tuner</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.AI_AUTO_SHADING)}>AI Auto-Shading</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.AI_LAYER_SEPARATION)}>AI Layer Separation</MenuItem>
            <div className="h-px bg-cyan-400/50 my-1"></div>
            <MenuItem onClick={() => onOpenWindow(WindowType.SETTINGS)}>Settings</MenuItem>
            <MenuItem onClick={() => onOpenWindow(WindowType.EXPORT)}>Export</MenuItem>
        </div>
    </div>
  );
};

export default StartMenu;
