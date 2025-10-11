import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AiModel, AIProvider } from "../types";

export const listModels = async (): Promise<AiModel[]> => {
    // The Gemini API client doesn't have a public model listing method.
    // We return the hardcoded models that are supported by this application.
    return Promise.resolve([
        { name: 'gemini-2.5-flash', provider: AIProvider.GEMINI },
        { name: 'imagen-4.0-generate-001', provider: AIProvider.GEMINI },
        { name: 'gemini-2.5-flash-image', provider: AIProvider.GEMINI },
    ]);
};

export const generatePixelArt = async (
  apiKey: string,
  prompt: string,
  artMode: string,
  resolution: number,
  models: { image: string; vision: string },
  image?: { base64: string; mimeType: string; },
  styleGuide?: string,
): Promise<string | null> => {
  if (!apiKey) throw new Error("Gemini API key is not set.");
  const ai = new GoogleGenAI({ apiKey });
  try {
    let finalPrompt = prompt;
    let basePrompt = `Generate a single, centered piece of pixel art. Style: ${artMode}. Content: {USER_PROMPT}. Resolution: ${resolution}x${resolution} pixels. Background: transparent. No anti-aliasing. The art should look clean and professional.`;
    
    if (styleGuide) {
        basePrompt += ` CRITICAL: Adhere to the following comprehensive style guide: "${styleGuide}"`;
    }

    if (image) {
        const descriptionResponse = await ai.models.generateContent({
            model: models.vision,
            contents: {
                parts: [
                    { inlineData: { data: image.base64, mimeType: image.mimeType } },
                    { text: 'Describe this image in detail for an artist to recreate.' }
                ]
            }
        });
        const description = descriptionResponse.text;
        finalPrompt = `Based on the description "${description}", ${prompt}`;
    }

    const fullPrompt = basePrompt.replace('{USER_PROMPT}', finalPrompt);
    
    const response = await ai.models.generateImages({
        model: models.image,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      return response.generatedImages[0].image.imageBytes;
    }
    return null;
  } catch (error) {
    console.error("Error generating pixel art with Gemini:", error);
    throw error;
  }
};

export const getPromptSuggestions = async (apiKey: string, currentPrompt: string, model: string): Promise<string[] | null> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    if (!currentPrompt.trim()) return null;
    const ai = new GoogleGenAI({ apiKey });
    try {
        const systemPrompt = `You are an expert prompt engineer for an AI image generator specializing in pixel art. 
        Your task is to improve the user's prompt to generate better, more detailed, and creative results. 
        Given the user's prompt, provide 3 alternative, improved prompts.
        The prompts should add descriptive details about style (e.g., 8-bit, 16-bit, dithering), lighting (e.g., moody, neon, god rays), composition, and mood suitable for pixel art.
        Keep each suggestion to a reasonable length.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: `User's prompt: "${currentPrompt}"`,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            description: 'An array of 3 improved prompt strings.',
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        if (result.suggestions && Array.isArray(result.suggestions)) {
            return result.suggestions;
        }
        return null;

    } catch (error) {
        console.error("Error getting prompt suggestions with Gemini:", error);
        throw error;
    }
};

export const generateFx = async (apiKey: string, prompt: string, width: number, height: number, model: string): Promise<string | null> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const fullPrompt = `Generate a single pixel art visual effect of: "${prompt}".
        - The effect should be centered in the frame.
        - Dimensions: ${width}x${height} pixels.
        - The background must be transparent.
        - Style: Pixel art, no anti-aliasing.
        - Return only the final image of the effect.`;

        const response = await ai.models.generateImages({
            model: model,
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: `${width}:${height}`,
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        return null;
    } catch (error) {
        console.error("Error generating FX with Gemini:", error);
        throw error;
    }
};


export const generatePalette = async (apiKey: string, prompt: string, model: string, image?: { base64: string; mimeType: string; }): Promise<string[] | null> => {
  if (!apiKey) throw new Error("Gemini API key is not set.");
  const ai = new GoogleGenAI({ apiKey });
  try {
    const contents: { parts: any[] } = { parts: [] };
    if (image) {
      contents.parts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
    }
    contents.parts.push({ text: `Generate a harmonious 16-color pixel art palette based on this theme/image: "${prompt}".` });

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            palette: {
              type: Type.ARRAY,
              description: 'An array of 16 hex color codes (e.g., "#RRGGBB").',
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    const result = JSON.parse(jsonText);
    if (result.palette && Array.isArray(result.palette)) {
      return result.palette.filter(c => /^#[0-9a-f]{6}$/i.test(c));
    }
    return null;
  } catch (error) {
    console.error("Error generating palette with Gemini:", error);
    throw error;
  }
};

export const upscaleImage = async (apiKey: string, base64ImageData: string, scaleFactor: number, model: string): Promise<string | null> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: 'image/png' } },
                    { text: `Upscale this pixel art image by ${scaleFactor}x. It is crucial to preserve the sharp, hard edges and the distinct pixelated style. Do not introduce any blurring, anti-aliasing, or gradients. Maintain the original color palette as closely as possible. Return only the upscaled image.` },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;
    } catch (error) {
        console.error("Error upscaling image with Gemini:", error);
        throw error;
    }
};

export const generateSpriteSheet = async (apiKey: string, base64ImageData: string, prompt: string, model: string): Promise<string | null> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const fullPrompt = `Using the provided character sprite as a base, generate a pixel art sprite sheet for a game. The sprite sheet should depict: ${prompt}. Arrange all frames in a single horizontal row. The background must be transparent. The style, character design, and scale must be consistent with the original sprite. Return only the final sprite sheet image.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: 'image/png' } },
                    { text: fullPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;

    } catch (error) {
        console.error("Error generating sprite sheet with Gemini:", error);
        throw error;
    }
};

export const generateAnimation = async (apiKey: string, prompt: string, width: number, height: number, model: string): Promise<string | null> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const fullPrompt = `Generate a pixel art animation based on this prompt: "${prompt}".
        - The animation should be a sprite sheet with all frames arranged in a single horizontal row.
        - Each frame must be exactly ${width}x${height} pixels.
        - The background must be transparent.
        - Maintain a consistent pixel art style with no anti-aliasing.
        - Return only the final sprite sheet image.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [{ text: fullPrompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;
    } catch (error) {
        console.error("Error generating animation with Gemini:", error);
        throw error;
    }
};

export const generateInbetweens = async (apiKey: string, startImageBase64: string, endImageBase64: string, frameCount: number, model: string): Promise<string | null> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const fullPrompt = `Generate ${frameCount} intermediate pixel art frames to create a smooth animation between the first image (start frame) and the second image (end frame).
        - The generated frames should logically transition from the start to the end.
        - The style, resolution, and palette should be consistent with the provided frames.
        - Arrange the ${frameCount} generated frames in a single horizontal row on a sprite sheet.
        - The background must be transparent.
        - Return only the sprite sheet of the in-between frames.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { data: startImageBase64, mimeType: 'image/png' } },
                    { inlineData: { data: endImageBase64, mimeType: 'image/png' } },
                    { text: fullPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;
    } catch (error) {
        console.error("Error generating in-betweens with Gemini:", error);
        throw error;
    }
};

export const analyzeArtStyle = async (apiKey: string, images: { base64: string; mimeType: string }[], model: string): Promise<string | null> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const prompt = `Analyze the following pixel art images. Describe the artistic style in detail, focusing on color palette characteristics (saturation, value range, common color harmonies), dithering techniques, outlining style (hard, soft, colored), anti-aliasing usage, character/object proportions, and overall mood. Create a concise but comprehensive style guide that can be used to generate new art in this exact style.`;
        const imageParts = images.map(image => ({
            inlineData: { data: image.base64, mimeType: image.mimeType }
        }));

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [{ text: prompt }, ...imageParts]
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing art style with Gemini:", error);
        throw error;
    }
};

export const generateShading = async (
    apiKey: string,
    base64ImageData: string,
    lightAngle: number, // 0-360 degrees, 0 is right, 90 is top
    lightIntensity: number, // 0-1
    model: string,
): Promise<string | null> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const directions = ['right', 'top-right', 'top', 'top-left', 'left', 'bottom-left', 'bottom', 'bottom-right'];
        const index = Math.round(lightAngle / 45) % 8;
        const lightDirectionDescription = directions[index];

        const fullPrompt = `Analyze the provided flat-colored pixel art sprite. Generate a new layer containing only shading and highlights for this sprite.
- The light source is coming from ${lightDirectionDescription}.
- The intensity of the light is ${lightIntensity > 0.7 ? 'strong' : 'normal'}.
- The output image MUST ONLY contain the shading and highlight pixels on a transparent background. Do not include the original sprite's colors.
- Use a pixel art style for the shading. Use techniques like dithering where appropriate, but keep it clean.
- The shading colors should be darker tones (for shadows) and lighter tones (for highlights) of the original colors, suitable for overlaying.
- Return only the final shading/highlight layer image.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: 'image/png' } },
                    { text: fullPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;
    } catch (error) {
        console.error("Error generating shading with Gemini:", error);
        throw error;
    }
};

export const separateImageLayers = async (
    apiKey: string,
    base64ImageData: string,
    mimeType: string,
    width: number,
    height: number,
    model: string,
): Promise<{ name: string, base64: string }[] | null> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    try {
        const prompt = `Analyze this image. Identify the distinct logical layers (e.g., background, mid-ground, foreground characters, objects). For each layer you identify, do the following:
1. Return a text part containing a short, descriptive name for that layer (e.g., "Sky", "Main Character", "Tree").
2. Immediately following the text part, return an image part containing ONLY that layer, pixelated to ${width}x${height} resolution, on a transparent background.
The final output should be a sequence of text and image parts. The background layer should be first. The art style must be pixel perfect with no anti-aliasing.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const parts = response.candidates?.[0]?.content?.parts ?? [];
        if (parts.length < 2) return null;

        const separatedLayers: { name: string, base64: string }[] = [];
        let currentName: string | null = null;

        for (const part of parts) {
            if (part.text) {
                currentName = part.text.trim().replace(/"/g, ''); // Clean up potential quotes
            } else if (part.inlineData && currentName) {
                separatedLayers.push({ name: currentName, base64: part.inlineData.data });
                currentName = null; // Reset name for the next pair
            }
        }
        
        if (separatedLayers.length === 0) return null;

        return separatedLayers;

    } catch (error) {
        console.error("Error separating image layers with Gemini:", error);
        throw error;
    }
};
