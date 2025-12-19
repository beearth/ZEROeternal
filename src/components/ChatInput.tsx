import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Send, Plus, X, Mic, SlidersHorizontal, MicOff, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { ToolsMenu } from './ToolsMenu';
import { VoiceMode } from './VoiceMode';
import { ModelSelector } from './ModelSelector';

interface ChatInputProps {
  onSendMessage: (message: string, images?: string[]) => Promise<string | void> | void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 음성 인식 관련 State
  const [shouldListen, setShouldListen] = useState(false);
  const recognitionInstance = useRef<any>(null);

  const handleSend = () => {
    if ((message.trim() || images.length > 0) && !disabled) {
      onSendMessage(message, images);
      setMessage('');
      setImages([]);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setImages(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    if (recognitionInstance.current) return;

    try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR'; 
        recognition.interimResults = true; 
        recognition.continuous = false; // 끊김 방지를 위해 재시작 로직 사용

        recognition.onstart = () => setIsListening(true);
        
        recognition.onresult = (event: any) => {
             let finalTranscript = '';
             let interimTranscript = '';
             
             for (let i = event.resultIndex; i < event.results.length; i++) {
                 const transcript = event.results[i][0].transcript;
                 if (event.results[i].isFinal) {
                     finalTranscript += transcript;
                 } else {
                     interimTranscript += transcript;
                 }
             }

             if (finalTranscript) {
                 setMessage(prev => (prev + (prev.trim() ? ' ' : '') + finalTranscript));
             }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                toast.error("마이크 권한이 거부되었습니다.");
                setShouldListen(false);
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            recognitionInstance.current = null;
            if (shouldListen) {
                setTimeout(() => startVoiceRecognition(), 100);
            }
        };

        recognitionInstance.current = recognition;
        recognition.start();
    } catch (e) {
        console.error("Failed to start recognition:", e);
        setShouldListen(false);
        setIsListening(false);
    }
  };

  const toggleVoiceRecognition = () => {
      if (shouldListen) {
          setShouldListen(false);
          recognitionInstance.current?.stop();
          recognitionInstance.current = null;
          setIsListening(false);
      } else {
          setShouldListen(true);
      }
  };

  useEffect(() => {
      if (shouldListen) {
          startVoiceRecognition();
      } else {
          recognitionInstance.current?.stop();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldListen]);

  useEffect(() => {
    return () => {
      if (recognitionInstance.current) {
        recognitionInstance.current.onend = null;
        recognitionInstance.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 bg-[#1e1f20] rounded-[32px] p-4 transition-all border border-[#27272a] shadow-lg max-w-4xl mx-auto w-full">
      {images.length > 0 && (
        <div className="flex gap-2 px-2 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <div key={index} className="relative flex-shrink-0">
              <img src={img} alt="preview" className="h-14 w-14 md:h-16 md:w-16 object-cover rounded-lg border border-zinc-600" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-1.5 -right-1.5 bg-zinc-800 rounded-full p-0.5 border border-zinc-600 hover:bg-zinc-700 text-zinc-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="w-full px-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메타인지 하기"
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent text-base md:text-lg text-white placeholder:text-zinc-500 focus:outline-none min-h-[24px] max-h-[200px]"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 200) + 'px';
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 pl-1 pr-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 text-zinc-400 hover:text-[#d4d4d8] hover:bg-[#27272a] rounded-full transition-colors"
            title="파일 추가"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setShowToolsMenu(true)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-[#d4d4d8] hover:bg-[#27272a] rounded-full transition-colors text-sm font-medium bg-[#1e1f20] border border-zinc-800"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>도구</span>
          </button>

          <div className="hidden sm:block">
            <ModelSelector compact />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleVoiceRecognition}
            disabled={disabled}
            className={`p-2 transition-colors rounded-full hover:bg-[#27272a] ${
              isListening 
                ? 'text-red-500 animate-pulse' 
                : 'text-zinc-400 hover:text-white'
            }`}
            title={isListening ? "음성 인식 중지" : "음성 입력"}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            type="button"
            onClick={() => setShowVoiceMode(true)}
            disabled={disabled}
            className="p-2 text-zinc-400 hover:text-white transition-colors hover:bg-[#27272a] rounded-full"
            title="음성 대화 모드"
          >
            <Headphones className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || (!message.trim() && images.length === 0)}
            className="flex-shrink-0 w-10 h-10 bg-white text-black rounded-full hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center ml-1"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>

      <ToolsMenu 
        isOpen={showToolsMenu} 
        onClose={() => setShowToolsMenu(false)}
        onInsertContent={(content) => setMessage(prev => prev + content)}
      />

      {showVoiceMode && (
        <VoiceMode 
            isOpen={showVoiceMode} 
            onClose={() => setShowVoiceMode(false)}
            onSendMessage={async (text) => {
                const response = await onSendMessage(text);
                return typeof response === 'string' ? response : "";
            }}
        />
      )}
    </div>
  );
}
