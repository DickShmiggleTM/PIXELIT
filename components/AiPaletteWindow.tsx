


import React, { useState, useCallback, useRef } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { AchievementID } from '../types';

interface AiPaletteWindowProps {
  title: string;
  onClose: () => void;
  onSetPalette: (palette: string[]) => void;
  onSavePaletteAsAsset: (name: string, tags: string[], palette: string[]) => void;
  onGeneratePalette: (prompt: string, image?: { base64: string; mimeType: string; }) => Promise<string[] | null>;
  unlockAchievement: (id: AchievementID) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};


const AiPaletteWindow: React.FC<AiPaletteWindowProps> = ({ title, onClose, onSetPalette, onSavePaletteAsAsset, onGeneratePalette, unlockAchievement }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ base64: string; mimeType: string; dataUrl: string; } | null>(null);
  const [generatedPalette, setGeneratedPalette] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setImage({ base64, mimeType: file.type, dataUrl: URL.createObjectURL(file) });
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = useCallback(async () => {
    if ((!prompt && !image) || isLoading) return;
    setIsLoading(true);
    setError(null);
    setGeneratedPalette(null);
    try {
      const result = await onGeneratePalette(prompt || "colors from image", image ?? undefined);
      if (result) {
        setGeneratedPalette(result);
      } else {
        setError('Failed to generate a valid palette.');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, isLoading, image, onGeneratePalette]);

  const handleApplyPalette = () => {
    if (generatedPalette) {
      onSetPalette(generatedPalette);
      onClose();
    }
  };

  const handleSaveAsset = () => {
    if (!generatedPalette) return;
    const name = prompt("Enter a name for this palette asset:", `Palette from "${prompt || 'image'}"`);
    if (name) {
        const tagsStr = prompt("Enter tags (comma-separated):", prompt.split(' ').join(', '));
        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
        onSavePaletteAsAsset(name, tags, generatedPalette);
        unlockAchievement(AchievementID.PALETTE_PRO);
        alert("Palette saved to asset library!");
    }
  };

  return (
    <DraggableWindow title={title} onClose={onClose} width="w-[400px]" height="h-auto">
      <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
        <p>Generate a 16-color palette from a text prompt (e.g., "gloomy forest") or an image.</p>
        
        <div className="flex gap-2">
            <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Enter a theme or description..."
                className="flex-grow p-2 bg-black/50 border-2 border-cyan-400 text-cyan-300 placeholder-cyan-700"
                disabled={isLoading}
            />
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            <PixelatedButton onClick={() => fileInputRef.current?.click()} disabled={isLoading}>Image</PixelatedButton>
        </div>

         {image && (
            <div className="my-2 relative w-16 h-16 mx-auto">
                <img src={image.dataUrl} alt="Upload preview" className="w-full h-full object-contain border border-fuchsia-500" />
                <button onClick={() => setImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">&times;</button>
            </div>
        )}
        
        <PixelatedButton onClick={handleSubmit} disabled={isLoading || (!prompt && !image)}>
            {isLoading ? 'Generating...' : 'Generate Palette'}
        </PixelatedButton>
        
        {error && <p className="text-red-400 text-center">{error}</p>}

        {generatedPalette && (
            <div className='mt-2 p-2 border-2 border-cyan-400/50'>
                <h4 className='font-bold text-fuchsia-400 mb-2'>Result:</h4>
                <div className='grid grid-cols-8 gap-1'>
                    {generatedPalette.map((color, i) => (
                        <div key={i} style={{backgroundColor: color}} className='w-full aspect-square border border-cyan-400/30' title={color} />
                    ))}
                </div>
                <div className="flex gap-2 mt-2">
                    <PixelatedButton onClick={handleApplyPalette} className="flex-1">Use Palette</PixelatedButton>
                    <PixelatedButton onClick={handleSaveAsset} className="flex-1">Save to Library</PixelatedButton>
                </div>
            </div>
        )}
      </div>
    </DraggableWindow>
  );
};

export default AiPaletteWindow;
