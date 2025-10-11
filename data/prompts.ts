// data/prompts.ts

export const CREATIVE_PROMPTS: string[] = [
    "A magical sword stuck in a stone.",
    "A retro spaceship console.",
    "An enchanted forest at twilight.",
    "A bustling cyberpunk city street.",
    "A tiny robot exploring a giant kitchen.",
    "A ghost playing a video game.",
    "An alien fruit stand on Mars.",
    "A cozy potion shop.",
    "A knight riding a giant snail.",
    "A futuristic motorcycle.",
    "A secret underwater library.",
    "A friendly dragon delivering mail.",
    "A set of elemental magic icons (fire, water, earth, air).",
    "A character portrait of a space pirate.",
    "A steaming bowl of ramen.",
    "A tranquil bonsai tree.",
    "A haunted grandfather clock.",
    "A hero's shield.",
    "A mysterious locked treasure chest.",
    "A landscape view from a mountaintop.",
];

export const getDailyPrompt = (): string => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now as any) - (start as any);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    const promptIndex = dayOfYear % CREATIVE_PROMPTS.length;
    return CREATIVE_PROMPTS[promptIndex];
}
