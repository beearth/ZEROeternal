import { Plus, MessageSquare, Trash2, X, BookOpen, Star, FileText, Users } from "lucide-react";
import { SettingsMenu } from "./SettingsMenu";
import { useNavigate, useLocation } from "react-router-dom";

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
  important: number;
  sentence: number;
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
  onLogout: () => void;
  onResetLanguage: () => void;
}

interface StackIconProps {
  active: "red" | "yellow" | "green";
  className?: string;
}

function StackIcon({ active, className }: StackIconProps) {
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
  onLogout,
  onResetLanguage,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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
              <h2 className="text-[#E3E3E3] font-semibold">🔴🟡🟢 SIGNAL VOCA</h2>
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
            학습 시그널
          </h3>
          <div className="space-y-1">
            {/* Red Stack */}
            <button
              onClick={() => navigate("/stack/red")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${isActive("/stack/red") ? "bg-[#2a2b2c]" : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <StackIcon active="red" className="w-5 h-5" />
                </div>
                <span className="text-red-400 font-medium truncate">
                  Red Signal
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
              onClick={() => navigate("/stack/yellow")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${isActive("/stack/yellow")
                ? "bg-[#2a2b2c]"
                : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <StackIcon active="yellow" className="w-5 h-5" />
                </div>
                <span className="text-yellow-400 font-medium truncate">
                  Yellow Signal
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
              onClick={() => navigate("/stack/green")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${isActive("/stack/green")
                ? "bg-[#2a2b2c]"
                : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <StackIcon active="green" className="w-5 h-5" />
                </div>
                <span className="text-green-400 font-medium truncate">
                  Green Signal
                </span>
              </div>
              {counts.green > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold flex-shrink-0 ml-2">
                  {counts.green}
                </span>
              )}
            </button>

            {/* TOEIC 4000 */}
            <button
              onClick={() => navigate("/toeic-4000")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${isActive("/toeic-4000")
                ? "bg-[#2a2b2c]"
                : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-purple-400 font-medium truncate">
                  TOEIC 4000
                </span>
              </div>
            </button>

            {/* Important Stack */}
            <button
              onClick={() => navigate("/stack/important")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${isActive("/stack/important")
                ? "bg-[#2a2b2c]"
                : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-orange-400 font-medium truncate">
                  중요 단어장
                </span>
              </div>
              {counts.important > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold flex-shrink-0 ml-2">
                  {counts.important}
                </span>
              )}
            </button>

            {/* Sentence Stack */}
            <button
              onClick={() => navigate("/stack/sentence")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${isActive("/stack/sentence")
                ? "bg-[#2a2b2c]"
                : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-blue-400 font-medium truncate">
                  문장 보관소
                </span>
              </div>
              {counts.sentence > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold flex-shrink-0 ml-2">
                  {counts.sentence}
                </span>
              )}
            </button>

            {/* Live AI Chat (Restored) */}
            <button
              onClick={() => navigate("/")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${isActive("/")
                ? "bg-[#2a2b2c]"
                : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-indigo-400 font-medium truncate">
                  Live AI Chat
                </span>
              </div>
            </button>

            {/* Community */}
            <button
              onClick={() => navigate("/community")}
              className={`w-full flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${isActive("/community")
                ? "bg-[#2a2b2c]"
                : "hover:bg-[#2a2b2c]/50"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-pink-400" />
                </div>
                <span className="text-pink-400 font-medium truncate">
                  커뮤니티
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* 대화 목록 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${conversation.id === currentConversationId && isActive("/")
                ? "bg-[#2a2b2c] border border-[#3a3b3c]"
                : "hover:bg-[#2a2b2c]/50 border border-transparent"
                }`}
              onClick={() => {
                onSelectConversation(conversation.id);
                navigate("/");
              }}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${conversation.id === currentConversationId && isActive("/")
                  ? "bg-gradient-to-br from-blue-500 to-purple-600"
                  : "bg-[#2a2b2c]"
                  }`}
              >
                <MessageSquare
                  className={`w-5 h-5 ${conversation.id === currentConversationId && isActive("/")
                    ? "text-white"
                    : "text-[#9ca3af]"
                    }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`truncate ${conversation.id === currentConversationId && isActive("/")
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
          ))
          }
        </div >

        {/* 푸터 */}
        < div className="p-4 border-t border-[#2a2b2c]" >
          <div className="text-xs text-[#9ca3af] text-center">
            AI 채팅 어시스턴트 v1.0
          </div>
        </div >
      </aside >
    </>
  );
}
