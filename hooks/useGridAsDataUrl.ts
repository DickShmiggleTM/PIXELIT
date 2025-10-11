


import { useState, useEffect } from 'react';
import { Layer, BlendMode } from '../types';
import { hexToRgba } from '../utils/colorUtils';

export const useGridAsDataUrl = (layers: Layer[], width: number, height: number): string => {
    const [dataUrl, setDataUrl] = useState('');

    useEffect(() => {
        if (!layers || layers.length === 0 || width === 0 || height === 0) {
            setDataUrl('');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            setDataUrl('');
            return;
        }
        
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);

        for (const layer of layers) {
             if (layer.isVisible) {
                ctx.globalAlpha = layer.opacity;
                // FIX: Map BlendMode.NORMAL to the correct 'source-over' for canvas context and cast to GlobalCompositeOperation.
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

        setDataUrl(canvas.toDataURL());
    }, [layers, width, height]);

    return dataUrl;
};