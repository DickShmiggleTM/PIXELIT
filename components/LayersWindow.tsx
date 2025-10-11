

import React, { useRef, useState } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { Layer, BlendMode } from '../types';

interface LayersWindowProps {
  title: string;
  onClose: () => void;
  layers: Layer[];
  activeLayerIndex: number;
  onSelectLayer: (index: number) => void;
  onAddLayer: () => void;
  onDeleteLayer: () => void;
  onDuplicateLayer: () => void;
  onMergeLayerDown: () => void;
  onUpdateLayerProps: (index: number, newProps: Partial<Layer>) => void;
  onCommitLayerProps: () => void;
  onReorderLayers: (sourceIndex: number, destIndex: number) => void;
  width: number;
  height: number;
  onSaveLayerAsAsset: (name: string, tags: string[]) => void;
}

const LayerPreview: React.FC<{layer: Layer, width: number, height: number}> = ({ layer, width, height }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        
        const previewSize = 48;
        canvas.width = previewSize;
        canvas.height = previewSize;
        
        const scaleX = previewSize / width;
        const scaleY = previewSize / height;

        ctx.clearRect(0, 0, previewSize, previewSize);
        ctx.imageSmoothingEnabled = false;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (layer.grid[y]?.[x] && layer.grid[y][x] !== 'transparent') {
                    ctx.fillStyle = layer.grid[y][x];
                    ctx.fillRect(Math.floor(x * scaleX), Math.floor(y * scaleY), Math.ceil(scaleX), Math.ceil(scaleY));
                }
            }
        }
    }, [layer.grid, width, height]);

    return (
        <canvas ref={canvasRef} className="w-12 h-12 object-contain bg-transparent bg-repeat bg-center" style={{ 
            imageRendering: 'pixelated',
            backgroundImage: `linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%)`,
            backgroundSize: `10px 10px`,
        }}/>
    )
}

const LayersWindow: React.FC<LayersWindowProps> = ({
  title, onClose, layers, activeLayerIndex, onSelectLayer,
  onAddLayer, onDeleteLayer, onDuplicateLayer, onMergeLayerDown,
  onUpdateLayerProps, onCommitLayerProps, onReorderLayers, width, height,
  onSaveLayerAsAsset
}) => {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [showSaveAsset, setShowSaveAsset] = useState(false);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragOverItem.current = index;
    };
    
    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            onReorderLayers(dragItem.current, dragOverItem.current);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };
    
    const handleSaveAsset = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const name = formData.get('assetName') as string || `Sprite ${Date.now()}`;
        const tags = (formData.get('assetTags') as string).split(',').map(t => t.trim()).filter(Boolean);
        onSaveLayerAsAsset(name, tags);
        setShowSaveAsset(false);
    };

  return (
    <DraggableWindow title={title} onClose={onClose} width="w-[300px]" height="h-[450px]">
      <div className="bg-transparent h-full flex flex-col p-1 text-xs text-cyan-300">
        <div className="flex-grow flex flex-col-reverse gap-1 overflow-y-auto p-1 border-2 border-cyan-400/50 bg-black/30">
          {layers.map((layer, index) => (
            <div 
                key={layer.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => onSelectLayer(index)} 
                className={`flex items-center gap-2 p-1 border-2 cursor-pointer ${index === activeLayerIndex ? 'border-fuchsia-500 bg-fuchsia-500/20' : 'border-cyan-400/50'}`}
             >
                <div className="flex-shrink-0">
                    <LayerPreview layer={layer} width={width} height={height} />
                </div>
                <div className="flex-grow flex flex-col gap-1">
                    <div className='flex items-center gap-2'>
                         <button onClick={(e) => { e.stopPropagation(); onUpdateLayerProps(index, { isVisible: !layer.isVisible }); onCommitLayerProps(); }} title="Toggle Visibility">
                            {layer.isVisible ? '👁️' : '🙈'}
                         </button>
                        <input 
                            type="text" 
                            value={layer.name}
                            onClick={e => e.stopPropagation()}
                            onChange={(e) => onUpdateLayerProps(index, { name: e.target.value })}
                            onBlur={onCommitLayerProps}
                            className="w-full bg-black/50 border border-cyan-400/50 p-0.5"
                        />
                    </div>
                     <div>
                        <label className="text-gray-400">Opacity</label>
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={layer.opacity}
                            onClick={e => e.stopPropagation()}
                            onChange={e => onUpdateLayerProps(index, { opacity: parseFloat(e.target.value) })}
                            onMouseUp={onCommitLayerProps}
                            className="w-full"
                        />
                     </div>
                     <div>
                         <label className="text-gray-400">Blend</label>
                         <select
                            value={layer.blendMode}
                            onClick={e => e.stopPropagation()}
                            onChange={(e) => { onUpdateLayerProps(index, { blendMode: e.target.value as BlendMode }); onCommitLayerProps(); }}
                            className="w-full bg-black/80 border border-cyan-400/50"
                         >
                            {Object.values(BlendMode).map(mode => (
                                <option key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</option>
                            ))}
                         </select>
                     </div>
                </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between">
          <PixelatedButton id="layers-add-button" onClick={onAddLayer} title="Add Layer">+</PixelatedButton>
          <PixelatedButton onClick={onDeleteLayer} title="Delete Layer" disabled={layers.length <= 1}>-</PixelatedButton>
          <PixelatedButton onClick={onDuplicateLayer} title="Duplicate Layer">⧉</PixelatedButton>
          <PixelatedButton onClick={onMergeLayerDown} title="Merge Down" disabled={activeLayerIndex === 0}>⇩</PixelatedButton>
        </div>
        <div className="mt-2 border-t-2 border-cyan-400/50 pt-2">
            <PixelatedButton onClick={() => setShowSaveAsset(!showSaveAsset)} className="w-full">
                {showSaveAsset ? 'Cancel' : 'Save Layer as Asset'}
            </PixelatedButton>
            {showSaveAsset && (
                <form onSubmit={handleSaveAsset} className="mt-2 flex flex-col gap-2 p-2 border border-fuchsia-500/50">
                    <input type="text" name="assetName" placeholder="Asset Name" defaultValue={layers[activeLayerIndex].name} className="p-1 bg-black/80 border border-cyan-400" />
                    <input type="text" name="assetTags" placeholder="Tags (comma-separated)" className="p-1 bg-black/80 border border-cyan-400" />
                    <PixelatedButton type="submit">Save to Library</PixelatedButton>
                </form>
            )}
        </div>
      </div>
    </DraggableWindow>
  );
};

export default LayersWindow;
