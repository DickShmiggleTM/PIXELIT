import React from 'react';

export const PencilIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M3 21L3 18L13 8L16 11L6 21H3Z"/>
        <path d="M14 7L17 10L21 6L18 3L14 7Z"/>
    </svg>
);

export const EraserIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M4 18H15L21 12L12 3L6 9V18H4Z"/>
        <path d="M4 19H17V21H4V19Z" />
    </svg>
);

export const FillBucketIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M3 12L12 21L21 12L19 10L12 17L5 10L3 12Z"/>
        <path d="M10 3H14V9H10V3Z"/>
        <path d="M12 8L18 2H6L12 8Z"/>
    </svg>
);

export const ColorPickerIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M12 2C12 2 4 10 4 15C4 19 8 23 12 23C16 23 20 19 20 15C20 10 12 2 12 2ZM12 18C10 18 8 16 8 14C8 12 10 10 12 10C14 10 16 12 16 14C16 16 14 18 12 18Z"/>
    </svg>
);

export const LineIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M3 21L21 3L22 4L4 22L3 21Z"/>
    </svg>
);

export const RectangleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M4 4H20V6H4V4Z"/>
        <path d="M4 18H20V20H4V18Z"/>
        <path d="M4 6H6V18H4V6Z"/>
        <path d="M18 6H20V18H18V6Z"/>
    </svg>
);

export const CircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M12 4 C8.691 4 6 6.691 6 10 L6 14 C6 17.309 8.691 20 12 20 S18 17.309 18 14 L18 10 C18 6.691 15.309 4 12 4 Z M12 6 C14.209 6 16 7.791 16 10 L16 14 C16 16.209 14.209 18 12 18 S8 16.209 8 14 L8 10 C8 7.791 9.791 6 12 6 Z"/>
    </svg>
);

export const DitherIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M4 4h4v4H4V4zm4 4h4v4H8V8zM4 12h4v4H4v-4zm4 4h4v4H8v-4z M12 4h4v4h-4V4zm4 4h4v4h-4V8zm-4 4h4v4h-4v-4zm4 4h4v4h-4v-4z"/>
    </svg>
);

export const RectangleSelectIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M4 4 H20 V20 H4 Z" strokeWidth="2" strokeDasharray="2 2"/>
    </svg>
);

export const EllipseSelectIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <ellipse cx="12" cy="12" rx="9" ry="7" strokeWidth="2" strokeDasharray="2 2"/>
    </svg>
);

export const LassoSelectIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M8 3 C3 3 3 8 3 8 S3 13 8 15 S13 18 16 17 S21 15 21 11 S19 3 14 3 S11 3 8 3Z" strokeWidth="2" strokeDasharray="2 2"/>
    </svg>
);