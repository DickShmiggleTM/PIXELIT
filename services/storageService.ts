// services/storageService.ts

import { VersionHistory, Asset, UnlockedAchievement, AISettings, AIProvider } from '../types';

const PROJECT_PREFIX = 'pixelit_project_';
const ASSET_PREFIX = 'pixelit_asset_';
const ACHIEVEMENTS_KEY = 'pixelit_unlocked_achievements';
const AI_SETTINGS_KEY = 'pixelit_ai_settings';

// Default AI Settings
const defaultAISettings: AISettings = {
    provider: AIProvider.GEMINI,
    ollamaUrl: 'http://localhost:11434',
    geminiApiKeys: [],
    mistralApiKeys: [],
    cohereApiKeys: [],
    openrouterApiKeys: [],
    openaiApiKeys: [],
    models: {
        [AIProvider.GEMINI]: {
            text: 'gemini-2.5-flash',
            image: 'imagen-4.0-generate-001',
            vision: 'gemini-2.5-flash-image',
        },
        [AIProvider.OLLAMA]: {
            text: 'llama3',
            image: 'llava',
            vision: 'llava',
        },
        [AIProvider.MISTRAL]: {
            text: 'mistral-large-latest',
            image: 'mistral-large-latest',
            vision: 'mistral-large-latest',
        },
        [AIProvider.COHERE]: {
            text: 'command-r',
            image: 'command-r',
            vision: 'command-r',
        },
        [AIProvider.OPENROUTER]: {
            text: 'google/gemma-7b-it:free',
            image: 'nousresearch/nous-hermes-2-vision-7b:free',
            vision: 'nousresearch/nous-hermes-2-vision-7b:free',
        },
        [AIProvider.OPENAI]: {
            text: 'gpt-4o-mini',
            image: 'gpt-4o-mini',
            vision: 'gpt-4o-mini',
        }
    },
};


// --- Project Management ---

export const saveProject = (name: string, history: VersionHistory): void => {
    try {
        localStorage.setItem(`${PROJECT_PREFIX}${name}`, JSON.stringify(history));
    } catch (e) {
        console.error("Failed to save project:", e);
        alert("Error: Could not save project. Storage might be full.");
    }
};

export const loadProject = (name: string): VersionHistory | null => {
    try {
        const data = localStorage.getItem(`${PROJECT_PREFIX}${name}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("Failed to load project:", e);
        alert("Error: Could not load project data. It may be corrupted.");
        return null;
    }
};

export const deleteProject = (name: string): void => {
    localStorage.removeItem(`${PROJECT_PREFIX}${name}`);
};

export const listProjects = (): string[] => {
    return Object.keys(localStorage)
        .filter(key => key.startsWith(PROJECT_PREFIX))
        .map(key => key.replace(PROJECT_PREFIX, ''));
};

// --- Asset Management ---

export const saveAsset = (asset: Asset): void => {
    try {
        localStorage.setItem(`${ASSET_PREFIX}${asset.id}`, JSON.stringify(asset));
    } catch (e) {
        console.error("Failed to save asset:", e);
    }
};

export const loadAsset = (id: string): Asset | null => {
    try {
        const data = localStorage.getItem(`${ASSET_PREFIX}${id}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("Failed to load asset:", e);
        return null;
    }
};

export const deleteAsset = (id: string): void => {
    localStorage.removeItem(`${ASSET_PREFIX}${id}`);
};

export const loadAllAssets = (): Asset[] => {
    const assets: Asset[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(ASSET_PREFIX)) {
            try {
                const asset = JSON.parse(localStorage.getItem(key) as string);
                assets.push(asset);
            } catch (e) {
                console.error(`Failed to parse asset with key ${key}:`, e);
            }
        }
    }
    return assets.sort((a, b) => b.createdAt - a.createdAt);
};

// --- Achievement Management ---

export const saveUnlockedAchievements = (achievements: UnlockedAchievement[]): void => {
    try {
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
    } catch (e) {
        console.error("Failed to save achievements:", e);
    }
};

export const loadUnlockedAchievements = (): UnlockedAchievement[] => {
    try {
        const data = localStorage.getItem(ACHIEVEMENTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load achievements:", e);
        return [];
    }
};

// --- AI Settings Management ---

export const saveAISettings = (settings: AISettings): void => {
    try {
        localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error("Failed to save AI settings:", e);
    }
};

export const loadAISettings = (): AISettings => {
    try {
        const data = localStorage.getItem(AI_SETTINGS_KEY);
        if (data) {
            const savedSettings = JSON.parse(data);
            
            // Backward compatibility: migrate single key string to array
            if (savedSettings.mistralApiKey) {
                savedSettings.mistralApiKeys = Array.isArray(savedSettings.mistralApiKey) ? savedSettings.mistralApiKey : [savedSettings.mistralApiKey];
                delete savedSettings.mistralApiKey;
            }
             if (savedSettings.cohereApiKey) {
                savedSettings.cohereApiKeys = Array.isArray(savedSettings.cohereApiKey) ? savedSettings.cohereApiKey : [savedSettings.cohereApiKey];
                delete savedSettings.cohereApiKey;
            }
             if (savedSettings.openrouterApiKey) {
                savedSettings.openrouterApiKeys = Array.isArray(savedSettings.openrouterApiKey) ? savedSettings.openrouterApiKey : [savedSettings.openrouterApiKey];
                delete savedSettings.openrouterApiKey;
            }
            if (savedSettings.openaiApiKey) {
                savedSettings.openaiApiKeys = Array.isArray(savedSettings.openaiApiKey) ? savedSettings.openaiApiKey : [savedSettings.openaiApiKey];
                delete savedSettings.openaiApiKey;
            }


            // Deep merge with defaults to ensure all keys are present after an update
            const mergedSettings = {
                ...defaultAISettings,
                ...savedSettings,
                models: {
                    ...defaultAISettings.models,
                },
            };
            // Merge each provider's models individually
            for (const provider of Object.values(AIProvider)) {
                // FIX: Cast provider to AIProvider to use it as an index key.
                const providerKey = provider as AIProvider;
                if (defaultAISettings.models[providerKey]) {
                    mergedSettings.models[providerKey] = {
                        ...defaultAISettings.models[providerKey],
                        ...(savedSettings.models?.[providerKey] || {}),
                    };
                }
            }
            return mergedSettings;
        }
        return defaultAISettings;
    } catch (e) {
        console.error("Failed to load AI settings, returning defaults:", e);
        return defaultAISettings;
    }
};