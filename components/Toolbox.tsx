import React, { useState, useEffect } from 'react';
import { Tool, WindowType, GridType } from '../types';
import PixelatedButton from './PixelatedButton';

interface GridSettings {
  isVisible: boolean;
  color: string;
  opacity: number;
  type: GridType;
}

interface GuideSettings {
    isVisible: boolean;
    snap: boolean;
}

interface ToolboxProps {
  isOpen: boolean;
  onToggle: () => void;
  tools: { id: Tool; name: string; icon: React.FC<{className?: string}>; }[];
  selectedTool: Tool;
  onToolSelect: (tool: Tool) => void;
  primaryColor: string;
  onPrimaryColorChange: (color: string) => void;
  secondaryColor: string;
  onSecondaryColorChange: (color: string) => void;
  resolutions: number[];
  canvasSize: { width: number, height: number };
  onCanvasSizeChange: (width: number, height: number) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  gridSettings: GridSettings;
  onGridSettingsChange: (settings: GridSettings) => void;
  isTiledMode: boolean;
  onTiledModeChange: (isTiled: boolean) => void;
  palette: string[];
  onOpenWindow: (window: WindowType) => void;
  guideSettings: GuideSettings;
  onGuideSettingsChange: (settings: GuideSettings) => void;
  onClearGuides: () => void;
}

const ColorSwatch: React.FC<{ color: string; onChange: (color: string) => void; label: string, id: string }> = ({ color, onChange, label, id }) => (
  <div id={id} className="relative w-10 h-10 border-2 border-cyan-400" title={label}>
    <div style={{ backgroundColor: color }} className="w-full h-full"></div>
    <input
      type="color"
      value={color}
      onChange={(e) => onChange(e.target.value)}
      className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
    />
  </div>
);

const Toolbox: React.FC<ToolboxProps> = ({
  isOpen, onToggle, tools, selectedTool, onToolSelect,
  primaryColor, onPrimaryColorChange, secondaryColor, onSecondaryColorChange,
  resolutions, canvasSize, onCanvasSizeChange,
  brushSize, onBrushSizeChange,
  gridSettings, onGridSettingsChange, isTiledMode, onTiledModeChange,
  palette, onOpenWindow, guideSettings, onGuideSettingsChange, onClearGuides
}) => {
  const [customSize, setCustomSize] = useState(canvasSize);
  const isPreset = resolutions.includes(canvasSize.width) && canvasSize.width === canvasSize.height;
  
  useEffect(() => {
    setCustomSize(canvasSize);
  }, [canvasSize]);
  
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value !== 'custom') {
          const size = parseInt(value);
          if(window.confirm("Changing the canvas size will clear the current canvas. Are you sure?")) {
            onCanvasSizeChange(size, size);
          }
      }
  };
  
  const handleCustomResize = () => {
    if(window.confirm("Changing the canvas size will clear the current canvas. Are you sure?")) {
        onCanvasSizeChange(customSize.width, customSize.height);
    }
  }

  return (
    <>
      <div 
        className={`fixed top-0 right-0 h-[calc(100vh-2.5rem)] bg-black/50 backdrop-blur-sm border-l-2 border-cyan-400 transform transition-transform duration-300 ease-in-out z-30 ${isOpen ? 'translate-x-0' : 'translate-x-full'} w-64 p-2 flex flex-col gap-4 text-xs text-cyan-300 overflow-y-auto`}
      >
        <h3 className="text-sm font-bold border-b-2 border-fuchsia-500 pb-1 text-fuchsia-400 tracking-widest">TOOLBOX</h3>
        
        {/* Tools */}
        <div className="p-1 border-2 border-cyan-400/50">
            <div className="grid grid-cols-3 gap-1">
            {tools.map(tool => (
                <button
                id={`tool-${tool.id}`}
                key={tool.id}
                onClick={() => onToolSelect(tool.id)}
                className={`flex items-center justify-center p-2 border-2 aspect-square ${selectedTool === tool.id ? 'border-fuchsia-500 bg-fuchsia-500/20' : 'border-cyan-400/50 bg-black/30 hover:bg-cyan-500/20'}`}
                title={tool.name}
                >
                <tool.icon className="w-6 h-6 text-cyan-300" />
                </button>
            ))}
            </div>
        </div>
        
        {/* Colors */}
        <div className="p-2 border-2 border-cyan-400/50">
            <div className="flex justify-center items-center gap-2">
                <ColorSwatch id="toolbox-primary-color" color={primaryColor} onChange={onPrimaryColorChange} label="Primary Color"/>
                <ColorSwatch id="toolbox-secondary-color" color={secondaryColor} onChange={onSecondaryColorChange} label="Secondary Color" />
            </div>
        </div>
        
        {/* Palette */}
        <div className="p-2 border-2 border-cyan-400/50">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-fuchsia-400">Palette</h4>
                <PixelatedButton onClick={() => onOpenWindow(WindowType.AI_PALETTE)} className="px-2 py-0.5">AI Gen</PixelatedButton>
            </div>
            <div className="grid grid-cols-8 gap-0.5">
                {palette.map((color, index) => (
                    <div
                        key={`${color}-${index}`}
                        title={color}
                        className="w-full aspect-square border border-cyan-400/50 cursor-pointer hover:border-fuchsia-500"
                        style={{ backgroundColor: color }}
                        onClick={() => onPrimaryColorChange(color)}
                    />
                ))}
            </div>
        </div>

        {/* Tool Options */}
        <div className="p-2 border-2 border-cyan-400/50">
            <h4 className="font-bold text-fuchsia-400">Tool Options</h4>
            {(selectedTool === Tool.PENCIL || selectedTool === Tool.ERASER) ? (
                <div>
                <label className="block mb-1">Brush Size ({brushSize}px):</label>
                <input type="range" min="1" max="16" value={brushSize} onChange={e => onBrushSizeChange(parseInt(e.target.value))} className="w-full"/>
                </div>
            ) : ( <p className="text-gray-400">No options for this tool.</p> )}
        </div>
        
        {/* Canvas Settings */}
        <div className="p-2 border-2 border-cyan-400/50 flex flex-col gap-2">
            <h4 className="font-bold text-fuchsia-400">Canvas</h4>
            <div>
              <label htmlFor="preset-select" className="block mb-1">Preset:</label>
              <select 
                id="preset-select" 
                value={isPreset ? canvasSize.width : 'custom'} 
                onChange={handlePresetChange}
                className="w-full bg-black/50 border-2 border-cyan-400 p-1 text-xs text-cyan-300"
              >
                {resolutions.map(res => <option key={res} value={res}>{res}x{res}</option>)}
                <option value="custom">Custom</option>
              </select>
            </div>
            {!isPreset && (
                <div className='flex flex-col gap-2 p-2 border border-cyan-500/50'>
                    <div className='flex gap-2 items-center'>
                        <label htmlFor='width-input'>W:</label>
                        <input id='width-input' type="number" value={customSize.width} onChange={e => setCustomSize({...customSize, width: parseInt(e.target.value) || 1})} className="w-full bg-black/80 border border-cyan-400 p-1 text-xs"/>
                        <label htmlFor='height-input'>H:</label>
                        <input id='height-input' type="number" value={customSize.height} onChange={e => setCustomSize({...customSize, height: parseInt(e.target.value) || 1})} className="w-full bg-black/80 border border-cyan-400 p-1 text-xs"/>
                    </div>
                    <PixelatedButton onClick={handleCustomResize}>Resize</PixelatedButton>
                </div>
            )}
             <div>
                <label htmlFor="grid-type-select" className="block mb-1">Grid Type:</label>
                <select
                    id="grid-type-select"
                    value={gridSettings.type}
                    onChange={e => onGridSettingsChange({ ...gridSettings, type: e.target.value as GridType })}
                    className="w-full bg-black/50 border-2 border-cyan-400 p-1 text-xs text-cyan-300"
                >
                    <option value={GridType.STANDARD}>Standard</option>
                    <option value={GridType.ISOMETRIC}>Isometric</option>
                </select>
             </div>
             <div className="flex items-center justify-between">
                <label htmlFor="grid-toggle">Show Grid</label>
                <input type="checkbox" id="grid-toggle" checked={gridSettings.isVisible} onChange={e => onGridSettingsChange({ ...gridSettings, isVisible: e.target.checked })} />
             </div>
             <div>
                <label>Grid Color:</label>
                 <input type="color" value={gridSettings.color} onChange={e => onGridSettingsChange({ ...gridSettings, color: e.target.value })} className="w-full h-8 p-0 border-none cursor-pointer bg-transparent"/>
             </div>
             <div>
                <label>Grid Opacity:</label>
                <input type="range" min="0" max="1" step="0.05" value={gridSettings.opacity} onChange={e => onGridSettingsChange({ ...gridSettings, opacity: parseFloat(e.target.value) })} className="w-full"/>
             </div>
             <div className="flex items-center justify-between">
                <label htmlFor="tile-toggle">Tiled Mode</label>
                <input type="checkbox" id="tile-toggle" checked={isTiledMode} onChange={e => onTiledModeChange(e.target.checked)} />
             </div>
        </div>
         {/* Guides Settings */}
        <div className="p-2 border-2 border-cyan-400/50 flex flex-col gap-2">
            <h4 className="font-bold text-fuchsia-400">Guides</h4>
            <div className="flex items-center justify-between">
                <label htmlFor="guide-toggle">Show Guides</label>
                <input type="checkbox" id="guide-toggle" checked={guideSettings.isVisible} onChange={e => onGuideSettingsChange({ ...guideSettings, isVisible: e.target.checked })} />
            </div>
            <div className="flex items-center justify-between">
                <label htmlFor="guide-snap-toggle">Snap to Guides</label>
                <input type="checkbox" id="guide-snap-toggle" checked={guideSettings.snap} onChange={e => onGuideSettingsChange({ ...guideSettings, snap: e.target.checked })} />
            </div>
            <PixelatedButton onClick={onClearGuides}>Clear Guides</PixelatedButton>
        </div>
      </div>
      <PixelatedButton 
        id="toolbox-toggle"
        className="fixed top-4 right-4 z-40"
        onClick={onToggle}
        style={{ transform: `translateX(${isOpen ? '-16rem' : '0'})`, transition: 'transform 300ms ease-in-out' }}
      >
        {isOpen ? '>' : '<'} Toolbox
      </PixelatedButton>
    </>
  );
};

export default Toolbox;
