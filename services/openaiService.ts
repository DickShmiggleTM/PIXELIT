// services/openaiService.ts

import { AiModel, AIProvider } from "../types";

const API_URL = 'https://api.openai.com/v1';

// --- Helper Functions ---
const extractBase64 = (text: string): string | null => {
    const regex = /\[BASE64_START\](.*?)\[BASE64_END\]/;
    const match = text.match(regex);
    return match ? match[1].trim().replace(/\s/g, '') : null;
};

const extractJson = <T>(text: string): T | null => {
    try {
        // First, try to find a JSON markdown block
        const regex = /```json\s*([\s\S]+?)\s*```/;
        const match = text.match(regex);
        if (match && match[1]) {
            return JSON.parse(match[1]) as T;
        }
        // If not found, assume the whole string is JSON
        return JSON.parse(text) as T;
    } catch (error) {
        console.error("Failed to parse JSON from OpenAI response:", text, error);
        return null;
    }
};

// --- API Functions ---

export const listModels = async (apiKey: string): Promise<AiModel[]> => {
    if (!apiKey) return [];
    try {
        const response = await fetch(`${API_URL}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!response.ok) {
            // OpenAI API returns detailed error messages in the body
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${errorData.error.message}`);
        }
        const data = await response.json();
        
        // Filter for models suitable for the free/low-cost tier and this application
        const suitableModels = [
            'gpt-4o-mini', // New, fast, multimodal, and cheap
            'gpt-4o',
            'gpt-3.5-turbo',
        ];

        return data.data
            .filter((model: any) => suitableModels.includes(model.id))
            .map((model: any) => ({
                name: model.id,
                provider: AIProvider.OPENAI,
            }))
            .sort((a: AiModel, b: AiModel) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Failed to fetch OpenAI models:", error);
        // Re-throw to be caught by the key-switching mechanism
        throw error;
    }
};

const generate = async (apiKey: string, model: string, content: any[], isJson: boolean = false): Promise<any> => {
    const body: any = {
        model,
        messages: [{ role: 'user', content }],
    };
    if (isJson) {
        body.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error.message}`);
    }
    const result = await response.json();
    return result.choices[0].message.content;
};

const generateImageBase64 = async (apiKey: string, model: string, content: any[]): Promise<string | null> => {
    const response = await generate(apiKey, model, content);
    return extractBase64(response);
};

const createContentArray = (prompt: string, image?: { base64: string; mimeType: string; }): any[] => {
    const content: any[] = [{ type: 'text', text: prompt }];
    if (image) {
        content.unshift({
            type: 'image_url',
            image_url: { url: `data:${image.mimeType};base64,${image.base64}` }
        });
    }
    return content;
};

// --- Service Implementations ---

export const generatePixelArt = (
    prompt: string, artMode: string, resolution: number, models: { image: string, vision: string }, apiKey: string,
    image?: { base64: string; mimeType: string; }, styleGuide?: string
): Promise<string | null> => {
    let finalPrompt = `Generate a single, centered piece of pixel art. Style: ${artMode}. Content: ${prompt}. Resolution: ${resolution}x${resolution} pixels. Background: transparent. No anti-aliasing.`;
    if (styleGuide) finalPrompt += ` CRITICAL: Adhere to this style guide: "${styleGuide}"`;
    finalPrompt += ` CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END]. No other text or explanation.`;

    const modelToUse = image ? models.vision : models.image;
    const content = createContentArray(finalPrompt, image);
    return generateImageBase64(apiKey, modelToUse, content);
};

export const getPromptSuggestions = async (currentPrompt: string, model: string, apiKey: string): Promise<string[] | null> => {
    const prompt = `You are an expert prompt engineer for an AI image generator specializing in pixel art. Your task is to improve the user's prompt. Given the user's prompt: "${currentPrompt}", provide 3 alternative, improved prompts. The prompts should add descriptive details about style, lighting, composition, and mood. Your response must be a single JSON object with a key "suggestions" containing an array of 3 strings.`;
    const content = createContentArray(prompt);
    const response = await generate(apiKey, model, content, true);
    const json = extractJson<{ suggestions: string[] }>(response);
    return json?.suggestions || null;
};

export const generateFx = (prompt: string, width: number, height: number, model: string, apiKey: string): Promise<string | null> => {
    const fullPrompt = `Generate a single pixel art visual effect of: "${prompt}". Dimensions: ${width}x${height} pixels. The background must be transparent. The style must be pixel art with no anti-aliasing. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END]. No other text or explanation.`;
    const content = createContentArray(fullPrompt);
    return generateImageBase64(apiKey, model, content);
};

export const generatePalette = async (prompt: string, model: string, apiKey: string, image?: { base64: string; mimeType: string; }): Promise<string[] | null> => {
    const fullPrompt = `Generate a harmonious 16-color pixel art palette based on this theme/image: "${prompt}". Your response must be a single JSON object with a key "palette" containing an array of 16 hex color code strings (e.g., "#RRGGBB").`;
    const content = createContentArray(fullPrompt, image);
    const response = await generate(apiKey, model, content, true);
    const json = extractJson<{ palette: string[] }>(response);
    return json?.palette || null;
};

export const upscaleImage = (base64ImageData: string, scaleFactor: number, model: string, apiKey: string): Promise<string | null> => {
    const prompt = `You are an AI specializing in pixel art. Upscale the provided pixel art image by ${scaleFactor}x. It is absolutely crucial to preserve the sharp, hard edges and the distinct pixelated style. Do not introduce any blurring, anti-aliasing, or gradients. Maintain the original color palette exactly. Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END]. No other text, dialogue, or explanation.`;
    const image = { base64: base64ImageData, mimeType: 'image/png' };
    const content = createContentArray(prompt, image);
    return generateImageBase64(apiKey, model, content);
};

export const generateSpriteSheet = (base64ImageData: string, prompt: string, model: string, apiKey: string): Promise<string | null> => {
    const fullPrompt = `Using the provided character sprite as a base, generate a pixel art sprite sheet depicting: ${prompt}. Arrange frames in a single horizontal row. Background must be transparent. Style, character design, and scale must be consistent with the original sprite. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    const image = { base64: base64ImageData, mimeType: 'image/png' };
    const content = createContentArray(fullPrompt, image);
    return generateImageBase64(apiKey, model, content);
};

export const generateAnimation = (prompt: string, width: number, height: number, model: string, apiKey: string): Promise<string | null> => {
    const fullPrompt = `Generate a pixel art animation sprite sheet for: "${prompt}". Each frame must be ${width}x${height} pixels. Arrange frames in a single horizontal row on a transparent background. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    const content = createContentArray(fullPrompt);
    return generateImageBase64(apiKey, model, content);
};

export const generateInbetweens = (startImageBase64: string, endImageBase64: string, frameCount: number, model: string, apiKey: string): Promise<string | null> => {
    const prompt = `Generate ${frameCount} intermediate pixel art frames to animate between the first image (start) and second image (end). Arrange the generated frames in a single horizontal sprite sheet on a transparent background. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    const content = [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${startImageBase64}` } },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${endImageBase64}` } }
    ];
    return generateImageBase64(apiKey, model, content);
};

export const analyzeArtStyle = (images: { base64: string; mimeType: string }[], model: string, apiKey: string): Promise<string | null> => {
    const prompt = `Analyze the following pixel art images. Describe the artistic style in detail (color palette, dithering, outlining, etc.). Create a concise but comprehensive style guide that can be used to generate new art in this exact style.`;
    const content: any[] = [{ type: 'text', text: prompt }];
    images.forEach(img => {
        content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } });
    });
    return generate(apiKey, model, content);
};

export const generateShading = (base64ImageData: string, lightAngle: number, lightIntensity: number, model: string, apiKey: string): Promise<string | null> => {
    const directions = ['right', 'top-right', 'top', 'top-left', 'left', 'bottom-left', 'bottom', 'bottom-right'];
    const lightDirectionDescription = directions[Math.round(lightAngle / 45) % 8];
    const prompt = `Analyze the provided flat-colored sprite. Generate a new layer containing only shading and highlights for a light source from the ${lightDirectionDescription}. The light intensity is ${lightIntensity > 0.7 ? 'strong' : 'normal'}. The output MUST ONLY contain the shading/highlight pixels on a transparent background. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    const image = { base64: base64ImageData, mimeType: 'image/png' };
    const content = createContentArray(prompt, image);
    return generateImageBase64(apiKey, model, content);
};

export const separateImageLayers = async (base64ImageData: string, mimeType: string, width: number, height: number, model: string, apiKey: string): Promise<{ name: string; base64: string; }[] | null> => {
    const prompt = `Analyze this image. Identify distinct logical layers (e.g., background, characters, foreground). For each layer, generate a name and a ${width}x${height} pixel art version of that layer on a transparent background. Your response must be a single JSON object with a key "layers" containing an array of objects, where each object has "name" (string) and "base64" (string, the base64-encoded PNG) keys.`;
    const image = { base64: base64ImageData, mimeType };
    const content = createContentArray(prompt, image);
    const response = await generate(apiKey, model, content, true);
    const json = extractJson<{ layers: { name: string, base64: string }[] }>(response);
    return json?.layers || null;
};
