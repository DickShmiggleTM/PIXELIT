import React, { useState, useCallback, useRef, useEffect } from 'react';
import PixelatedButton from './PixelatedButton';
import { AI_ART_MODES, ART_MODE_STYLES } from '../constants';
import { MicIcon, SendIcon, SparkleIcon } from './icons/ChatIcons';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { Asset, AchievementID } from '../types';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

interface AiChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onGenerateArt: (prompt: string, artMode: string, image?: { base64: string; mimeType: string; }, styleGuide?: string) => void;
  onGenerateAnimation: (prompt: string) => void;
  onGenerateFx: (prompt: string) => void;
  onGetPromptSuggestions: (prompt: string) => Promise<string[] | null>;
  assets: Asset[];
  activeStyleProfile: Asset | null;
  onSetActiveStyleProfile: (asset: Asset | null) => void;
  unlockAchievement: (id: AchievementID) => void;
}

const AiChatPanel: React.FC<AiChatPanelProps> = ({
  isOpen, onToggle, onGenerateArt, onGenerateAnimation, onGenerateFx, onGetPromptSuggestions,
  assets, activeStyleProfile, onSetActiveStyleProfile, unlockAchievement
}) => {
  const [prompt, setPrompt] = useState('');
  const [artMode, setArtMode] = useState(AI_ART_MODES[0]);
  const [styleModifier, setStyleModifier] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<{ base64: string; mimeType: string; dataUrl: string; } | null>(null);
  
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { isRecording, transcript, error, startRecording } = useGeminiLive();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleProfiles = assets.filter(a => a.type === 'style');

  useEffect(() => {
    if(transcript) setPrompt(transcript);
  }, [transcript]);

  // Reset style modifier when art mode changes
  useEffect(() => {
    setStyleModifier('');
  }, [artMode]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setImage({ base64, mimeType: file.type, dataUrl: URL.createObjectURL(file) });
      if (e.target) e.target.value = ''; // Allow re-uploading the same file
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!prompt || isLoading) return;
    setIsLoading(true);
    setSuggestions(null);
    setApiError(null);
    
    const finalPrompt = styleModifier ? `${prompt}, Style: ${styleModifier}` : prompt;

    try {
      if (artMode === 'Animation') {
        await onGenerateAnimation(finalPrompt);
      } else if (artMode === 'FX') {
        await onGenerateFx(finalPrompt);
      } else {
        await onGenerateArt(finalPrompt, artMode, image ? { base64: image.base64, mimeType: image.mimeType } : undefined, activeStyleProfile?.data);
      }
      unlockAchievement(AchievementID.AI_ARTIST);
    } catch (e: any) {
      console.error(e);
      setApiError(e.message || "An unknown error occurred during generation.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, artMode, styleModifier, isLoading, onGenerateArt, onGenerateAnimation, onGenerateFx, image, activeStyleProfile, unlockAchievement]);

  const handleStyleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const assetId = e.target.value;
    if (assetId === 'default') {
        onSetActiveStyleProfile(null);
    } else {
        const selectedProfile = styleProfiles.find(p => p.id === assetId);
        if (selectedProfile) {
            onSetActiveStyleProfile(selectedProfile);
        }
    }
  };

  const handleGetSuggestions = async () => {
    if (!prompt || isSuggesting) return;
    setIsSuggesting(true);
    setApiError(null);
    try {
        const result = await onGetPromptSuggestions(prompt);
        setSuggestions(result);
    } catch (e: any) {
        console.error(e);
        setApiError(e.message || "Failed to get suggestions.");
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    setPrompt(suggestion);
    setSuggestions(null);
  };

  const availableModifiers = ART_MODE_STYLES[artMode];

  return (
    <>
        <div 
            className={`fixed top-0 left-0 h-[calc(100vh-2.5rem)] bg-black/50 backdrop-blur-sm border-r-2 border-cyan-400 transform transition-transform duration-300 ease-in-out z-30 ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-64 p-2 flex flex-col gap-4 text-xs text-cyan-300`}
        >
            <h3 className="text-sm font-bold border-b-2 border-fuchsia-500 pb-1 text-fuchsia-400 tracking-widest">AI GENERATOR</h3>
            
            <div className="flex-grow flex flex-col gap-2 p-1 border-2 border-cyan-400/50">
                <div className="flex-grow bg-black/30 p-2 overflow-y-auto">
                    <p>Use text, your voice, or an image to generate pixel art.</p>
                    {apiError && <p className="text-red-400 mt-2">Error: {apiError}</p>}
                    {error && <p className="text-red-400 mt-2">Mic Error: {error}</p>}
                    {image && (
                        <div className="mt-2 relative w-24 h-24 mx-auto">
                        <img src={image.dataUrl} alt="Upload preview" className="w-full h-full object-contain border border-fuchsia-500" />
                        <button onClick={() => setImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">&times;</button>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label htmlFor="art-mode-select">Art Mode:</label>
                <select 
                    id="art-mode-select" 
                    value={artMode} 
                    onChange={e => setArtMode(e.target.value)}
                    className="w-full bg-black/50 border-2 border-cyan-400 p-1 mt-1"
                >
                    {AI_ART_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                </select>
            </div>
            
            {availableModifiers && availableModifiers.length > 0 && (
                <div>
                    <label htmlFor="style-modifier-select">Style:</label>
                    <select
                        id="style-modifier-select"
                        value={styleModifier}
                        onChange={e => setStyleModifier(e.target.value)}
                        className="w-full bg-black/50 border-2 border-cyan-400 p-1 mt-1"
                    >
                        <option value="">Default Style</option>
                        {availableModifiers.map(style => <option key={style} value={style}>{style}</option>)}
                    </select>
                </div>
            )}

            <div>
                <label htmlFor="style-profile-select">Learned Style Profile:</label>
                <select 
                    id="style-profile-select" 
                    value={activeStyleProfile?.id || 'default'} 
                    onChange={handleStyleProfileChange}
                    className="w-full bg-black/50 border-2 border-cyan-400 p-1 mt-1"
                >
                    <option value="default">Default AI Style</option>
                    {styleProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                </select>
            </div>

            <div className="flex flex-col gap-2 relative">
                 <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => {if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
                    placeholder={isRecording ? 'Listening...' : 'Type a prompt...'}
                    className="w-full h-24 p-2 bg-black/50 border-2 border-cyan-400 text-cyan-300 placeholder-cyan-700 resize-none"
                    disabled={isLoading || isRecording}
                />
                 <button onClick={handleGetSuggestions} disabled={isSuggesting || !prompt} title="Get prompt suggestions" className="absolute top-1 right-1 p-1 text-fuchsia-400 hover:text-white disabled:text-gray-600">
                    {isSuggesting ? <div className="w-4 h-4 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin"></div> : <SparkleIcon />}
                 </button>

                 {suggestions && (
                    <div className="absolute bottom-full mb-1 w-full p-2 bg-black/80 border-2 border-fuchsia-500 backdrop-blur-sm flex flex-col gap-2 z-10">
                        <div className="flex justify-between items-center">
                            <h5 className="font-bold text-fuchsia-400">Suggestions</h5>
                            <button onClick={() => setSuggestions(null)} className="text-cyan-300 hover:text-white">&times;</button>
                        </div>
                        {suggestions.map((s, i) => (
                            <p key={i} onClick={() => handleApplySuggestion(s)} className="p-1 border border-cyan-400/30 hover:bg-cyan-500/20 cursor-pointer">
                                {s}
                            </p>
                        ))}
                    </div>
                 )}

                <div className="flex gap-1">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                    <PixelatedButton className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={isLoading || artMode === 'Animation' || artMode === 'FX'}>Img</PixelatedButton>
                    <PixelatedButton className="flex-1" onClick={startRecording} disabled={isLoading} active={isRecording}>
                        <MicIcon />
                    </PixelatedButton>
                    <PixelatedButton className="flex-1" onClick={handleSubmit} disabled={isLoading || isRecording || !prompt}>
                        {isLoading ? '...' : <SendIcon />}
                    </PixelatedButton>
                </div>
            </div>
        </div>
        <PixelatedButton 
            className="fixed top-4 left-4 z-40"
            onClick={onToggle}
            style={{ transform: `translateX(${isOpen ? '16rem' : '0'})`, transition: 'transform 300ms ease-in-out' }}
        >
            {isOpen ? '<' : '>'} AI Panel
        </PixelatedButton>
    </>
  );
};

export default AiChatPanel;
