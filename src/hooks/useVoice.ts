import { useState, useCallback, useRef, useEffect } from "react";

// Types for Speech Recognition (Web Speech API)
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

// Fix for SpeechRecognition visibility
const SpeechRecognitionConstructor = (typeof window !== 'undefined') 
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) 
    : null;


export function useVoice() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if (SpeechRecognitionConstructor) {
            const recognition = new (SpeechRecognitionConstructor as any)();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = "ko-KR"; // Default to Korean

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let currentTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setTranscript(currentTranscript);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const startListening = useCallback((lang: string = "ko-KR") => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = lang;
            setTranscript("");
            setIsListening(true);
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error("Failed to start recognition:", error);
                setIsListening(false);
            }
        } else {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    // Text to Speech
    const speak = useCallback((text: string, lang: string = "ko-KR") => {
        // Stop any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        
        // Find a natural sounding voice if possible
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes(lang) && v.name.includes("Google"));
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis.cancel();
    }, []);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        hasSupport: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    };
}
