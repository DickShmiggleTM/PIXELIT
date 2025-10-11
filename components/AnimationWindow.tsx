import React, { useRef, useEffect, useState } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { Frame, Layer, BlendMode, Asset, AchievementID } from '../types';
import AnimationPreview from './AnimationPreview';

interface AnimationPanelProps {
  title: string;
  onClose: () => void;
  frames: Frame[];
  activeFrameIndex: number;
  onAddFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onSelectFrame: (index: number) => void;
  onDuplicateFrame: (index: number) => void;
  onReorderFrames: (sourceIndex: number, destIndex: number) => void;
  width: number;
  height: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  isOnionSkinningOn: boolean;
  onOnionSkinningToggle: () => void;
  onGenerateInbetweens: (frameCount: number) => Promise<void>;
  assets: Asset[];
  onAttachSfxToFrame: (frameIndex: number, assetId: string | null) => void;
  unlockAchievement: (id: AchievementID) => void;
}

const FrameThumbnail: React.FC<{layers: Layer[], width: number, height: number}> = ({ layers, width, height }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        for (const layer of layers) {
            if (layer.isVisible) {
                ctx.globalAlpha = layer.opacity;
                ctx.globalCompositeOperation = (layer.blendMode === BlendMode.NORMAL ? 'source-over' : layer.blendMode) as GlobalCompositeOperation;
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
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }, [layers, width, height]);

    return <canvas ref={canvasRef} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }}/>
}

const AnimationPanel: React.FC<AnimationPanelProps> = ({
  title, onClose, frames, activeFrameIndex,
  onAddFrame, onDeleteFrame, onSelectFrame, onDuplicateFrame, onReorderFrames,
  width, height, isPlaying, onPlayToggle, fps, onFpsChange,
  isOnionSkinningOn, onOnionSkinningToggle, onGenerateInbetweens,
  assets, onAttachSfxToFrame, unlockAchievement
}) => {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [tweenCount, setTweenCount] = useState(3);
    const [isTweening, setIsTweening] = useState(false);
    const sfxAssets = assets.filter(a => a.type === 'sfx');

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragOverItem.current = index;
    };
    
    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            onReorderFrames(dragItem.current, dragOverItem.current);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const handleTween = async () => {
        setIsTweening(true);
        try {
            await onGenerateInbetweens(tweenCount);
        } catch (error) {
            console.error("Tweening failed", error);
        } finally {
            setIsTweening(false);
        }
    };

    const handleAddFrameAndCheckAchievement = () => {
        if(frames.length === 9) { // About to add the 10th frame
            unlockAchievement(AchievementID.ANIMATOR);
        }
        onAddFrame();
    }


  return (
    <DraggableWindow title={title} onClose={onClose} width="w-[600px]" height="h-auto">
      <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
        
        {/* Preview & Controls */}
        <div className="p-2 border-2 border-cyan-400/50 bg-black/30">
            <div 
                className="w-full h-48 mx-auto bg-transparent bg-repeat bg-center p-1 border border-cyan-400/30"
                style={{
                    backgroundImage: `linear-gradient(45deg, #1a1a2e 25%, transparent 25%), linear-gradient(-45deg, #1a1a2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a2e 75%), linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)`,
                    backgroundSize: `20px 20px`,
                }}
            >
                <AnimationPreview 
                    frames={frames} 
                    width={width} 
                    height={height} 
                    fps={fps} 
                    isPlaying={isPlaying} 
                    assets={assets}
                    className="w-full h-full object-contain" 
                    style={{ imageRendering: 'pixelated' }}
                />
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
                <PixelatedButton onClick={onPlayToggle} className="px-4">{isPlaying ? 'Pause' : 'Play'}</PixelatedButton>
                <div className="flex-grow flex items-center gap-2">
                    <label htmlFor="fps-slider" className="flex-shrink-0">FPS: {fps}</label>
                    <input id="fps-slider" type="range" min="1" max="60" value={fps} onChange={e => onFpsChange(parseInt(e.target.value))} className="w-full"/>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="onion-skin-toggle">Onion Skin</label>
                    <input id="onion-skin-toggle" type="checkbox" checked={isOnionSkinningOn} onChange={onOnionSkinningToggle} />
                </div>
            </div>
        </div>
        
        {/* AI Tweening */}
        <div className="p-2 border-2 border-cyan-400/50 bg-black/30 flex items-center justify-between gap-2">
            <h4 className="font-bold text-fuchsia-400">AI Tween</h4>
            <div className="flex items-center gap-2">
                <label htmlFor="tween-count">Frames to add:</label>
                <input
                    id="tween-count"
                    type="number"
                    min="1"
                    max="10"
                    value={tweenCount}
                    onChange={(e) => setTweenCount(parseInt(e.target.value))}
                    className="w-16 bg-black/80 border border-cyan-400 p-1 text-xs"
                    disabled={isTweening}
                />
            </div>
            <PixelatedButton onClick={handleTween} disabled={isTweening || activeFrameIndex < 1} title="Generates frames between the previous and current frame">
                {isTweening ? 'Generating...' : 'Generate In-betweens'}
            </PixelatedButton>
        </div>


        {/* Timeline */}
        <div className="p-2 border-2 border-cyan-400/50 bg-black/30">
            <div className="flex items-start gap-2 overflow-x-auto min-h-[100px] p-2">
            {frames.map((frame, index) => (
                <div 
                    key={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex-shrink-0 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing"
                    >
                    <button 
                        onClick={() => onSelectFrame(index)} 
                        className={`w-24 h-24 p-1 border-2 flex items-center justify-center ${index === activeFrameIndex ? 'border-fuchsia-500 bg-fuchsia-500/20' : 'border-cyan-400/50'}`}
                    >
                        <FrameThumbnail layers={frame.layers} width={width} height={height} />
                    </button>
                    <span className="text-center text-[10px]">Frame {index + 1}</span>
                     <select 
                        value={frame.sfxAssetId || ''}
                        onChange={(e) => onAttachSfxToFrame(index, e.target.value || null)}
                        onClick={e => e.stopPropagation()}
                        className="w-full text-[10px] bg-black/50 border border-cyan-400/50"
                        title="Attach Sound Effect"
                    >
                        <option value="">-- No SFX --</option>
                        {sfxAssets.map(asset => (
                            <option key={asset.id} value={asset.id}>{asset.name}</option>
                        ))}
                    </select>
                </div>
            ))}
            </div>
            <div className="mt-2 flex gap-2">
                <PixelatedButton onClick={handleAddFrameAndCheckAchievement}>Add Frame</PixelatedButton>
                <PixelatedButton onClick={() => onDuplicateFrame(activeFrameIndex)}>Duplicate Frame</PixelatedButton>
                <PixelatedButton onClick={() => onDeleteFrame(activeFrameIndex)} disabled={frames.length <= 1}>Delete Frame</PixelatedButton>
            </div>
        </div>

      </div>
    </DraggableWindow>
  );
};

export default AnimationPanel;
