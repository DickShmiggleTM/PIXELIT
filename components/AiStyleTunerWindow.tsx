import React, { useState, useMemo } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { Asset, ProjectState } from '../types';

interface AiStyleTunerWindowProps {
    title: string;
    onClose: () => void;
    assets: Asset[];
    currentProjectState: ProjectState;
    onAnalyzeStyle: (name: string, source: { type: 'project'; data: ProjectState } | { type: 'assets'; data: Asset[] }) => Promise<void>;
    onDeleteAsset: (assetId: string) => void;
    activeStyleProfile: Asset | null;
    onSetActiveStyleProfile: (asset: Asset | null) => void;
}

type SourceType = 'project' | 'assets';

const AiStyleTunerWindow: React.FC<AiStyleTunerWindowProps> = ({
    title, onClose, assets, currentProjectState, onAnalyzeStyle, onDeleteAsset,
    activeStyleProfile, onSetActiveStyleProfile
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newStyleName, setNewStyleName] = useState('');
    const [sourceType, setSourceType] = useState<SourceType>('project');
    const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
    
    const styleProfiles = useMemo(() => assets.filter(a => a.type === 'style'), [assets]);
    const spriteAssets = useMemo(() => assets.filter(a => a.type === 'sprite'), [assets]);

    const toggleAssetSelection = (assetId: string) => {
        setSelectedAssetIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(assetId)) {
                newSet.delete(assetId);
            } else {
                newSet.add(assetId);
            }
            return newSet;
        });
    };
    
    const handleAnalyze = async () => {
        if (!newStyleName.trim()) {
            alert('Please enter a name for the style profile.');
            return;
        }

        let source: { type: 'project'; data: ProjectState } | { type: 'assets'; data: Asset[] };
        if (sourceType === 'project') {
            source = { type: 'project', data: currentProjectState };
        } else {
            const selectedAssets = spriteAssets.filter(a => selectedAssetIds.has(a.id));
            if (selectedAssets.length === 0) {
                alert('Please select at least one sprite asset to analyze.');
                return;
            }
            source = { type: 'assets', data: selectedAssets };
        }
        
        setIsLoading(true);
        await onAnalyzeStyle(newStyleName.trim(), source);
        setIsLoading(false);
        setIsCreating(false);
        setNewStyleName('');
        setSelectedAssetIds(new Set());
    };
    
    const renderCreateNew = () => (
        <div className="p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-3">
            <h4 className="font-bold text-fuchsia-400">Create New Style Profile</h4>
            <input
                type="text"
                value={newStyleName}
                onChange={(e) => setNewStyleName(e.target.value)}
                placeholder="Enter style name..."
                className="w-full p-2 bg-black/80 border-2 border-cyan-400"
                disabled={isLoading}
            />
            
            <div>
                <label className="block mb-1">Source:</label>
                <div className="flex gap-2">
                    <PixelatedButton active={sourceType === 'project'} onClick={() => setSourceType('project')} className="flex-1" disabled={isLoading}>Current Project</PixelatedButton>
                    <PixelatedButton active={sourceType === 'assets'} onClick={() => setSourceType('assets')} className="flex-1" disabled={isLoading}>Saved Sprites</PixelatedButton>
                </div>
            </div>

            {sourceType === 'assets' && (
                <div className="h-40 overflow-y-auto border border-cyan-400/50 p-1 flex flex-col gap-1">
                    {spriteAssets.length > 0 ? spriteAssets.map(asset => (
                        <div key={asset.id} onClick={() => toggleAssetSelection(asset.id)} className={`flex items-center gap-2 p-1 cursor-pointer ${selectedAssetIds.has(asset.id) ? 'bg-fuchsia-500/30' : 'hover:bg-cyan-500/20'}`}>
                           <img src={asset.preview} alt={asset.name} className="w-8 h-8 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
                           <span>{asset.name}</span>
                        </div>
                    )) : <p className="text-center text-cyan-600 p-2">No saved sprites.</p>}
                </div>
            )}
            
            <div className="flex gap-2">
                <PixelatedButton onClick={() => setIsCreating(false)} className="flex-1" disabled={isLoading}>Cancel</PixelatedButton>
                <PixelatedButton onClick={handleAnalyze} className="flex-1" disabled={isLoading}>
                    {isLoading ? 'Analyzing...' : 'Analyze & Save'}
                </PixelatedButton>
            </div>
        </div>
    );
    
    const renderManageProfiles = () => (
         <div className="flex flex-col gap-2 h-full">
            <PixelatedButton onClick={() => setIsCreating(true)}>Create New Style Profile</PixelatedButton>
            <div className="flex-grow overflow-y-auto border-2 border-cyan-400/50 p-1 bg-black/30">
                <h4 className="font-bold text-fuchsia-400 p-1">Saved Styles</h4>
                 {styleProfiles.length === 0 ? <p className="text-center text-cyan-600 p-2">No saved style profiles.</p> :
                    styleProfiles.map(asset => (
                        <div key={asset.id} className={`flex justify-between items-center p-1 hover:bg-fuchsia-500/20 ${activeStyleProfile?.id === asset.id ? 'bg-fuchsia-500/30' : ''}`}>
                            <span>{asset.name}</span>
                            <div className="flex gap-1">
                                <PixelatedButton onClick={() => onSetActiveStyleProfile(asset)} className="text-xs px-2 py-0.5" active={activeStyleProfile?.id === asset.id}>Set Active</PixelatedButton>
                                <PixelatedButton onClick={() => onDeleteAsset(asset.id)} className="text-xs px-2 py-0.5">Del</PixelatedButton>
                            </div>
                        </div>
                    ))
                }
            </div>
             {activeStyleProfile && <button onClick={() => onSetActiveStyleProfile(null)} className="text-center hover:text-white">Clear Active Style</button>}
         </div>
    );

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[450px]" height="h-[500px]">
            <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
                {isCreating ? renderCreateNew() : renderManageProfiles()}
            </div>
        </DraggableWindow>
    );
};

export default AiStyleTunerWindow;