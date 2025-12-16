import { useState } from "react";
import { Plus, Trash2, X, BookOpen, FileText, Users, ChevronDown, ChevronRight, LayoutGrid, Menu } from "lucide-react";
import { SettingsMenu } from "./SettingsMenu";
import { EternalLogo } from "./EternalLogo";
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
  onResetVocabulary?: () => void;
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
  onResetVocabulary,
}: SidebarProps) {
  console.log("Sidebar: Rendered. isOpen:", isOpen);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const [isGarageOpen, setIsGarageOpen] = useState(true);

  const MenuItem = ({
    path,
    icon,
    label,
    count,
    activeColor = "red",
    isSubItem = false,
  }: {
    path: string;
    icon: React.ReactNode;
    label: string;
    count?: number;
    activeColor?: string;
    isSubItem?: boolean;
  }) => {
    const active = isActive(path);
    return (
      <button
        onClick={() => {
          navigate(path);
          onClose();
        }}
        className={`w-full flex items-center justify-between text-sm py-2 px-3 transition-colors relative font-mono group
          ${active
            ? "bg-zinc-800/50 text-white"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
          }
          ${isSubItem ? "pl-8" : ""}
        `}
      >
        {active && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-600" />
        )}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon}
          <span className={`${active ? "font-bold" : "font-medium"} truncate`}>{label}</span>
        </div>
        {count !== undefined && count > 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${active ? `text-${activeColor}-500 bg-${activeColor}-500/10` : "text-zinc-600 bg-zinc-800"
            }`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Overlay (Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full bg-[#09090b] border-r border-[#27272a] transition-transform duration-300 z-[9999] flex flex-col w-72 shadow-2xl
          ${isOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"}`}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#27272a]">
          {/* Header Top Row: Menu Button + Logo */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button - Left aligned */}
              <button
                onClick={onClose}
                className="p-1 hover:bg-[#27272a] rounded transition-colors lg:hidden text-zinc-500 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </button>
              <EternalLogo />
            </div>

            <button
              onClick={onClose}
              className="p-1 hover:bg-[#27272a] rounded transition-colors lg:hidden text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => {
              onNewConversation();
              navigate("/");
            }}
            className="group w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded hover:border-red-500/50 hover:text-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all duration-300"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-mono text-sm font-bold tracking-tight">NEW SIGNAL</span>
          </button>
        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto py-6">

          {/* RED GARAGE Section */}
          <div className="mb-8 pl-1">
            <button
              onClick={() => setIsGarageOpen(!isGarageOpen)}
              className="w-full flex items-center justify-between px-5 mb-3 group"
            >
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-zinc-600 group-hover:text-red-500 transition-colors" />
                <span className="font-mono text-xs font-bold text-zinc-500 tracking-widest group-hover:text-zinc-300 transition-colors">
                  RED GARAGE
                </span>
              </div>
              {isGarageOpen ? (
                <ChevronDown className="w-3 h-3 text-zinc-600" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-600" />
              )}
            </button>

            {isGarageOpen && (
              <div className="space-y-1">
                <MenuItem
                  path="/stack/red"
                  label="Red Signal"
                  count={counts.red}
                  icon={
                    <div
                      className="rounded-full flex-shrink-0 neon-dot"
                      style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#dc2626',
                        boxShadow: '0 0 8px #dc2626'
                      }}
                    />
                  }
                  isSubItem
                />
                <MenuItem
                  path="/stack/yellow"
                  label="Yellow Signal"
                  count={counts.yellow}
                  icon={
                    <div
                      className="rounded-full flex-shrink-0 neon-dot"
                      style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#ca8a04',
                        boxShadow: '0 0 8px #ca8a04'
                      }}
                    />
                  }
                  isSubItem
                  activeColor="yellow"
                />
                <MenuItem
                  path="/stack/green"
                  label="Green Signal"
                  count={counts.green}
                  icon={
                    <div
                      className="rounded-full flex-shrink-0 neon-dot"
                      style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#16a34a',
                        boxShadow: '0 0 8px #16a34a'
                      }}
                    />
                  }
                  isSubItem
                  activeColor="green"
                />
              </div>
            )}
          </div>

          {/* THE ARMORY Section */}
          <div className="mb-8 pl-1">
            <div className="px-5 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-600" />
              <span className="font-mono text-xs font-bold text-zinc-500 tracking-widest">
                THE ARMORY
              </span>
            </div>
            <div className="space-y-1">
              <MenuItem
                path="/stack/sentence"
                label="Sentence Archive"
                count={counts.sentence}
                icon={<FileText className="w-4 h-4 opacity-70" />}
                isSubItem
              />
              <MenuItem
                path="/toeic-4000"
                label="TOEIC 4000"
                icon={<BookOpen className="w-4 h-4 opacity-70" />}
                isSubItem
              />
              <MenuItem
                path="/community"
                label="Community"
                icon={<Users className="w-4 h-4 opacity-70" />}
                isSubItem
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#27272a] mx-5 my-6" />

          {/* Recent Signals */}
          <div className="px-5">
            <h3 className="font-mono text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">
              RECENT SIGNALS
            </h3>
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group relative flex items-center gap-3 py-2 px-2 rounded cursor-pointer transition-all font-mono text-xs ${conversation.id === currentConversationId && isActive("/")
                    ? "text-zinc-200 bg-zinc-800/50"
                    : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/30"
                    }`}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                    navigate("/");
                    onClose();
                  }}
                >
                  <span className="truncate flex-1">
                    {conversation.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-red-500/70 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a]">
          <SettingsMenu onLogout={onLogout} onResetLanguage={onResetLanguage} onResetVocabulary={onResetVocabulary} />

          <div className="mt-4 flex items-center justify-between opacity-30">
            <span className="font-mono text-[10px] text-zinc-500">SYSTEM READY</span>
            <span className="font-mono text-[10px] text-zinc-500">v2.0</span>
          </div>
        </div>
      </div>
    </>
  );
}
