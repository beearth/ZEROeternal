import { Plus, MessageSquare, Trash2, X } from 'lucide-react';

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

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-800">대화 목록</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>새 대화</span>
          </button>
        </div>

        {/* 대화 목록 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                conversation.id === currentConversationId
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                  conversation.id === currentConversationId
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                    : 'bg-slate-100'
                }`}
              >
                <MessageSquare
                  className={`w-5 h-5 ${
                    conversation.id === currentConversationId
                      ? 'text-white'
                      : 'text-slate-600'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`truncate ${
                    conversation.id === currentConversationId
                      ? 'text-slate-800'
                      : 'text-slate-700'
                  }`}
                >
                  {conversation.title}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {conversation.messages.length > 0
                    ? `메시지 ${conversation.messages.length}개`
                    : '메시지 없음'}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 text-center">
            AI 채팅 어시스턴트 v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
