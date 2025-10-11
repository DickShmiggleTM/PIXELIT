import React, { useState, useRef, WheelEvent, MouseEvent } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';

interface ReferenceImageWindowProps {
  title: string;
  onClose: () => void;
}

const ReferenceImageWindow: React.FC<ReferenceImageWindowProps> = ({ title, onClose }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        resetView();
      };
      reader.readAsDataURL(file);
    }
  };
  
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.1, Math.min(prev + delta, 10)));
  };
  
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if(!imageSrc) return;
    e.preventDefault();
    handleZoom(e.deltaY * -0.001);
  };
  
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if(!imageSrc) return;
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isPanning && imageSrc) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  return (
    <DraggableWindow title={title} onClose={onClose} width="w-[400px]" height="h-[450px]">
      <div className="bg-transparent h-full flex flex-col text-xs text-cyan-300">
        <div 
          className="flex-grow bg-black/30 border-2 border-cyan-400/50 overflow-hidden relative flex items-center justify-center"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
          {imageSrc ? (
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Reference"
              className="max-w-none max-h-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                opacity: opacity,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                imageRendering: zoom > 1.5 ? 'pixelated' : 'auto',
              }}
              draggable={false}
            />
          ) : (
            <p className="text-cyan-500">Load a reference image</p>
          )}
        </div>
        <div className="p-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <PixelatedButton onClick={() => fileInputRef.current?.click()} className="flex-1">Load Image</PixelatedButton>
                <PixelatedButton onClick={() => setImageSrc(null)} disabled={!imageSrc} className="flex-1">Clear</PixelatedButton>
            </div>
            <div className="flex items-center gap-2">
                <label>Opacity:</label>
                <input type="range" min="0" max="1" step="0.05" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} className="w-full" disabled={!imageSrc}/>
            </div>
            <div className="flex items-center gap-2">
                <label>Zoom:</label>
                <PixelatedButton onClick={() => handleZoom(-0.1)} disabled={!imageSrc}>-</PixelatedButton>
                <span onClick={resetView} className="flex-1 text-center cursor-pointer">{Math.round(zoom * 100)}%</span>
                <PixelatedButton onClick={() => handleZoom(0.1)} disabled={!imageSrc}>+</PixelatedButton>
            </div>
        </div>
      </div>
    </DraggableWindow>
  );
};

export default ReferenceImageWindow;
