// types.ts

// --- Enums ---

export enum Tool {
    PENCIL = 'PENCIL',
    ERASER = 'ERASER',
    FILL_BUCKET = 'FILL_BUCKET',
    COLOR_PICKER = 'COLOR_PICKER',
    LINE = 'LINE',
    RECTANGLE = 'RECTANGLE',
    CIRCLE = 'CIRCLE',
    DITHER = 'DITHER',
    RECTANGLE_SELECT = 'RECTANGLE_SELECT',
    ELLIPSE_SELECT = 'ELLIPSE_SELECT',
    LASSO_SELECT = 'LASSO_SELECT',
}

export enum WindowType {
    FILE_BROWSER = 'File Browser',
    VERSION_CONTROL = 'Version Control',
    AI_CHAT = 'AI Chat',
    ANIMATION_TIMELINE = 'Animation Timeline',
    LAYERS = 'Layers',
    REFERENCE_IMAGE = 'Reference Image',
    FILTERS = 'Filters & Effects',
    PREVIEW = 'Interactive Preview',
    MACROS_AND_SCRIPTS = 'Macros & Scripts',
    CHIPTUNE_SFX = 'Chiptune SFX Generator',
    MUSIC_VISUALIZER = 'Music Visualizer',
    TUTORIALS = 'Tutorials',
    DAILY_CHALLENGE = 'Daily Challenge',
    ACHIEVEMENTS = 'Achievements',
    AI_PALETTE = 'AI Palette Generator',
    AI_UPSCALE = 'AI Upscaler',
    AI_SPRITE_SHEET = 'AI Sprite Sheet Generator',
    AI_STYLE_TUNER = 'AI Style Tuner',
    AI_AUTO_SHADING = 'AI Auto-Shading',
    AI_LAYER_SEPARATION = 'AI Layer Separation',
    SPRITE_LAB = 'Sprite Lab',
    SETTINGS = 'Settings',
    EXPORT = 'Export',
}

export enum BlendMode {
    NORMAL = 'normal',
    MULTIPLY = 'multiply',
    SCREEN = 'screen',
    OVERLAY = 'overlay',
    DARKEN = 'darken',
    LIGHTEN = 'lighten',
    COLOR_DODGE = 'color-dodge',
    COLOR_BURN = 'color-burn',
    HARD_LIGHT = 'hard-light',
    SOFT_LIGHT = 'soft-light',
    DIFFERENCE = 'difference',
    EXCLUSION = 'exclusion',
}

export enum GridType {
    STANDARD = 'standard',
    ISOMETRIC = 'isometric',
}

export enum AchievementID {
    FIRST_STROKE = 'FIRST_STROKE',
    AI_ARTIST = 'AI_ARTIST',
    ANIMATOR = 'ANIMATOR',
    EXPORTER = 'EXPORTER',
    PALETTE_PRO = 'PALETTE_PRO',
    LEARNER = 'LEARNER',
    CHALLENGER = 'CHALLENGER',
    SFX_MASTER = 'SFX_MASTER',
}

export enum AIProvider {
    GEMINI = 'Gemini',
    OLLAMA = 'Ollama',
    MISTRAL = 'Mistral',
    COHERE = 'Cohere',
    OPENROUTER = 'OpenRouter',
    OPENAI = 'OpenAI',
    HUGGINGFACE = 'HuggingFace',
}

// --- Interfaces & Types ---

export interface Layer {
    id: string;
    name: string;
    grid: string[][];
    isVisible: boolean;
    opacity: number;
    blendMode: BlendMode;
}

export interface Frame {
    layers: Layer[];
    sfxAssetId?: string;
}

export interface ProjectState {
    canvasSize: { width: number, height: number };
    frames: Frame[];
}

export interface Commit {
    id: string;
    parentId: string | null;
    timestamp: number;
    message: string;
    projectState: ProjectState;
}

export interface VersionHistory {
    commits: { [id: string]: Commit };
    branches: { [name: string]: { name: string, commitId: string } };
    currentBranch: string;
}

export type AssetType = 'sprite' | 'palette' | 'macro' | 'script' | 'style' | 'sfx';

export interface Asset {
    id: string;
    name: string;
    type: AssetType;
    tags: string[];
    data: any;
    createdAt: number;
    preview: string;
}

export interface MacroAction {
    type: 'SET_TOOL' | 'SET_PRIMARY_COLOR' | 'SET_SECONDARY_COLOR' | 'SET_BRUSH_SIZE' | 'ADD_LAYER' | 'SELECT_LAYER' | 'SET_LAYER_GRID';
    payload: any;
}

export interface Macro {
    name: string;
    actions: MacroAction[];
}

export interface Script {
    name: string;
    code: string;
}

export interface TutorialStep {
    title: string;
    content: string;
    targetId?: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface Tutorial {
    id: string;
    title: string;
    description: string;
    steps: TutorialStep[];
}

export interface UnlockedAchievement {
    achievementId: AchievementID;
    timestamp: number;
}

export interface Achievement {
    id: AchievementID;
    name: string;
    description: string;
    icon: string;
}

export interface AiModel {
    name: string;
    provider: AIProvider;
}

export interface AISettings {
    provider: AIProvider;
    ollamaUrl: string;
    geminiApiKeys: string[];
    mistralApiKeys: string[];
    cohereApiKeys: string[];
    openrouterApiKeys: string[];
    openaiApiKeys: string[];
    huggingfaceApiKeys: string[];
    huggingfaceBaseUrl: string;
    models: {
        [key in AIProvider]: {
            text: string;
            image: string;
            vision: string;
        }
    };
}

export interface SfxParameters {
    waveform: 'square' | 'sine' | 'sawtooth' | 'triangle' | 'noise';
    attack: number;
    sustain: number;
    decay: number;
    startFrequency: number;
    endFrequency: number;
    volume: number;
}
