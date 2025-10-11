import React, { useState, useRef, useEffect, useCallback } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { hexToRgb } from '../utils/colorUtils';

interface MusicVisualizerWindowProps {
  title: string;
  onClose: () => void;
  palette: string[];
  onCaptureFrame: (grid: string[][]) => void;
}

type VisualizerType = 'bars' | 'circle' | 'radial';

const CAPTURE_SIZE = 64;

const MusicVisualizerWindow: React.FC<MusicVisualizerWindowProps> = ({ title, onClose, palette, onCaptureFrame }) => {
    const { isListening, error, startListening, stopListening, getFrequencyData } = useAudioVisualizer();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();

    const [visualizerType, setVisualizerType] = useState<VisualizerType>('bars');
    
    const draw = useCallback(() => {
        const data = getFrequencyData();
        const canvas = canvasRef.current;
        if (!data || !canvas) {
            animationFrameId.current = requestAnimationFrame(draw);
            return;
        };

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { width, height } = canvas;
        const bufferLength = data.length;
        
        ctx.fillStyle = 'rgba(10, 10, 31, 0.3)'; // Fading effect
        ctx.fillRect(0, 0, width, height);
        
        switch(visualizerType) {
            case 'bars': {
                const barWidth = (width / bufferLength) * 2.5;
                let x = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (data[i] / 255) * height;
                    const colorIndex = Math.floor((data[i] / 255) * palette.length);
                    ctx.fillStyle = palette[colorIndex] || '#0ff';
                    ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }
                break;
            }
            case 'circle': {
                const avg = data.reduce((sum, val) => sum + val, 0) / bufferLength;
                const radius = (avg / 255) * (Math.min(width, height) / 3);
                const colorIndex = Math.floor((avg / 255) * palette.length);

                ctx.strokeStyle = palette[colorIndex] || '#f0f';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
            }
            case 'radial': {
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(centerX, centerY) * 0.4;
                
                for(let i=0; i<bufferLength; i++) {
                    const barHeight = (data[i] / 255) * (radius * 0.8);
                    const angle = (i / bufferLength) * 2 * Math.PI;
                    const colorIndex = Math.floor((data[i] / 255) * palette.length);
                    
                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.rotate(angle);
                    
                    ctx.fillStyle = palette[colorIndex] || '#0ff';
                    ctx.fillRect(radius, -2, barHeight, 4);
                    
                    ctx.restore();
                }
                break;
            }
        }
        
        animationFrameId.current = requestAnimationFrame(draw);
    }, [getFrequencyData, palette, visualizerType]);

    useEffect(() => {
        if (isListening) {
            animationFrameId.current = requestAnimationFrame(draw);
        } else {
            if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            const canvas = canvasRef.current;
            if(canvas) {
                const ctx = canvas.getContext('2d');
                if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        return () => {
             if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        }
    }, [isListening, draw]);

    const handleToggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const handleCapture = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create a temporary canvas for downsampling
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = CAPTURE_SIZE;
        tempCanvas.height = CAPTURE_SIZE;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);

        const imageData = ctx.getImageData(0, 0, CAPTURE_SIZE, CAPTURE_SIZE).data;
        const grid: string[][] = Array(CAPTURE_SIZE).fill(0).map(() => Array(CAPTURE_SIZE).fill('transparent'));

        for (let y = 0; y < CAPTURE_SIZE; y++) {
            for (let x = 0; x < CAPTURE_SIZE; x++) {
                const i = (y * CAPTURE_SIZE + x) * 4;
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const a = imageData[i + 3];
                if (a > 20) { // Threshold to avoid capturing faint background
                    grid[y][x] = `rgba(${r},${g},${b},${a / 255})`;
                }
            }
        }
        onCaptureFrame(grid);
    };

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[500px]" height="h-[450px]">
            <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
                <canvas ref={canvasRef} width="480" height="300" className="w-full h-full bg-black/50 border-2 border-cyan-400/50"></canvas>
                
                {error && <p className="text-red-400 text-center">{error}</p>}

                <div className="p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-2">
                    <div className="flex gap-2">
                        <PixelatedButton onClick={handleToggleListening} active={isListening} className="flex-1">
                            {isListening ? 'Stop Listening' : 'Start Listening'}
                        </PixelatedButton>
                        <PixelatedButton onClick={handleCapture} disabled={!isListening} className="flex-1">
                            Capture Frame
                        </PixelatedButton>
                    </div>
                    <div className="flex items-center gap-2">
                        <label>Style:</label>
                        <select
                            value={visualizerType}
                            onChange={(e) => setVisualizerType(e.target.value as VisualizerType)}
                            className="w-full bg-black/80 border border-cyan-400 p-1"
                        >
                            <option value="bars">Frequency Bars</option>
                            <option value="circle">Pulsing Circle</option>
                            <option value="radial">Radial Bars</option>
                        </select>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default MusicVisualizerWindow;