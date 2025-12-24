import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useVoice } from '../hooks/useVoice';

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => Promise<string>; 
}

export function VoiceMode({ isOpen, onClose, onSendMessage }: VoiceModeProps) {
  const [status, setStatus] = useState<'listening' | 'processing' | 'speaking' | 'idle'>('idle');
  const [aiResponse, setAiResponse] = useState('');
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    speak, 
    stopSpeaking 
  } = useVoice();

  // AI 처리 및 TTS
  const handleProcess = async (text: string) => {
    if (!text.trim()) return;
    
    setStatus('processing');
    stopListening();

    try {
      const responseText = await onSendMessage(text);
      const finalResponse = responseText || "죄송합니다. 응답을 들을 수 없습니다.";
      
      setAiResponse(finalResponse);
      setStatus('speaking');
      speak(finalResponse);
    } catch (error) {
      console.error("AI processing error", error);
      toast.error("AI 응답 오류 발생");
      setStatus('idle');
    }
  };

  // Sync hook state to status
  useEffect(() => {
     if (isListening) {
         setStatus('listening');
     } else if (status === 'listening' && transcript) {
         // Auto-process when listening ends and there's transcript
         handleProcess(transcript);
     }
  }, [isListening]);

  // Handle TTS ending
  useEffect(() => {
      const checkSpeaking = setInterval(() => {
          if (status === 'speaking' && !window.speechSynthesis.speaking) {
              setStatus('idle');
              // AI가 말을 끝내면 다시 듣기 시작 (연속 대화)
              if (isOpen) {
                  setTimeout(() => startListening(), 500);
              }
          }
      }, 500);
      return () => clearInterval(checkSpeaking);
  }, [status, isOpen, startListening]);

  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopListening();
      stopSpeaking();
      setStatus('idle');
    }
  }, [isOpen]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 text-white transition-opacity duration-300">
      {/* Header */}
      <div className="absolute top-6 right-6">
        <button 
            onClick={onClose}
            className="p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
            <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-6 text-center space-y-12">
        
        {/* Status Indicator / Animation */}
        <div className="relative">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                status === 'listening' ? 'bg-blue-500/20 scale-110' :
                status === 'speaking' ? 'bg-green-500/20 scale-110' :
                status === 'processing' ? 'bg-purple-500/20' :
                'bg-zinc-800'
            }`}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                     status === 'listening' ? 'bg-blue-500 animate-pulse' :
                     status === 'speaking' ? 'bg-green-500 animate-pulse' :
                     status === 'processing' ? 'bg-purple-500 animate-spin' :
                     'bg-zinc-700'
                }`}>
                    {status === 'listening' && <Mic className="w-10 h-10 text-white" />}
                    {status === 'speaking' && <Volume2 className="w-10 h-10 text-white" />}
                    {status === 'processing' && <Loader2 className="w-10 h-10 text-white animate-spin" />}
                    {status === 'idle' && <MicOff className="w-10 h-10 text-zinc-400" />}
                </div>
            </div>
            {/* Ripple Effects */}
            {(status === 'listening' || status === 'speaking') && (
                <>
                    <div className="absolute inset-0 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-0 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                </>
            )}
        </div>

        {/* Text Display */}
        <div className="space-y-6 min-h-[120px]">
             {status === 'listening' && (
                <div className="space-y-2">
                    <p className="text-zinc-400 text-sm font-medium uppercase tracking-widest">Listening</p>
                    <p className="text-2xl font-light text-white leading-relaxed">
                        {transcript || "말씀해주세요..."}
                    </p>
                </div>
             )}

             {status === 'processing' && (
                <div className="space-y-2">
                    <p className="text-zinc-400 text-sm font-medium uppercase tracking-widest">Thinking</p>
                </div>
             )}

             {status === 'speaking' && (
                 <div className="space-y-2">
                    <p className="text-zinc-400 text-sm font-medium uppercase tracking-widest">Speaking</p>
                    <p className="text-xl text-zinc-200 leading-relaxed line-clamp-3">
                        {aiResponse}
                    </p>
                </div>
             )}
             
             {status === 'idle' && (
                 <p className="text-zinc-500">대기 중...</p>
             )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="pb-12 flex items-center gap-6">
         <button 
            onClick={() => {
                if (status === 'listening') stopListening();
                else startListening();
            }}
            className={`p-4 rounded-full transition-all duration-300 ${
                status === 'listening' 
                ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
         >
            {status === 'listening' ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
         </button>
      </div>
    </div>
  );
}
