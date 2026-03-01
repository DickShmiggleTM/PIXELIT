import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Components
import GridCanvas from './components/GridCanvas';
import Toolbox from './components/Toolbox';
import Taskbar from './components/Taskbar';
import StartMenu from './components/StartMenu';
import SynthwaveBackground from './components/SynthwaveBackground';
import AiChatPanel from './components/AiChatPanel';
import AnimationPanel from './components/AnimationWindow';
import ExportWindow from './components/ExportWindow';
import LayersWindow from './components/LayersWindow';
import AiPaletteWindow from './components/AiPaletteWindow';
import AiUpscalingWindow from './components/AiUpscalingWindow';
import AiSpriteSheetWindow from './components/AiSpriteSheetWindow';
import FiltersWindow from './components/FiltersWindow';
import PreviewWindow from './components/PreviewWindow';
import ReferenceImageWindow from './components/ReferenceImageWindow';
import FileBrowserWindow from './components/FileBrowserWindow';
import VersionControlWindow from './components/VersionControlWindow';
import MacrosAndScriptsWindow from './components/MacrosAndScriptsWindow';
import AiStyleTunerWindow from './components/AiStyleTunerWindow';
import AiAutoShadingWindow from './components/AiAutoShadingWindow';
import AiLayerSeparationWindow from './components/AiLayerSeparationWindow';
import ChiptuneSfxWindow from './components/ChiptuneSfxWindow';
import MusicVisualizerWindow from './components/MusicVisualizerWindow';
import TutorialsWindow from './components/TutorialsWindow';
import DailyChallengeWindow from './components/DailyChallengeWindow';
import AchievementsWindow from './components/AchievementsWindow';
import AchievementToast from './components/AchievementToast';
import TutorialGuide from './components/TutorialGuide';
import SettingsWindow from './components/SettingsWindow';
import SpriteLabWindow from './components/SpriteLabWindow';

// Types and Constants
import { Tool, WindowType, Frame, Layer, BlendMode, GridType, VersionHistory, Commit, ProjectState, Asset, MacroAction, Macro, Script, Tutorial, UnlockedAchievement, Achievement, AchievementID, AISettings } from './types';
import { RESOLUTIONS, TOOLS } from './constants';
import { ALL_ACHIEVEMENTS } from './data/achievements';

// Services
import * as aiService from './services/aiService';
import * as storage from './services/storageService';
import { useGridAsDataUrl } from './hooks/useGridAsDataUrl';
import { sliceSpriteSheet, frameToBase64, layerToDataUrl } from './utils/imageUtils';

// Helper to create an empty grid
const createEmptyGrid = (width: number, height: number): string[][] =>
  Array(height).fill(0).map(() => Array(width).fill('transparent'));

const createEmptyLayer = (width: number, height: number, name: string = "Layer 1"): Layer => ({
    id: uuidv4(),
    name,
    grid: createEmptyGrid(width, height),
    isVisible: true,
    opacity: 1,
    blendMode: BlendMode.NORMAL,
});

const createInitialFrame = (width: number, height: number): Frame => ({
    layers: [createEmptyLayer(width, height)],
    sfxAssetId: undefined,
});

const createInitialProjectState = (width: number, height: number): ProjectState => ({
    canvasSize: { width, height },
    frames: [createInitialFrame(width, height)],
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface FilterSettings {
  scanlines: { enabled: boolean; opacity: number; density: number };
  crt: { enabled: boolean; intensity: number };
  bloom: { enabled: boolean; intensity: number };
  chromaticAberration: { enabled: boolean; intensity: number };
}

const initialFilterSettings: FilterSettings = {
    scanlines: { enabled: false, opacity: 0.1, density: 2 },
    crt: { enabled: false, intensity: 5 },
    bloom: { enabled: false, intensity: 5 },
    chromaticAberration: { enabled: false, intensity: 1 },
};

const App: React.FC = () => {
    // AI Settings
    const [aiSettings, setAiSettings] = useState<AISettings>(storage.loadAISettings());
    
    // Initialize AI service on load and when settings change
    useEffect(() => {
        aiService.init(aiSettings);
    }, [aiSettings]);

    // Project & Version Control State
    const [currentProject, setCurrentProject] = useState<string | null>(null);
    const [versionHistory, setVersionHistory] = useState<VersionHistory | null>(null);
    const [assets, setAssets] = useState<Asset[]>(storage.loadAllAssets());
    const [activeStyleProfile, setActiveStyleProfile] = useState<Asset | null>(null);


    // Editor State
    const [projectState, setProjectState] = useState<ProjectState>(() => createInitialProjectState(32, 32));
    const { canvasSize, frames } = projectState;
    
    // UI State
    const [isToolboxOpen, setIsToolboxOpen] = useState(true);
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [openWindows, setOpenWindows] = useState<{[key in WindowType]?: boolean}>({});
    const [zoom, setZoom] = useState(1);
    const [gridSettings, setGridSettings] = useState({ isVisible: true, color: '#888888', opacity: 0.5, type: GridType.STANDARD });
    const [isTiledMode, setIsTiledMode] = useState(false);
    const [filterSettings, setFilterSettings] = useState<FilterSettings>(initialFilterSettings);
    const [guideSettings, setGuideSettings] = useState({ isVisible: true, snap: true });
    const [guides, setGuides] = useState<{ horizontal: number[], vertical: number[] }>({ horizontal: [], vertical: [] });


    // Session History (Undo/Redo) State
    const [activeFrameIndex, setActiveFrameIndex] = useState(0);
    const [activeLayerIndex, setActiveLayerIndex] = useState(0);
    const [sessionHistory, setSessionHistory] = useState<ProjectState[]>([projectState]);
    const [sessionHistoryIndex, setSessionHistoryIndex] = useState(0);
    
    // Tool State
    const [selectedTool, _setSelectedTool] = useState<Tool>(Tool.PENCIL);
    const [primaryColor, _setPrimaryColor] = useState('#ffffff');
    const [secondaryColor, _setSecondaryColor] = useState('#000000');
    const [brushSize, _setBrushSize] = useState(1);
    const [palette, setPalette] = useState<string[]>(['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#c0c0c0', '#808080', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080']);

    // Animation State
    const [isPlaying, setIsPlaying] = useState(false);
    const [fps, setFps] = useState(12);
    const [isOnionSkinningOn, setIsOnionSkinningOn] = useState(true);

    // Macro & Scripting State
    const [isRecordingMacro, setIsRecordingMacro] = useState(false);
    const [currentMacroActions, setCurrentMacroActions] = useState<MacroAction[]>([]);
    
    // Tutorial & Achievement State
    const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>(storage.loadUnlockedAchievements);
    const [toastQueue, setToastQueue] = useState<Achievement[]>([]);
    const [activeTutorial, setActiveTutorial] = useState<{ tutorial: Tutorial; step: number } | null>(null);

    const gridElementRef = useRef<HTMLDivElement>(null);

    const currentFrame = frames[activeFrameIndex];
    const currentLayers = currentFrame?.layers || [];
    const activeLayer = currentLayers[activeLayerIndex];

    const canUndo = sessionHistoryIndex > 0;
    const canRedo = sessionHistoryIndex < sessionHistory.length - 1;
    const tileDataUrl = useGridAsDataUrl(currentLayers, canvasSize.width, canvasSize.height);

     // --- Achievement Handlers ---
    const unlockAchievement = useCallback((id: AchievementID) => {
        if (unlockedAchievements.some(a => a.achievementId === id)) return;

        const newAchievement: UnlockedAchievement = {
            achievementId: id,
            timestamp: Date.now(),
        };
        const newUnlocked = [...unlockedAchievements, newAchievement];
        setUnlockedAchievements(newUnlocked);
        storage.saveUnlockedAchievements(newUnlocked);
        
        const achievementData = ALL_ACHIEVEMENTS.find(a => a.id === id);
        if (achievementData) {
            setToastQueue(prev => [...prev, achievementData]);
        }
    }, [unlockedAchievements]);

    const handleToastComplete = () => {
        setToastQueue(prev => prev.slice(1));
    };

    // --- Tutorial Handlers ---
    const handleStartTutorial = (tutorial: Tutorial) => {
        setActiveTutorial({ tutorial, step: 0 });
    };
    const handleEndTutorial = () => {
        setActiveTutorial(null);
    };
    const handleNextStep = () => {
        setActiveTutorial(prev => {
            if (!prev || prev.step >= prev.tutorial.steps.length - 1) return prev;
            return { ...prev, step: prev.step + 1 };
        });
    };
    const handlePrevStep = () => {
        setActiveTutorial(prev => {
            if (!prev || prev.step <= 0) return prev;
            return { ...prev, step: prev.step - 1 };
        });
    };

    const updateProjectState = (newState: ProjectState | ((prevState: ProjectState) => ProjectState), addToHistory: boolean = true) => {
        const nextState = typeof newState === 'function' ? newState(projectState) : newState;
        setProjectState(nextState);
        if (addToHistory) {
            const newHistory = sessionHistory.slice(0, sessionHistoryIndex + 1);
            newHistory.push(nextState);
            setSessionHistory(newHistory);
            setSessionHistoryIndex(newHistory.length - 1);
        }
    };
     // --- Macro & Scripting Handlers ---
    const recordAction = useCallback((action: MacroAction) => {
        if (isRecordingMacro) {
            setCurrentMacroActions(prev => [...prev, action]);
        }
    }, [isRecordingMacro]);

    const setSelectedTool = (tool: Tool) => {
        recordAction({ type: 'SET_TOOL', payload: tool });
        _setSelectedTool(tool);
    };
    const setPrimaryColor = (color: string) => {
        recordAction({ type: 'SET_PRIMARY_COLOR', payload: color });
        _setPrimaryColor(color);
    };
    const setSecondaryColor = (color: string) => {
        recordAction({ type: 'SET_SECONDARY_COLOR', payload: color });
        _setSecondaryColor(color);
    };
    const setBrushSize = (size: number) => {
        recordAction({ type: 'SET_BRUSH_SIZE', payload: size });
        _setBrushSize(size);
    };

    const handleStartRecording = () => {
        setCurrentMacroActions([]);
        setIsRecordingMacro(true);
        alert('Macro recording started!');
    };
    
    const handleStopRecording = () => {
        setIsRecordingMacro(false);
        alert(`Macro recording stopped! ${currentMacroActions.length} actions recorded.`);
    };

    const handleSaveMacro = (name: string) => {
        if (!name || currentMacroActions.length === 0) {
            alert("Cannot save an empty macro or a macro without a name.");
            return;
        }
        const newMacro: Macro = { name, actions: currentMacroActions };
        handleSaveAsset({ name, type: 'macro', tags: ['macro'], data: newMacro });
        setCurrentMacroActions([]);
    };
    
    const handlePlayMacro = async (macro: Macro) => {
        alert(`Playing macro: "${macro.name}"`);
        for (const action of macro.actions) {
            switch (action.type) {
                case 'SET_TOOL': _setSelectedTool(action.payload); break;
                case 'SET_PRIMARY_COLOR': _setPrimaryColor(action.payload); break;
                case 'SET_SECONDARY_COLOR': _setSecondaryColor(action.payload); break;
                case 'SET_BRUSH_SIZE': _setBrushSize(action.payload); break;
                case 'ADD_LAYER': handleAddLayer(); break;
                case 'SELECT_LAYER': setActiveLayerIndex(action.payload); break;
                case 'SET_LAYER_GRID':
                    updateProjectState(prev => {
                        const newFrames = JSON.parse(JSON.stringify(prev.frames));
                        newFrames[activeFrameIndex].layers[action.payload.layerIndex].grid = action.payload.grid;
                        return { ...prev, frames: newFrames };
                    });
                    break;
            }
            await sleep(100); // Small delay to visualize the actions
        }
        alert(`Macro finished.`);
    };

    const runScript = async (script: Script): Promise<{ success: boolean; logs: string[] }> => {
        let logs: string[] = [];
        try {
            const tempGrid = JSON.parse(JSON.stringify(activeLayer.grid));
            
            const api = {
                log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                sleep,
                getCanvasSize: () => ({ ...canvasSize }),
                getPixel: (x: number, y: number) => {
                    if (y >= 0 && y < canvasSize.height && x >= 0 && x < canvasSize.width) return tempGrid[y][x];
                    return undefined;
                },
                setPixel: (x: number, y: number, color: string) => {
                    if (y >= 0 && y < canvasSize.height && x >= 0 && x < canvasSize.width) tempGrid[y][x] = color;
                },
                getGrid: () => JSON.parse(JSON.stringify(tempGrid)),
                setGrid: (newGrid: string[][]) => {
                    if (newGrid.length === canvasSize.height && newGrid[0].length === canvasSize.width) {
                        for(let y=0; y<canvasSize.height; y++) for(let x=0; x<canvasSize.width; x++) tempGrid[y][x] = newGrid[y][x];
                    } else {
                        throw new Error("Grid dimensions must match canvas size.");
                    }
                },
                getPrimaryColor: () => primaryColor,
                setPrimaryColor: (c: string) => _setPrimaryColor(c),
                getActiveLayerIndex: () => activeLayerIndex,
            };

            logs.push(`Executing script: ${script.name}...`);
            const userScript = new Function('api', `return (async () => { ${script.code} })();`);
            await userScript(api);

            updateProjectState(prev => {
                const newFrames = JSON.parse(JSON.stringify(prev.frames));
                newFrames[activeFrameIndex].layers[activeLayerIndex].grid = tempGrid;
                return { ...prev, frames: newFrames };
            });
            logs.push('Script finished successfully.');
            return { success: true, logs };

        } catch (e: any) {
            console.error("Script execution error:", e);
            logs.push(`Error: ${e.message}`);
            return { success: false, logs };
        }
    };
    
    // --- Project and Version Control Handlers ---

    const handleNewProject = () => {
        if (window.confirm("Are you sure? Any unsaved changes will be lost.")) {
            const newState = createInitialProjectState(32, 32);
            setProjectState(newState);
            setCurrentProject(null);
            setVersionHistory(null);
            setSessionHistory([newState]);
            setSessionHistoryIndex(0);
            setActiveFrameIndex(0);
            setActiveLayerIndex(0);
        }
    };

    const handleSaveProjectAs = (projectName: string) => {
        const initialCommitId = uuidv4();
        const initialCommit: Commit = {
            id: initialCommitId,
            parentId: null,
            timestamp: Date.now(),
            message: 'Initial commit',
            projectState,
        };
        const newHistory: VersionHistory = {
            commits: { [initialCommitId]: initialCommit },
            branches: { 'main': { name: 'main', commitId: initialCommitId } },
            currentBranch: 'main'
        };
        storage.saveProject(projectName, newHistory);
        setCurrentProject(projectName);
        setVersionHistory(newHistory);
        alert(`Project "${projectName}" saved!`);
    };

    const handleLoadProject = (projectName: string) => {
        if (window.confirm(`Load "${projectName}"? Any unsaved changes will be lost.`)) {
            const history = storage.loadProject(projectName);
            if (history) {
                const currentBranch = history.branches[history.currentBranch];
                const headCommit = history.commits[currentBranch.commitId];
                
                setVersionHistory(history);
                setProjectState(headCommit.projectState);
                setCurrentProject(projectName);
                
                // Reset session state
                setSessionHistory([headCommit.projectState]);
                setSessionHistoryIndex(0);
                setActiveFrameIndex(0);
                setActiveLayerIndex(0);
            } else {
                alert(`Could not load project "${projectName}".`);
            }
        }
    };

    const handleCommit = (message: string) => {
        if (!currentProject || !versionHistory) {
            alert("Please save the project first before making a commit.");
            handleOpenWindow(WindowType.FILE_BROWSER);
            return;
        }
    
        const currentBranch = versionHistory.branches[versionHistory.currentBranch];
        const parentId = currentBranch.commitId;
        
        const newCommitId = uuidv4();
        const newCommit: Commit = {
            id: newCommitId,
            parentId,
            timestamp: Date.now(),
            message,
            projectState,
        };
    
        const newHistory: VersionHistory = {
            ...versionHistory,
            commits: { ...versionHistory.commits, [newCommitId]: newCommit },
            branches: {
                ...versionHistory.branches,
                [versionHistory.currentBranch]: { ...currentBranch, commitId: newCommitId }
            }
        };
    
        storage.saveProject(currentProject, newHistory);
        setVersionHistory(newHistory);
        alert("Changes committed!");
    };

    const handleCheckout = (commitId: string) => {
        if (!versionHistory) return;
        const commit = versionHistory.commits[commitId];
        if (commit) {
            updateProjectState(commit.projectState, true);
            setActiveFrameIndex(0);
            setActiveLayerIndex(0);
        }
    };

    const handleBranch = (newBranchName: string) => {
        if (!currentProject || !versionHistory) return;
        if (versionHistory.branches[newBranchName]) {
            alert(`Branch "${newBranchName}" already exists.`);
            return;
        }
        const currentBranch = versionHistory.branches[versionHistory.currentBranch];
        const newHistory: VersionHistory = {
            ...versionHistory,
            branches: {
                ...versionHistory.branches,
                [newBranchName]: { name: newBranchName, commitId: currentBranch.commitId }
            },
            currentBranch: newBranchName,
        };
        storage.saveProject(currentProject, newHistory);
        setVersionHistory(newHistory);
    };

    const handleSwitchBranch = (branchName: string) => {
        if (!currentProject || !versionHistory || !versionHistory.branches[branchName]) return;
        
        const branch = versionHistory.branches[branchName];
        const commit = versionHistory.commits[branch.commitId];

        const newHistory = { ...versionHistory, currentBranch: branchName };
        storage.saveProject(currentProject, newHistory);
        setVersionHistory(newHistory);
        setProjectState(commit.projectState);
        setSessionHistory([commit.projectState]);
        setSessionHistoryIndex(0);
        setActiveFrameIndex(0);
        setActiveLayerIndex(0);
    };

    // --- Asset Handlers ---
    const handleSaveAsset = async (asset: Omit<Asset, 'id' | 'createdAt' | 'preview'>) => {
        let preview = '';
        if (asset.type === 'sprite') {
            const layer = createEmptyLayer(canvasSize.width, canvasSize.height);
            layer.grid = asset.data;
            preview = await layerToDataUrl(layer, canvasSize.width, canvasSize.height);
        }

        const newAsset: Asset = {
            ...asset,
            id: uuidv4(),
            createdAt: Date.now(),
            preview,
        };
        storage.saveAsset(newAsset);
        setAssets(storage.loadAllAssets());
    };
    
    const handleAddSpriteToCanvas = (asset: Asset) => {
        if (asset.type !== 'sprite') return;
        const newLayer = createEmptyLayer(canvasSize.width, canvasSize.height, asset.name);
        newLayer.grid = asset.data;
        
        updateProjectState(prev => {
            const newFrames: Frame[] = JSON.parse(JSON.stringify(prev.frames));
            const newLayerIndex = activeLayerIndex + 1;
            newFrames[activeFrameIndex].layers.splice(newLayerIndex, 0, newLayer);
            setActiveLayerIndex(newLayerIndex);
            return { ...prev, frames: newFrames };
        });
    };

    const handleApplyPalette = (asset: Asset) => {
        if (asset.type !== 'palette') return;
        setPalette(asset.data);
    };
    
    const handleDeleteAsset = (assetId: string) => {
        if (window.confirm("Are you sure you want to delete this asset?")) {
            storage.deleteAsset(assetId);
            setAssets(storage.loadAllAssets());
        }
    };

    const handleLayerGridCommit = useCallback((layerIndex: number, finalGrid: string[][]) => {
        recordAction({ type: 'SET_LAYER_GRID', payload: { layerIndex, grid: finalGrid } });
        updateProjectState(prev => {
            const newFrames = JSON.parse(JSON.stringify(prev.frames));
            newFrames[activeFrameIndex].layers[layerIndex].grid = finalGrid;
            return { ...prev, frames: newFrames };
        });
    }, [activeFrameIndex, recordAction]);

    const handleCanvasSizeChange = (newWidth: number, newHeight: number) => {
        const newState = createInitialProjectState(newWidth, newHeight);
        setProjectState(newState);
        // This is a new project, so we should clear the project name and version history.
        setCurrentProject(null);
        setVersionHistory(null);
        setSessionHistory([newState]);
        setSessionHistoryIndex(0);
        setActiveFrameIndex(0);
        setActiveLayerIndex(0);
    };

    const handleOpenWindow = (windowType: WindowType) => {
        if (windowType === WindowType.AI_CHAT) {
            setIsAiPanelOpen(true);
            setIsStartMenuOpen(false);
            return;
        }
        setOpenWindows(prev => ({ ...prev, [windowType]: true }));
        setIsStartMenuOpen(false);
    };

    const handleCloseWindow = (windowType: WindowType) => {
        setOpenWindows(prev => ({ ...prev, [windowType]: false }));
    };
    
    // Frame handlers
    const handleAddFrame = () => {
        const newFrame = createInitialFrame(canvasSize.width, canvasSize.height);
        updateProjectState(prev => ({ ...prev, frames: [...prev.frames, newFrame]}));
        setActiveFrameIndex(frames.length);
    };

    const handleDeleteFrame = (index: number) => {
        if (frames.length <= 1) return;
        updateProjectState(prev => {
            const newFrames = prev.frames.filter((_, i) => i !== index);
            setActiveFrameIndex(p => Math.max(0, Math.min(p, newFrames.length - 1)));
            return { ...prev, frames: newFrames };
        });
    };

    const handleDuplicateFrame = (index: number) => {
        updateProjectState(prev => {
            const newFrames = JSON.parse(JSON.stringify(prev.frames));
            const frameToDuplicate = newFrames[index];
            const duplicatedFrame = {
                ...frameToDuplicate,
                layers: frameToDuplicate.layers.map((layer: Layer) => ({ ...layer, id: uuidv4() }))
            };
            newFrames.splice(index + 1, 0, duplicatedFrame);
            setActiveFrameIndex(index + 1);
            return { ...prev, frames: newFrames };
        });
    };

    const handleReorderFrames = (sourceIndex: number, destIndex: number) => {
        updateProjectState(prev => {
            const newFrames = [...prev.frames];
            const [removed] = newFrames.splice(sourceIndex, 1);
            newFrames.splice(destIndex, 0, removed);
            setActiveFrameIndex(destIndex);
            return { ...prev, frames: newFrames };
        });
    };

    const handleSelectFrame = (index: number) => {
        setActiveFrameIndex(index);
        setActiveLayerIndex(0);
    };

    const handleAttachSfxToFrame = (frameIndex: number, assetId: string | null) => {
        updateProjectState(prev => {
            const newFrames = JSON.parse(JSON.stringify(prev.frames));
            newFrames[frameIndex].sfxAssetId = assetId === null ? undefined : assetId;
            return { ...prev, frames: newFrames };
        });
    };

    // Layer Handlers
    const handleAddLayer = () => {
        recordAction({ type: 'ADD_LAYER', payload: null });
        updateProjectState(prev => {
            const newFrames: Frame[] = JSON.parse(JSON.stringify(prev.frames));
            const newLayer = createEmptyLayer(canvasSize.width, canvasSize.height, `Layer ${currentLayers.length + 1}`);
            newFrames[activeFrameIndex].layers.splice(activeLayerIndex + 1, 0, newLayer);
            setActiveLayerIndex(activeLayerIndex + 1);
            return { ...prev, frames: newFrames };
        });
    };

    const handleDeleteLayer = () => {
        if (currentLayers.length <= 1) return;
        updateProjectState(prev => {
            const newFrames: Frame[] = JSON.parse(JSON.stringify(prev.frames));
            newFrames[activeFrameIndex].layers.splice(activeLayerIndex, 1);
            setActiveLayerIndex(p => Math.max(0, p - 1));
            return { ...prev, frames: newFrames };
        });
    };

    const handleDuplicateLayer = () => {
        updateProjectState(prev => {
            const newFrames: Frame[] = JSON.parse(JSON.stringify(prev.frames));
            const layerToDuplicate = newFrames[activeFrameIndex].layers[activeLayerIndex];
            const duplicatedLayer = { ...layerToDuplicate, id: uuidv4(), name: `${layerToDuplicate.name} Copy` };
            newFrames[activeFrameIndex].layers.splice(activeLayerIndex + 1, 0, duplicatedLayer);
            setActiveLayerIndex(activeLayerIndex + 1);
            return { ...prev, frames: newFrames };
        });
    };
    
    const handleMergeLayerDown = () => {
        if (activeLayerIndex === 0) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        updateProjectState(prev => {
            const newFrames: Frame[] = JSON.parse(JSON.stringify(prev.frames));
            const currentFrameLayers = newFrames[activeFrameIndex].layers;
            const topLayer = currentFrameLayers[activeLayerIndex];
            const bottomLayer = currentFrameLayers[activeLayerIndex - 1];

            // 1. Draw bottom layer
            for (let y = 0; y < canvasSize.height; y++) for (let x = 0; x < canvasSize.width; x++) { ctx.fillStyle = bottomLayer.grid[y][x]; ctx.fillRect(x, y, 1, 1); }
            // 2. Draw top layer
            ctx.globalAlpha = topLayer.opacity;
            ctx.globalCompositeOperation = (topLayer.blendMode === BlendMode.NORMAL ? 'source-over' : topLayer.blendMode) as GlobalCompositeOperation;
            for (let y = 0; y < canvasSize.height; y++) for (let x = 0; x < canvasSize.width; x++) { ctx.fillStyle = topLayer.grid[y][x]; ctx.fillRect(x, y, 1, 1); }
            // 3. Read back merged data
            const mergedGrid = createEmptyGrid(canvasSize.width, canvasSize.height);
            const imageData = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height).data;
            for (let i = 0; i < imageData.length; i += 4) {
                const x = (i / 4) % canvasSize.width;
                const y = Math.floor((i / 4) / canvasSize.width);
                if (imageData[i + 3] > 0) mergedGrid[y][x] = `rgba(${imageData[i]}, ${imageData[i+1]}, ${imageData[i+2]}, ${imageData[i+3]/255})`;
            }
            bottomLayer.grid = mergedGrid;
            currentFrameLayers.splice(activeLayerIndex, 1);
            setActiveLayerIndex(prev => prev - 1);
            return { ...prev, frames: newFrames };
        });
    };

    const handleReorderLayers = (sourceIndex: number, destIndex: number) => {
        updateProjectState(prev => {
            const newFrames: Frame[] = JSON.parse(JSON.stringify(prev.frames));
            const layers = newFrames[activeFrameIndex].layers;
            const [removed] = layers.splice(sourceIndex, 1);
            layers.splice(destIndex, 0, removed);
            setActiveLayerIndex(destIndex);
            return { ...prev, frames: newFrames };
        });
    };

    const handleSelectLayer = (index: number) => {
        recordAction({ type: 'SELECT_LAYER', payload: index });
        setActiveLayerIndex(index);
    };

    const handleUpdateLayerProps = (layerIndex: number, newProps: Partial<Layer>) => {
        updateProjectState(prev => {
            const newFrames: Frame[] = JSON.parse(JSON.stringify(prev.frames));
            const layer = newFrames[activeFrameIndex].layers[layerIndex];
            newFrames[activeFrameIndex].layers[layerIndex] = { ...layer, ...newProps };
            return { ...prev, frames: newFrames };
        }, false);
    };
    
    const handleCommitLayerProps = () => {
        // Pushes the current state to session history after a property change is "finalized"
        const newHistory = sessionHistory.slice(0, sessionHistoryIndex + 1);
        newHistory.push(projectState);
        setSessionHistory(newHistory);
        setSessionHistoryIndex(newHistory.length - 1);
    }

    // Zoom handlers
    const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 10));
    const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
    const handleResetZoom = () => setZoom(1);

    const imageToGrid = (img: HTMLImageElement): string[][] => {
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return createEmptyGrid(canvasSize.width, canvasSize.height);
        ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
        
        const newGrid = createEmptyGrid(canvasSize.width, canvasSize.height);
        for (let y = 0; y < canvasSize.height; y++) {
            for (let x = 0; x < canvasSize.width; x++) {
                const pixel = ctx.getImageData(x, y, 1, 1).data;
                if (pixel[3] > 0) newGrid[y][x] = `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3] / 255})`;
            }
        }
        return newGrid;
    };
    
    // AI Handlers
    const handleGenerateArt = async (prompt: string, artMode: string, image?: { base64: string; mimeType: string; }, styleGuide?: string) => {
        const base64Image = await aiService.generatePixelArt(prompt, artMode, canvasSize.width, image, styleGuide);
        if (base64Image) {
            const img = new Image();
            img.onload = () => {
                const newGrid = imageToGrid(img);
                updateProjectState(prev => {
                    const newFrames = JSON.parse(JSON.stringify(prev.frames));
                    newFrames[activeFrameIndex].layers[activeLayerIndex].grid = newGrid;
                    return { ...prev, frames: newFrames };
                });
            };
            img.src = `data:image/png;base64,${base64Image}`;
        }
    };

    const handleGenerateAnimation = async (prompt: string) => {
        const spriteSheetBase64 = await aiService.generateAnimation(prompt, canvasSize.width, canvasSize.height);
        if (spriteSheetBase64) {
            const frameDataUrls = await sliceSpriteSheet(spriteSheetBase64, canvasSize.width, canvasSize.height);
            const newFrames: Frame[] = [];
            for (const dataUrl of frameDataUrls) {
                const img = new Image();
                await new Promise(resolve => { img.onload = resolve; img.src = dataUrl; });
                const grid = imageToGrid(img);
                const layer = createEmptyLayer(canvasSize.width, canvasSize.height, 'Layer 1');
                layer.grid = grid;
                newFrames.push({ layers: [layer] });
            }
            if (newFrames.length > 0) {
                updateProjectState(prev => ({...prev, frames: newFrames }));
                setActiveFrameIndex(0); setActiveLayerIndex(0);
            }
        }
    };

    const handleGenerateInbetweens = async (frameCount: number) => {
        if (activeFrameIndex < 1) return alert("Select a frame with a previous frame.");
        const startFrame = frames[activeFrameIndex - 1];
        const endFrame = frames[activeFrameIndex];
        const startFrameBase64 = await frameToBase64(startFrame, canvasSize.width, canvasSize.height);
        const endFrameBase64 = await frameToBase64(endFrame, canvasSize.width, canvasSize.height);
        const inbetweenSpriteSheet = await aiService.generateInbetweens(startFrameBase64, endFrameBase64, frameCount);
        if (inbetweenSpriteSheet) {
            const frameDataUrls = await sliceSpriteSheet(inbetweenSpriteSheet, canvasSize.width, canvasSize.height);
            const newFrames: Frame[] = [];
            for (const dataUrl of frameDataUrls) {
                const img = new Image();
                await new Promise(resolve => { img.onload = resolve; img.src = dataUrl; });
                const grid = imageToGrid(img);
                const layer = createEmptyLayer(canvasSize.width, canvasSize.height, 'Layer 1');
                layer.grid = grid;
                newFrames.push({ layers: [layer] });
            }
            if (newFrames.length > 0) {
                updateProjectState(prev => {
                    const framesCopy = [...prev.frames];
                    framesCopy.splice(activeFrameIndex, 0, ...newFrames);
                    setActiveFrameIndex(activeFrameIndex + newFrames.length);
                    return { ...prev, frames: framesCopy };
                });
            }
        }
    };

    const handleGenerateFx = async (prompt: string) => {
        const fxImageBase64 = await aiService.generateFx(prompt, canvasSize.width, canvasSize.height);
        if (fxImageBase64) {
            const img = new Image();
            img.onload = () => {
                const newGrid = imageToGrid(img);
                const newLayer = createEmptyLayer(canvasSize.width, canvasSize.height, `FX: ${prompt.substring(0, 15)}...`);
                newLayer.grid = newGrid;
                updateProjectState(prev => {
                    const newFrames = JSON.parse(JSON.stringify(prev.frames));
                    const newLayerIndex = activeLayerIndex + 1;
                    newFrames[activeFrameIndex].layers.splice(newLayerIndex, 0, newLayer);
                    setActiveLayerIndex(newLayerIndex);
                    return { ...prev, frames: newFrames };
                });
            };
            img.src = `data:image/png;base64,${fxImageBase64}`;
        }
    };

    const handleAnalyzeStyle = async (name: string, source: { type: 'project'; data: ProjectState } | { type: 'assets'; data: Asset[] }): Promise<void> => {
        let images: { base64: string, mimeType: string }[] = [];
        if (source.type === 'project') {
            const projectFrames = source.data.frames.slice(0, 10); // Limit to 10 frames
            for (const frame of projectFrames) {
                const b64 = await frameToBase64(frame, source.data.canvasSize.width, source.data.canvasSize.height);
                images.push({ base64: b64, mimeType: 'image/png' });
            }
        } else { // assets
            for (const asset of source.data) {
                if(asset.preview) {
                    images.push({ base64: asset.preview.split(',')[1], mimeType: 'image/png' });
                }
            }
        }

        if (images.length === 0) {
            alert("No images found to analyze.");
            return;
        }

        const styleGuide = await aiService.analyzeArtStyle(images);
        if (styleGuide) {
            await handleSaveAsset({
                name,
                type: 'style',
                tags: ['style', ...name.toLowerCase().split(' ')],
                data: styleGuide
            });
            alert(`Style "${name}" learned and saved!`);
        } else {
            alert("Could not analyze style from the provided source.");
        }
    };
    
    const handleApplyShadingLayer = (grid: string[][], name: string) => {
        updateProjectState(prev => {
            const newFrames: Frame[] = JSON.parse(JSON.stringify(prev.frames));
            const newLayer = createEmptyLayer(canvasSize.width, canvasSize.height, name);
            newLayer.grid = grid;
            newLayer.blendMode = BlendMode.OVERLAY;
            const newLayerIndex = activeLayerIndex + 1;
            newFrames[activeFrameIndex].layers.splice(newLayerIndex, 0, newLayer);
            setActiveLayerIndex(newLayerIndex);
            return { ...prev, frames: newFrames };
        });
    };

    const handleImportSeparatedLayersAsNewProject = (layers: { name: string, grid: string[][] }[], size: { width: number, height: number }) => {
        if (window.confirm("This will create a new project with the separated layers, replacing your current work. Are you sure?")) {
            const newLayers: Layer[] = layers.map(l => ({
                id: uuidv4(),
                name: l.name,
                grid: l.grid,
                isVisible: true,
                opacity: 1,
                blendMode: BlendMode.NORMAL,
            }));

            // Reverse to put background at the bottom of the stack
            newLayers.reverse();
    
            const newFrame: Frame = { layers: newLayers };
            const newState: ProjectState = {
                canvasSize: size,
                frames: [newFrame],
            };
            
            setProjectState(newState);
            setCurrentProject(null);
            setVersionHistory(null);
            setSessionHistory([newState]);
            setSessionHistoryIndex(0);
            setActiveFrameIndex(0);
            setActiveLayerIndex(newLayers.length > 0 ? newLayers.length - 1 : 0); // Select the top layer
        }
    };

    // Canvas Toolbar Handlers
    const handleUndo = () => {
        if (canUndo) {
            const newIndex = sessionHistoryIndex - 1;
            setSessionHistoryIndex(newIndex);
            setProjectState(sessionHistory[newIndex]);
        }
    };
    
    const handleRedo = () => {
        if (canRedo) {
            const newIndex = sessionHistoryIndex + 1;
            setSessionHistoryIndex(newIndex);
            setProjectState(sessionHistory[newIndex]);
        }
    };

    const handleClearCanvas = () => {
        updateProjectState(prev => {
            const newGrid = createEmptyGrid(canvasSize.width, canvasSize.height);
            const newFrames = JSON.parse(JSON.stringify(prev.frames));
            newFrames[activeFrameIndex].layers[activeLayerIndex].grid = newGrid;
            return { ...prev, frames: newFrames };
        });
    };

    const handleCaptureVisualizerFrame = (grid: string[][]) => {
        const newLayer = createEmptyLayer(canvasSize.width, canvasSize.height, `Viz Capture ${Date.now()}`);
        
        // Resize captured grid to canvas size if different
        const capturedWidth = grid[0]?.length || 0;
        const capturedHeight = grid.length || 0;
        
        if (capturedWidth === canvasSize.width && capturedHeight === canvasSize.height) {
             newLayer.grid = grid;
        } else {
            // Basic nearest-neighbor scaling
            for(let y=0; y < canvasSize.height; y++){
                for(let x=0; x < canvasSize.width; x++){
                    const srcX = Math.floor(x * capturedWidth / canvasSize.width);
                    const srcY = Math.floor(y * capturedHeight / canvasSize.height);
                    newLayer.grid[y][x] = grid[srcY]?.[srcX] || 'transparent';
                }
            }
        }

        updateProjectState(prev => {
            const newFrames = JSON.parse(JSON.stringify(prev.frames));
            const newLayerIndex = activeLayerIndex + 1;
            newFrames[activeFrameIndex].layers.splice(newLayerIndex, 0, newLayer);
            setActiveLayerIndex(newLayerIndex);
            return { ...prev, frames: newFrames };
        });
    };
    
    const handleSettingsSave = (newSettings: AISettings) => {
        setAiSettings(newSettings);
        storage.saveAISettings(newSettings);
    };

    const previousFrame = isOnionSkinningOn && activeFrameIndex > 0 ? frames[activeFrameIndex - 1] : null;
    const nextFrame = isOnionSkinningOn && activeFrameIndex < frames.length - 1 ? frames[activeFrameIndex + 1] : null;
    
    // Effects styles
    const effectsStyle: React.CSSProperties = {
        width: '100%', height: '100%', overflow: 'hidden', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    };
    const canvasWrapperStyle: React.CSSProperties = {
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.2s ease-out', filter: '',
    };
    if (filterSettings.crt.enabled) {
        const intensity = filterSettings.crt.intensity / 100;
        canvasWrapperStyle.transform = `scale(${1 - intensity * 0.1}, ${1 - intensity * 0.15})`;
        canvasWrapperStyle.borderRadius = `${intensity * 40}% / ${intensity * 50}%`;
        effectsStyle.boxShadow = `inset 0 0 ${intensity * 40}px 10px rgba(0,0,0,0.8)`;
    }
    if (filterSettings.bloom.enabled) {
        canvasWrapperStyle.filter += ` brightness(${1 + (filterSettings.bloom.intensity/10) * 0.03}) drop-shadow(0 0 ${filterSettings.bloom.intensity/10}px rgba(255, 255, 255, 0.3))`;
    }
    if (filterSettings.chromaticAberration.enabled) canvasWrapperStyle.filter += ` url(#chromatic-aberration)`;

    return (
        <div className="bg-[#0a0a1f] text-white font-mono h-screen w-screen overflow-hidden flex flex-col">
            <SynthwaveBackground />
            
            <AiChatPanel
                isOpen={isAiPanelOpen}
                onToggle={() => setIsAiPanelOpen(!isAiPanelOpen)}
                onGenerateArt={handleGenerateArt}
                onGenerateAnimation={handleGenerateAnimation}
                onGenerateFx={handleGenerateFx}
                onGetPromptSuggestions={aiService.getPromptSuggestions}
                assets={assets}
                activeStyleProfile={activeStyleProfile}
                onSetActiveStyleProfile={setActiveStyleProfile}
                unlockAchievement={unlockAchievement}
            />

            <main className="flex-grow flex items-center justify-center relative overflow-auto">
                 <div style={effectsStyle}>
                    {filterSettings.chromaticAberration.enabled && (
                        <svg style={{ position: 'absolute', height: 0, width: 0, overflow: 'hidden' }}>
                            <defs>
                                <filter id="chromatic-aberration">
                                    <feOffset in="SourceGraphic" dx={filterSettings.chromaticAberration.intensity} dy="0" result="R"/>
                                    <feColorMatrix in="R" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="R2"/>
                                    <feOffset in="SourceGraphic" dx={-filterSettings.chromaticAberration.intensity} dy="0" result="B"/>
                                    <feColorMatrix in="B" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="B2"/>
                                    <feBlend in="R2" in2="B2" mode="screen"/>
                                </filter>
                            </defs>
                        </svg>
                    )}
                    <div style={canvasWrapperStyle}>
                        {isTiledMode && (
                            <div className="absolute inset-0 bg-repeat" style={{ backgroundImage: `url(${tileDataUrl})`, backgroundSize: `${canvasSize.width * 2}px ${canvasSize.height * 2}px`, imageRendering: 'pixelated' }} />
                        )}
                        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
                            <GridCanvas
                                ref={gridElementRef}
                                layers={currentLayers}
                                activeLayerIndex={activeLayerIndex}
                                width={canvasSize.width}
                                height={canvasSize.height}
                                onLayerGridChange={handleLayerGridCommit}
                                selectedTool={selectedTool}
                                primaryColor={primaryColor}
                                secondaryColor={secondaryColor}
                                onPrimaryColorChange={setPrimaryColor}
                                brushSize={brushSize}
                                onNew={handleNewProject}
                                onClear={handleClearCanvas}
                                onUndo={handleUndo}
                                onRedo={handleRedo}
                                canUndo={canUndo}
                                canRedo={canRedo}
                                gridSettings={gridSettings}
                                isOnionSkinningOn={isOnionSkinningOn}
                                previousFrameLayers={previousFrame?.layers || null}
                                nextFrameLayers={nextFrame?.layers || null}
                                guides={guides}
                                guideSettings={guideSettings}
                                onGuidesChange={setGuides}
                                onOpenWindow={handleOpenWindow}
                                unlockAchievement={unlockAchievement}
                            />
                        </div>
                    </div>
                     {filterSettings.scanlines.enabled && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', background: `repeating-linear-gradient(to bottom, rgba(12,12,32,${filterSettings.scanlines.opacity}), rgba(12,12,32,${filterSettings.scanlines.opacity}) ${filterSettings.scanlines.density}px, transparent ${filterSettings.scanlines.density}px, transparent ${filterSettings.scanlines.density * 2}px)`, mixBlendMode: 'overlay' }} />
                    )}
                </div>
            </main>

            <Toolbox
                isOpen={isToolboxOpen}
                onToggle={() => setIsToolboxOpen(!isToolboxOpen)}
                tools={TOOLS}
                selectedTool={selectedTool}
                onToolSelect={setSelectedTool}
                primaryColor={primaryColor}
                onPrimaryColorChange={setPrimaryColor}
                secondaryColor={secondaryColor}
                onSecondaryColorChange={setSecondaryColor}
                resolutions={RESOLUTIONS}
                canvasSize={canvasSize}
                onCanvasSizeChange={handleCanvasSizeChange}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                gridSettings={gridSettings}
                onGridSettingsChange={setGridSettings}
                isTiledMode={isTiledMode}
                onTiledModeChange={setIsTiledMode}
                palette={palette}
                onOpenWindow={handleOpenWindow}
                guideSettings={guideSettings}
                onGuideSettingsChange={setGuideSettings}
                onClearGuides={() => setGuides({ horizontal: [], vertical: [] })}
            />
            
            {openWindows[WindowType.ANIMATION_TIMELINE] && (
                <AnimationPanel title={WindowType.ANIMATION_TIMELINE} onClose={() => handleCloseWindow(WindowType.ANIMATION_TIMELINE)} frames={frames} activeFrameIndex={activeFrameIndex} onAddFrame={handleAddFrame} onDeleteFrame={handleDeleteFrame} onSelectFrame={handleSelectFrame} onDuplicateFrame={handleDuplicateFrame} onReorderFrames={handleReorderFrames} width={canvasSize.width} height={canvasSize.height} isPlaying={isPlaying} onPlayToggle={() => setIsPlaying(!isPlaying)} fps={fps} onFpsChange={setFps} isOnionSkinningOn={isOnionSkinningOn} onOnionSkinningToggle={() => setIsOnionSkinningOn(!isOnionSkinningOn)} onGenerateInbetweens={handleGenerateInbetweens} assets={assets} onAttachSfxToFrame={handleAttachSfxToFrame} unlockAchievement={unlockAchievement} />
            )}
             {openWindows[WindowType.LAYERS] && (
                <LayersWindow title={WindowType.LAYERS} onClose={() => handleCloseWindow(WindowType.LAYERS)} layers={currentLayers} activeLayerIndex={activeLayerIndex} onSelectLayer={handleSelectLayer} onAddLayer={handleAddLayer} onDeleteLayer={handleDeleteLayer} onDuplicateLayer={handleDuplicateLayer} onMergeLayerDown={handleMergeLayerDown} onUpdateLayerProps={handleUpdateLayerProps} onCommitLayerProps={handleCommitLayerProps} onReorderLayers={handleReorderLayers} width={canvasSize.width} height={canvasSize.height} onSaveLayerAsAsset={(name, tags) => handleSaveAsset({ name, tags, type: 'sprite', data: activeLayer.grid })} />
            )}
            {openWindows[WindowType.EXPORT] && (
                <ExportWindow title={WindowType.EXPORT} onClose={() => handleCloseWindow(WindowType.EXPORT)} gridElementRef={gridElementRef} frames={frames} fps={fps} width={canvasSize.width} height={canvasSize.height} unlockAchievement={unlockAchievement} />
            )}
            {openWindows[WindowType.AI_PALETTE] && (
                <AiPaletteWindow title={WindowType.AI_PALETTE} onClose={() => handleCloseWindow(WindowType.AI_PALETTE)} onSetPalette={setPalette} onSavePaletteAsAsset={(name, tags, palette) => handleSaveAsset({ name, tags, type: 'palette', data: palette })} onGeneratePalette={aiService.generatePalette} unlockAchievement={unlockAchievement} />
            )}
            {openWindows[WindowType.AI_UPSCALE] && (
                <AiUpscalingWindow title={WindowType.AI_UPSCALE} onClose={() => handleCloseWindow(WindowType.AI_UPSCALE)} gridElementRef={gridElementRef} onUpscaleImage={aiService.upscaleImage} />
            )}
            {openWindows[WindowType.AI_SPRITE_SHEET] && (
                <AiSpriteSheetWindow title={WindowType.AI_SPRITE_SHEET} onClose={() => handleCloseWindow(WindowType.AI_SPRITE_SHEET)} gridElementRef={gridElementRef} onEditSpriteSheet={aiService.editSpriteSheet} onGenerateDirectionalSpriteSheet={aiService.generateDirectionalSpriteSheet} />
            )}
             {openWindows[WindowType.FILTERS] && (
                <FiltersWindow title={WindowType.FILTERS} onClose={() => handleCloseWindow(WindowType.FILTERS)} filters={filterSettings} onFiltersChange={setFilterSettings} onReset={() => setFilterSettings(initialFilterSettings)} onOpenWindow={handleOpenWindow} />
            )}
            {openWindows[WindowType.PREVIEW] && (
                <PreviewWindow title={WindowType.PREVIEW} onClose={() => handleCloseWindow(WindowType.PREVIEW)} frames={frames} width={canvasSize.width} height={canvasSize.height} isPlaying={isPlaying} fps={fps} filters={filterSettings} assets={assets} />
            )}
             {openWindows[WindowType.REFERENCE_IMAGE] && (
                <ReferenceImageWindow title={WindowType.REFERENCE_IMAGE} onClose={() => handleCloseWindow(WindowType.REFERENCE_IMAGE)} />
            )}
            {openWindows[WindowType.FILE_BROWSER] && (
                <FileBrowserWindow title={WindowType.FILE_BROWSER} onClose={() => handleCloseWindow(WindowType.FILE_BROWSER)} projects={storage.listProjects()} onSaveProjectAs={handleSaveProjectAs} onLoadProject={handleLoadProject} onDeleteProject={storage.deleteProject} assets={assets} onAddSpriteToCanvas={handleAddSpriteToCanvas} onApplyPalette={handleApplyPalette} onDeleteAsset={handleDeleteAsset} />
            )}
            {openWindows[WindowType.VERSION_CONTROL] && (
                 <VersionControlWindow title={WindowType.VERSION_CONTROL} onClose={() => handleCloseWindow(WindowType.VERSION_CONTROL)} history={versionHistory} onCommit={handleCommit} onCheckout={handleCheckout} onBranch={handleBranch} onSwitchBranch={handleSwitchBranch} />
            )}
            {openWindows[WindowType.MACROS_AND_SCRIPTS] && (
                <MacrosAndScriptsWindow
                    title={WindowType.MACROS_AND_SCRIPTS}
                    onClose={() => handleCloseWindow(WindowType.MACROS_AND_SCRIPTS)}
                    isRecording={isRecordingMacro}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                    onSaveMacro={handleSaveMacro}
                    onPlayMacro={handlePlayMacro}
                    onSaveScript={(script) => handleSaveAsset({ name: script.name, type: 'script', tags: ['script'], data: script })}
                    onRunScript={runScript}
                    onDeleteAsset={handleDeleteAsset}
                    assets={assets}
                />
            )}
            {openWindows[WindowType.AI_STYLE_TUNER] && (
                <AiStyleTunerWindow
                    title={WindowType.AI_STYLE_TUNER}
                    onClose={() => handleCloseWindow(WindowType.AI_STYLE_TUNER)}
                    assets={assets}
                    currentProjectState={projectState}
                    onAnalyzeStyle={handleAnalyzeStyle}
                    onDeleteAsset={handleDeleteAsset}
                    activeStyleProfile={activeStyleProfile}
                    onSetActiveStyleProfile={setActiveStyleProfile}
                />
            )}
            {openWindows[WindowType.AI_AUTO_SHADING] && (
                <AiAutoShadingWindow
                    title={WindowType.AI_AUTO_SHADING}
                    onClose={() => handleCloseWindow(WindowType.AI_AUTO_SHADING)}
                    activeLayer={activeLayer}
                    canvasSize={canvasSize}
                    onApplyShadingLayer={handleApplyShadingLayer}
                    onGenerateShading={aiService.generateShading}
                />
            )}
            {openWindows[WindowType.AI_LAYER_SEPARATION] && (
                <AiLayerSeparationWindow
                    title={WindowType.AI_LAYER_SEPARATION}
                    onClose={() => handleCloseWindow(WindowType.AI_LAYER_SEPARATION)}
                    onImportAsNewProject={handleImportSeparatedLayersAsNewProject}
                    onSeparateLayers={aiService.separateImageLayers}
                />
            )}
             {openWindows[WindowType.CHIPTUNE_SFX] && (
                <ChiptuneSfxWindow
                    title={WindowType.CHIPTUNE_SFX}
                    onClose={() => handleCloseWindow(WindowType.CHIPTUNE_SFX)}
                    onSaveSfxAsAsset={(name, tags, data) => handleSaveAsset({ name, tags, type: 'sfx', data })}
                    unlockAchievement={unlockAchievement}
                />
            )}
            {openWindows[WindowType.MUSIC_VISUALIZER] && (
                <MusicVisualizerWindow
                    title={WindowType.MUSIC_VISUALIZER}
                    onClose={() => handleCloseWindow(WindowType.MUSIC_VISUALIZER)}
                    palette={palette}
                    onCaptureFrame={handleCaptureVisualizerFrame}
                />
            )}
             {openWindows[WindowType.TUTORIALS] && (
                <TutorialsWindow title={WindowType.TUTORIALS} onClose={() => handleCloseWindow(WindowType.TUTORIALS)} onStartTutorial={handleStartTutorial} />
            )}
            {openWindows[WindowType.DAILY_CHALLENGE] && (
                <DailyChallengeWindow title={WindowType.DAILY_CHALLENGE} onClose={() => handleCloseWindow(WindowType.DAILY_CHALLENGE)} unlockAchievement={unlockAchievement} />
            )}
            {openWindows[WindowType.ACHIEVEMENTS] && (
                <AchievementsWindow title={WindowType.ACHIEVEMENTS} onClose={() => handleCloseWindow(WindowType.ACHIEVEMENTS)} unlockedAchievements={unlockedAchievements} />
            )}
            {openWindows[WindowType.SPRITE_LAB] && (
                <SpriteLabWindow title={WindowType.SPRITE_LAB} onClose={() => handleCloseWindow(WindowType.SPRITE_LAB)} />
            )}
            {openWindows[WindowType.SETTINGS] && (
                <SettingsWindow
                    title={WindowType.SETTINGS}
                    onClose={() => handleCloseWindow(WindowType.SETTINGS)}
                    initialSettings={aiSettings}
                    onSave={handleSettingsSave}
                />
            )}
            
            {activeTutorial && (
                <TutorialGuide
                    tutorial={activeTutorial.tutorial}
                    currentStepIndex={activeTutorial.step}
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                    onEnd={handleEndTutorial}
                    unlockAchievement={unlockAchievement}
                />
            )}

            {toastQueue.length > 0 && (
                <AchievementToast
                    key={toastQueue[0].id}
                    achievement={toastQueue[0]}
                    onComplete={handleToastComplete}
                />
            )}


            <Taskbar onMenuClick={() => setIsStartMenuOpen(!isStartMenuOpen)} zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleResetZoom}>
                <StartMenu isOpen={isStartMenuOpen} onOpenWindow={handleOpenWindow} />
            </Taskbar>
        </div>
    );
};

export default App;
