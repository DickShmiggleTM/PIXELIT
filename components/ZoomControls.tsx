import React from 'react';
import PixelatedButton from './PixelatedButton';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ zoom, onZoomIn, onZoomOut, onReset }) => {
  return (
    <div className="flex items-center gap-2 text-xs">
      <PixelatedButton onClick={onZoomOut} className="px-2 py-1 font-bold text-lg leading-none">-</PixelatedButton>
      <span onClick={onReset} className="text-cyan-300 cursor-pointer w-16 text-center hover:text-white" title="Reset Zoom">
        {Math.round(zoom * 100)}%
      </span>
      <PixelatedButton onClick={onZoomIn} className="px-2 py-1 font-bold text-lg leading-none">+</PixelatedButton>
    </div>
  );
};

export default ZoomControls;