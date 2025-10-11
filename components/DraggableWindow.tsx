import React, { useRef } from 'react';
import { useDraggable } from '../hooks/useDraggable';
import { CloseIcon } from './icons/WindowIcons';

interface DraggableWindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
  width?: string;
  height?: string;
}

const DraggableWindow: React.FC<DraggableWindowProps> = ({ title, onClose, children, width = 'w-[500px]', height = 'h-[400px]' }) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const { position } = useDraggable(handleRef);

  return (
    <div
      className={`absolute ${width} ${height} bg-black/50 backdrop-blur-sm border-2 border-cyan-400 flex flex-col shadow-lg shadow-cyan-500/20`}
      style={{ top: position.y, left: position.x }}
    >
      <div
        ref={handleRef}
        className="h-7 bg-gradient-to-r from-fuchsia-800 via-purple-800 to-blue-800 flex items-center justify-between px-2 text-white cursor-move border-b-2 border-cyan-400"
      >
        <span className="text-sm tracking-widest">{title}</span>
        <button onClick={onClose} className="w-5 h-5 bg-black/30 border-2 border-cyan-400 flex items-center justify-center hover:bg-red-500/50">
          <CloseIcon />
        </button>
      </div>
      <div className="flex-grow p-1 m-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default DraggableWindow;