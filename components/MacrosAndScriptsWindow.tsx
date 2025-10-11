import React, { useState, useMemo } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { Asset, Macro, Script } from '../types';

interface MacrosAndScriptsWindowProps {
    title: string;
    onClose: () => void;
    isRecording: boolean;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onSaveMacro: (name: string) => void;
    onPlayMacro: (macro: Macro) => void;
    onSaveScript: (script: Script) => void;
    onRunScript: (script: Script) => Promise<{ success: boolean; logs: string[] }>;
    onDeleteAsset: (assetId: string) => void;
    assets: Asset[];
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`flex-1 p-2 text-xs border-b-2 ${active ? 'border-fuchsia-500 text-fuchsia-400' : 'border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/10'}`}>
        {children}
    </button>
);

const MacrosAndScriptsWindow: React.FC<MacrosAndScriptsWindowProps> = ({
    title, onClose, isRecording, onStartRecording, onStopRecording, onSaveMacro,
    onPlayMacro, onSaveScript, onRunScript, onDeleteAsset, assets
}) => {
    const [activeTab, setActiveTab] = useState<'macros' | 'scripts'>('macros');
    const [macroName, setMacroName] = useState('');
    const [scriptName, setScriptName] = useState('My Script');
    const [scriptCode, setScriptCode] = useState('// PXL-Script API available as `api`\n// api.setPixel(x, y, color);\n// api.log("Hello, world!");\n\nfor (let i = 0; i < 10; i++) {\n  api.setPixel(i, i, api.getPrimaryColor());\n}');
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const [isRunningScript, setIsRunningScript] = useState(false);

    const macros = useMemo(() => assets.filter(a => a.type === 'macro'), [assets]);
    const scripts = useMemo(() => assets.filter(a => a.type === 'script'), [assets]);

    const handleSaveCurrentMacro = () => {
        if (macroName.trim()) {
            onSaveMacro(macroName.trim());
            setMacroName('');
        } else {
            alert('Please enter a name for the macro.');
        }
    };
    
    const handleSaveCurrentScript = () => {
        if (scriptName.trim() && scriptCode.trim()) {
            onSaveScript({ name: scriptName.trim(), code: scriptCode });
        } else {
            alert('Please provide a name and some code for the script.');
        }
    };

    const handleRunCurrentScript = async () => {
        setIsRunningScript(true);
        setConsoleOutput([]);
        const result = await onRunScript({ name: scriptName, code: scriptCode });
        setConsoleOutput(result.logs);
        setIsRunningScript(false);
    };

    const handleLoadScript = (scriptAsset: Asset) => {
        const script: Script = scriptAsset.data;
        setScriptName(script.name);
        setScriptCode(script.code);
    };

    const renderMacrosTab = () => (
        <div className="flex flex-col gap-2 h-full">
            <div className="p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-2">
                <h4 className="font-bold text-fuchsia-400">Recorder</h4>
                <div className="flex gap-2">
                    <PixelatedButton onClick={onStartRecording} disabled={isRecording} className="flex-1">Record</PixelatedButton>
                    <PixelatedButton onClick={onStopRecording} disabled={!isRecording} className="flex-1">Stop</PixelatedButton>
                </div>
                 {isRecording && <p className="text-center text-fuchsia-400 animate-pulse">RECORDING...</p>}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={macroName}
                        onChange={(e) => setMacroName(e.target.value)}
                        placeholder="Name for new macro..."
                        className="flex-grow p-1 bg-black/80 border border-cyan-400"
                        disabled={isRecording}
                    />
                    <PixelatedButton onClick={handleSaveCurrentMacro} disabled={isRecording}>Save</PixelatedButton>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto border-2 border-cyan-400/50 p-1 bg-black/30">
                <h4 className="font-bold text-fuchsia-400 p-1">Saved Macros</h4>
                {macros.length === 0 ? <p className="text-center text-cyan-600 p-2">No saved macros.</p> :
                    macros.map(asset => (
                        <div key={asset.id} className="flex justify-between items-center p-1 hover:bg-fuchsia-500/20">
                            <span>{asset.name}</span>
                            <div className="flex gap-1">
                                <PixelatedButton onClick={() => onPlayMacro(asset.data)} className="text-xs px-2 py-0.5">Play</PixelatedButton>
                                <PixelatedButton onClick={() => onDeleteAsset(asset.id)} className="text-xs px-2 py-0.5">Del</PixelatedButton>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
    
    const renderScriptsTab = () => (
         <div className="flex flex-col gap-2 h-full">
            <div className="flex-grow flex gap-2">
                <div className="w-2/3 flex flex-col gap-2">
                     <input
                        type="text"
                        value={scriptName}
                        onChange={(e) => setScriptName(e.target.value)}
                        placeholder="Script name..."
                        className="w-full p-2 bg-black/50 border-2 border-cyan-400"
                    />
                    <textarea
                        value={scriptCode}
                        onChange={e => setScriptCode(e.target.value)}
                        placeholder="// Enter your PXL-Script code here"
                        className="w-full flex-grow p-2 bg-black/80 border-2 border-cyan-400 text-cyan-300 placeholder-cyan-700 resize-none font-mono text-[10px] leading-3"
                        spellCheck="false"
                    />
                    <div className="flex gap-2">
                        <PixelatedButton onClick={handleRunCurrentScript} className="flex-1" disabled={isRunningScript}>
                            {isRunningScript ? 'Running...' : 'Run'}
                        </PixelatedButton>
                        <PixelatedButton onClick={handleSaveCurrentScript} className="flex-1" disabled={isRunningScript}>Save Script</PixelatedButton>
                    </div>
                </div>
                <div className="w-1/3 flex flex-col gap-2">
                    <div className="flex-grow overflow-y-auto border-2 border-cyan-400/50 p-1 bg-black/30">
                        <h4 className="font-bold text-fuchsia-400 p-1">Saved Scripts</h4>
                        {scripts.map(asset => (
                            <div key={asset.id} className="flex justify-between items-center p-1 hover:bg-fuchsia-500/20">
                                <span className="truncate" title={asset.name}>{asset.name}</span>
                                <div className="flex gap-1 flex-shrink-0">
                                    <PixelatedButton onClick={() => handleLoadScript(asset)} className="text-xs px-2 py-0.5">Load</PixelatedButton>
                                    <PixelatedButton onClick={() => onDeleteAsset(asset.id)} className="text-xs px-2 py-0.5">Del</PixelatedButton>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             <div className="h-24 flex flex-col">
                 <h4 className="font-bold text-fuchsia-400 p-1">Console</h4>
                <div className="flex-grow bg-black/80 border-2 border-cyan-400/50 p-1 overflow-y-auto font-mono text-[10px] leading-3">
                    {consoleOutput.map((log, i) => <p key={i} className={log.startsWith('Error:') ? 'text-red-400' : ''}>&gt; {log}</p>)}
                </div>
             </div>
        </div>
    );

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[600px]" height="h-[550px]">
            <div className="bg-transparent h-full flex flex-col text-xs text-cyan-300">
                <div className="flex">
                    <TabButton active={activeTab === 'macros'} onClick={() => setActiveTab('macros')}>Macros</TabButton>
                    <TabButton active={activeTab === 'scripts'} onClick={() => setActiveTab('scripts')}>Scripts</TabButton>
                </div>
                <div className="p-2 flex-grow">
                    {activeTab === 'macros' ? renderMacrosTab() : renderScriptsTab()}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default MacrosAndScriptsWindow;
