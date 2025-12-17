import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Plus, X, Mic } from 'lucide-react';
import { toast } from 'sonner';

interface ChatInputProps {
  onSendMessage: (message: string, images?: string[]) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((message.trim() || images.length > 0) && !disabled) {
      onSendMessage(message, images);
      setMessage('');
      setImages([]);
      // Focus input after sending
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
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2 md:gap-3 bg-[#2a2b2c] rounded-[24px] md:rounded-[32px] p-3 md:p-5 shadow-xl transition-all">
      {/* Image Previews */}
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

      {/* Top: Text Area */}
      <div className="w-full">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="매타인지 하기"
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-2 text-base md:text-lg text-white placeholder:text-zinc-500 focus:outline-none min-h-[44px] md:min-h-[56px]"
          style={{
            height: 'auto',
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 200) + 'px';
          }}
        />
      </div>

      {/* Bottom: Controls */}
      <div className="flex items-center justify-between mt-1">

        {/* Left Side: + and Tools */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2.5 text-zinc-400 hover:text-white hover:bg-[#3a3b3c] rounded-full transition-colors bg-transparent"
            title="파일 추가"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => toast.info("도구 기능은 준비 중입니다.")}
            disabled={disabled}
            className="flex items-center gap-1.5 px-4 py-2.5 text-zinc-400 hover:text-white hover:bg-[#3a3b3c] rounded-full transition-colors bg-transparent text-sm font-medium"
          >
            <span className="">도구</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>

        {/* Right Side: Mic and Send */}
        <div className="flex items-center gap-3">
          {/* Mic Button (Visual) */}
          <button
            type="button"
            onClick={() => toast.info("음성 입력은 준비 중입니다.")}
            disabled={disabled}
            className="p-2.5 text-zinc-400 hover:text-white transition-colors"
            title="음성 입력"
          >
            <Mic className="w-6 h-6" />
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || (!message.trim() && images.length === 0)}
            className="flex-shrink-0 w-11 h-11 bg-white text-black rounded-full hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
