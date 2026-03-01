import { AiModel, AIProvider } from '../types';

const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_INFERENCE_URL = 'https://api-inference.huggingface.co/models';

const parseDataUrl = (dataUrl: string): string => dataUrl.startsWith('data:') ? dataUrl.split(',')[1] : dataUrl;

const runChatCompletion = async (apiKey: string, model: string, prompt: string): Promise<string | null> => {
    const response = await fetch(HF_ROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'You are an expert pixel-art and game-sprite assistant.' },
                { role: 'user', content: prompt },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace chat request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
};

const runImageInference = async (apiKey: string, model: string, prompt: string): Promise<string | null> => {
    const response = await fetch(`${HF_INFERENCE_URL}/${model}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputs: prompt,
            options: { wait_for_model: true },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace image request failed (${response.status}): ${errorText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
};

export const listModels = async (configuredModel: string): Promise<AiModel[]> => {
    return [
        { name: configuredModel || 'black-forest-labs/FLUX.1-dev', provider: AIProvider.HUGGINGFACE },
        { name: 'stabilityai/stable-diffusion-xl-base-1.0', provider: AIProvider.HUGGINGFACE },
        { name: 'black-forest-labs/FLUX.1-schnell', provider: AIProvider.HUGGINGFACE },
    ];
};

export const generateSpriteSheet = async (
    base64ImageData: string,
    prompt: string,
    imageModel: string,
    apiKey: string,
): Promise<string | null> => {
    const sourceImage = parseDataUrl(base64ImageData);
    const fullPrompt = `Create a pixel-art sprite sheet PNG. ${prompt}. Keep a transparent background and consistent character proportions. Source image (base64 PNG): ${sourceImage}`;
    return runImageInference(apiKey, imageModel, fullPrompt);
};

export const editSpriteSheet = async (
    base64ImageData: string,
    prompt: string,
    imageModel: string,
    apiKey: string,
): Promise<string | null> => {
    const sourceImage = parseDataUrl(base64ImageData);
    const fullPrompt = `Edit this existing sprite/sprite-sheet while preserving art style and palette. Instruction: ${prompt}. Existing sheet (base64 PNG): ${sourceImage}`;
    return runImageInference(apiKey, imageModel, fullPrompt);
};

export const generateDirectionalSpriteSheet = async (
    base64ImageData: string,
    prompt: string,
    directions: 4 | 8,
    framesPerDirection: number,
    imageModel: string,
    apiKey: string,
): Promise<string | null> => {
    const sourceImage = parseDataUrl(base64ImageData);
    const directionalPrompt = `Generate a ${directions}-direction pixel-art sprite sheet with ${framesPerDirection} animation frames per direction. ${prompt}. Include rows per direction suitable for Godot animation import. Source image (base64 PNG): ${sourceImage}`;
    return runImageInference(apiKey, imageModel, directionalPrompt);
};

export const generatePixelArt = async (
    prompt: string,
    artMode: string,
    resolution: number,
    imageModel: string,
    apiKey: string,
): Promise<string | null> => runImageInference(apiKey, imageModel, `${artMode} pixel art, ${resolution}x${resolution}, ${prompt}`);

export const sendChatMessage = async (apiKey: string, model: string, message: string): Promise<string | null> => runChatCompletion(apiKey, model, message);
