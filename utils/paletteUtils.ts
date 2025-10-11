// paletteUtils.ts

import { hexToRgb, rgbToHex } from "./colorUtils";

/**
 * Parses a GIMP Palette (.gpl) file content.
 */
export const parseGpl = (fileContent: string): { name: string, colors: string[] } => {
    const lines = fileContent.split('\n');
    let name = 'Imported Palette';
    const colors: string[] = [];
    
    if (lines[0].trim() !== 'GIMP Palette') {
        throw new Error('Invalid GIMP Palette file.');
    }

    for (const line of lines) {
        if (line.startsWith('Name:')) {
            name = line.substring(5).trim();
        } else if (!line.startsWith('#') && line.trim() !== '' && !line.startsWith('GIMP Palette') && !line.startsWith('Columns:')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                const r = parseInt(parts[0], 10);
                const g = parseInt(parts[1], 10);
                const b = parseInt(parts[2], 10);
                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    colors.push(rgbToHex(r, g, b));
                }
            }
        }
    }
    return { name, colors };
};

/**
 * Exports a palette to the GIMP Palette (.gpl) format.
 */
export const exportGpl = (name: string, colors: string[]): string => {
    let content = `GIMP Palette\nName: ${name}\nColumns: 8\n#\n`;
    for (const color of colors) {
        const rgb = hexToRgb(color);
        if (rgb) {
            content += `${rgb.r.toString().padStart(3, ' ')} ${rgb.g.toString().padStart(3, ' ')} ${rgb.b.toString().padStart(3, ' ')}\t${color}\n`;
        }
    }
    return content;
};

/**
 * Extracts a color palette from an image file.
 */
export const extractPaletteFromImage = (file: File, maxColors: number = 64): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 256;
                const scale = Math.min(1, MAX_WIDTH / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                try {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    const colorSet = new Set<string>();
                    
                    for (let i = 0; i < imageData.length; i += 4) {
                        // Skip transparent pixels
                        if (imageData[i + 3] < 255) continue;
                        
                        const r = imageData[i];
                        const g = imageData[i + 1];
                        const b = imageData[i + 2];
                        colorSet.add(rgbToHex(r, g, b));
                    }
                    
                    // Simple quantization if too many colors: just take the first `maxColors`
                    // A proper implementation would use k-means or median cut, but this is simpler.
                    const colors = Array.from(colorSet);
                    resolve(colors.slice(0, maxColors));

                } catch (e) {
                    reject(new Error("Couldn't read image data. The image might be from a different origin."));
                }
            };
            img.onerror = () => reject(new Error('Failed to load image.'));
            img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
    });
};
