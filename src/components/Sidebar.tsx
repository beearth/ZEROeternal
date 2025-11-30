import { Plus, MessageSquare, Trash2, X } from "lucide-react";
import { SettingsMenu } from "./SettingsMenu";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

interface StackCounts {
  red: number;
  yellow: number;
  green: number;
}

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  counts: StackCounts;
  currentView: "chat" | "red" | "yellow" | "green";
  onSelectView: (
    view: "chat" | "red" | "yellow" | "green"
  ) => void;
  onLogout: () => void;
  onResetLanguage: () => void;
}

interface TrafficLightIconProps {
  active: "red" | "yellow" | "green";
  className?: string;
}

function TrafficLightIcon({ active, className }: TrafficLightIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="5" y="2" width="14" height="20" rx="4" fill="#1e1f20" stroke="#3a3b3c" strokeWidth="1.5" />
      <circle cx="12" cy="7" r="2.5" fill={active === "red" ? "#ef4444" : "#2a2b2c"} className={active === "red" ? "animate-pulse" : ""} />
      <circle cx="12" cy="12" r="2.5" fill={active === "yellow" ? "#eab308" : "#2a2b2c"} className={active === "yellow" ? "animate-pulse" : ""} />
      <circle cx="12" cy="17" r="2.5" fill={active === "green" ? "#22c55e" : "#2a2b2c"} className={active === "green" ? "animate-pulse" : ""} />
    </svg>
  );
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onClose,
  counts,
  currentView,
  onSelectView,
  onLogout,
  onResetLanguage,
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
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-[#1e1f20] border-r border-[#2a2b2c] flex flex-col transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        {/* 헤더 */}
        <div className="p-4 border-b border-[#2a2b2c]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <SettingsMenu onLogout={onLogout} onResetLanguage={onResetLanguage} />
              <h2 className="text-[#E3E3E3] font-semibold">대화 목록</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2a2b2c] rounded-lg transition-colors lg:hidden"
            >
              <X className="w-5 h-5 text-[#E3E3E3]" />
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

        {/* 스택 통계 */}
        <div className="p-4 border-b border-[#2a2b2c]">
          <h3 className="text-sm font-semibold text-[#E3E3E3] mb-3">
            학습 스택
          </h3>
          <div className="space-y-1">
            {/* Red Stack */}
            <button
              onClick={() => onSelectView("red")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${currentView === "red" ? "bg-[#2a2b2c]" : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <TrafficLightIcon active="red" className="w-5 h-5" />
                </div>
                <span className="text-red-400 font-medium truncate">
                  Red Stack
                </span>
              </div>
              {counts.red > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold flex-shrink-0 ml-2">
                  {counts.red}
                </span>
              )}
            </button>

            {/* Yellow Stack */}
            <button
              onClick={() => onSelectView("yellow")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${currentView === "yellow"
                ? "bg-[#2a2b2c]"
                : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <TrafficLightIcon active="yellow" className="w-5 h-5" />
                </div>
                <span className="text-yellow-400 font-medium truncate">
                  Yellow Stack
                </span>
              </div>
              {counts.yellow > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold flex-shrink-0 ml-2">
                  {counts.yellow}
                </span>
              )}
            </button>

            {/* Green Stack */}
            <button
              onClick={() => onSelectView("green")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${currentView === "green"
                ? "bg-[#2a2b2c]"
                : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <TrafficLightIcon active="green" className="w-5 h-5" />
                </div>
                <span className="text-green-400 font-medium truncate">
                  Green Stack
                </span>
              </div>
              {counts.green > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold flex-shrink-0 ml-2">
                  {counts.green}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 대화 목록 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${conversation.id === currentConversationId
                ? "bg-[#2a2b2c] border border-[#3a3b3c]"
                : "hover:bg-[#2a2b2c]/50 border border-transparent"
                }`}
              onClick={() => {
                onSelectConversation(conversation.id);
                onSelectView("chat");
              }}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${conversation.id === currentConversationId
                  ? "bg-gradient-to-br from-blue-500 to-purple-600"
                  : "bg-[#2a2b2c]"
                  }`}
              >
                <MessageSquare
                  className={`w-5 h-5 ${conversation.id === currentConversationId
                    ? "text-white"
                    : "text-[#9ca3af]"
                    }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`truncate ${conversation.id === currentConversationId
                    ? "text-[#E3E3E3]"
                    : "text-[#E3E3E3]"
                    }`}
                >
                  {conversation.title}
                </p>
                <p className="text-xs text-[#9ca3af] mt-1">
                  {conversation.messages.length > 0
                    ? `메시지 ${conversation.messages.length}개`
                    : "메시지 없음"}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-[#3a3b3c] rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-[#2a2b2c]">
          <div className="text-xs text-[#9ca3af] text-center">
            AI 채팅 어시스턴트 v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
