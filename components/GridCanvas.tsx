import React, { useState, forwardRef, useRef, useLayoutEffect, useEffect } from 'react';
import { Tool, Layer, GridType, WindowType, AchievementID } from '../types';
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

interface GridCanvasProps {
  layers: Layer[];
  activeLayerIndex: number;
  width: number;
  height: number;
  onLayerGridChange: (layerIndex: number, newGrid: string[][]) => void;
  selectedTool: Tool;
  primaryColor: string;
  secondaryColor: string;
  onPrimaryColorChange: (color: string) => void;
  brushSize: number;
  onNew: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  gridSettings: GridSettings;
  isOnionSkinningOn: boolean;
  previousFrameLayers: Layer[] | null;
  nextFrameLayers: Layer[] | null;
  guides: { horizontal: number[], vertical: number[] };
  guideSettings: GuideSettings;
  onGuidesChange: (guides: { horizontal: number[], vertical: number[] }) => void;
  onOpenWindow: (windowType: WindowType) => void;
  unlockAchievement: (id: AchievementID) => void;
}

type Point = { x: number; y: number };
type Selection = {
    path: Point[];
    mask: boolean[][];
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
};
type GuideInteraction = {
    type: 'horizontal' | 'vertical';
    index: number;
    pos: number;
} | {
    type: 'new-horizontal' | 'new-vertical';
    pos: number;
} | null;


const isSelectionTool = (tool: Tool) =>
    [Tool.RECTANGLE_SELECT, Tool.ELLIPSE_SELECT, Tool.LASSO_SELECT].includes(tool);

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
};

const RULER_SIZE = 20;

const GridCanvas = forwardRef<HTMLDivElement, GridCanvasProps>(
  ({ layers, activeLayerIndex, width, height, onLayerGridChange, selectedTool, primaryColor, secondaryColor, onPrimaryColorChange, brushSize, onNew, onClear, onUndo, onRedo, canUndo, canRedo, gridSettings, isOnionSkinningOn, previousFrameLayers, nextFrameLayers, guides, guideSettings, onGuidesChange, onOpenWindow, unlockAchievement }, ref) => {
    const gridData = layers[activeLayerIndex]?.grid;
    if (!gridData) return null;

    const [isDrawing, setIsDrawing] = useState(false);
    const [startCoords, setStartCoords] = useState<Point | null>(null);
    const [previewGrid, setPreviewGrid] = useState<string[][] | null>(null);
    
    const [selection, setSelection] = useState<Selection | null>(null);
    const [selectionPath, setSelectionPath] = useState('');
    const [movingSelection, setMovingSelection] = useState<{ pixelData: string[][], origin: Point } | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    
    const [guideInteraction, setGuideInteraction] = useState<GuideInteraction>(null);

    const animationFrameRef = useRef<number>();
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const hasDrawnRef = useRef(false);


    const getSnappedCoords = (row: number, col: number) => {
        if (!guideSettings.snap) return { row, col };
        let snappedRow = row;
        let snappedCol = col;
        const snapDistance = 1;

        let minRowDist = Infinity, closestHGuide = -1;
        for (const guidePos of guides.horizontal) {
            const dist = Math.abs(row - guidePos);
            if (dist < minRowDist) { minRowDist = dist; closestHGuide = guidePos; }
        }
        if (minRowDist < snapDistance) snappedRow = closestHGuide;
    
        let minColDist = Infinity, closestVGuide = -1;
        for (const guidePos of guides.vertical) {
            const dist = Math.abs(col - guidePos);
            if (dist < minColDist) { minColDist = dist; closestVGuide = guidePos; }
        }
        if (minColDist < snapDistance) snappedCol = closestVGuide;
        
        return { row: snappedRow, col: snappedCol };
    };

    const drawWithBrush = (grid: string[][], row: number, col: number, colorFn: (r: number, c: number) => string) => {
      const halfBrush = Math.floor(brushSize / 2);
      for (let i = 0; i < brushSize; i++) {
        for (let j = 0; j < brushSize; j++) {
          const r = row - halfBrush + i;
          const c = col - halfBrush + j;
          if (r >= 0 && r < height && c >= 0 && c < width && (!selection || selection.mask[r][c])) {
            grid[r][c] = colorFn(r,c);
          }
        }
      }
    };
    
    const getBresenhamLine = (x0: number, y0: number, x1: number, y1: number): Point[] => {
        const points: Point[] = [];
        const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy, e2;
        for (;;) {
            points.push({ x: x0, y: y0 });
            if (x0 == x1 && y0 == y1) break;
            e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
        return points;
    };

    const getMidpointCircle = (x0: number, y0: number, x1: number, y1: number): Point[] => {
        const points: Point[] = [];
        const radiusX = Math.abs(x1 - x0);
        const radiusY = Math.abs(y1 - y0);
        let x = -radiusX, y = 0, err = 2-2*radiusX; 
        do {
            points.push({x: x0 - x, y: y0 + y});
            points.push({x: x0 + x, y: y0 + y});
            points.push({x: x0 + x, y: y0 - y});
            points.push({x: x0 - x, y: y0 - y});
            const e2 = err;
            if (e2 <= y) err += ++y*2+1;
            if (e2 > x || err > y) err += ++x*2+1;
        } while (x <= 0);
        return points;
    };

    const applyShapeToGrid = (grid: string[][], points: Point[], color: string) => {
        points.forEach(p => {
            if (p.y >= 0 && p.y < height && p.x >= 0 && p.x < width && (!selection || selection.mask[p.y][p.x])) {
                grid[p.y][p.x] = color;
            }
        });
    };

    const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
        e.preventDefault();
        const { row: snappedRow, col: snappedCol } = getSnappedCoords(row, col);
        const drawColor = e.button === 0 ? primaryColor : secondaryColor;

        if (selection && e.button === 0 && selection.mask[snappedRow][snappedCol]) {
            setIsMoving(true);
            const { minX, minY, maxX, maxY } = selection.bounds;
            const pixelData = [];
            const newGrid = gridData.map(r => [...r]);
            for (let r = minY; r <= maxY; r++) {
                const rowData = [];
                for (let c = minX; c <= maxX; c++) {
                    if (selection.mask[r][c]) {
                        rowData.push(gridData[r][c]);
                        newGrid[r][c] = 'transparent';
                    } else {
                        rowData.push('transparent');
                    }
                }
                pixelData.push(rowData);
            }
            setMovingSelection({ pixelData, origin: { x: snappedCol, y: snappedRow }});
            setPreviewGrid(newGrid);
            setSelection(null); 
            setStartCoords({ x: snappedCol, y: snappedRow });
            return;
        }

        if (movingSelection) return;
        
        if (selection && !selection.mask[snappedRow][snappedCol]) {
            setSelection(null);
        }

        setIsDrawing(true);
        setStartCoords({ x: snappedCol, y: snappedRow });
        
        const newGrid = gridData.map(r => [...r]);

        switch (selectedTool) {
            case Tool.PENCIL:
                drawWithBrush(newGrid, snappedRow, snappedCol, () => drawColor);
                setPreviewGrid(newGrid);
                break;
            case Tool.DITHER:
                drawWithBrush(newGrid, snappedRow, snappedCol, (r, c) => (r + c) % 2 === 0 ? primaryColor : secondaryColor);
                setPreviewGrid(newGrid);
                break;
            case Tool.ERASER:
                drawWithBrush(newGrid, snappedRow, snappedCol, () => 'transparent');
                setPreviewGrid(newGrid);
                break;
            case Tool.COLOR_PICKER:
                if (snappedRow >= 0 && snappedRow < height && snappedCol >= 0 && snappedCol < width) {
                    onPrimaryColorChange(gridData[snappedRow][snappedCol]);
                }
                setIsDrawing(false);
                break;
            case Tool.FILL_BUCKET:
                const targetColor = newGrid[snappedRow][snappedCol];
                if (targetColor === drawColor) {
                    setIsDrawing(false);
                    return;
                }
                const queue: Point[] = [{ x: snappedCol, y: snappedRow }];
                const visited = new Set<string>([`${snappedRow},${snappedCol}`]);
                
                while (queue.length > 0) {
                  const {x: c, y: r} = queue.shift()!;
                  if (!selection || selection.mask[r][c]) {
                    newGrid[r][c] = drawColor;
                  }
                  
                  const neighbors: Point[] = [{y:r-1, x:c}, {y:r+1, x:c}, {y:r, x:c-1}, {y:r, x:c+1}];
                  for (const {x: nc, y: nr} of neighbors) {
                    if (nr >= 0 && nr < height && nc >= 0 && nc < width && newGrid[nr][nc] === targetColor && !visited.has(`${nr},${nc}`)) {
                      visited.add(`${nr},${nc}`);
                      queue.push({ x: nc, y: nr });
                    }
                  }
                }
                onLayerGridChange(activeLayerIndex, newGrid);
                if (!hasDrawnRef.current) {
                    unlockAchievement(AchievementID.FIRST_STROKE);
                    hasDrawnRef.current = true;
                }
                setIsDrawing(false);
                break;
            case Tool.RECTANGLE_SELECT:
            case Tool.ELLIPSE_SELECT:
            case Tool.LASSO_SELECT:
                setSelectionPath(`M ${snappedCol} ${snappedRow}`);
                break;
        }
    };

    const handleMouseMove = (row: number, col: number, e: React.MouseEvent) => {
        if (!isDrawing && !isMoving) return;
        e.preventDefault();
        
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        
        animationFrameRef.current = requestAnimationFrame(() => {
            const { row: snappedRow, col: snappedCol } = getSnappedCoords(row, col);
            if (isMoving && movingSelection && startCoords) {
                const newOrigin = {
                    x: movingSelection.origin.x + (snappedCol - startCoords.x),
                    y: movingSelection.origin.y + (snappedRow - startCoords.y),
                };
                const movedData = { ...movingSelection, origin: newOrigin };
                setMovingSelection(movedData);
                return;
            }

            if (!isDrawing || !startCoords) return;

            const drawColor = e.buttons === 1 ? primaryColor : secondaryColor;
            let currentPreview = previewGrid || gridData.map(r => [...r]);

            if (isSelectionTool(selectedTool)) {
                return;
            }
            
            switch (selectedTool) {
                case Tool.PENCIL:
                    drawWithBrush(currentPreview, snappedRow, snappedCol, () => drawColor);
                    setPreviewGrid(currentPreview);
                    break;
                 case Tool.DITHER:
                    drawWithBrush(currentPreview, snappedRow, snappedCol, (r, c) => (r + c) % 2 === 0 ? primaryColor : secondaryColor);
                    setPreviewGrid(currentPreview);
                    break;
                case Tool.ERASER:
                    drawWithBrush(currentPreview, snappedRow, snappedCol, () => 'transparent');
                    setPreviewGrid(currentPreview);
                    break;
                case Tool.LINE:
                case Tool.RECTANGLE:
                case Tool.CIRCLE:
                    const tempGrid = gridData.map(r => [...r]);
                    const points = selectedTool === Tool.LINE ? getBresenhamLine(startCoords.x, startCoords.y, snappedCol, snappedRow)
                                 : selectedTool === Tool.RECTANGLE ? [...getBresenhamLine(startCoords.x, startCoords.y, snappedCol, startCoords.y), ...getBresenhamLine(startCoords.x, startCoords.y, startCoords.x, snappedRow), ...getBresenhamLine(snappedCol, startCoords.y, snappedCol, snappedRow), ...getBresenhamLine(startCoords.x, snappedRow, snappedCol, snappedRow)]
                                 : getMidpointCircle(Math.floor((startCoords.x + snappedCol)/2), Math.floor((startCoords.y + snappedRow)/2), startCoords.x, startCoords.y);
                    
                    applyShapeToGrid(tempGrid, points, drawColor);
                    setPreviewGrid(tempGrid);
                    break;
            }
        });
    };

    const handleMouseUp = (row: number, col: number, e: React.MouseEvent) => {
        e.preventDefault();
        
        if (isMoving && movingSelection && previewGrid) {
            const finalGrid = previewGrid.map(r => [...r]);
            const { pixelData, origin } = movingSelection;
            const startX = origin.x;
            const startY = origin.y;
             for (let r = 0; r < pixelData.length; r++) {
                for (let c = 0; c < pixelData[0].length; c++) {
                    if (pixelData[r][c] !== 'transparent') {
                        const targetY = startY + r - Math.floor(pixelData.length / 2);
                        const targetX = startX + c - Math.floor(pixelData[0].length/2);
                        if (targetY >= 0 && targetY < height && targetX >= 0 && targetX < width) {
                            finalGrid[targetY][targetX] = pixelData[r][c];
                        }
                    }
                }
            }
            onLayerGridChange(activeLayerIndex, finalGrid);
            setMovingSelection(null);
            setIsMoving(false);
            setStartCoords(null);
            setPreviewGrid(null);
            return;
        }
        
        if (!isDrawing || !startCoords) return;
        const { row: snappedRow, col: snappedCol } = getSnappedCoords(row, col);

        if (isSelectionTool(selectedTool)) {
            const mask = Array(height).fill(0).map(() => Array(width).fill(false));
            let minX = Math.min(startCoords.x, snappedCol), maxX = Math.max(startCoords.x, snappedCol);
            let minY = Math.min(startCoords.y, snappedRow), maxY = Math.max(startCoords.y, snappedRow);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const ctx = tempCanvas.getContext('2d')!;
            ctx.beginPath();
            
            if (selectedTool === Tool.RECTANGLE_SELECT) {
                ctx.rect(minX, minY, maxX - minX + 1, maxY - minY + 1);
            } else if (selectedTool === Tool.ELLIPSE_SELECT) {
                 ctx.ellipse(startCoords.x + (snappedCol - startCoords.x)/2, startCoords.y + (snappedRow - startCoords.y)/2, Math.abs(snappedCol-startCoords.x)/2, Math.abs(snappedRow-startCoords.y)/2, 0, 0, 2 * Math.PI);
            } else { // Lasso
                 const points = selectionPath.split(/[LM]/).filter(Boolean).map(p => {
                     const [x,y] = p.trim().split(' ').map(Number);
                     return {x,y};
                 });
                 if(points.length > 2) {
                    ctx.moveTo(points[0].x, points[0].y);
                    for(let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
                    ctx.closePath();
                    minX = Math.min(...points.map(p => p.x));
                    minY = Math.min(...points.map(p => p.y));
                    maxX = Math.max(...points.map(p => p.x));
                    maxY = Math.max(...points.map(p => p.y));
                 }
            }
            ctx.fill();

            for (let r = 0; r < height; r++) {
                for (let c = 0; c < width; c++) {
                    if (ctx.isPointInPath(c, r)) {
                        mask[r][c] = true;
                    }
                }
            }
            setSelection({ path: [], mask, bounds: {minX, minY, maxX, maxY} });
            setSelectionPath('');
        } else if (previewGrid) {
             onLayerGridChange(activeLayerIndex, previewGrid);
             if (!hasDrawnRef.current) {
                unlockAchievement(AchievementID.FIRST_STROKE);
                hasDrawnRef.current = true;
            }
        }
        
        setPreviewGrid(null);
        setIsDrawing(false);
        setStartCoords(null);
    };

    const getCursor = () => {
        if (isSelectionTool(selectedTool) || [Tool.LINE, Tool.RECTANGLE, Tool.CIRCLE].includes(selectedTool)) return 'crosshair';
        switch(selectedTool) {
            case Tool.PENCIL: case Tool.ERASER: case Tool.DITHER: return 'crosshair';
            case Tool.FILL_BUCKET: return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" style="image-rendering: pixelated;" fill="white"><path d="M3 12L12 21L21 12L19 10L12 17L5 10L3 12Z"/><path d="M10 3H14V9H10V3Z"/><path d="M12 8L18 2H6L12 8Z"/></svg>'), auto`;
            case Tool.COLOR_PICKER: return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" style="image-rendering: pixelated;" fill="white"><path d="M12 2C12 2 4 10 4 15C4 19 8 23 12 23C16 23 20 19 20 15C20 10 12 2 12 2ZM12 18C10 18 8 16 8 14C8 12 10 10 12 10C14 10 16 12 16 14C16 16 14 18 12 18Z" /></svg>'), auto`;
            default: return 'default';
        }
    };
    
    useLayoutEffect(() => {
        if (!isSelectionTool(selectedTool) && !isMoving) {
            setSelection(null);
        }
    }, [selectedTool, isMoving]);
    
    useEffect(() => {
        const getCoordsFromEvent = (e: MouseEvent) => {
            if (!canvasContainerRef.current) return null;
            const rect = canvasContainerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;
            const col = Math.floor((x / rect.width) * width);
            const row = Math.floor((y / rect.height) * height);
            return { row, col };
        };

        const handleDocMouseMove = (e: MouseEvent) => {
            if (!guideInteraction) return;
            const coords = getCoordsFromEvent(e);
            
            if (guideInteraction.type === 'new-horizontal') {
                setGuideInteraction({ type: 'new-horizontal', pos: coords?.row ?? -1 });
            } else if (guideInteraction.type === 'new-vertical') {
                setGuideInteraction({ type: 'new-vertical', pos: coords?.col ?? -1 });
            } else if (guideInteraction.type === 'horizontal') {
                const newPos = coords?.row ?? -1;
                setGuideInteraction({...guideInteraction, pos: newPos});
                const newGuides = { ...guides };
                newGuides.horizontal[guideInteraction.index] = newPos;
                onGuidesChange(newGuides);
            } else if (guideInteraction.type === 'vertical') {
                const newPos = coords?.col ?? -1;
                setGuideInteraction({...guideInteraction, pos: newPos});
                const newGuides = { ...guides };
                newGuides.vertical[guideInteraction.index] = newPos;
                onGuidesChange(newGuides);
            }
        };

        const handleDocMouseUp = () => {
            if (!guideInteraction) return;
            let finalGuides = JSON.parse(JSON.stringify(guides));
            if (guideInteraction.type === 'new-horizontal' && guideInteraction.pos >= 0 && guideInteraction.pos < height) {
                finalGuides.horizontal.push(guideInteraction.pos);
            } else if (guideInteraction.type === 'new-vertical' && guideInteraction.pos >= 0 && guideInteraction.pos < width) {
                finalGuides.vertical.push(guideInteraction.pos);
            } else if (guideInteraction.type === 'horizontal') {
                if (guideInteraction.pos < 0 || guideInteraction.pos >= height) {
                    finalGuides.horizontal.splice(guideInteraction.index, 1);
                }
            } else if (guideInteraction.type === 'vertical') {
                 if (guideInteraction.pos < 0 || guideInteraction.pos >= width) {
                    finalGuides.vertical.splice(guideInteraction.index, 1);
                }
            }
            finalGuides.horizontal.sort((a:number,b:number)=>a-b);
            finalGuides.vertical.sort((a:number,b:number)=>a-b);
            onGuidesChange(finalGuides);
            setGuideInteraction(null);
        };
        
        document.addEventListener('mousemove', handleDocMouseMove);
        document.addEventListener('mouseup', handleDocMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleDocMouseMove);
            document.removeEventListener('mouseup', handleDocMouseUp);
        };
    }, [guideInteraction, guides, onGuidesChange, width, height]);
    
    const gridCellWidth = 100 / width;
    const gridCellHeight = 100 / height;
    const activeGrid = previewGrid || gridData;

    const IsoGridLines = () => {
        const lines = [];
        const step = 16 / width * 100;
        const color = `rgba(${hexToRgb(gridSettings.color)}, ${gridSettings.opacity})`;

        for (let i = -100; i < 200; i += step) {
            lines.push(<line key={`ur-${i}`} x1={`${i}%`} y1="100%" x2={`${i + 200}%`} y2="0%" stroke={color} strokeWidth="1" />);
            lines.push(<line key={`dr-${i}`} x1={`${i}%`} y1="0%" x2={`${i + 200}%`} y2="100%" stroke={color} strokeWidth="1" />);
        }
        return <>{lines}</>;
    };

    return (
      <div id="grid-canvas-container" className="p-4 bg-black/50 backdrop-blur-sm border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 relative">
        <div className="absolute top-[-44px] right-0 flex gap-1 z-10">
            <PixelatedButton onClick={onNew} title="New Project">New</PixelatedButton>
            <PixelatedButton onClick={() => onOpenWindow(WindowType.VERSION_CONTROL)} title="Commit Changes">Commit</PixelatedButton>
            <PixelatedButton onClick={onClear} title="Clear Canvas">Clear</PixelatedButton>
            <PixelatedButton onClick={onUndo} disabled={!canUndo} title="Undo">Undo</PixelatedButton>
            <PixelatedButton onClick={onRedo} disabled={!canRedo} title="Redo">Redo</PixelatedButton>
        </div>
        <div className="relative" style={{ paddingLeft: RULER_SIZE, paddingTop: RULER_SIZE }}>
             {/* RULERS */}
            <div 
                className="absolute bg-black/30 cursor-ns-resize" 
                style={{ top: 0, left: RULER_SIZE, width: `calc(100% - ${RULER_SIZE}px)`, height: RULER_SIZE }}
                onMouseDown={() => setGuideInteraction({ type: 'new-horizontal', pos: -1})}
            />
            <div 
                className="absolute bg-black/30 cursor-ew-resize" 
                style={{ left: 0, top: RULER_SIZE, width: RULER_SIZE, height: `calc(100% - ${RULER_SIZE}px)` }}
                onMouseDown={() => setGuideInteraction({ type: 'new-vertical', pos: -1})}
            />

            <div 
            ref={canvasContainerRef}
            className="relative bg-transparent bg-repeat bg-center"
            style={{ 
                width: 'min(70vh, 70vw)',
                height: 'min(70vh, 70vw)',
                backgroundImage: `linear-gradient(45deg, #1a1a2e 25%, transparent 25%), linear-gradient(-45deg, #1a1a2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a2e 75%), linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)`,
                backgroundSize: `20px 20px`,
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                border: '2px solid #002b36',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
            }}
            >
            <div
                ref={ref}
                className="relative"
                style={{
                    width: width >= height ? '100%' : 'auto',
                    height: height > width ? '100%' : 'auto',
                    aspectRatio: `${width} / ${height}`,
                    imageRendering: 'pixelated',
                }}
            >
                {/* Onion Skinning Layers */}
                {isOnionSkinningOn && previousFrameLayers && (
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-25 bg-red-500" style={{mixBlendMode: 'lighten'}}>
                        {previousFrameLayers.map(layer => (
                            layer.isVisible && <div key={layer.id} className="absolute top-0 left-0 w-full h-full grid" style={{
                                gridTemplateColumns: `repeat(${width}, 1fr)`, gridTemplateRows: `repeat(${height}, 1fr)`, opacity: layer.opacity, mixBlendMode: layer.blendMode
                            }}>
                                {layer.grid.map((r, ri) => r.map((c, ci) => <div key={`${ri}-${ci}`} style={{backgroundColor: c}} />))}
                            </div>
                        ))}
                    </div>
                )}
                {isOnionSkinningOn && nextFrameLayers && (
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-25 bg-blue-500" style={{mixBlendMode: 'lighten'}}>
                        {nextFrameLayers.map(layer => (
                            layer.isVisible && <div key={layer.id} className="absolute top-0 left-0 w-full h-full grid" style={{
                                gridTemplateColumns: `repeat(${width}, 1fr)`, gridTemplateRows: `repeat(${height}, 1fr)`, opacity: layer.opacity, mixBlendMode: layer.blendMode
                            }}>
                                {layer.grid.map((r, ri) => r.map((c, ci) => <div key={`${ri}-${ci}`} style={{backgroundColor: c}} />))}
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Render all active layers */}
                {layers.map((layer, index) => (
                    <div key={layer.id} className="absolute top-0 left-0 w-full h-full grid" style={{
                        gridTemplateColumns: `repeat(${width}, 1fr)`,
                        gridTemplateRows: `repeat(${height}, 1fr)`,
                        opacity: layer.isVisible ? layer.opacity : 0,
                        mixBlendMode: layer.blendMode,
                        pointerEvents: 'none'
                    }}>
                    {(index === activeLayerIndex ? activeGrid : layer.grid).map((rowArr, rowIndex) => 
                        rowArr.map((color, colIndex) => (
                            <div key={`${rowIndex}-${colIndex}`} style={{backgroundColor: color}} />
                        ))
                    )}
                    </div>
                ))}

                {/* Interaction layer */}
                <div className="absolute top-0 left-0 w-full h-full grid"
                    style={{
                        gridTemplateColumns: `repeat(${width}, 1fr)`,
                        gridTemplateRows: `repeat(${height}, 1fr)`,
                        cursor: getCursor()
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseLeave={(e) => {
                    if (isDrawing || isMoving) {
                        handleMouseUp(0, 0, e as any);
                    }
                    }}
                >
                    {Array.from({ length: height }).map((_, rowIndex) =>
                    Array.from({ length: width }).map((_, colIndex) => (
                        <div
                        key={`${rowIndex}-${colIndex}`}
                        className="w-full h-full"
                        onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
                        onMouseUp={(e) => handleMouseUp(rowIndex, colIndex, e)}
                        onMouseMove={(e) => handleMouseMove(rowIndex, colIndex, e)}
                        />
                    ))
                    )}
                </div>

                {/* OVERLAYS */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {gridSettings.isVisible && gridSettings.type === GridType.STANDARD && (
                        <div
                            className="w-full h-full"
                            style={{
                                backgroundImage: `
                                    linear-gradient(to right, rgba(${hexToRgb(gridSettings.color)}, ${gridSettings.opacity}) 1px, transparent 1px),
                                    linear-gradient(to bottom, rgba(${hexToRgb(gridSettings.color)}, ${gridSettings.opacity}) 1px, transparent 1px)
                                `,
                                backgroundSize: `${gridCellWidth}% ${gridCellHeight}%`
                            }}
                        />
                    )}
                     {gridSettings.isVisible && gridSettings.type === GridType.ISOMETRIC && (
                        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="overflow-hidden">
                           <IsoGridLines />
                        </svg>
                    )}
                    {selection && (
                        <div className="w-full h-full" style={{
                            border: `1px solid black`,
                            outline: `1px solid white`,
                            outlineOffset: '-1px',
                            animation: 'march 500ms linear infinite',
                            backgroundImage: `conic-gradient(from 0.25turn at 50% 50%, white 0 25%, black 0 50%, white 0 75%, black 0 100%)`,
                            backgroundSize: '8px 8px',
                            clipPath: `url(#selection-clip)`
                        }}>
                            <svg width="0" height="0">
                                <defs>
                                    <clipPath id="selection-clip" clipPathUnits="objectBoundingBox">
                                        <path d={
                                            selection.mask.map((row, y) => row.map((cell, x) => cell ? `M ${x/width} ${y/height} h ${1/width} v ${1/height} h ${-1/width} z` : '').join(' ')).join(' ')
                                        } />
                                    </clipPath>
                                </defs>
                            </svg>
                        </div>
                    )}
                    {movingSelection && (
                        <div className="grid pointer-events-none" style={{
                            position: 'absolute',
                            left: `${(movingSelection.origin.x - Math.floor(movingSelection.pixelData[0].length/2)) * 100 / width}%`,
                            top: `${(movingSelection.origin.y - Math.floor(movingSelection.pixelData.length/2)) * 100 / height}%`,
                            width: `${movingSelection.pixelData[0].length * 100 / width}%`,
                            height: `${movingSelection.pixelData.length * 100 / height}%`,
                            gridTemplateColumns: `repeat(${movingSelection.pixelData[0].length}, 1fr)`,
                            gridTemplateRows: `repeat(${movingSelection.pixelData.length}, 1fr)`,
                            imageRendering: 'pixelated',
                        }}>
                            {movingSelection.pixelData.map((row, r) => row.map((color, c) => (
                                <div key={`${r}-${c}`} style={{backgroundColor: color}}/>
                            )))}
                        </div>
                    )}
                </div>
                </div>
            </div>

            {/* GUIDES OVERLAY - must be outside the scaled canvas div */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{top: RULER_SIZE, left: RULER_SIZE, width: `calc(100% - ${RULER_SIZE}px)`, height: `calc(100% - ${RULER_SIZE}px)`}}>
                {guideSettings.isVisible && guides.horizontal.map((y, i) => (
                    <div key={`h-${i}`} className="absolute w-full h-px bg-cyan-400 pointer-events-auto cursor-row-resize" style={{ top: `${y * 100 / height}%` }}
                        onMouseDown={(e) => { e.stopPropagation(); setGuideInteraction({ type: 'horizontal', index: i, pos: y }); }}
                    />
                ))}
                {guideSettings.isVisible && guides.vertical.map((x, i) => (
                    <div key={`v-${i}`} className="absolute h-full w-px bg-cyan-400 pointer-events-auto cursor-col-resize" style={{ left: `${x * 100 / width}%` }}
                        onMouseDown={(e) => { e.stopPropagation(); setGuideInteraction({ type: 'vertical', index: i, pos: x }); }}
                    />
                ))}
                {guideInteraction?.type.startsWith('new-') && guideInteraction.pos !== -1 && (
                    <div className={`absolute ${guideInteraction.type === 'new-horizontal' ? 'w-full h-px' : 'h-full w-px'} bg-fuchsia-500`} style={{
                        top: guideInteraction.type === 'new-horizontal' ? `${guideInteraction.pos * 100 / height}%` : 0,
                        left: guideInteraction.type === 'new-vertical' ? `${guideInteraction.pos * 100 / width}%` : 0,
                    }}/>
                )}
            </div>
        </div>
      </div>
    );
  }
);

export default GridCanvas;
