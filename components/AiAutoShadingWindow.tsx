import React, { useState, useRef, useCallback, useEffect } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { Layer } from '../types';
import { layerToDataUrl } from '../utils/imageUtils';

interface AiAutoShadingWindowProps {
    title: string;
    onClose: () => void;
    activeLayer: Layer;
    canvasSize: { width: number; height: number; };
    onApplyShadingLayer: (grid: string[][], name: string) => void;
    onGenerateShading: (base64: string, angle: number, intensity: number) => Promise<string | null>;
}

const LayerPreview: React.FC<{ layer: Layer, width: number, height: number, generatedImage?: string | null }> = ({ layer, width, height, generatedImage }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.canvas.width = width;
        ctx.canvas.height = height;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        
        // Draw original layer
        if (layer.isVisible) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const color = layer.grid[y]?.[x];
                    if (color && color !== 'transparent') {
                        ctx.fillStyle = color;
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
        
        // Draw generated shading/highlight layer on top
        if(generatedImage) {
            const img = new Image();
            img.onload = () => {
                ctx.globalAlpha = 0.7;
                ctx.globalCompositeOperation = 'overlay';
                ctx.drawImage(img, 0, 0, width, height);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
            };
            img.src = generatedImage;
        }

    }, [layer, width, height, generatedImage]);

    return <canvas ref={canvasRef} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
}

const AiAutoShadingWindow: React.FC<AiAutoShadingWindowProps> = ({
    title, onClose, activeLayer, canvasSize, onApplyShadingLayer, onGenerateShading
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    
    const controllerRef = useRef<HTMLDivElement>(null);
    const [lightPos, setLightPos] = useState({ x: 75, y: 25 }); // Default: Top-right
    const [isDraggingLight, setIsDraggingLight] = useState(false);

    const handleLightMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDraggingLight || !controllerRef.current) return;
        const rect = controllerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        setLightPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
    }, [isDraggingLight]);

    const handleGenerate = async () => {
        if (!activeLayer) return;
        setIsLoading(true);
        setGeneratedImage(null);
        setError(null);

        const dx = (lightPos.x / 50) - 1; // -1 to 1
        const dy = (lightPos.y / 50) - 1; // -1 to 1
        let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        const intensity = Math.min(1, Math.sqrt(dx * dx + dy * dy));

        try {
            const layerB64 = (await layerToDataUrl(activeLayer, canvasSize.width, canvasSize.height)).split(',')[1];
            const resultB64 = await onGenerateShading(layerB64, angle, intensity);
            if (resultB64) {
                setGeneratedImage(`data:image/png;base64,${resultB64}`);
            } else {
                setError("Failed to generate shading. The AI may have returned an empty result.");
            }
        } catch (e) {
            console.error(e);
            setError("An error occurred during generation.");
        } finally {
            setIsLoading(false);
        }
    };

    const imageToGrid = (img: HTMLImageElement, width: number, height: number): string[][] => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return Array(height).fill(0).map(() => Array(width).fill('transparent'));
        ctx.drawImage(img, 0, 0, width, height);
        
        const newGrid = Array(height).fill(0).map(() => Array(width).fill('transparent'));
        const imageData = ctx.getImageData(0, 0, width, height).data;
        for (let i = 0; i < imageData.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            if (imageData[i + 3] > 0) {
                newGrid[y][x] = `rgba(${imageData[i]}, ${imageData[i+1]}, ${imageData[i+2]}, ${imageData[i+3]/255})`;
            }
        }
        return newGrid;
    };

    const handleApply = () => {
        if (!generatedImage) return;
        const img = new Image();
        img.onload = () => {
            const grid = imageToGrid(img, canvasSize.width, canvasSize.height);
            onApplyShadingLayer(grid, `Shading for ${activeLayer.name}`);
            onClose();
        };
        img.src = generatedImage;
    };

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[480px]" height="h-auto">
            <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
                <p>Set the light direction, then generate shading for the active layer.</p>
                
                <div className="flex gap-2">
                    {/* Preview */}
                    <div className="w-1/2 p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col items-center justify-center">
                         <div className='w-48 h-48 bg-transparent bg-repeat bg-center' style={{ backgroundImage: `linear-gradient(45deg, #1a1a2e 25%, transparent 25%), linear-gradient(-45deg, #1a1a2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a2e 75%), linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)`, backgroundSize: `20px 20px` }}>
                            <LayerPreview layer={activeLayer} width={canvasSize.width} height={canvasSize.height} generatedImage={generatedImage}/>
                         </div>
                         <span className="mt-1 text-fuchsia-400">Preview</span>
                    </div>

                    {/* Controls */}
                    <div className="w-1/2 p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col items-center justify-center">
                        <div
                            ref={controllerRef}
                            className="w-32 h-32 bg-black/50 rounded-full border-2 border-cyan-400 relative cursor-pointer"
                            onMouseDown={() => setIsDraggingLight(true)}
                            onMouseUp={() => setIsDraggingLight(false)}
                            onMouseLeave={() => setIsDraggingLight(false)}
                            onMouseMove={handleLightMove}
                        >
                            <div className="absolute w-full h-px bg-cyan-400/30 top-1/2 -translate-y-1/2" />
                            <div className="absolute h-full w-px bg-cyan-400/30 left-1/2 -translate-x-1/2" />
                            <div
                                className="absolute w-4 h-4 bg-fuchsia-500 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                style={{ top: `${lightPos.y}%`, left: `${lightPos.x}%` }}
                            />
                        </div>
                        <span className="mt-1 text-fuchsia-400">Light Direction</span>
                    </div>
                </div>

                {error && <p className="text-red-400 text-center">{error}</p>}
                
                <div className="flex gap-2 mt-1">
                    <PixelatedButton onClick={handleGenerate} disabled={isLoading} className="flex-grow">
                        {isLoading ? 'Generating...' : 'Generate Shading'}
                    </PixelatedButton>
                    <PixelatedButton onClick={handleApply} disabled={!generatedImage || isLoading}>
                        Apply to Canvas
                    </PixelatedButton>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default AiAutoShadingWindow;
