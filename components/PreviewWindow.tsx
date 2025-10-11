import React from 'react';
import DraggableWindow from './DraggableWindow';
import AnimationPreview from './AnimationPreview';
import { Frame, Asset } from '../types';

interface FilterSettings {
  scanlines: { enabled: boolean; opacity: number; density: number };
  crt: { enabled: boolean; intensity: number };
  bloom: { enabled: boolean; intensity: number };
  chromaticAberration: { enabled: boolean; intensity: number };
}

interface PreviewWindowProps {
  title: string;
  onClose: () => void;
  frames: Frame[];
  width: number;
  height: number;
  isPlaying: boolean;
  fps: number;
  filters: FilterSettings;
  assets: Asset[];
}

const PreviewWindow: React.FC<PreviewWindowProps> = ({ title, onClose, frames, width, height, isPlaying, fps, filters, assets }) => {

    const effectsStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a1f',
    };
    
    const canvasWrapperStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s ease-out',
        filter: '',
    };
    
    if (filters.crt.enabled) {
        const intensity = filters.crt.intensity / 100;
        canvasWrapperStyle.transform = `scale(${1 - intensity * 0.1}, ${1 - intensity * 0.15})`;
        canvasWrapperStyle.borderRadius = `${intensity * 40}% / ${intensity * 50}%`;
        effectsStyle.boxShadow = `inset 0 0 ${intensity * 40}px 10px rgba(0,0,0,0.8)`;
    }

    if (filters.bloom.enabled) {
        const intensity = filters.bloom.intensity / 10;
        canvasWrapperStyle.filter += ` brightness(${1 + intensity * 0.03}) drop-shadow(0 0 ${intensity}px rgba(255, 255, 255, 0.3))`;
    }

    if (filters.chromaticAberration.enabled) {
        canvasWrapperStyle.filter += ` url(#chromatic-aberration-preview)`;
    }

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[480px]" height="h-[480px]">
             <div style={effectsStyle}>
                {filters.chromaticAberration.enabled && (
                    <svg style={{ position: 'absolute', height: 0, width: 0, overflow: 'hidden' }}>
                        <defs>
                            <filter id="chromatic-aberration-preview">
                                <feOffset in="SourceGraphic" dx={filters.chromaticAberration.intensity} dy="0" result="R"/>
                                <feColorMatrix in="R" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="R2"/>
                                <feOffset in="SourceGraphic" dx={-filters.chromaticAberration.intensity} dy="0" result="B"/>
                                <feColorMatrix in="B" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="B2"/>
                                <feBlend in="R2" in2="B2" mode="screen"/>
                            </filter>
                        </defs>
                    </svg>
                )}
                <div style={canvasWrapperStyle}>
                    <div className="w-full h-full p-2 bg-transparent bg-repeat bg-center"
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
                </div>
                {filters.scanlines.enabled && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        pointerEvents: 'none',
                        background: `repeating-linear-gradient(to bottom, rgba(12,12,32,${filters.scanlines.opacity}), rgba(12,12,32,${filters.scanlines.opacity}) ${filters.scanlines.density}px, transparent ${filters.scanlines.density}px, transparent ${filters.scanlines.density * 2}px)`,
                        mixBlendMode: 'overlay'
                    }} />
                )}
            </div>
        </DraggableWindow>
    );
};

export default PreviewWindow;