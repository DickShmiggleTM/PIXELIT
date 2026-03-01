import React, { useState, useCallback, RefObject } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import html2canvas from 'html2canvas';

interface AiSpriteSheetWindowProps {
  title: string;
  onClose: () => void;
  gridElementRef: RefObject<HTMLDivElement>;
  onEditSpriteSheet: (base64: string, prompt: string) => Promise<string | null>;
  onGenerateDirectionalSpriteSheet: (base64: string, prompt: string, directions: 4 | 8, framesPerDirection: number) => Promise<string | null>;
}

const AiSpriteSheetWindow: React.FC<AiSpriteSheetWindowProps> = ({
  title,
  onClose,
  gridElementRef,
  onEditSpriteSheet,
  onGenerateDirectionalSpriteSheet,
}) => {
  const [prompt, setPrompt] = useState('armored knight walk cycle with sword and shield');
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [directions, setDirections] = useState<4 | 8>(4);
  const [framesPerDirection, setFramesPerDirection] = useState(8);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spriteSheetImage, setSpriteSheetImage] = useState<string | null>(null);

  const getCanvasBase64 = useCallback(async () => {
    if (!gridElementRef.current) return null;
    const canvas = await html2canvas(gridElementRef.current, { backgroundColor: null });
    return canvas.toDataURL('image/png').split(',')[1];
  }, [gridElementRef]);

  const handleUploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setUploadedBase64(result.split(',')[1] || null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = useCallback(async () => {
    if (isLoading || !prompt) return;

    setIsLoading(true);
    setError(null);
    setSpriteSheetImage(null);

    try {
      const base64ImageData = uploadedBase64 || await getCanvasBase64();
      if (!base64ImageData) throw new Error('No source sprite found. Draw on canvas or upload an image.');

      const result = mode === 'edit'
        ? await onEditSpriteSheet(base64ImageData, prompt)
        : await onGenerateDirectionalSpriteSheet(base64ImageData, prompt, directions, framesPerDirection);

      if (result) {
        setSpriteSheetImage(`data:image/png;base64,${result}`);
      } else {
        setError('Failed to generate sprite sheet. Try another model or prompt.');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, prompt, uploadedBase64, getCanvasBase64, mode, onEditSpriteSheet, onGenerateDirectionalSpriteSheet, directions, framesPerDirection]);

  const handleDownload = () => {
    if (!spriteSheetImage) return;
    const link = document.createElement('a');
    link.href = spriteSheetImage;
    link.download = `sprite-sheet-${mode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DraggableWindow title={title} onClose={onClose} width="w-[540px]" height="h-auto">
      <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
        <p>Create or edit sprite sheets from canvas art or uploaded references. Optimized for game engines like Godot.</p>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            Mode
            <select className="bg-black/80 border border-cyan-400 p-1" value={mode} onChange={(e) => setMode(e.target.value as 'generate' | 'edit')}>
              <option value="generate">Generate Animation Sheet</option>
              <option value="edit">Prompt Edit Existing Sheet</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Upload source sprite/image (optional)
            <input type="file" accept="image/*" onChange={handleUploadImage} className="bg-black/80 border border-cyan-400 p-1" />
          </label>
        </div>

        {mode === 'generate' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              Direction set
              <select value={directions} onChange={e => setDirections(Number(e.target.value) as 4 | 8)} className="bg-black/80 border border-cyan-400 p-1">
                <option value={4}>4-directional (N/E/S/W)</option>
                <option value={8}>8-directional</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Frames per direction
              <input type="number" min={2} max={16} value={framesPerDirection} onChange={e => setFramesPerDirection(Number(e.target.value) || 8)} className="bg-black/80 border border-cyan-400 p-1" />
            </label>
          </div>
        )}

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe sprite, animation, palette, and style constraints"
          className="w-full p-2 bg-black/50 border-2 border-cyan-400 text-cyan-300 placeholder-cyan-700 min-h-[80px]"
          disabled={isLoading}
        />

        <PixelatedButton onClick={handleGenerate} disabled={isLoading || !prompt}>
          {isLoading ? 'Generating...' : mode === 'edit' ? 'Edit Sprite Sheet from Prompt' : 'Generate 4/8-Direction Sprite Sheet'}
        </PixelatedButton>

        {error && <p className="text-red-400 text-center my-2">{error}</p>}

        <div className="flex-grow mt-2 p-2 border-2 border-cyan-400/50 min-h-[220px] flex items-center justify-center bg-black/30">
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
            Download Sprite Sheet PNG
          </PixelatedButton>
        )}
      </div>
    </DraggableWindow>
  );
};

export default AiSpriteSheetWindow;
