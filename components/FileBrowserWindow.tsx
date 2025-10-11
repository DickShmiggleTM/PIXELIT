import React, { useState, useMemo } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { Asset, AssetType } from '../types';

interface FileBrowserWindowProps {
    title: string;
    onClose: () => void;
    projects: string[];
    onSaveProjectAs: (name: string) => void;
    onLoadProject: (name: string) => void;
    onDeleteProject: (name: string) => void;
    assets: Asset[];
    onAddSpriteToCanvas: (asset: Asset) => void;
    onApplyPalette: (asset: Asset) => void;
    onDeleteAsset: (assetId: string) => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`flex-1 p-2 text-xs border-b-2 ${active ? 'border-fuchsia-500 text-fuchsia-400' : 'border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/10'}`}>
        {children}
    </button>
);

const SfxIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated' }}>
        <path d="M2 6H4V12H2V6Z" />
        <path d="M5 4H7V14H5V4Z" />
        <path d="M8 2H10V16H8V2Z" />
    </svg>
);

const FileBrowserWindow: React.FC<FileBrowserWindowProps> = ({
    title, onClose, projects, onSaveProjectAs, onLoadProject, onDeleteProject,
    assets, onAddSpriteToCanvas, onApplyPalette, onDeleteAsset
}) => {
    const [activeTab, setActiveTab] = useState<'projects' | 'sprites' | 'palettes' | 'sfx'>('projects');
    const [newProjectName, setNewProjectName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [projectList, setProjectList] = useState(projects);
    
    const filteredAssets = useMemo(() => {
        if (!searchTerm) return assets;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return assets.filter(asset =>
            asset.name.toLowerCase().includes(lowerCaseSearch) ||
            asset.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch))
        );
    }, [assets, searchTerm]);

    const handleSave = () => {
        if (newProjectName.trim()) {
            onSaveProjectAs(newProjectName.trim());
            setProjectList([...projectList, newProjectName.trim()]);
            setNewProjectName('');
        } else {
            alert('Please enter a project name.');
        }
    };
    
    const handleDeleteProjectUI = (projectName: string) => {
        if (window.confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
            onDeleteProject(projectName);
            setProjectList(projectList.filter(p => p !== projectName));
        }
    };
    
    const renderAsset = (asset: Asset) => {
        const handleUse = () => {
            if (asset.type === 'sprite') onAddSpriteToCanvas(asset);
            else if (asset.type === 'palette') onApplyPalette(asset);
            // "Use" for SFX is handled in the animation timeline
        };

        const canUse = asset.type === 'sprite' || asset.type === 'palette';
        
        return (
            <div key={asset.id} className="p-2 border border-cyan-400/50 bg-black/30 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                    {asset.type === 'sprite' ? (
                         <img src={asset.preview} alt={asset.name} className="w-12 h-12 border border-cyan-400/50" style={{ imageRendering: 'pixelated' }} />
                    ) : asset.type === 'palette' ? (
                        <div className="w-12 h-12 border border-cyan-400/50 grid grid-cols-4 grid-rows-4">
                            {(asset.data as string[]).slice(0, 16).map((c, i) => <div key={i} style={{ backgroundColor: c }} />)}
                        </div>
                    ) : (
                        <div className="w-12 h-12 border border-cyan-400/50 flex items-center justify-center text-cyan-400">
                            <SfxIcon />
                        </div>
                    )}
                    <div className="flex-grow">
                        <h4 className="font-bold text-fuchsia-400">{asset.name}</h4>
                        <p className="text-cyan-500 text-[10px] break-words">
                            {asset.tags.map(t => `#${t}`).join(' ')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1">
                    {canUse && <PixelatedButton onClick={handleUse} className="flex-1 text-xs py-1 px-2">Use</PixelatedButton>}
                    <PixelatedButton onClick={() => onDeleteAsset(asset.id)} className="flex-1 text-xs py-1 px-2">Delete</PixelatedButton>
                </div>
            </div>
        );
    };

    const renderProjectsTab = () => (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="New project name..."
                    className="flex-grow p-2 bg-black/50 border-2 border-cyan-400"
                />
                <PixelatedButton onClick={handleSave}>Save As</PixelatedButton>
            </div>
            <div className="flex-grow overflow-y-auto border-2 border-cyan-400/50 p-1 bg-black/30 h-[250px]">
                {projectList.length === 0 ? <p className="text-center text-cyan-600">No saved projects.</p> :
                    projectList.map(p => (
                        <div key={p} className="flex justify-between items-center p-1 hover:bg-fuchsia-500/20">
                            <span>{p}</span>
                            <div className="flex gap-1">
                                <PixelatedButton onClick={() => onLoadProject(p)} className="text-xs px-2 py-0.5">Load</PixelatedButton>
                                <PixelatedButton onClick={() => handleDeleteProjectUI(p)} className="text-xs px-2 py-0.5">Del</PixelatedButton>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
    
    const renderAssetsTab = (type: AssetType) => (
         <div className="flex flex-col gap-2 h-full">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or #tag..."
                className="w-full p-2 bg-black/50 border-2 border-cyan-400"
            />
            <div className="flex-grow overflow-y-auto grid grid-cols-2 gap-2 p-1 border-2 border-cyan-400/50 bg-black/30">
                {filteredAssets.filter(a => a.type === type).map(renderAsset)}
            </div>
        </div>
    );

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[500px]" height="h-[450px]">
            <div className="bg-transparent h-full flex flex-col text-xs text-cyan-300">
                <div className="flex">
                    <TabButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')}>Projects</TabButton>
                    <TabButton active={activeTab === 'sprites'} onClick={() => setActiveTab('sprites')}>Sprites</TabButton>
                    <TabButton active={activeTab === 'palettes'} onClick={() => setActiveTab('palettes')}>Palettes</TabButton>
                    <TabButton active={activeTab === 'sfx'} onClick={() => setActiveTab('sfx')}>SFX</TabButton>
                </div>
                <div className="p-2 flex-grow">
                    {activeTab === 'projects' && renderProjectsTab()}
                    {activeTab === 'sprites' && renderAssetsTab('sprite')}
                    {activeTab === 'palettes' && renderAssetsTab('palette')}
                    {activeTab === 'sfx' && renderAssetsTab('sfx')}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default FileBrowserWindow;