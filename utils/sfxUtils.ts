// utils/sfxUtils.ts
import { SfxParameters } from '../types';

// Create a single AudioContext to be reused.
// Some browsers require the AudioContext to be created after a user interaction.
// This should be fine as sounds are only played after button clicks.
export const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

export const playSfx = (params: SfxParameters) => {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const now = audioContext.currentTime;
    const totalDuration = params.attack + params.sustain + params.decay;

    // --- Gain Node (Volume Envelope) ---
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0, now);
    // Attack
    gainNode.gain.linearRampToValueAtTime(params.volume, now + params.attack);
    // Sustain (no change in volume)
    gainNode.gain.setValueAtTime(params.volume, now + params.attack + params.sustain);
    // Decay
    gainNode.gain.linearRampToValueAtTime(0, now + totalDuration);

    if (params.waveform === 'noise') {
        // --- Noise Generator ---
        const bufferSize = audioContext.sampleRate * totalDuration;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noiseNode = audioContext.createBufferSource();
        noiseNode.buffer = buffer;
        noiseNode.connect(gainNode);
        noiseNode.start(now);
        noiseNode.stop(now + totalDuration);

    } else {
        // --- Oscillator Node (Pitch) ---
        const oscillator = audioContext.createOscillator();
        oscillator.type = params.waveform;
        oscillator.connect(gainNode);
        
        // Frequency Sweep
        oscillator.frequency.setValueAtTime(params.startFrequency, now);
        oscillator.frequency.linearRampToValueAtTime(params.endFrequency, now + totalDuration);
        
        oscillator.start(now);
        oscillator.stop(now + totalDuration);
    }
};

// FIX: Corrected the function signature to return a Promise<Blob> as `startRendering` is asynchronous.
export const sfxToWav = (params: SfxParameters): Promise<Blob> => {
    const totalDuration = params.attack + params.sustain + params.decay;
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(1, sampleRate * totalDuration, sampleRate);
    
    // The synthesis logic is identical to playSfx, but on the offline context
    const now = 0;
    const gainNode = offlineCtx.createGain();
    gainNode.connect(offlineCtx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(params.volume, now + params.attack);
    gainNode.gain.setValueAtTime(params.volume, now + params.attack + params.sustain);
    gainNode.gain.linearRampToValueAtTime(0, now + totalDuration);

    if (params.waveform === 'noise') {
        const bufferSize = sampleRate * totalDuration;
        const buffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noiseNode = offlineCtx.createBufferSource();
        noiseNode.buffer = buffer;
        noiseNode.connect(gainNode);
        noiseNode.start(now);
    } else {
        const oscillator = offlineCtx.createOscillator();
        oscillator.type = params.waveform;
        oscillator.connect(gainNode);
        oscillator.frequency.setValueAtTime(params.startFrequency, now);
        oscillator.frequency.linearRampToValueAtTime(params.endFrequency, now + totalDuration);
        oscillator.start(now);
    }

    return offlineCtx.startRendering().then(renderedBuffer => {
        return bufferToWav(renderedBuffer);
    });
};

// Helper function to convert AudioBuffer to a WAV Blob
const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    }
    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    for (i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });
};


export const PRESETS: { [key: string]: SfxParameters } = {
    Default: {
        waveform: 'square',
        attack: 0.01,
        sustain: 0.1,
        decay: 0.1,
        startFrequency: 880,
        endFrequency: 440,
        volume: 0.5,
    },
    Coin: {
        waveform: 'square',
        attack: 0.01,
        sustain: 0.05,
        decay: 0.1,
        startFrequency: 1046.50,
        endFrequency: 1567.98,
        volume: 0.4,
    },
    Laser: {
        waveform: 'sawtooth',
        attack: 0.01,
        sustain: 0.1,
        decay: 0.15,
        startFrequency: 1200,
        endFrequency: 100,
        volume: 0.5,
    },
    Explosion: {
        waveform: 'noise',
        attack: 0.01,
        sustain: 0.2,
        decay: 0.3,
        startFrequency: 800,
        endFrequency: 20,
        volume: 0.8,
    },
    Jump: {
        waveform: 'square',
        attack: 0.01,
        sustain: 0.08,
        decay: 0.1,
        startFrequency: 440,
        endFrequency: 880,
        volume: 0.6,
    }
};