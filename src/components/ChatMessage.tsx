import { Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping = false }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={`flex gap-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      {isAssistant && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
          <Bot className="w-6 h-6 text-white" />
        </div>
      )}
      <div
        className={`max-w-[70%] ${
          isAssistant
            ? 'bg-white border border-slate-200 rounded-2xl rounded-tl-sm'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-tr-sm'
        } px-5 py-3 shadow-sm`}
      >
        {isTyping ? (
          <div className="flex gap-1.5 py-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
          </div>
        ) : (
          <p
            className={`whitespace-pre-wrap ${
              isAssistant ? 'text-slate-800' : 'text-white'
            }`}
          >
            {message.content}
          </p>
        )}
      </div>
      {!isAssistant && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
          <User className="w-6 h-6 text-slate-600" />
        </div>
      )}
    </div>
  );
}
