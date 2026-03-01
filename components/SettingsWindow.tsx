import React, { useState, useEffect } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { AISettings, AIProvider, AiModel } from '../types';
import * as aiService from '../services/aiService';

interface SettingsWindowProps {
  title: string;
  onClose: () => void;
  initialSettings: AISettings;
  onSave: (settings: AISettings) => void;
}

const SettingsWindow: React.FC<SettingsWindowProps> = ({ title, onClose, initialSettings, onSave }) => {
    const [settings, setSettings] = useState<AISettings>(initialSettings);
    const [models, setModels] = useState<AiModel[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchModels = async () => {
        setIsLoadingModels(true);
        setError(null);
        setModels([]);
        try {
            // Temporarily init service to fetch models for the selected provider
            aiService.init(settings);
            const fetchedModels = await aiService.listModels();

            let providerError: string | null = null;
            if (fetchedModels.length === 0) {
                 switch(settings.provider) {
                    case AIProvider.OLLAMA:
                        providerError = "Could not connect to Ollama or no models found."; break;
                    case AIProvider.GEMINI:
                    case AIProvider.MISTRAL:
                    case AIProvider.COHERE:
                    case AIProvider.OPENROUTER:
                    case AIProvider.OPENAI:
                    case AIProvider.HUGGINGFACE:
                        providerError = "Failed to fetch models. Is the API key correct?"; break;
                }
            }
            if(providerError) throw new Error(providerError);

            setModels(fetchedModels);

            // If the currently selected model for a type doesn't exist in the new list, select the first available one.
            const modelNames = new Set(fetchedModels.map(m => m.name));
            const currentModels = settings.models[settings.provider];
            const updatedProviderModels = { ...currentModels };
            let changed = false;

            (['text', 'image', 'vision'] as const).forEach(type => {
                if (!modelNames.has(currentModels[type]) && fetchedModels.length > 0) {
                    updatedProviderModels[type] = fetchedModels[0].name;
                    changed = true;
                }
            });

            if (changed) {
                setSettings(prev => ({
                    ...prev,
                    models: { ...prev.models, [settings.provider]: updatedProviderModels }
                }));
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoadingModels(false);
            // Revert service to initial settings
            aiService.init(initialSettings);
        }
    };
    
    // Fetch models on initial load or provider change
    useEffect(() => {
        handleFetchModels();
    }, [settings.provider, settings.ollamaUrl, settings.geminiApiKeys, settings.mistralApiKeys, settings.cohereApiKeys, settings.openrouterApiKeys, settings.openaiApiKeys, settings.huggingfaceApiKeys]);

    const handleSave = () => {
        onSave(settings);
        onClose();
    };
    
    const ModelSelect: React.FC<{ label: string, modelType: 'text' | 'image' | 'vision' }> = ({ label, modelType }) => {
        const currentProvider = settings.provider;
        
        return (
            <div className="flex items-center gap-2">
                <label className="w-28 flex-shrink-0">{label}:</label>
                <select
                    value={settings.models[currentProvider]?.[modelType] || ''}
                    onChange={(e) => setSettings(prev => ({
                        ...prev,
                        models: {
                            ...prev.models,
                            [currentProvider]: { ...prev.models[currentProvider], [modelType]: e.target.value }
                        }
                    }))}
                    className="w-full bg-black/80 border border-cyan-400 p-1"
                    disabled={models.length === 0}
                >
                    {models.length === 0 && <option>No models loaded</option>}
                    {models.map(m => <option key={m.name} value={m.name}>{m.name.split('/').pop()}</option>)}
                </select>
            </div>
        );
    };

    const ApiKeyManager: React.FC<{
        provider: AIProvider,
        keys: string[],
        onKeysChange: (newKeys: string[]) => void
    }> = ({ provider, keys, onKeysChange }) => {
        const [newKey, setNewKey] = useState('');

        const handleAddKey = () => {
            if (newKey.trim() && !keys.includes(newKey.trim())) {
                onKeysChange([...keys, newKey.trim()]);
                setNewKey('');
            }
        };

        const handleDeleteKey = (keyToDelete: string) => {
            onKeysChange(keys.filter(k => k !== keyToDelete));
        };

        const maskKey = (key: string) => `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;

        return (
            <div className="flex flex-col gap-2">
                <label className="font-bold">{provider} API Keys:</label>
                {keys.length > 0 && (
                    <div className="p-1 border border-cyan-400/50 flex flex-col gap-1 max-h-24 overflow-y-auto">
                        {keys.map(key => (
                            <div key={key} className="flex items-center justify-between bg-black/30 p-1">
                                <span className="font-mono text-cyan-400">{maskKey(key)}</span>
                                <button onClick={() => handleDeleteKey(key)} className="text-red-400 hover:text-red-600 px-1">&times;</button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex gap-1">
                    <input
                        type="password"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="Add new API key"
                        className="w-full p-1 bg-black/80 border border-cyan-400"
                    />
                    <PixelatedButton onClick={handleAddKey} className="px-2">Add</PixelatedButton>
                </div>
            </div>
        );
    };


    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[450px]" height="h-auto">
            <div className="bg-transparent h-full flex flex-col p-2 gap-3 text-xs text-cyan-300">
                <div className="p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-2">
                    <h4 className="font-bold text-fuchsia-400">AI Provider</h4>
                    <select
                        value={settings.provider}
                        onChange={(e) => setSettings(prev => ({ ...prev, provider: e.target.value as AIProvider }))}
                        className="w-full bg-black/80 border border-cyan-400 p-1"
                    >
                        {Object.values(AIProvider).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    {settings.provider === AIProvider.GEMINI && (
                        <ApiKeyManager provider={AIProvider.GEMINI} keys={settings.geminiApiKeys} onKeysChange={newKeys => setSettings(s => ({...s, geminiApiKeys: newKeys}))} />
                    )}
                    {settings.provider === AIProvider.OLLAMA && (
                        <div className="flex flex-col gap-1">
                            <label>Ollama Server URL:</label>
                            <input
                                type="text"
                                value={settings.ollamaUrl}
                                onChange={(e) => setSettings(prev => ({ ...prev, ollamaUrl: e.target.value }))}
                                placeholder="http://localhost:11434"
                                className="w-full p-1 bg-black/80 border border-cyan-400"
                            />
                        </div>
                    )}
                    {settings.provider === AIProvider.MISTRAL && (
                        <ApiKeyManager provider={AIProvider.MISTRAL} keys={settings.mistralApiKeys} onKeysChange={newKeys => setSettings(s => ({...s, mistralApiKeys: newKeys}))} />
                    )}
                     {settings.provider === AIProvider.COHERE && (
                        <ApiKeyManager provider={AIProvider.COHERE} keys={settings.cohereApiKeys} onKeysChange={newKeys => setSettings(s => ({...s, cohereApiKeys: newKeys}))} />
                    )}
                     {settings.provider === AIProvider.OPENROUTER && (
                        <ApiKeyManager provider={AIProvider.OPENROUTER} keys={settings.openrouterApiKeys} onKeysChange={newKeys => setSettings(s => ({...s, openrouterApiKeys: newKeys}))} />
                    )}
                    {settings.provider === AIProvider.OPENAI && (
                        <ApiKeyManager provider={AIProvider.OPENAI} keys={settings.openaiApiKeys} onKeysChange={newKeys => setSettings(s => ({...s, openaiApiKeys: newKeys}))} />
                    )}
                    {settings.provider === AIProvider.HUGGINGFACE && (
                        <>
                            <ApiKeyManager provider={AIProvider.HUGGINGFACE} keys={settings.huggingfaceApiKeys} onKeysChange={newKeys => setSettings(s => ({...s, huggingfaceApiKeys: newKeys}))} />
                            <div className="flex flex-col gap-1">
                                <label>HuggingFace Inference Base URL:</label>
                                <input
                                    type="text"
                                    value={settings.huggingfaceBaseUrl}
                                    onChange={(e) => setSettings(prev => ({ ...prev, huggingfaceBaseUrl: e.target.value }))}
                                    placeholder="https://api-inference.huggingface.co/models"
                                    className="w-full p-1 bg-black/80 border border-cyan-400"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-2">
                     <div className="flex justify-between items-center">
                        <h4 className="font-bold text-fuchsia-400">Model Selection</h4>
                        <PixelatedButton onClick={handleFetchModels} disabled={isLoadingModels} className="px-2 py-0.5">
                            {isLoadingModels ? '...' : 'Refresh'}
                        </PixelatedButton>
                     </div>
                     {error && <p className="text-red-400 text-center">{error}</p>}
                     <ModelSelect label="Text Model" modelType="text" />
                     <ModelSelect label="Image Gen Model" modelType="image" />
                     <ModelSelect label="Vision Model" modelType="vision" />
                     <p className="text-cyan-500 text-[10px] mt-1">Note: Ensure selected models are suitable for their task (e.g., a vision model for image-related tasks).</p>
                </div>
                
                <PixelatedButton onClick={handleSave} className="w-full">Save and Close</PixelatedButton>
            </div>
        </DraggableWindow>
    );
};

export default SettingsWindow;
