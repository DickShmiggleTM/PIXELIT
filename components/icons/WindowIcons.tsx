import React from 'react';

export const CloseIcon: React.FC = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M0 0 L10 10 M0 10 L10 0" stroke="white" strokeWidth="2"/>
    </svg>
);

export const StartIcon: React.FC = () => (
     <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M2 2H16V16H2V2Z" fill="#1e293b"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M3 3H15V15H3V3ZM4 4V14H14V4H4Z" fill="#00ffff"/>
        <path d="M5 5H8V9H5V5Z" fill="#f0f"/>
        <path d="M9 5H13V6H9V5Z" fill="#f0f"/>
        <path d="M9 7H13V8H9V7Z" fill="#f0f"/>
        <path d="M5 10H13V13H5V10Z" fill="#1e293b" />
        <path d="M6 11H12V12H6V11Z" fill="#f0f" />
    </svg>
);