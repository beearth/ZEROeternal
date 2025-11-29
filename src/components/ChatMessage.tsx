import { useState } from 'react';
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
  // 각 단어의 클릭 상태: 0 = 선택 안됨, 1 = 빨강, 2 = 노랑, 3 = 녹색
  // 객체를 사용하여 React가 변경을 감지하도록 함
  const [wordStates, setWordStates] = useState<Record<number, number>>({});

  // 단어를 클릭했을 때 처리 (색상 순환)
  const handleWordClick = (index: number) => {
    if (!isAssistant || isTyping) return;
    
    setWordStates((prev) => {
      const currentState = prev[index] || 0;
      const nextState = (currentState + 1) % 4; // 0 -> 1 -> 2 -> 3 -> 0 순환
      
      const newStates = { ...prev };
      if (nextState === 0) {
        delete newStates[index]; // 원래 색상이면 객체에서 제거
      } else {
        newStates[index] = nextState;
      }
      return newStates;
    });
  };

  // 단어 상태에 따른 스타일 반환
  const getWordStyle = (state: number) => {
    switch (state) {
      case 1: // 빨강
        return {
          className: 'bg-red-200 text-red-900',
          style: { backgroundColor: '#fecaca', color: '#7f1d1d' }
        };
      case 2: // 노랑
        return {
          className: 'bg-yellow-200 text-yellow-900',
          style: { backgroundColor: '#fef08a', color: '#713f12' }
        };
      case 3: // 녹색
        return {
          className: 'bg-green-200 text-green-900',
          style: { backgroundColor: '#bbf7d0', color: '#14532d' }
        };
      default:
        return {
          className: '',
          style: {}
        };
    }
  };

  // 텍스트를 단어로 분리하고 렌더링
  const renderWords = (text: string) => {
    // 단어와 공백을 분리 (공백도 유지)
    const parts = text.split(/(\s+)/);
    let wordIndex = 0;
    
    return parts.map((part, partIndex) => {
      // 공백만 있는 경우 그대로 반환
      if (/^\s+$/.test(part)) {
        return <span key={partIndex}>{part}</span>;
      }
      
      // 실제 단어인 경우
      const currentWordIndex = wordIndex;
      wordIndex++;
      const wordState = wordStates[currentWordIndex] || 0;
      const styleInfo = getWordStyle(wordState);
      
      return (
        <span
          key={partIndex}
          onClick={() => handleWordClick(currentWordIndex)}
          className={`inline-block rounded px-1 cursor-pointer transition-colors ${
            wordState > 0
              ? styleInfo.className
              : 'hover:bg-slate-100'
          }`}
          style={{
            userSelect: 'none',
            ...styleInfo.style,
          }}
        >
          {part}
        </span>
      );
    });
  };

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
            {isAssistant ? renderWords(message.content) : message.content}
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
