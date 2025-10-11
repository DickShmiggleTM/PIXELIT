import React from 'react';
import { StartIcon } from './icons/WindowIcons';
import ZoomControls from './ZoomControls';

interface TaskbarProps {
  onMenuClick: () => void;
  children: React.ReactNode;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const Taskbar: React.FC<TaskbarProps> = ({ onMenuClick, children, zoom, onZoomIn, onZoomOut, onReset }) => {
  return (
    <div className="w-full h-10 bg-black/50 backdrop-blur-sm border-t-2 border-cyan-400 flex items-center justify-between px-2 z-50 relative text-cyan-300">
      {/* Left side */}
      <div className="relative">
        <button
          onClick={onMenuClick}
          className="flex items-center gap-1 px-2 py-1 bg-black/30 border-2 border-cyan-400 hover:shadow-[0_0_10px_0_#0ff] active:bg-cyan-500/20 text-sm transition-shadow duration-200"
        >
          <StartIcon />
          Menu
        </button>
        {children}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <ZoomControls 
            zoom={zoom} 
            onZoomIn={onZoomIn} 
            onZoomOut={onZoomOut} 
            onReset={onReset} 
        />
        <div className="px-2 py-1 border-2 border-cyan-400/50 bg-black/30 text-xs">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default Taskbar;