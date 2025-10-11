// services/ollamaService.ts

import { AiModel, AIProvider } from "../types";

const extractBase64 = (text: string): string | null => {
    const regex = /\[BASE64_START\](.*?)\[BASE64_END\]/;
    const match = text.match(regex);
    return match ? match[1].trim() : null;
};

const extractJson = <T>(text: string): T | null => {
    try {
        const regex = /```json\s*([\s\S]+?)\s*```/;
        const match = text.match(regex);
        if (match && match[1]) {
            return JSON.parse(match[1]) as T;
        }
        // Fallback for non-fenced JSON
        return JSON.parse(text) as T;
    } catch (error) {
        console.error("Failed to parse JSON from text:", text, error);
        return null;
    }
}

export const listModels = async (url: string): Promise<AiModel[]> => {
    try {
        const response = await fetch(`${url}/api/tags`);
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.models.map((model: any) => ({
            name: model.name,
            provider: AIProvider.OLLAMA,
        }));
    } catch (error) {
        console.error("Failed to fetch Ollama models:", error);
        return [];
    }
};

const generate = async (url: string, model: string, prompt: string, images?: string[]): Promise<any> => {
    const body = {
        model,
        prompt,
        images,
        stream: false,
    };
    const response = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
    }
    return response.json();
};

// NOTE: Ollama doesn't natively generate images. The following functions rely on a
// multimodal model (like LLaVA) being prompted to return a base64 encoded image string.
// This is a workaround and its success depends heavily on the model's capabilities.

export const generatePixelArt = async (
    prompt: string,
    artMode: string,
    resolution: number,
    models: { image: string; vision: string },
    url: string,
    image?: { base64: string; mimeType: string; },
    styleGuide?: string,
): Promise<string | null> => {
    let finalPrompt = prompt;

    if (image) {
        const descriptionResponse = await generate(url, models.vision, 'Describe this image in detail for an artist to recreate.', [image.base64]);
        const description = descriptionResponse.response;
        finalPrompt = `Based on the description "${description}", ${prompt}`;
    }

    let basePrompt = `Generate a single, centered piece of pixel art. Style: ${artMode}. Content: ${finalPrompt}. Resolution: ${resolution}x${resolution} pixels. Background: transparent. No anti-aliasing.`;
    if (styleGuide) {
        basePrompt += ` CRITICAL: Adhere to this style guide: "${styleGuide}"`;
    }
    basePrompt += ` CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END]. No other text or explanation.`;

    const response = await generate(url, models.image, basePrompt, image ? [image.base64] : undefined);
    return extractBase64(response.response);
};


export const getPromptSuggestions = async (currentPrompt: string, model: string, url: string): Promise<string[] | null> => {
    const prompt = `You are an expert prompt engineer for an AI image generator specializing in pixel art. Your task is to improve the user's prompt. Given the user's prompt: "${currentPrompt}", provide 3 alternative, improved prompts. The prompts should add descriptive details about style, lighting, composition, and mood. Your response must be a single JSON object in a markdown block, with a key "suggestions" containing an array of 3 strings.`;
    
    const response = await generate(url, model, prompt);
    const json = extractJson<{ suggestions: string[] }>(response.response);
    return json?.suggestions || null;
};

export const generateFx = async (prompt: string, width: number, height: number, model: string, url: string): Promise<string | null> => {
    const fullPrompt = `Generate a single pixel art visual effect of: "${prompt}". Dimensions: ${width}x${height} pixels. The background must be transparent. The style must be pixel art with no anti-aliasing. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END]. No other text or explanation.`;
    const response = await generate(url, model, fullPrompt);
    return extractBase64(response.response);
};

export const generatePalette = async (prompt: string, model: string, url: string, image?: { base64: string; mimeType: string; }): Promise<string[] | null> => {
    const fullPrompt = `Generate a harmonious 16-color pixel art palette based on this theme/image: "${prompt}". Your response must be a single JSON object in a markdown block, with a key "palette" containing an array of 16 hex color code strings (e.g., "#RRGGBB").`;
    const response = await generate(url, model, fullPrompt, image ? [image.base64] : undefined);
    const json = extractJson<{ palette: string[] }>(response.response);
    return json?.palette || null;
};

export const upscaleImage = async (base64ImageData: string, scaleFactor: number, model: string, url: string): Promise<string | null> => {
    const prompt = `Upscale this pixel art image by ${scaleFactor}x. Preserve sharp, hard edges and the pixelated style. Do not introduce blurring or anti-aliasing. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END]. No other text or explanation.`;
    const response = await generate(url, model, prompt, [base64ImageData]);
    return extractBase64(response.response);
};

export const generateSpriteSheet = async (base64ImageData: string, prompt: string, model: string, url: string): Promise<string | null> => {
    const fullPrompt = `Using the provided character sprite as a base, generate a pixel art sprite sheet depicting: ${prompt}. Arrange frames in a single horizontal row. Background must be transparent. Style must be consistent. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    const response = await generate(url, model, fullPrompt, [base64ImageData]);
    return extractBase64(response.response);
};

export const generateAnimation = async (prompt: string, width: number, height: number, model: string, url: string): Promise<string | null> => {
    const fullPrompt = `Generate a pixel art animation sprite sheet for: "${prompt}". Each frame must be ${width}x${height} pixels. Arrange frames in a single horizontal row on a transparent background. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    const response = await generate(url, model, fullPrompt);
    return extractBase64(response.response);
};

export const generateInbetweens = async (startImageBase64: string, endImageBase64: string, frameCount: number, model: string, url: string): Promise<string | null> => {
    const prompt = `Generate ${frameCount} intermediate pixel art frames to animate between the first image (start) and second image (end). Arrange the generated frames in a single horizontal sprite sheet on a transparent background. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    const response = await generate(url, model, prompt, [startImageBase64, endImageBase64]);
    return extractBase64(response.response);
};

export const analyzeArtStyle = async (images: { base64: string; mimeType: string }[], model: string, url: string): Promise<string | null> => {
    const prompt = `Analyze the following pixel art images. Describe the artistic style in detail (color palette, dithering, outlining, etc.). Create a concise but comprehensive style guide that can be used to generate new art in this exact style.`;
    const response = await generate(url, model, prompt, images.map(i => i.base64));
    return response.response;
};

export const generateShading = async (base64ImageData: string, lightAngle: number, lightIntensity: number, model: string, url: string): Promise<string | null> => {
    const directions = ['right', 'top-right', 'top', 'top-left', 'left', 'bottom-left', 'bottom', 'bottom-right'];
    const lightDirectionDescription = directions[Math.round(lightAngle / 45) % 8];
    const prompt = `Analyze the provided flat-colored sprite. Generate a new layer containing only shading and highlights for a light source from the ${lightDirectionDescription}. The light intensity is ${lightIntensity > 0.7 ? 'strong' : 'normal'}. The output MUST ONLY contain the shading/highlight pixels on a transparent background. CRITICAL: Your entire response must be a single, raw, base64-encoded PNG string, wrapped like this: [BASE64_START]...base64_data...[BASE64_END].`;
    const response = await generate(url, model, prompt, [base64ImageData]);
    return extractBase64(response.response);
};

export const separateImageLayers = async (base64ImageData: string, mimeType: string, width: number, height: number, model: string, url: string): Promise<{ name: string, base64: string }[] | null> => {
    const prompt = `Analyze this image. Identify distinct logical layers (e.g., background, characters, foreground). For each layer, generate a name and a ${width}x${height} pixel art version of that layer on a transparent background. Your response must be a single JSON object in a markdown block, with a key "layers" containing an array of objects, where each object has "name" (string) and "base64" (string, the base64-encoded PNG) keys.`;
    const response = await generate(url, model, prompt, [base64ImageData]);
    const json = extractJson<{ layers: { name: string, base64: string }[] }>(response.response);
    return json?.layers || null;
};
