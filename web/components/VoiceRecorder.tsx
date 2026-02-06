'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Speaker, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
    onCancel: () => void;
}

export default function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                onRecordingComplete(blob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Cannot access microphone. Please allow permissions.');
            onCancel();
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        // cleanup
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    // Format for preview
    if (audioUrl) {
        return (
            <div className="flex items-center gap-2 bg-[#334155]/50 px-3 py-1.5 rounded-full border border-blue-500/30">
                <button
                    onClick={() => {
                        if (audioRef.current) {
                            audioRef.current.play();
                            setIsPlaying(true);
                        }
                    }}
                    className="p-1.5 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors"
                >
                    <Play className="w-3 h-3 fill-current" />
                </button>
                <div className="flex-1 min-w-[60px]">
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-full animate-pulse" />
                    </div>
                </div>
                <span className="text-xs text-blue-200 font-mono">{formatTime(recordingTime)}</span>
                <button
                    onClick={() => {
                        setAudioUrl(null);
                        setAudioBlob(null);
                        setRecordingTime(0);
                        // Reset parent
                        // We might need a prop to reset parent state if complex, but here we just re-mount or handle in parent
                    }}
                    className="p-1 text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            {!isRecording ? (
                <button
                    onClick={startRecording}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors relative group"
                    title="Record Voice Comment"
                >
                    <Mic className="w-5 h-5" />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Record Voice
                    </span>
                </button>
            ) : (
                <div className="flex items-center gap-3 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 animate-in fade-in duration-200">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-mono text-red-400 min-w-[35px]">{formatTime(recordingTime)}</span>
                    <button
                        onClick={stopRecording}
                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                        <Square className="w-3 h-3 fill-current" />
                    </button>
                </div>
            )}
        </div>
    );
}
