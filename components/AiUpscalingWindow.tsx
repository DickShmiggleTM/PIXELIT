

import React, { useState, useCallback, RefObject } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import html2canvas from 'html2canvas';

interface AiUpscalingWindowProps {
  title: string;
  onClose: () => void;
  gridElementRef: RefObject<HTMLDivElement>;
  onUpscaleImage: (base64: string, scale: number) => Promise<string | null>;
}

const AiUpscalingWindow: React.FC<AiUpscalingWindowProps> = ({ title, onClose, gridElementRef, onUpscaleImage }) => {
  const [scaleFactor, setScaleFactor] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);

  const handleUpscale = useCallback(async () => {
    if (!gridElementRef.current || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setUpscaledImage(null);

    try {
      const canvas = await html2canvas(gridElementRef.current, { backgroundColor: null });
      const base64ImageData = canvas.toDataURL('image/png');
      setOriginalImage(base64ImageData);
      
      const result = await onUpscaleImage(base64ImageData.split(',')[1], scaleFactor);
      
      if (result) {
        setUpscaledImage(`data:image/png;base64,${result}`);
      } else {
        setError('Failed to generate upscaled image.');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, gridElementRef, scaleFactor, onUpscaleImage]);
  
  const handleDownload = () => {
    if (upscaledImage) {
        const link = document.createElement('a');
        link.href = upscaledImage;
        link.download = `upscaled-art-${scaleFactor}x.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  return (
    <DraggableWindow title={title} onClose={onClose} width="w-[600px]" height="h-auto">
      <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
        <p>Intelligently upscale your pixel art while preserving sharp edges.</p>
        
        <div className="flex items-center gap-2">
            <label htmlFor="scale-factor">Scale Factor:</label>
            <select
                id="scale-factor"
                value={scaleFactor}
                onChange={e => setScaleFactor(parseInt(e.target.value))}
                className="bg-black/50 border-2 border-cyan-400 p-1"
                disabled={isLoading}
            >
                <option value={2}>2x</option>
                <option value={4}>4x</option>
            </select>
            <PixelatedButton onClick={handleUpscale} disabled={isLoading} className="flex-grow">
                {isLoading ? 'Upscaling...' : 'Upscale'}
            </PixelatedButton>
        </div>

        {error && <p className="text-red-400 text-center my-2">{error}</p>}

        <div className="flex-grow grid grid-cols-2 gap-2 mt-2 p-2 border-2 border-cyan-400/50 min-h-[200px]">
            <div className='flex flex-col items-center gap-1'>
                <h4 className="font-bold text-fuchsia-400">Original</h4>
                <div className='w-full flex-grow bg-black/30 flex items-center justify-center p-1'>
                    {originalImage && <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" style={{imageRendering: 'pixelated'}} />}
                </div>
            </div>
            <div className='flex flex-col items-center gap-1'>
                <h4 className="font-bold text-fuchsia-400">Upscaled Result</h4>
                 <div className='w-full flex-grow bg-black/30 flex items-center justify-center p-1'>
                    {isLoading && <p>Loading...</p>}
                    {upscaledImage && <img src={upscaledImage} alt="Upscaled" className="max-w-full max-h-full object-contain" style={{imageRendering: 'pixelated'}} />}
                </div>
            </div>
        </div>
         {upscaledImage && (
            <PixelatedButton onClick={handleDownload} className="w-full mt-2">
                Download Upscaled Image
            </PixelatedButton>
        )}
      </div>
    </DraggableWindow>
  );
};

export default AiUpscalingWindow;
