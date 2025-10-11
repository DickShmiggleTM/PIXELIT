import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

// FIX: Moved GoogleGenAI initialization to the module scope to avoid re-creating it on every hook usage.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Helper function to encode raw audio data to base64, as required by the API.
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Helper function to create a Blob object in the format expected by the Gemini Live API.
function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

export const useGeminiLive = () => {
    const [transcript, setTranscript] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fullTranscriptRef = useRef('');

    const stopRecording = useCallback(async () => {
        if (sessionPromiseRef.current) {
            const session = await sessionPromiseRef.current;
            session.close();
            sessionPromiseRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        
        setTranscript(fullTranscriptRef.current);
        setIsRecording(false);
    }, []);

    const startRecording = useCallback(async () => {
        if (isRecording) {
            stopRecording();
            return;
        }

        setIsRecording(true);
        setTranscript('');
        setError(null);
        fullTranscriptRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const source = audioContext.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        
                        const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            // FIX: Per coding guidelines, rely solely on the promise resolving to send data.
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContext.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            fullTranscriptRef.current += text;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Gemini Live Error:', e);
                        setError('An error occurred during transcription.');
                        stopRecording();
                    },
                    onclose: () => {
                        // FIX: Ensure resources are cleaned up when the connection closes cleanly.
                        stopRecording();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO], // Required by API, even if we only need transcription
                    inputAudioTranscription: {},
                },
            });

            await sessionPromiseRef.current;

        } catch (err) {
            console.error('Error starting recording:', err);
            setError('Failed to access microphone. Please grant permission.');
            // FIX: Ensure resources are cleaned up if an error occurs during setup.
            await stopRecording();
        }
    }, [isRecording, stopRecording]);

    return { isRecording, transcript, error, startRecording };
};