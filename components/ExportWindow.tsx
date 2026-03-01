import React, { useState, RefObject, useCallback, useEffect } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { Frame, BlendMode, AchievementID } from '../types';
import { canvasToBmp } from '../utils/exportUtils';

// Import libraries from importmap
import html2canvas from 'html2canvas';
import 'jszip';
import 'gif.js';

type ExportType = 'image' | 'gif' | 'sequence' | 'spritesheet';
type SpriteSheetMetadataFormat = 'texturepacker-json' | 'godot-spriteframes';

interface ExportWindowProps {
  title: string;
  onClose: () => void;
  gridElementRef: RefObject<HTMLDivElement>;
  frames: Frame[];
  fps: number;
  width: number;
  height: number;
  unlockAchievement: (id: AchievementID) => void;
}

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-fuchsia-400">{message}</p>
    </div>
);

// Helper to render a single frame to a canvas
const frameToCanvas = async (frame: Frame, width: number, height: number): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.imageSmoothingEnabled = false;
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
    return canvas;
};

const ExportWindow: React.FC<ExportWindowProps> = ({ title, onClose, gridElementRef, frames, fps, width, height, unlockAchievement }) => {
    const [exportType, setExportType] = useState<ExportType>('image');
    const [fileName, setFileName] = useState('pixel-art');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // Static Image State
    const [staticFormat, setStaticFormat] = useState('png');
    
    // Animation State
    const [gifFps, setGifFps] = useState(fps);

    // Sprite Sheet State
    const [ssColumns, setSsColumns] = useState(Math.min(frames.length, 8));
    const [ssSpacing, setSsSpacing] = useState(0);
    const [ssMetadataFormat, setSsMetadataFormat] = useState<SpriteSheetMetadataFormat>('texturepacker-json');

    useEffect(() => { setGifFps(fps) }, [fps]);

    const triggerDownload = (href: string, download: string) => {
        const link = document.createElement('a');
        link.href = href;
        link.download = download;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        unlockAchievement(AchievementID.EXPORTER);
    }
    
    // --- Export Logic ---
    const exportStaticImage = async () => {
        if (!gridElementRef.current) return;
        setLoadingMessage('Capturing image...');
        setIsLoading(true);
        try {
            const canvas = await html2canvas(gridElementRef.current, { backgroundColor: null });
            let url: string;
            if (staticFormat === 'bmp') {
                url = canvasToBmp(canvas);
            } else {
                url = canvas.toDataURL(`image/${staticFormat}`);
            }
            triggerDownload(url, `${fileName}.${staticFormat}`);
        } catch (error) {
            console.error("Failed to export static image:", error);
            alert("Error exporting image.");
        } finally {
            setIsLoading(false);
        }
    };

    const exportGif = () => {
        setLoadingMessage(`Initializing GIF...`);
        setIsLoading(true);

        const gif = new GIF({
            workers: 2,
            quality: 10,
            width,
            height,
        });

        const delay = 1000 / gifFps;
        let framesProcessed = 0;

        const addFramesToGif = async () => {
            for (const frame of frames) {
                const canvas = await frameToCanvas(frame, width, height);
                gif.addFrame(canvas, { delay });
                framesProcessed++;
                setLoadingMessage(`Processing frame ${framesProcessed}/${frames.length}...`);
            }
        };
        
        gif.on('finished', (blob) => {
            setLoadingMessage('Done!');
            const url = URL.createObjectURL(blob);
            triggerDownload(url, `${fileName}.gif`);
            setIsLoading(false);
        });

        addFramesToGif().then(() => {
            setLoadingMessage('Rendering GIF...');
            gif.render();
        }).catch(err => {
            console.error("Error creating GIF:", err);
            alert("Failed to create GIF.");
            setIsLoading(false);
        });
    };
    
    const exportSequence = async () => {
        setLoadingMessage('Preparing sequence...');
        setIsLoading(true);
        try {
            const zip = new JSZip();
            let frameCount = 0;
            for (const frame of frames) {
                frameCount++;
                setLoadingMessage(`Zipping frame ${frameCount}/${frames.length}...`);
                const canvas = await frameToCanvas(frame, width, height);
                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                if(blob) {
                    const pad = '000';
                    const num = pad.substring(0, pad.length - String(frameCount).length) + String(frameCount);
                    zip.file(`${fileName}_${num}.png`, blob);
                }
            }
            setLoadingMessage('Generating ZIP file...');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            triggerDownload(url, `${fileName}_sequence.zip`);
        } catch (error) {
            console.error("Failed to export sequence:", error);
            alert("Error exporting sequence.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const exportSpriteSheet = async () => {
        setLoadingMessage('Building sprite sheet...');
        setIsLoading(true);
        try {
            const columns = Math.min(ssColumns, frames.length);
            const rows = Math.ceil(frames.length / columns);
            const sheetWidth = columns * (width + ssSpacing) - ssSpacing;
            const sheetHeight = rows * (height + ssSpacing) - ssSpacing;

            const sheetCanvas = document.createElement('canvas');
            sheetCanvas.width = sheetWidth;
            sheetCanvas.height = sheetHeight;
            const ctx = sheetCanvas.getContext('2d')!;
            
            const texturePackerData = {
                frames: {} as Record<string, any>,
                meta: {
                    image: `${fileName}.png`,
                    format: 'RGBA8888',
                    size: { w: sheetWidth, h: sheetHeight },
                    scale: '1',
                }
            };
            
            for (let i = 0; i < frames.length; i++) {
                setLoadingMessage(`Drawing frame ${i + 1}/${frames.length}...`);
                const frame = frames[i];
                const frameCanvas = await frameToCanvas(frame, width, height);
                const col = i % columns;
                const row = Math.floor(i / columns);
                const x = col * (width + ssSpacing);
                const y = row * (height + ssSpacing);
                ctx.drawImage(frameCanvas, x, y);

                const frameName = `${fileName}_${i}.png`;
                texturePackerData.frames[frameName] = {
                    frame: { x, y, w: width, h: height },
                    rotated: false,
                    trimmed: false,
                    spriteSourceSize: { x: 0, y: 0, w: width, h: height },
                    sourceSize: { w: width, h: height },
                    duration: 1000 / fps // Duration in ms
                };
            }
            
            setLoadingMessage('Generating files...');
            const zip = new JSZip();
            const sheetBlob = await new Promise<Blob|null>(resolve => sheetCanvas.toBlob(resolve, 'image/png'));
            if(sheetBlob) zip.file(`${fileName}.png`, sheetBlob);

            if (ssMetadataFormat === 'texturepacker-json') {
                zip.file(`${fileName}.json`, JSON.stringify(texturePackerData, null, 2));
            } else {
                const framesTRES = Object.values(texturePackerData.frames).map((frameData, index) => {
                    const id = `AtlasTexture_${index + 1}`;
                    return {
                        id,
                        frame: frameData.frame,
                    };
                });

                const atlasTextureSections = framesTRES.map(({ id, frame }) => {
                    return `[sub_resource type="AtlasTexture" id="${id}"]\natlas = ExtResource("1")\nregion = Rect2(${frame.x}, ${frame.y}, ${frame.w}, ${frame.h})`;
                }).join('\n\n');

                const animationFrameEntries = framesTRES.map(({ id }) => {
                    return `{
"duration": 1.0,
"texture": SubResource("${id}")
}`;
                }).join(',\n');

                const godotSpriteFramesTRES = `[gd_resource type="SpriteFrames" load_steps=${framesTRES.length + 2} format=3]

[ext_resource type="Texture2D" path="res://${fileName}.png" id="1"]

${atlasTextureSections}

[resource]
animations = [{
"frames": [${animationFrameEntries}],
"loop": true,
"name": &"default",
"speed": ${fps}.0
}]`;

                zip.file(`${fileName}.tres`, godotSpriteFramesTRES);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            triggerDownload(url, `${fileName}_spritesheet.zip`);

        } catch (error) {
            console.error("Failed to export sprite sheet:", error);
            alert("Error exporting sprite sheet.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        switch (exportType) {
            case 'image': exportStaticImage(); break;
            case 'gif': exportGif(); break;
            case 'sequence': exportSequence(); break;
            case 'spritesheet': exportSpriteSheet(); break;
        }
    };

    const renderOptions = () => {
        switch (exportType) {
            case 'image':
                return (
                    <div>
                        <label htmlFor="format" className="block mb-1">Format:</label>
                        <select id="format" value={staticFormat} onChange={e => setStaticFormat(e.target.value)} className="w-full bg-black/50 border-2 border-cyan-400 p-1">
                            <option value="png">PNG</option>
                            <option value="jpeg">JPEG</option>
                            <option value="bmp">BMP</option>
                        </select>
                    </div>
                );
            case 'gif':
                return (
                    <div>
                        <label htmlFor="gif-fps" className="block mb-1">FPS ({gifFps}):</label>
                        <input id="gif-fps" type="range" min="1" max="60" value={gifFps} onChange={e => setGifFps(parseInt(e.target.value))} className="w-full"/>
                    </div>
                );
            case 'sequence':
                return <p className='text-cyan-500'>Exports all frames as numbered PNGs inside a ZIP file.</p>;
            case 'spritesheet':
                return (
                    <div className='flex flex-col gap-2'>
                        <div>
                            <label htmlFor="ss-cols" className="block mb-1">Columns ({ssColumns}):</label>
                            <input id="ss-cols" type="range" min="1" max={frames.length} value={ssColumns} onChange={e => setSsColumns(parseInt(e.target.value))} className="w-full"/>
                        </div>
                        <div>
                            <label htmlFor="ss-space" className="block mb-1">Spacing ({ssSpacing}px):</label>
                            <input id="ss-space" type="range" min="0" max="16" value={ssSpacing} onChange={e => setSsSpacing(parseInt(e.target.value))} className="w-full"/>
                        </div>
                         <p className='text-cyan-500 text-xs mt-1'>Exports a PNG sprite sheet with selectable metadata format inside a ZIP.</p>
                        <div>
                            <label htmlFor="ss-meta" className="block mb-1 mt-1">Metadata Format:</label>
                            <select id="ss-meta" value={ssMetadataFormat} onChange={e => setSsMetadataFormat(e.target.value as SpriteSheetMetadataFormat)} className="w-full bg-black/50 border-2 border-cyan-400 p-1">
                                <option value="texturepacker-json">TexturePacker-style JSON</option>
                                <option value="godot-spriteframes">Godot SpriteFrames (.tres)</option>
                            </select>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const TabButton: React.FC<{ type: ExportType; children: React.ReactNode }> = ({ type, children }) => (
        <button onClick={() => setExportType(type)} className={`flex-1 p-2 text-xs border-b-2 ${exportType === type ? 'border-fuchsia-500 text-fuchsia-400' : 'border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/10'}`}>
            {children}
        </button>
    );

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[400px]" height="h-auto">
            <div className="relative bg-transparent h-full flex flex-col text-xs text-cyan-300">
                {isLoading && <LoadingOverlay message={loadingMessage} />}
                <div className="flex">
                    <TabButton type="image">Image</TabButton>
                    <TabButton type="gif">GIF</TabButton>
                    <TabButton type="sequence">Sequence</TabButton>
                    <TabButton type="spritesheet">Sprite Sheet</TabButton>
                </div>
                <div className='p-4 flex flex-col gap-4'>
                    <div>
                        <label htmlFor="filename" className="block mb-1">Filename:</label>
                        <input id="filename" type="text" value={fileName} onChange={e => setFileName(e.target.value)} className="w-full p-2 bg-black/50 border-2 border-cyan-400 text-cyan-300 placeholder-cyan-700" />
                    </div>
                    {renderOptions()}
                    <PixelatedButton onClick={handleExport} className="w-full mt-2" disabled={isLoading}>
                        Export
                    </PixelatedButton>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default ExportWindow;
