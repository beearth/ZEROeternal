import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => Promise<string>; // AI 응답을 반환받아야 함
}

export function VoiceMode({ isOpen, onClose, onSendMessage }: VoiceModeProps) {
  const [status, setStatus] = useState<'listening' | 'processing' | 'speaking' | 'idle'>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  // 음성 인식 시작
  const startListening = () => {
    if (status === 'speaking' || status === 'processing') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    // 딜레이 없이 즉시 시작 (브라우저 보안 정책 준수)
    try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = true; // 중간 결과 허용
        recognition.continuous = false; 
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setStatus('listening');
            setTranscript(''); // 초기화
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            // 화면에 실시간으로 보여줌
            const currentText = finalTranscript || interimTranscript;
            if (currentText) {
                setTranscript(currentText);
            }
        };

        recognition.onend = () => {
            // 인식이 끝났을 때 (브라우저가 자동으로 멈춘 경우 포함)
            if (status === 'listening') {
                if (transcript && transcript.trim().length > 0) {
                    handleProcess(transcript);
                } else {
                    // 인식된 내용이 없으면 다시 듣기 (연속 대화 유지)
                    // 즉시 재시작하면 에러가 날 수 있으므로 약간의 지연
                    setTimeout(() => {
                        // 컴포넌트가 여전히 열려있는지 확인 필요하지만,
                        // useEffect cleanup에서 stop을 부르므로 안전할 것으로 추정.
                        // 하지만 명시적으로 ref나 status 확인 권장.
                        if (status === 'listening' || status === 'idle') {
                             try {
                                 recognition.start();
                             } catch(e) { /* ignore already started */ }
                        }
                    }, 300);
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            if (event.error === 'not-allowed') {
                toast.error("마이크 권한이 거부되었습니다.");
                setStatus('idle');
            } else if (event.error === 'no-speech') {
                // 말하지 않아서 종료된 경우 -> onend에서 재시작 처리됨
            } else if (event.error === 'aborted') {
                // 사용자가 멈추거나 시스템 중단 -> 무시
            } else {
                // 기타 에러는 조용히 넘어가고 재시작 시도
                // toast.error(`음성 인식 오류: ${event.error}`);
            }
            // 에러 발생 시 status가 idle로 바뀔 수 있으므로, 
            // no-speech 등은 onend를 타지 않을 수도 있음. 
            // Chrome의 경우 no-speech 후 onend가 호출됨. 
        };

        recognitionRef.current = recognition;
        recognition.start();
    } catch (e) {
        console.error("Recognition start failed", e);
        setStatus('idle');
        toast.error("음성 인식을 시작할 수 없습니다.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
        try {
            recognitionRef.current.stop();
        } catch(e) { /* ignore */ }
        recognitionRef.current = null;
    }
  };

  // AI 처리 및 TTS
  const handleProcess = async (text: string) => {
    if (!text.trim()) return;
    
    setStatus('processing');
    stopListening();

    try {
      // AI 응답 대기
      const responseText = await onSendMessage(text);
      
      const finalResponse = responseText || "죄송합니다. 응답을 들을 수 없습니다.";
      
      setAiResponse(finalResponse);
      speak(finalResponse);
    } catch (error) {
      console.error("AI processing error", error);
      toast.error("AI 응답 오류 발생");
      setStatus('idle');
    }
  };

  // TTS 말하기
  const speak = (text: string) => {
    setStatus('speaking');
    
    // 기존 발화 취소
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // 한국어 음성 선택 시도
    const voices = synthRef.current.getVoices();
    const koVoice = voices.find(v => v.lang.includes('ko') || v.name.includes('Korean'));
    if (koVoice) utterance.voice = koVoice;

    utterance.onend = () => {
      setStatus('idle');
      // AI가 말을 끝내면 다시 듣기 시작 (연속 대화)
      // 약간의 딜레이 후 시작
      setTimeout(() => {
          if (isOpen) startListening();
      }, 500);
    };

    synthRef.current.speak(utterance);
  };

  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopListening();
      synthRef.current.cancel();
      setTranscript('');
      setAiResponse('');
      setStatus('idle');
    }
    return () => {
        stopListening();
        synthRef.current.cancel();
    };
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
            onClick={status === 'listening' ? stopListening : startListening}
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
