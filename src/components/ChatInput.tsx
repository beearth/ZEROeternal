import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
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

  return (
    <div className="relative flex items-end gap-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-lg focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-transparent px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none max-h-32 min-h-[44px]"
        style={{
          height: 'auto',
          minHeight: '44px',
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = Math.min(target.scrollHeight, 128) + 'px';
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="flex-shrink-0 w-11 h-11 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}
