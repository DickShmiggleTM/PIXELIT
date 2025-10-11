// services/cohereService.ts

import { AiModel, AIProvider } from "../types";

const API_URL = 'https://api.cohere.com/v1';

const extractBase64 = (text: string): string | null => {
    const regex = /\[BASE64_START\](.*?)\[BASE64_END\]/;
    const match = text.match(regex);
    return match ? match[1].trim().replace(/\s/g, '') : null;
};

const extractJson = <T>(text: string): T | null => {
    try {
        const regex = /```json\s*([\s\S]+?)\s*```/;
        const match = text.match(regex);
        if (match && match[1]) {
            return JSON.parse(match[1]) as T;
        }
        return JSON.parse(text) as T;
    } catch (error) {
        console.error("Failed to parse JSON from Cohere response:", text, error);
        return null;
    }
}

export const listModels = async (apiKey: string): Promise<AiModel[]> => {
    if (!apiKey) return [];
    try {
        const response = await fetch(`${API_URL}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!response.ok) throw new Error(`Cohere API error: ${response.statusText}`);
        const data = await response.json();
        // Filter for models that support the chat endpoint
        return data.models.filter((m: any) => m.endpoints?.includes('chat')).map((model: any) => ({
            name: model.name,
            provider: AIProvider.COHERE,
        })).sort((a: AiModel, b: AiModel) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Failed to fetch Cohere models:", error);
        return [];
    }
};

const generate = async (apiKey: string, model: string, prompt: string): Promise<any> => {
    const body = {
        model,
        message: prompt,
    };
    const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Cohere API error: ${response.statusText}`);
    const result = await response.json();
    return result.text;
};

const generateImageBase64 = async (apiKey: string, model: string, prompt: string): Promise<string | null> => {
    const response = await generate(apiKey, model, prompt);
    return extractBase64(response);
};

export const generatePixelArt = (
    prompt: string, artMode: string, resolution: number, models: { image: string }, apiKey: string,
    image?: { base64: string; mimeType: string; }, styleGuide?: string
): Promise<string | null> => {
    let finalPrompt = `Generate a single, centered piece of pixel art. Style: ${artMode}. Content: ${prompt}. Resolution: ${resolution}x${resolution} pixels. Background: transparent. No anti-aliasing.`;
    if (styleGuide) finalPrompt += ` CRITICAL: Adhere to this style guide: "${styleGuide}"`;
    finalPrompt += ` CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END]. Do not include any other text, dialogue, or explanation.`;
    return generateImageBase64(apiKey, models.image, finalPrompt);
};

export const getPromptSuggestions = async (currentPrompt: string, model: string, apiKey: string): Promise<string[] | null> => {
    const prompt = `You are an expert prompt engineer for an AI image generator specializing in pixel art. Your task is to improve the user's prompt. Given the user's prompt: "${currentPrompt}", provide 3 alternative, improved prompts. The prompts should add descriptive details about style, lighting, composition, and mood. Your response must be a single JSON object in a markdown block, with a key "suggestions" containing an array of 3 strings.`;
    const response = await generate(apiKey, model, prompt);
    const json = extractJson<{ suggestions: string[] }>(response);
    return json?.suggestions || null;
};

export const generateFx = (prompt: string, width: number, height: number, model: string, apiKey: string): Promise<string | null> => {
    const fullPrompt = `Generate a single pixel art visual effect of: "${prompt}". Dimensions: ${width}x${height} pixels. The background must be transparent. The style must be pixel art with no anti-aliasing. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END]. No other text or explanation.`;
    return generateImageBase64(apiKey, model, fullPrompt);
};

export const generatePalette = async (prompt: string, model: string, apiKey: string): Promise<string[] | null> => {
    const fullPrompt = `Generate a harmonious 16-color pixel art palette based on this theme: "${prompt}". Your response must be a single JSON object in a markdown block, with a key "palette" containing an array of 16 hex color code strings (e.g., "#RRGGBB").`;
    const response = await generate(apiKey, model, fullPrompt);
    const json = extractJson<{ palette: string[] }>(response);
    return json?.palette || null;
};

export const upscaleImage = (base64ImageData: string, scaleFactor: number, model: string, apiKey: string): Promise<string | null> => {
    const prompt = `Upscale this pixel art image by ${scaleFactor}x. Preserve sharp, hard edges and the pixelated style. Do not introduce blurring or anti-aliasing. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END]. No other text or explanation.`;
    return generateImageBase64(apiKey, model, prompt);
};

export const generateSpriteSheet = (base64ImageData: string, prompt: string, model: string, apiKey: string): Promise<string | null> => {
    const fullPrompt = `Using the provided character sprite as a base, generate a pixel art sprite sheet depicting: ${prompt}. Arrange frames in a single horizontal row. Background must be transparent. Style must be consistent. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    return generateImageBase64(apiKey, model, fullPrompt);
};

export const generateAnimation = (prompt: string, width: number, height: number, model: string, apiKey: string): Promise<string | null> => {
    const fullPrompt = `Generate a pixel art animation sprite sheet for: "${prompt}". Each frame must be ${width}x${height} pixels. Arrange frames in a single horizontal row on a transparent background. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    return generateImageBase64(apiKey, model, fullPrompt);
};

export const generateInbetweens = (startImageBase64: string, endImageBase64: string, frameCount: number, model: string, apiKey: string): Promise<string | null> => {
    const prompt = `Generate ${frameCount} intermediate pixel art frames to animate between the first image (start) and second image (end). Arrange the generated frames in a single horizontal sprite sheet on a transparent background. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    return generateImageBase64(apiKey, model, prompt);
};

export const analyzeArtStyle = (images: { base64: string; mimeType: string }[], model: string, apiKey: string): Promise<string | null> => {
    const prompt = `Analyze the following pixel art images. Describe the artistic style in detail (color palette, dithering, outlining, etc.). Create a concise but comprehensive style guide that can be used to generate new art in this exact style.`;
    return generate(apiKey, model, prompt);
};

export const generateShading = (base64ImageData: string, lightAngle: number, lightIntensity: number, model: string, apiKey: string): Promise<string | null> => {
    const directions = ['right', 'top-right', 'top', 'top-left', 'left', 'bottom-left', 'bottom', 'bottom-right'];
    const lightDirectionDescription = directions[Math.round(lightAngle / 45) % 8];
    const prompt = `Analyze the provided flat-colored sprite. Generate a new layer containing only shading and highlights for a light source from the ${lightDirectionDescription}. The light intensity is ${lightIntensity > 0.7 ? 'strong' : 'normal'}. The output MUST ONLY contain the shading/highlight pixels on a transparent background. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    return generateImageBase64(apiKey, model, prompt);
};

export const separateImageLayers = async (base64ImageData: string, mimeType: string, width: number, height: number, model: string, apiKey: string): Promise<{ name: string; base64: string; }[] | null> => {
    const prompt = `Analyze this image. Identify distinct logical layers (e.g., background, characters, foreground). For each layer, generate a name and a ${width}x${height} pixel art version of that layer on a transparent background. Your response must be a single JSON object in a markdown block, with a key "layers" containing an array of objects, where each object has "name" (string) and "base64" (string, the base64-encoded PNG) keys.`;
    const response = await generate(apiKey, model, prompt);
    const json = extractJson<{ layers: { name: string, base64: string }[] }>(response);
    return json?.layers || null;
};
