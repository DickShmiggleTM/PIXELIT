import { Tool } from './types';
import { PencilIcon, EraserIcon, FillBucketIcon, ColorPickerIcon, LineIcon, RectangleIcon, CircleIcon, DitherIcon, RectangleSelectIcon, EllipseSelectIcon, LassoSelectIcon } from './components/icons/ToolIcons';

export const RESOLUTIONS = [8, 16, 32, 64, 128];

export const TOOLS = [
  { id: Tool.PENCIL, name: 'Pencil', icon: PencilIcon },
  { id: Tool.ERASER, name: 'Eraser', icon: EraserIcon },
  { id: Tool.FILL_BUCKET, name: 'Fill Bucket', icon: FillBucketIcon },
  { id: Tool.COLOR_PICKER, name: 'Color Picker', icon: ColorPickerIcon },
  { id: Tool.LINE, name: 'Line', icon: LineIcon },
  { id: Tool.RECTANGLE, name: 'Rectangle', icon: RectangleIcon },
  { id: Tool.CIRCLE, name: 'Circle', icon: CircleIcon },
  { id: Tool.DITHER, name: 'Dither', icon: DitherIcon },
  { id: Tool.RECTANGLE_SELECT, name: 'Rectangle Select', icon: RectangleSelectIcon },
  { id: Tool.ELLIPSE_SELECT, name: 'Ellipse Select', icon: EllipseSelectIcon },
  { id: Tool.LASSO_SELECT, name: 'Lasso Select', icon: LassoSelectIcon },
];

// FIX: Added 'FX' to AI_ART_MODES to match its usage in the application.
export const AI_ART_MODES = ['Art', 'UI Design', 'Sprite', 'Game Asset', 'Icon', 'Animation', 'FX'];

export const ART_MODE_STYLES: Record<string, string[]> = {
    'Art': ['Classical', 'Abstract', 'Modern'],
    'UI Design': ['Modern', 'Professional', '90\'s', 'Old-School', 'Futuristic', 'Creative', 'Unique', 'Terminal', 'Cyber', 'Fluid'],
    'Sprite': ['Retro', 'Metroidvania', 'Toon', 'Fighter'],
    'Game Asset': ['Retro', 'Metroidvania', 'Toon', 'Fighter'],
    'Icon': ['Flat', '3D', 'Abstract', 'Metallic'],
    'Animation': ['Low Frames', 'Fluid Motion', 'Stop-Motion', 'Max Frames', 'Simple'],
    'FX': ['Digital', 'Overlay', 'Postprocess', 'Hi-Def', 'Low-Def'],
};
