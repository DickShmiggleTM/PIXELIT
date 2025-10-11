import React, { useRef, useEffect } from 'react';
import { Frame, BlendMode, Asset, SfxParameters } from '../types';
import { playSfx } from '../utils/sfxUtils';

interface AnimationPreviewProps {
    frames: Frame[];
    width: number;
    height: number;
    fps: number;
    isPlaying: boolean;
    assets: Asset[];
    className?: string;
    style?: React.CSSProperties;
}

const AnimationPreview: React.FC<AnimationPreviewProps> = ({ frames, width, height, fps, isPlaying, assets, className, style }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIndexRef = useRef(0);
    const lastTimeRef = useRef(0);
    const animationFrameIdRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || frames.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.imageSmoothingEnabled = false;

        const render = (time: number) => {
            animationFrameIdRef.current = requestAnimationFrame(render);

            const now = time;
            const delta = now - lastTimeRef.current;
            const interval = 1000 / fps;

            if (isPlaying && delta > interval) {
                lastTimeRef.current = now - (delta % interval);
                const newIndex = (frameIndexRef.current + 1) % frames.length;
                frameIndexRef.current = newIndex;

                const newFrame = frames[newIndex];
                if (newFrame?.sfxAssetId) {
                    const sfxAsset = assets.find(a => a.id === newFrame.sfxAssetId);
                    if (sfxAsset) {
                        playSfx(sfxAsset.data as SfxParameters);
                    }
                }
            }
            
            const frameToDraw = frames[frameIndexRef.current];
            if (!frameToDraw) return;
            
            ctx.clearRect(0, 0, width, height);

            for (const layer of frameToDraw.layers) {
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
        };
        
        if (frameIndexRef.current >= frames.length) {
            frameIndexRef.current = 0;
        }
        lastTimeRef.current = performance.now();
        animationFrameIdRef.current = requestAnimationFrame(render);

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };
    }, [frames, width, height, fps, isPlaying, assets]);


    return <canvas ref={canvasRef} width={width} height={height} className={className} style={style} />;
};

export default AnimationPreview;