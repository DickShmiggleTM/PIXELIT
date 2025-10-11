

import React, { useState, useCallback, RefObject } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import html2canvas from 'html2canvas';

interface AiSpriteSheetWindowProps {
  title: string;
  onClose: () => void;
  gridElementRef: RefObject<HTMLDivElement>;
  onGenerateSpriteSheet: (base64: string, prompt: string) => Promise<string | null>;
}

const AiSpriteSheetWindow: React.FC<AiSpriteSheetWindowProps> = ({ title, onClose, gridElementRef, onGenerateSpriteSheet }) => {
  const [prompt, setPrompt] = useState('8-frame walk cycle to the right');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spriteSheetImage, setSpriteSheetImage] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!gridElementRef.current || isLoading || !prompt) return;
    
    setIsLoading(true);
    setError(null);
    setSpriteSheetImage(null);

    try {
      const canvas = await html2canvas(gridElementRef.current, { backgroundColor: null });
      const base64ImageData = canvas.toDataURL('image/png').split(',')[1];
      
      const result = await onGenerateSpriteSheet(base64ImageData, prompt);
      
      if (result) {
        setSpriteSheetImage(`data:image/png;base64,${result}`);
      } else {
        setError('Failed to generate sprite sheet.');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, gridElementRef, prompt, onGenerateSpriteSheet]);
  
  const handleDownload = () => {
    if (spriteSheetImage) {
        const link = document.createElement('a');
        link.href = spriteSheetImage;
        link.download = `sprite-sheet.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  return (
    <DraggableWindow title={title} onClose={onClose} width="w-[500px]" height="h-auto">
      <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
        <p>Generate an animation sprite sheet from your current art. Describe the animation below.</p>
        
        <div className="flex flex-col gap-2">
            <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g., 8-frame walk cycle to the right"
                className="w-full p-2 bg-black/50 border-2 border-cyan-400 text-cyan-300 placeholder-cyan-700"
                disabled={isLoading}
            />
            <PixelatedButton onClick={handleGenerate} disabled={isLoading || !prompt}>
                {isLoading ? 'Generating...' : 'Generate Sprite Sheet'}
            </PixelatedButton>
        </div>

        {error && <p className="text-red-400 text-center my-2">{error}</p>}

        <div className="flex-grow mt-2 p-2 border-2 border-cyan-400/50 min-h-[200px] flex items-center justify-center bg-black/30">
            {isLoading && <p>Loading...</p>}
            {spriteSheetImage && (
                <img 
                    src={spriteSheetImage} 
                    alt="Generated Sprite Sheet" 
                    className="max-w-full max-h-full object-contain" 
                    style={{
                        imageRendering: 'pixelated',
                        backgroundImage: `linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%)`,
                        backgroundSize: `10px 10px`,
                    }}
                />
            )}
        </div>
        
         {spriteSheetImage && (
            <PixelatedButton onClick={handleDownload} className="w-full mt-2">
                Download Sprite Sheet
            </PixelatedButton>
        )}
      </div>
    </DraggableWindow>
  );
};

export default AiSpriteSheetWindow;
