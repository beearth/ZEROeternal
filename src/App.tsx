import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Send, Menu, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      title: '새로운 대화',
      messages: [],
      timestamp: new Date(),
    },
  ]);
  const [currentConversationId, setCurrentConversationId] = useState('1');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !currentConversation) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // 사용자 메시지 추가
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              title:
                conv.messages.length === 0
                  ? content.slice(0, 30) + (content.length > 30 ? '...' : '')
                  : conv.title,
            }
          : conv
      )
    );

    // AI 응답 시뮬레이션
    setIsTyping(true);
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateMockResponse(content),
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, aiMessage] }
            : conv
        )
      );
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const generateMockResponse = (userMessage: string): string => {
    const responses = [
      '안녕하세요! 무엇을 도와드릴까요?',
      '좋은 질문이네요. 제가 자세히 설명해드리겠습니다.',
      '그것에 대해 말씀드리자면, 여러 관점에서 생각해볼 수 있습니다.',
      '이해하셨습니다. 다음과 같이 답변드리겠습니다.',
      '흥미로운 주제네요! 함께 탐구해보겠습니다.',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: '새로운 대화',
      messages: [],
      timestamp: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((conv) => conv.id !== id);
      if (filtered.length === 0) {
        const newConv: Conversation = {
          id: Date.now().toString(),
          title: '새로운 대화',
          messages: [],
          timestamp: new Date(),
        };
        setCurrentConversationId(newConv.id);
        return [newConv];
      }
      if (id === currentConversationId) {
        setCurrentConversationId(filtered[0].id);
      }
      return filtered;
    });
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 사이드바 */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5 text-slate-600" />
            ) : (
              <Menu className="w-5 h-5 text-slate-600" />
            )}
          </button>
          <div>
            <h1 className="text-slate-800">AI 채팅</h1>
            <p className="text-sm text-slate-500">인공지능과 대화하세요</p>
          </div>
        </header>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {currentConversation?.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Send className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-slate-800 mb-2">새로운 대화 시작</h2>
                <p className="text-slate-500">
                  무엇이든 물어보세요. AI가 답변해드립니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {currentConversation?.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isTyping && (
                <ChatMessage
                  message={{
                    id: 'typing',
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                  }}
                  isTyping={true}
                />
              )}
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
          </div>
        </div>
      </div>
    </div>
  );
}
