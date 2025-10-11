// data/achievements.ts
import { Achievement, AchievementID } from '../types';

export const ALL_ACHIEVEMENTS: Achievement[] = [
    {
        id: AchievementID.FIRST_STROKE,
        name: 'First Stroke',
        description: 'Draw your first pixel on the canvas.',
        icon: '🎨',
    },
    {
        id: AchievementID.AI_ARTIST,
        name: 'AI Artist',
        description: 'Generate a piece of art using the AI chat.',
        icon: '🤖',
    },
    {
        id: AchievementID.ANIMATOR,
        name: 'Animator',
        description: 'Create an animation with 10 or more frames.',
        icon: '🎬',
    },
    {
        id: AchievementID.EXPORTER,
        name: 'Exporter',
        description: 'Export your creation for the first time.',
        icon: '💾',
    },
    {
        id: AchievementID.PALETTE_PRO,
        name: 'Palette Pro',
        description: 'Save a custom color palette.',
        icon: '🌈',
    },
    {
        id: AchievementID.LEARNER,
        name: 'Learner',
        description: 'Complete your first tutorial.',
        icon: '🎓',
    },
    {
        id: AchievementID.CHALLENGER,
        name: 'Challenger',
        description: 'Start working on a daily challenge.',
        icon: '🏆',
    },
    {
        id: AchievementID.SFX_MASTER,
        name: 'SFX Master',
        description: 'Save a custom sound effect.',
        icon: '🎵',
    },
];
