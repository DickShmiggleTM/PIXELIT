import React, { useState } from 'react';
import DraggableWindow from './DraggableWindow';
import PixelatedButton from './PixelatedButton';
import { SfxParameters, AchievementID } from '../types';
import { playSfx, sfxToWav, PRESETS } from '../utils/sfxUtils';

interface ChiptuneSfxWindowProps {
    title: string;
    onClose: () => void;
    onSaveSfxAsAsset: (name: string, tags: string[], data: SfxParameters) => void;
    unlockAchievement: (id: AchievementID) => void;
}

const LabeledSlider: React.FC<{ label: string; value: number | string; min: string; max: string; step: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, value, ...props }) => (
  <div className="flex items-center gap-2">
    <label className="w-32 flex-shrink-0 capitalize">{label}:</label>
    <input type="range" value={value} {...props} className="w-full" />
    <span className="w-12 text-right">{Number(value).toFixed(2)}</span>
  </div>
);

const ChiptuneSfxWindow: React.FC<ChiptuneSfxWindowProps> = ({ title, onClose, onSaveSfxAsAsset, unlockAchievement }) => {
    const [params, setParams] = useState<SfxParameters>(PRESETS.Default);
    const [name, setName] = useState('My Sound Effect');

    const handleParamChange = (param: keyof SfxParameters, value: string | number) => {
        setParams(prev => ({ ...prev, [param]: Number(value) }));
    };

    const handleWaveformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setParams(prev => ({ ...prev, waveform: e.target.value as SfxParameters['waveform'] }));
    };

    const loadPreset = (preset: SfxParameters) => {
        setParams(preset);
    };

    const handleSave = () => {
        if (!name.trim()) {
            alert("Please enter a name for the sound effect.");
            return;
        }
        const tags = [params.waveform];
        onSaveSfxAsAsset(name.trim(), tags, params);
        unlockAchievement(AchievementID.SFX_MASTER);
        alert(`SFX "${name.trim()}" saved to assets!`);
    };

    // FIX: Made the function async to await the Blob from sfxToWav.
    const handleExport = async () => {
        const wavBlob = await sfxToWav(params);
        const url = URL.createObjectURL(wavBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name.trim().replace(/\s+/g, '_') || 'sfx'}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <DraggableWindow title={title} onClose={onClose} width="w-[450px]" height="h-auto">
            <div className="bg-transparent h-full flex flex-col p-2 gap-3 text-xs text-cyan-300">
                <div className="p-2 border-2 border-cyan-400/50 bg-black/30">
                    <h4 className="font-bold text-fuchsia-400 mb-2">Presets</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                        <PixelatedButton onClick={() => loadPreset(PRESETS.Coin)}>Coin</PixelatedButton>
                        <PixelatedButton onClick={() => loadPreset(PRESETS.Laser)}>Laser</PixelatedButton>
                        <PixelatedButton onClick={() => loadPreset(PRESETS.Explosion)}>Explosion</PixelatedButton>
                        <PixelatedButton onClick={() => loadPreset(PRESETS.Jump)}>Jump</PixelatedButton>
                    </div>
                </div>

                <div className="p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-2">
                    <h4 className="font-bold text-fuchsia-400 mb-2">Synthesizer</h4>
                    <div className="flex items-center gap-2">
                        <label className="w-32 flex-shrink-0">Waveform:</label>
                        <select value={params.waveform} onChange={handleWaveformChange} className="w-full bg-black/80 border border-cyan-400 p-1">
                            <option value="square">Square</option>
                            <option value="sine">Sine</option>
                            <option value="sawtooth">Sawtooth</option>
                            <option value="triangle">Triangle</option>
                            <option value="noise">Noise</option>
                        </select>
                    </div>
                    <LabeledSlider label="Volume" value={params.volume} min="0" max="1" step="0.01" onChange={e => handleParamChange('volume', e.target.value)} />
                    <LabeledSlider label="Attack" value={params.attack} min="0.01" max="0.5" step="0.01" onChange={e => handleParamChange('attack', e.target.value)} />
                    <LabeledSlider label="Sustain" value={params.sustain} min="0.01" max="0.5" step="0.01" onChange={e => handleParamChange('sustain', e.target.value)} />
                    <LabeledSlider label="Decay" value={params.decay} min="0.01" max="0.5" step="0.01" onChange={e => handleParamChange('decay', e.target.value)} />
                    <LabeledSlider label="Start Frequency" value={params.startFrequency} min="20" max="2000" step="1" onChange={e => handleParamChange('startFrequency', e.target.value)} />
                    <LabeledSlider label="End Frequency" value={params.endFrequency} min="20" max="2000" step="1" onChange={e => handleParamChange('endFrequency', e.target.value)} />
                </div>
                
                <div className="p-2 border-2 border-cyan-400/50 bg-black/30 flex flex-col gap-2">
                     <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Sound effect name..."
                        className="w-full p-2 bg-black/80 border-2 border-cyan-400"
                    />
                    <div className="flex gap-2">
                        <PixelatedButton onClick={() => playSfx(params)} className="flex-1">Play</PixelatedButton>
                        <PixelatedButton onClick={handleSave} className="flex-1">Save Asset</PixelatedButton>
                        <PixelatedButton onClick={handleExport} className="flex-1">Export .wav</PixelatedButton>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default ChiptuneSfxWindow;