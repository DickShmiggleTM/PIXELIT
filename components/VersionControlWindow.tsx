import React, { useState, useMemo } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { VersionHistory, Commit } from '../types';

interface VersionControlWindowProps {
    title: string;
    onClose: () => void;
    history: VersionHistory | null;
    onCommit: (message: string) => void;
    onCheckout: (commitId: string) => void;
    onBranch: (branchName: string) => void;
    onSwitchBranch: (branchName: string) => void;
}

const VersionControlWindow: React.FC<VersionControlWindowProps> = ({
    title, onClose, history, onCommit, onCheckout, onBranch, onSwitchBranch
}) => {
    const [commitMessage, setCommitMessage] = useState('');
    const [newBranchName, setNewBranchName] = useState('');

    const commitGraph = useMemo(() => {
        if (!history) return [];
        const commitArray = Object.values(history.commits);
        // FIX: Explicitly typed 'a' and 'b' as 'Commit' to resolve type inference issue where they were treated as 'unknown'.
        commitArray.sort((a: Commit, b: Commit) => b.timestamp - a.timestamp);
        return commitArray;
    }, [history]);

    const handleCommit = () => {
        if (commitMessage.trim()) {
            onCommit(commitMessage.trim());
            setCommitMessage('');
        } else {
            alert('Please enter a commit message.');
        }
    };
    
    const handleCreateBranch = () => {
        if (newBranchName.trim()) {
            onBranch(newBranchName.trim());
            setNewBranchName('');
        } else {
            alert('Please enter a branch name.');
        }
    }

    if (!history) {
        return (
            <DraggableWindow title={title} onClose={onClose} width="w-[500px]" height="h-auto">
                <div className="p-4 text-center text-cyan-400">
                    <p>No project loaded or project has not been saved yet.</p>
                    <p className="mt-2 text-xs">Save your project via the File Browser to start using version control.</p>
                </div>
            </DraggableWindow>
        );
    }
    
    const currentBranchHeadId = history.branches[history.currentBranch].commitId;

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[500px]" height="h-[500px]">
            <div className="bg-transparent h-full flex flex-col p-2 gap-2 text-xs text-cyan-300">
                {/* Branch Management */}
                <div className="p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <label>Current Branch:</label>
                        <select
                            value={history.currentBranch}
                            onChange={(e) => onSwitchBranch(e.target.value)}
                            className="flex-grow p-1 bg-black/80 border border-cyan-400"
                        >
                            {Object.keys(history.branches).map(branchName => (
                                <option key={branchName} value={branchName}>{branchName}</option>
                            ))}
                        </select>
                    </div>
                     <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newBranchName}
                            onChange={e => setNewBranchName(e.target.value)}
                            placeholder="New branch name..."
                            className="flex-grow p-1 bg-black/80 border border-cyan-400"
                        />
                        <PixelatedButton onClick={handleCreateBranch} className="px-2">Create Branch</PixelatedButton>
                    </div>
                </div>

                {/* Commit History */}
                <div className="flex-grow overflow-y-auto border-2 border-cyan-400/50 p-2 bg-black/30 flex flex-col gap-2">
                    {commitGraph.map(commit => {
                        const isHead = commit.id === currentBranchHeadId;
                        return (
                            <div key={commit.id} className={`p-2 border ${isHead ? 'border-fuchsia-500' : 'border-cyan-400/30'}`}>
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-fuchsia-400">{commit.message}</p>
                                    {isHead && <span className="px-2 py-0.5 bg-fuchsia-500 text-white text-[10px]">HEAD</span>}
                                </div>
                                <p className="text-cyan-500 text-[10px]">{new Date(commit.timestamp).toLocaleString()}</p>
                                <p className="text-cyan-600 text-[10px] truncate">ID: {commit.id}</p>
                                <PixelatedButton onClick={() => onCheckout(commit.id)} className="mt-1 text-xs px-2 py-0.5">Checkout this version</PixelatedButton>
                            </div>
                        );
                    })}
                </div>

                {/* Commit Action */}
                <div className="p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-2">
                    <textarea
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Commit message (e.g., 'Added character outline')"
                        className="w-full h-16 p-2 bg-black/80 border border-cyan-400 resize-none"
                    />
                    <PixelatedButton onClick={handleCommit} className="w-full">Commit Changes</PixelatedButton>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default VersionControlWindow;