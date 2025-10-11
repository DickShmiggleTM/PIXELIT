// data/tutorials.ts
import { Tutorial } from '../types';

export const TUTORIALS: Tutorial[] = [
    {
        id: 'basics',
        title: 'Interface Basics',
        description: 'Learn the fundamental tools and windows of Pixelit.',
        steps: [
            {
                title: 'Welcome to Pixelit!',
                content: 'This short tutorial will guide you through the main features. Click "Next" to begin.',
            },
            {
                targetId: 'toolbox-toggle',
                title: 'The Toolbox',
                content: 'This is the Toolbox toggle. The Toolbox contains all your drawing tools, color palettes, and canvas settings. Let\'s open it.',
                placement: 'left',
            },
            {
                targetId: 'tool-PENCIL',
                title: 'Pencil Tool',
                content: 'This is the Pencil tool, your primary tool for drawing pixels. Make sure it\'s selected.',
                placement: 'left',
            },
            {
                targetId: 'toolbox-primary-color',
                title: 'Primary Color',
                content: 'This swatch shows your currently selected primary color. Click it to open a color picker and choose a color you like.',
                placement: 'left',
            },
            {
                targetId: 'grid-canvas-container',
                title: 'The Canvas',
                content: 'This is your canvas! Click and drag here with the Pencil tool to start drawing.',
                placement: 'top',
            },
            {
                targetId: 'layers-window-button',
                title: 'Layers',
                content: 'Pixelit supports layers, just like professional art software. Let\'s open the Layers window from the Start Menu.',
                placement: 'bottom',
            },
            {
                targetId: 'layers-add-button',
                title: 'Adding a Layer',
                content: 'You can add a new layer by clicking this button. Try drawing on your new layer!',
                placement: 'top',
            },
            {
                targetId: 'animation-window-button',
                title: 'Animation',
                content: 'Ready to animate? Open the Animation Timeline from the Start Menu to create frame-by-frame animations.',
                placement: 'bottom',
            },
            {
                title: 'Tutorial Complete!',
                content: 'You\'ve learned the basics! Feel free to explore the other windows and tools. Happy creating!',
            }
        ]
    }
];
