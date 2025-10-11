// imageUtils.ts
import { Frame, Layer, BlendMode } from '../types';

/**
 * Converts a Layer object to a base64 encoded PNG data URL.
 */
export const layerToDataUrl = (layer: Layer, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Could not get canvas context');
        
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        
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
        
        resolve(canvas.toDataURL('image/png'));
    });
};


/**
 * Converts a Frame object (with layers) to a base64 encoded PNG string.
 */
export const frameToBase64 = (frame: Frame, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Could not get canvas context');
        
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);

        for (const layer of frame.layers) {
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
        
        // Return only the base64 part
        resolve(canvas.toDataURL('image/png').split(',')[1]);
    });
};

/**
 * Slices a horizontal sprite sheet into an array of base64 encoded PNG strings.
 */
export const sliceSpriteSheet = (imageBase64: string, frameWidth: number, frameHeight: number): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (img.height !== frameHeight || img.width % frameWidth !== 0) {
                console.warn(`Sprite sheet dimensions (${img.width}x${img.height}) are not compatible with frame size (${frameWidth}x${frameHeight}).`);
            }
            const frameCount = Math.floor(img.width / frameWidth);
            const frames: string[] = [];

            for (let i = 0; i < frameCount; i++) {
                const canvas = document.createElement('canvas');
                canvas.width = frameWidth;
                canvas.height = frameHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;
                
                ctx.drawImage(img, i * frameWidth, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
                frames.push(canvas.toDataURL('image/png'));
            }
            resolve(frames);
        };
        img.onerror = () => reject('Failed to load sprite sheet image.');
        img.src = `data:image/png;base64,${imageBase64}`;
    });
};
