import React, { useState, useRef } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { RESOLUTIONS } from '../constants';

interface AiLayerSeparationWindowProps {
    title: string;
    onClose: () => void;
    onImportAsNewProject: (layers: { name: string, grid: string[][] }[], size: { width: number, height: number }) => void;
    onSeparateLayers: (base64: string, mimeType: string, width: number, height: number) => Promise<{ name: string; base64: string; }[] | null>;
}

const fileToImageInfo = (file: File): Promise<{ base64: string; mimeType: string; dataUrl: string; width: number; height: number; }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const img = new Image();
            img.onload = () => {
                const base64 = dataUrl.split(',')[1];
                resolve({ base64, mimeType: file.type, dataUrl, width: img.width, height: img.height });
            };
            img.onerror = reject;
            img.src = dataUrl;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const imageToGrid = (img: HTMLImageElement, width: number, height: number): string[][] => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Array(height).fill(0).map(() => Array(width).fill('transparent'));
    ctx.imageSmoothingEnabled = false;
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

const AiLayerSeparationWindow: React.FC<AiLayerSeparationWindowProps> = ({ title, onClose, onImportAsNewProject, onSeparateLayers }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadedImage, setUploadedImage] = useState<{ base64: string; mimeType: string; dataUrl: string; width: number; height: number; } | null>(null);
    const [targetResolution, setTargetResolution] = useState(64);
    const [separatedLayers, setSeparatedLayers] = useState<{ name: string, base64: string }[] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsLoading(true);
            setUploadedImage(null);
            setSeparatedLayers(null);
            setError(null);
            try {
                const imageInfo = await fileToImageInfo(file);
                setUploadedImage(imageInfo);
            } catch (err) {
                setError("Could not load image file.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSeparate = async () => {
        if (!uploadedImage) return;
        setIsLoading(true);
        setError(null);
        setSeparatedLayers(null);

        const aspectRatio = uploadedImage.width / uploadedImage.height;
        const targetWidth = Math.round(aspectRatio >= 1 ? targetResolution : targetResolution * aspectRatio);
        const targetHeight = Math.round(aspectRatio < 1 ? targetResolution : targetResolution / aspectRatio);

        try {
            const result = await onSeparateLayers(uploadedImage.base64, uploadedImage.mimeType, targetWidth, targetHeight);
            if (result && result.length > 0) {
                setSeparatedLayers(result);
            } else {
                setError("AI could not separate layers from this image. Try a different one.");
            }
        } catch (e) {
            setError("An error occurred during AI processing.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (!separatedLayers || !uploadedImage) return;
        setIsImporting(true);

        const aspectRatio = uploadedImage.width / uploadedImage.height;
        const targetWidth = Math.round(aspectRatio >= 1 ? targetResolution : targetResolution * aspectRatio);
        const targetHeight = Math.round(aspectRatio < 1 ? targetResolution : targetResolution / aspectRatio);

        try {
            const layersWithGrids: { name: string, grid: string[][] }[] = [];
            for (const layer of separatedLayers) {
                const img = new Image();
                const grid = await new Promise<string[][]>((resolve, reject) => {
                    img.onload = () => resolve(imageToGrid(img, targetWidth, targetHeight));
                    img.onerror = reject;
                    img.src = `data:image/png;base64,${layer.base64}`;
                });
                layersWithGrids.push({ name: layer.name, grid });
            }
            onImportAsNewProject(layersWithGrids, { width: targetWidth, height: targetHeight });
            onClose();
        } catch (e) {
            setError("Failed to process separated layers for import.");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[500px]" height="h-auto">
            <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
                <p>Upload an image and the AI will attempt to separate it into layers and convert it to pixel art.</p>
                
                <div className="p-2 border-2 border-cyan-400/50 flex flex-col gap-2">
                    <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <PixelatedButton onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                        {uploadedImage ? "Change Image" : "Upload Image"}
                    </PixelatedButton>
                    
                    {uploadedImage && (
                        <div className="flex gap-2 items-end">
                             <div className="w-24 h-24 flex-shrink-0 bg-black/30 border border-cyan-400/50 flex items-center justify-center">
                                <img src={uploadedImage.dataUrl} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-grow flex flex-col gap-2">
                                <label>Target Resolution (Longest Side)</label>
                                <select 
                                    value={targetResolution} 
                                    onChange={e => setTargetResolution(Number(e.target.value))}
                                    className="w-full bg-black/50 border-2 border-cyan-400 p-1"
                                    disabled={isLoading}
                                >
                                    {RESOLUTIONS.map(r => <option key={r} value={r}>{r}px</option>)}
                                </select>
                                <PixelatedButton onClick={handleSeparate} disabled={isLoading}>
                                    {isLoading ? 'Processing...' : 'Separate Layers'}
                                </PixelatedButton>
                            </div>
                        </div>
                    )}
                </div>

                {error && <p className="text-red-400 text-center">{error}</p>}
                
                {separatedLayers && (
                    <div className="flex flex-col gap-2">
                        <h4 className="font-bold text-fuchsia-400">Separated Layers:</h4>
                        <div className="h-48 overflow-y-auto p-1 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-1">
                            {separatedLayers.map((layer, index) => (
                                <div key={index} className="flex items-center gap-2 p-1 bg-black/50">
                                    <div className="w-12 h-12 flex-shrink-0 bg-transparent bg-repeat bg-center border border-cyan-400/50" style={{ backgroundImage: `linear-gradient(45deg, #1a1a2e 25%, transparent 25%), linear-gradient(-45deg, #1a1a2e 25%, transparent 25%)`, backgroundSize: `10px 10px` }}>
                                        <img src={`data:image/png;base64,${layer.base64}`} className="w-full h-full object-contain" style={{imageRendering: 'pixelated'}}/>
                                    </div>
                                    <span className="truncate">{layer.name}</span>
                                </div>
                            ))}
                        </div>
                        <PixelatedButton onClick={handleImport} disabled={isImporting} className="w-full">
                            {isImporting ? 'Importing...' : 'Import to New Project'}
                        </PixelatedButton>
                    </div>
                )}
            </div>
        </DraggableWindow>
    );
};

export default AiLayerSeparationWindow;
