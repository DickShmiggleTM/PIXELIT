import React, { useMemo, useState } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import {
  compileSpriteSheets,
  createVoxelHeightMap,
  cropFrame,
  sliceSpriteSheetToFrames,
  SpriteFrameRect,
  SpriteSource,
} from '../utils/spriteLabUtils';

type Tab = 'player' | 'voxel' | 'compiler' | 'cookie' | 'godot' | 'ai';

interface SpriteLabWindowProps {
  title: string;
  onClose: () => void;
}

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

const openSourceApis = [
  { name: 'Hugging Face Inference API', url: 'https://huggingface.co/inference-api', note: 'Text/image models (many open-weight).' },
  { name: 'Replicate', url: 'https://replicate.com/explore', note: 'Hosted OSS model APIs for image and video tasks.' },
  { name: 'fal.ai', url: 'https://fal.ai/models', note: 'Fast diffusion + image editing models with API access.' },
  { name: 'OpenRouter', url: 'https://openrouter.ai/models', note: 'Unified model gateway with open model options.' },
  { name: 'Stability AI API', url: 'https://platform.stability.ai/docs/api-reference', note: 'Stable diffusion and edit workflows.' },
];

const SpriteLabWindow: React.FC<SpriteLabWindowProps> = ({ title, onClose }) => {
  const [tab, setTab] = useState<Tab>('player');
  const [sourceSheet, setSourceSheet] = useState<string | null>(null);
  const [frameWidth, setFrameWidth] = useState(32);
  const [frameHeight, setFrameHeight] = useState(32);
  const [fps, setFps] = useState(8);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sheetFrameCount, setSheetFrameCount] = useState(1);

  const [voxelDepth, setVoxelDepth] = useState(6);
  const [voxelPreview, setVoxelPreview] = useState<string | null>(null);

  const [compileSources, setCompileSources] = useState<SpriteSource[]>([]);
  const [compileColumns, setCompileColumns] = useState(3);
  const [compileGap, setCompileGap] = useState(2);
  const [compiledSheet, setCompiledSheet] = useState<string | null>(null);

  const [cookieRect, setCookieRect] = useState<SpriteFrameRect>({ x: 0, y: 0, width: 16, height: 16 });
  const [cookieFrames, setCookieFrames] = useState<string[]>([]);

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadPrimary = async (file?: File) => {
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    setSourceSheet(dataUrl);
    const image = new Image();
    image.onload = () => {
      const cols = Math.max(1, Math.floor(image.width / Math.max(1, frameWidth)));
      const rows = Math.max(1, Math.floor(image.height / Math.max(1, frameHeight)));
      setSheetFrameCount(cols * rows);
    };
    image.src = dataUrl;
    setError(null);
  };


  const playerStyle = useMemo(
    () => ({
      backgroundImage: sourceSheet ? `url(${sourceSheet})` : 'none',
      width: `${frameWidth}px`,
      height: `${frameHeight}px`,
      backgroundRepeat: 'no-repeat',
      imageRendering: 'pixelated' as const,
      animation: isPlaying ? `sprite-play ${Math.max(0.1, 1 / fps)}s steps(1) infinite` : undefined,
    }),
    [sourceSheet, frameWidth, frameHeight, fps, isPlaying],
  );

  const ensureSource = () => {
    if (!sourceSheet) throw new Error('Upload a source sprite sheet first.');
  };

  const buildVoxelPreview = async () => {
    try {
      ensureSource();
      setIsBusy(true);
      setVoxelPreview(await createVoxelHeightMap(sourceSheet!, voxelDepth));
      setTab('voxel');
    } catch (e: any) {
      setError(e.message || 'Voxel conversion failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddCompileSources = async (files: FileList | null) => {
    if (!files?.length) return;
    const loaded = await Promise.all(
      Array.from(files).map(async (file) => ({
        id: `${file.name}-${file.lastModified}`,
        name: file.name,
        dataUrl: await readAsDataUrl(file),
      })),
    );
    setCompileSources((prev) => [...prev, ...loaded]);
  };

  const handleCompile = async () => {
    try {
      setIsBusy(true);
      setCompiledSheet(await compileSpriteSheets(compileSources, compileColumns, compileGap, 'transparent'));
      setTab('compiler');
    } catch (e: any) {
      setError(e.message || 'Sprite sheet compilation failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCookieCut = async () => {
    try {
      ensureSource();
      setIsBusy(true);
      const frames = await sliceSpriteSheetToFrames(sourceSheet!, frameWidth, frameHeight);
      const cropped = await Promise.all(frames.map((frame) => cropFrame(frame, cookieRect)));
      setCookieFrames(cropped);
      setTab('cookie');
    } catch (e: any) {
      setError(e.message || 'Cookie cutter process failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const downloadDataUrl = (dataUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  };

  const exportGodotTemplate = async () => {
    if (!sourceSheet) {
      setError('Upload a sprite sheet first.');
      return;
    }

    const json = {
      app: 'Pixilit',
      engine: 'Godot 4.6',
      spriteSheet: {
        frameWidth,
        frameHeight,
        fps,
        sourceHint: 'Place exported image in res://art/sprites/',
      },
      animation: {
        name: 'default',
        loop: true,
      },
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, 'godot46-pixilit-import.json');
    URL.revokeObjectURL(url);
  };

  const aiPrompt = `Touch-up + shading pipeline:\n1) Preserve silhouette and timing\n2) Add directional shading from top-left\n3) Cleanup single-pixel noise\n4) Keep palette under 32 colors\n5) Return sprite sheet unchanged in frame layout`;

  return (
    <DraggableWindow title={title} onClose={onClose} width="w-[760px]" height="h-auto">
      <style>{`@keyframes sprite-play { 0% { background-position: 0 0; } 100% { background-position: calc(-1 * var(--sheetWidth, 0px)) 0; }}`}</style>
      <div className="p-3 text-xs text-cyan-200 flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-2">
          <label className="col-span-2 flex flex-col gap-1">
            Source sprite sheet
            <input type="file" accept="image/*" onChange={(e) => handleUploadPrimary(e.target.files?.[0])} className="bg-black/60 border border-cyan-400 p-1" />
          </label>
          <label className="flex flex-col gap-1">Frame W<input type="number" min={1} value={frameWidth} onChange={(e) => setFrameWidth(Number(e.target.value) || 1)} className="bg-black/60 border border-cyan-400 p-1" /></label>
          <label className="flex flex-col gap-1">Frame H<input type="number" min={1} value={frameHeight} onChange={(e) => setFrameHeight(Number(e.target.value) || 1)} className="bg-black/60 border border-cyan-400 p-1" /></label>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['player', 'voxel', 'compiler', 'cookie', 'godot', 'ai'] as Tab[]).map((entry) => (
            <PixelatedButton key={entry} onClick={() => setTab(entry)} className={tab === entry ? 'bg-cyan-600/40' : ''}>{entry.toUpperCase()}</PixelatedButton>
          ))}
        </div>

        {error && <p className="text-red-400">{error}</p>}

        {tab === 'player' && (
          <div className="grid grid-cols-2 gap-3 items-start">
            <div className="space-y-2">
              <label className="flex items-center gap-2">FPS<input type="range" min={1} max={24} value={fps} onChange={(e) => setFps(Number(e.target.value) || 8)} /></label>
              <p>Live sprite player enables in-app animation checks before export.</p>
              <PixelatedButton onClick={() => setIsPlaying((prev) => !prev)}>{isPlaying ? 'Pause' : 'Play'}</PixelatedButton>
            </div>
            <div className="min-h-40 border-2 border-cyan-400 p-2 flex items-center justify-center bg-black/40">
              {sourceSheet ? (
                <div
                  style={{ ...playerStyle, ['--sheetWidth' as any]: `${frameWidth * Math.max(sheetFrameCount, 1)}px` }}
                />
              ) : <p>Upload a sheet to preview.</p>}
            </div>
          </div>
        )}

        {tab === 'voxel' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2">Voxel depth<input type="range" min={1} max={12} value={voxelDepth} onChange={(e) => setVoxelDepth(Number(e.target.value) || 6)} />{voxelDepth}</label>
            <PixelatedButton onClick={buildVoxelPreview} disabled={isBusy}>Generate Voxel Preview</PixelatedButton>
            <div className="min-h-52 border border-cyan-400 p-2 bg-black/40 flex items-center justify-center">
              {voxelPreview ? <img src={voxelPreview} alt="Voxel preview" className="max-h-64 object-contain" style={{ imageRendering: 'pixelated' }} /> : <p>No voxel preview yet.</p>}
            </div>
          </div>
        )}

        {tab === 'compiler' && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col">Columns<input type="number" min={1} value={compileColumns} onChange={(e) => setCompileColumns(Number(e.target.value) || 1)} className="bg-black/60 border border-cyan-400 p-1" /></label>
              <label className="flex flex-col">Gap<input type="number" min={0} value={compileGap} onChange={(e) => setCompileGap(Number(e.target.value) || 0)} className="bg-black/60 border border-cyan-400 p-1" /></label>
              <label className="flex flex-col">Sheet inputs<input type="file" multiple accept="image/*" onChange={(e) => handleAddCompileSources(e.target.files)} className="bg-black/60 border border-cyan-400 p-1" /></label>
            </div>
            <p>{compileSources.length} source sheets queued.</p>
            <PixelatedButton onClick={handleCompile} disabled={isBusy || compileSources.length === 0}>Compile Unified Sheet</PixelatedButton>
            {compiledSheet && <><img src={compiledSheet} alt="Compiled sprite sheet" className="max-h-56" style={{ imageRendering: 'pixelated' }} /><PixelatedButton onClick={() => downloadDataUrl(compiledSheet, 'compiled-spritesheet.png')}>Download</PixelatedButton></>}
          </div>
        )}

        {tab === 'cookie' && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {(['x', 'y', 'width', 'height'] as (keyof SpriteFrameRect)[]).map((key) => (
                <label key={key} className="flex flex-col capitalize">{key}<input type="number" min={0} value={cookieRect[key]} onChange={(e) => setCookieRect((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))} className="bg-black/60 border border-cyan-400 p-1" /></label>
              ))}
            </div>
            <PixelatedButton onClick={handleCookieCut} disabled={isBusy}>Cookie Cutter All Frames</PixelatedButton>
            <div className="grid grid-cols-6 gap-2 max-h-64 overflow-auto border border-cyan-400 p-2">
              {cookieFrames.map((frame, idx) => <img key={`${frame}-${idx}`} src={frame} alt={`cookie frame ${idx + 1}`} style={{ imageRendering: 'pixelated' }} className="border border-cyan-500/40" />)}
            </div>
          </div>
        )}

        {tab === 'godot' && (
          <div className="space-y-2">
            <p>Direct Godot 4.6 bridge export includes import metadata + animation defaults for AnimatedSprite2D pipelines.</p>
            <PixelatedButton onClick={exportGodotTemplate}>Export Godot 4.6 Import JSON</PixelatedButton>
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-2">
            <p>Advanced AI editing profile (shading + touch-up):</p>
            <textarea readOnly value={aiPrompt} className="w-full min-h-24 bg-black/50 border border-cyan-400 p-2" />
            <p className="font-bold">Additional open/free API options:</p>
            <ul className="list-disc pl-5 space-y-1">
              {openSourceApis.map((api) => (
                <li key={api.name}><a className="underline text-fuchsia-300" href={api.url} target="_blank" rel="noreferrer">{api.name}</a> — {api.note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DraggableWindow>
  );
};

export default SpriteLabWindow;
