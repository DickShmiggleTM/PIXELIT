// services/aiService.ts
import { AISettings, AIProvider, AiModel } from '../types';
import * as geminiService from './geminiService';
import * as ollamaService from './ollamaService';
import * as mistralService from './mistralService';
import * as cohereService from './cohereService';
import * as openrouterService from './openrouterService';
import * as openaiService from './openaiService';

let settings: AISettings;

// --- Key Management State ---
interface ProviderKeyState {
    currentIndex: number;
    errorCounts: number[];
}
const keyStates: Partial<Record<AIProvider, ProviderKeyState>> = {};
const ERROR_THRESHOLD = 3;

const initializeKeyStates = (s: AISettings) => {
    keyStates[AIProvider.GEMINI] = {
        currentIndex: 0,
        errorCounts: Array(s.geminiApiKeys.length).fill(0),
    };
    keyStates[AIProvider.MISTRAL] = {
        currentIndex: 0,
        errorCounts: Array(s.mistralApiKeys.length).fill(0),
    };
    keyStates[AIProvider.COHERE] = {
        currentIndex: 0,
        errorCounts: Array(s.cohereApiKeys.length).fill(0),
    };
    keyStates[AIProvider.OPENROUTER] = {
        currentIndex: 0,
        errorCounts: Array(s.openrouterApiKeys.length).fill(0),
    };
    keyStates[AIProvider.OPENAI] = {
        currentIndex: 0,
        errorCounts: Array(s.openaiApiKeys.length).fill(0),
    };
};

const getApiKeyForProvider = (provider: AIProvider): string | undefined => {
    const state = keyStates[provider];
    if (!state) return undefined;
    
    let keys: string[] = [];
    if (provider === AIProvider.GEMINI) keys = settings.geminiApiKeys;
    else if (provider === AIProvider.MISTRAL) keys = settings.mistralApiKeys;
    else if (provider === AIProvider.COHERE) keys = settings.cohereApiKeys;
    else if (provider === AIProvider.OPENROUTER) keys = settings.openrouterApiKeys;
    else if (provider === AIProvider.OPENAI) keys = settings.openaiApiKeys;

    return keys[state.currentIndex];
};

const reportSuccessForProvider = (provider: AIProvider) => {
    const state = keyStates[provider];
    if (state && state.errorCounts[state.currentIndex] > 0) {
        state.errorCounts[state.currentIndex] = 0;
    }
}

const reportErrorForProvider = (provider: AIProvider) => {
    const state = keyStates[provider];
    if (!state) return;
    
    state.errorCounts[state.currentIndex]++;
    if (state.errorCounts[state.currentIndex] >= ERROR_THRESHOLD) {
        let keys: string[] = [];
        if (provider === AIProvider.GEMINI) keys = settings.geminiApiKeys;
        else if (provider === AIProvider.MISTRAL) keys = settings.mistralApiKeys;
        else if (provider === AIProvider.COHERE) keys = settings.cohereApiKeys;
        else if (provider === AIProvider.OPENROUTER) keys = settings.openrouterApiKeys;
        else if (provider === AIProvider.OPENAI) keys = settings.openaiApiKeys;
        
        if (keys.length > 1) {
            console.warn(`API key for ${provider} failed ${ERROR_THRESHOLD} times. Switching to the next key.`);
            state.currentIndex = (state.currentIndex + 1) % keys.length;
            state.errorCounts[state.currentIndex] = 0;
        }
    }
};

const withErrorHandling = async <T>(provider: AIProvider, fn: () => Promise<T>): Promise<T> => {
    try {
        const result = await fn();
        reportSuccessForProvider(provider);
        return result;
    } catch (error) {
        console.error(`API call failed for provider ${provider}:`, error);
        reportErrorForProvider(provider);
        throw error; // Re-throw the error to be handled by the caller UI
    }
}


// --- Service Initialization ---
export const init = (newSettings: AISettings) => {
    settings = newSettings;
    initializeKeyStates(newSettings);
};

// --- Service Functions ---

export const listModels = async (): Promise<AiModel[]> => {
    const apiKeyProviders = [AIProvider.GEMINI, AIProvider.MISTRAL, AIProvider.COHERE, AIProvider.OPENAI];
    const isApiKeyProvider = apiKeyProviders.includes(settings.provider);

    try {
        switch (settings.provider) {
            case AIProvider.OLLAMA:
                return await ollamaService.listModels(settings.ollamaUrl);
            case AIProvider.MISTRAL: {
                const apiKey = getApiKeyForProvider(AIProvider.MISTRAL);
                return await mistralService.listModels(apiKey || '');
            }
            case AIProvider.COHERE: {
                 const apiKey = getApiKeyForProvider(AIProvider.COHERE);
                return await cohereService.listModels(apiKey || '');
            }
            case AIProvider.OPENROUTER:
                return await openrouterService.listModels();
            case AIProvider.OPENAI: {
                const apiKey = getApiKeyForProvider(AIProvider.OPENAI);
                return await openaiService.listModels(apiKey || '');
            }
            case AIProvider.GEMINI:
            default:
                return await geminiService.listModels();
        }
    } catch(error) {
        if(isApiKeyProvider) reportErrorForProvider(settings.provider);
        console.error(`Failed to list models for ${settings.provider}`, error);
        return [];
    }
};

export const generatePixelArt = (
    prompt: string, artMode: string, resolution: number, 
    image?: { base64: string; mimeType: string; }, styleGuide?: string
): Promise<string | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.generatePixelArt(prompt, artMode, resolution, settings.models[AIProvider.OLLAMA], settings.ollamaUrl, image, styleGuide);
        case AIProvider.MISTRAL:
            return withErrorHandling(AIProvider.MISTRAL, () => mistralService.generatePixelArt(prompt, artMode, resolution, settings.models[AIProvider.MISTRAL], getApiKeyForProvider(AIProvider.MISTRAL)!, image, styleGuide));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.generatePixelArt(prompt, artMode, resolution, settings.models[AIProvider.COHERE], getApiKeyForProvider(AIProvider.COHERE)!, image, styleGuide));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.generatePixelArt(prompt, artMode, resolution, settings.models[AIProvider.OPENROUTER], getApiKeyForProvider(AIProvider.OPENROUTER)!, image, styleGuide));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.generatePixelArt(prompt, artMode, resolution, settings.models[AIProvider.OPENAI], getApiKeyForProvider(AIProvider.OPENAI)!, image, styleGuide));
        case AIProvider.GEMINI:
        default:
             return withErrorHandling(AIProvider.GEMINI, () => geminiService.generatePixelArt(getApiKeyForProvider(AIProvider.GEMINI)!, prompt, artMode, resolution, settings.models[AIProvider.GEMINI], image, styleGuide));
    }
};

export const getPromptSuggestions = (currentPrompt: string): Promise<string[] | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.getPromptSuggestions(currentPrompt, settings.models[AIProvider.OLLAMA].text, settings.ollamaUrl);
        case AIProvider.MISTRAL:
             return withErrorHandling(AIProvider.MISTRAL, () => mistralService.getPromptSuggestions(currentPrompt, settings.models[AIProvider.MISTRAL].text, getApiKeyForProvider(AIProvider.MISTRAL)!));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.getPromptSuggestions(currentPrompt, settings.models[AIProvider.COHERE].text, getApiKeyForProvider(AIProvider.COHERE)!));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.getPromptSuggestions(currentPrompt, settings.models[AIProvider.OPENROUTER].text, getApiKeyForProvider(AIProvider.OPENROUTER)!));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.getPromptSuggestions(currentPrompt, settings.models[AIProvider.OPENAI].text, getApiKeyForProvider(AIProvider.OPENAI)!));
        case AIProvider.GEMINI:
        default:
            return withErrorHandling(AIProvider.GEMINI, () => geminiService.getPromptSuggestions(getApiKeyForProvider(AIProvider.GEMINI)!, currentPrompt, settings.models[AIProvider.GEMINI].text));
    }
};

export const generateFx = (prompt: string, width: number, height: number): Promise<string | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.generateFx(prompt, width, height, settings.models[AIProvider.OLLAMA].image, settings.ollamaUrl);
        case AIProvider.MISTRAL:
            return withErrorHandling(AIProvider.MISTRAL, () => mistralService.generateFx(prompt, width, height, settings.models[AIProvider.MISTRAL].image, getApiKeyForProvider(AIProvider.MISTRAL)!));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.generateFx(prompt, width, height, settings.models[AIProvider.COHERE].image, getApiKeyForProvider(AIProvider.COHERE)!));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.generateFx(prompt, width, height, settings.models[AIProvider.OPENROUTER].image, getApiKeyForProvider(AIProvider.OPENROUTER)!));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.generateFx(prompt, width, height, settings.models[AIProvider.OPENAI].image, getApiKeyForProvider(AIProvider.OPENAI)!));
        case AIProvider.GEMINI:
        default:
            return withErrorHandling(AIProvider.GEMINI, () => geminiService.generateFx(getApiKeyForProvider(AIProvider.GEMINI)!, prompt, width, height, settings.models[AIProvider.GEMINI].image));
    }
};

export const generatePalette = (prompt: string, image?: { base64: string; mimeType: string; }): Promise<string[] | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.generatePalette(prompt, settings.models[AIProvider.OLLAMA].text, settings.ollamaUrl, image);
        case AIProvider.MISTRAL:
            return withErrorHandling(AIProvider.MISTRAL, () => mistralService.generatePalette(prompt, settings.models[AIProvider.MISTRAL].text, getApiKeyForProvider(AIProvider.MISTRAL)!));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.generatePalette(prompt, settings.models[AIProvider.COHERE].text, getApiKeyForProvider(AIProvider.COHERE)!));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.generatePalette(prompt, settings.models[AIProvider.OPENROUTER].text, getApiKeyForProvider(AIProvider.OPENROUTER)!));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.generatePalette(prompt, settings.models[AIProvider.OPENAI].vision, getApiKeyForProvider(AIProvider.OPENAI)!, image));
        case AIProvider.GEMINI:
        default:
            return withErrorHandling(AIProvider.GEMINI, () => geminiService.generatePalette(getApiKeyForProvider(AIProvider.GEMINI)!, prompt, settings.models[AIProvider.GEMINI].text, image));
    }
};

export const upscaleImage = (base64ImageData: string, scaleFactor: number): Promise<string | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.upscaleImage(base64ImageData, scaleFactor, settings.models[AIProvider.OLLAMA].vision, settings.ollamaUrl);
        case AIProvider.MISTRAL:
            return withErrorHandling(AIProvider.MISTRAL, () => mistralService.upscaleImage(base64ImageData, scaleFactor, settings.models[AIProvider.MISTRAL].vision, getApiKeyForProvider(AIProvider.MISTRAL)!));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.upscaleImage(base64ImageData, scaleFactor, settings.models[AIProvider.COHERE].vision, getApiKeyForProvider(AIProvider.COHERE)!));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.upscaleImage(base64ImageData, scaleFactor, settings.models[AIProvider.OPENROUTER].vision, getApiKeyForProvider(AIProvider.OPENROUTER)!));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.upscaleImage(base64ImageData, scaleFactor, settings.models[AIProvider.OPENAI].vision, getApiKeyForProvider(AIProvider.OPENAI)!));
        case AIProvider.GEMINI:
        default:
            return withErrorHandling(AIProvider.GEMINI, () => geminiService.upscaleImage(getApiKeyForProvider(AIProvider.GEMINI)!, base64ImageData, scaleFactor, settings.models[AIProvider.GEMINI].vision));
    }
};

export const generateSpriteSheet = (base64ImageData: string, prompt: string): Promise<string | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.generateSpriteSheet(base64ImageData, prompt, settings.models[AIProvider.OLLAMA].vision, settings.ollamaUrl);
        case AIProvider.MISTRAL:
            return withErrorHandling(AIProvider.MISTRAL, () => mistralService.generateSpriteSheet(base64ImageData, prompt, settings.models[AIProvider.MISTRAL].vision, getApiKeyForProvider(AIProvider.MISTRAL)!));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.generateSpriteSheet(base64ImageData, prompt, settings.models[AIProvider.COHERE].vision, getApiKeyForProvider(AIProvider.COHERE)!));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.generateSpriteSheet(base64ImageData, prompt, settings.models[AIProvider.OPENROUTER].vision, getApiKeyForProvider(AIProvider.OPENROUTER)!));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.generateSpriteSheet(base64ImageData, prompt, settings.models[AIProvider.OPENAI].vision, getApiKeyForProvider(AIProvider.OPENAI)!));
        case AIProvider.GEMINI:
        default:
            return withErrorHandling(AIProvider.GEMINI, () => geminiService.generateSpriteSheet(getApiKeyForProvider(AIProvider.GEMINI)!, base64ImageData, prompt, settings.models[AIProvider.GEMINI].vision));
    }
};

export const generateAnimation = (prompt: string, width: number, height: number): Promise<string | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.generateAnimation(prompt, width, height, settings.models[AIProvider.OLLAMA].image, settings.ollamaUrl);
        case AIProvider.MISTRAL:
            return withErrorHandling(AIProvider.MISTRAL, () => mistralService.generateAnimation(prompt, width, height, settings.models[AIProvider.MISTRAL].image, getApiKeyForProvider(AIProvider.MISTRAL)!));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.generateAnimation(prompt, width, height, settings.models[AIProvider.COHERE].image, getApiKeyForProvider(AIProvider.COHERE)!));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.generateAnimation(prompt, width, height, settings.models[AIProvider.OPENROUTER].image, getApiKeyForProvider(AIProvider.OPENROUTER)!));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.generateAnimation(prompt, width, height, settings.models[AIProvider.OPENAI].image, getApiKeyForProvider(AIProvider.OPENAI)!));
        case AIProvider.GEMINI:
        default:
            return withErrorHandling(AIProvider.GEMINI, () => geminiService.generateAnimation(getApiKeyForProvider(AIProvider.GEMINI)!, prompt, width, height, settings.models[AIProvider.GEMINI].vision));
    }
};

export const generateInbetweens = (startImageBase64: string, endImageBase64: string, frameCount: number): Promise<string | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.generateInbetweens(startImageBase64, endImageBase64, frameCount, settings.models[AIProvider.OLLAMA].vision, settings.ollamaUrl);
        case AIProvider.MISTRAL:
            return withErrorHandling(AIProvider.MISTRAL, () => mistralService.generateInbetweens(startImageBase64, endImageBase64, frameCount, settings.models[AIProvider.MISTRAL].vision, getApiKeyForProvider(AIProvider.MISTRAL)!));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.generateInbetweens(startImageBase64, endImageBase64, frameCount, settings.models[AIProvider.COHERE].vision, getApiKeyForProvider(AIProvider.COHERE)!));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.generateInbetweens(startImageBase64, endImageBase64, frameCount, settings.models[AIProvider.OPENROUTER].vision, getApiKeyForProvider(AIProvider.OPENROUTER)!));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.generateInbetweens(startImageBase64, endImageBase64, frameCount, settings.models[AIProvider.OPENAI].vision, getApiKeyForProvider(AIProvider.OPENAI)!));
        case AIProvider.GEMINI:
        default:
            return withErrorHandling(AIProvider.GEMINI, () => geminiService.generateInbetweens(getApiKeyForProvider(AIProvider.GEMINI)!, startImageBase64, endImageBase64, frameCount, settings.models[AIProvider.GEMINI].vision));
    }
};

export const analyzeArtStyle = (images: { base64: string; mimeType: string }[]): Promise<string | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.analyzeArtStyle(images, settings.models[AIProvider.OLLAMA].vision, settings.ollamaUrl);
        case AIProvider.MISTRAL:
            return withErrorHandling(AIProvider.MISTRAL, () => mistralService.analyzeArtStyle(images, settings.models[AIProvider.MISTRAL].vision, getApiKeyForProvider(AIProvider.MISTRAL)!));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.analyzeArtStyle(images, settings.models[AIProvider.COHERE].vision, getApiKeyForProvider(AIProvider.COHERE)!));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.analyzeArtStyle(images, settings.models[AIProvider.OPENROUTER].vision, getApiKeyForProvider(AIProvider.OPENROUTER)!));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.analyzeArtStyle(images, settings.models[AIProvider.OPENAI].vision, getApiKeyForProvider(AIProvider.OPENAI)!));
        case AIProvider.GEMINI:
        default:
            return withErrorHandling(AIProvider.GEMINI, () => geminiService.analyzeArtStyle(getApiKeyForProvider(AIProvider.GEMINI)!, images, settings.models[AIProvider.GEMINI].vision));
    }
};

export const generateShading = (base64ImageData: string, lightAngle: number, lightIntensity: number): Promise<string | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.generateShading(base64ImageData, lightAngle, lightIntensity, settings.models[AIProvider.OLLAMA].vision, settings.ollamaUrl);
        case AIProvider.MISTRAL:
            return withErrorHandling(AIProvider.MISTRAL, () => mistralService.generateShading(base64ImageData, lightAngle, lightIntensity, settings.models[AIProvider.MISTRAL].vision, getApiKeyForProvider(AIProvider.MISTRAL)!));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.generateShading(base64ImageData, lightAngle, lightIntensity, settings.models[AIProvider.COHERE].vision, getApiKeyForProvider(AIProvider.COHERE)!));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.generateShading(base64ImageData, lightAngle, lightIntensity, settings.models[AIProvider.OPENROUTER].vision, getApiKeyForProvider(AIProvider.OPENROUTER)!));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.generateShading(base64ImageData, lightAngle, lightIntensity, settings.models[AIProvider.OPENAI].vision, getApiKeyForProvider(AIProvider.OPENAI)!));
        case AIProvider.GEMINI:
        default:
            return withErrorHandling(AIProvider.GEMINI, () => geminiService.generateShading(getApiKeyForProvider(AIProvider.GEMINI)!, base64ImageData, lightAngle, lightIntensity, settings.models[AIProvider.GEMINI].vision));
    }
};

export const separateImageLayers = (base64ImageData: string, mimeType: string, width: number, height: number): Promise<{ name: string; base64: string; }[] | null> => {
    switch (settings.provider) {
        case AIProvider.OLLAMA:
            return ollamaService.separateImageLayers(base64ImageData, mimeType, width, height, settings.models[AIProvider.OLLAMA].vision, settings.ollamaUrl);
        case AIProvider.MISTRAL:
            return withErrorHandling(AIProvider.MISTRAL, () => mistralService.separateImageLayers(base64ImageData, mimeType, width, height, settings.models[AIProvider.MISTRAL].vision, getApiKeyForProvider(AIProvider.MISTRAL)!));
        case AIProvider.COHERE:
            return withErrorHandling(AIProvider.COHERE, () => cohereService.separateImageLayers(base64ImageData, mimeType, width, height, settings.models[AIProvider.COHERE].vision, getApiKeyForProvider(AIProvider.COHERE)!));
        case AIProvider.OPENROUTER:
            return withErrorHandling(AIProvider.OPENROUTER, () => openrouterService.separateImageLayers(base64ImageData, mimeType, width, height, settings.models[AIProvider.OPENROUTER].vision, getApiKeyForProvider(AIProvider.OPENROUTER)!));
        case AIProvider.OPENAI:
            return withErrorHandling(AIProvider.OPENAI, () => openaiService.separateImageLayers(base64ImageData, mimeType, width, height, settings.models[AIProvider.OPENAI].vision, getApiKeyForProvider(AIProvider.OPENAI)!));
        case AIProvider.GEMINI:
        default:
            return withErrorHandling(AIProvider.GEMINI, () => geminiService.separateImageLayers(getApiKeyForProvider(AIProvider.GEMINI)!, base64ImageData, mimeType, width, height, settings.models[AIProvider.GEMINI].vision));
    }
};
