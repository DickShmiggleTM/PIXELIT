import { useState, useRef, useCallback, useEffect } from 'react';

export const useAudioVisualizer = () => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    const stopListening = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        streamRef.current = null;
        sourceRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
        dataArrayRef.current = null;
        setIsListening(false);
    }, []);
    
    const startListening = useCallback(async () => {
        if (isListening) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            streamRef.current = stream;
            
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = context;
            
            const source = context.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
            
            source.connect(analyser);
            
            setIsListening(true);
            setError(null);
            
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please grant permission.");
            stopListening();
        }
    }, [isListening, stopListening]);
    
    useEffect(() => {
        // Cleanup on component unmount
        return () => {
            stopListening();
        };
    }, [stopListening]);

    const getFrequencyData = useCallback(() => {
        if (analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            return dataArrayRef.current;
        }
        return null;
    }, []);

    return {
        isListening,
        error,
        startListening,
        stopListening,
        getFrequencyData,
    };
};
