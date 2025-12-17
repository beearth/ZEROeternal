import { useState, useEffect } from "react";
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
  onToggle: () => void;
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
  onToggle,
  counts,
  onLogout,
  onResetLanguage,
  onResetVocabulary,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Detect desktop screen size
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On desktop, sidebar is always visible. On mobile, it depends on isOpen.
  const shouldShowSidebar = isDesktop || isOpen;

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
      {/* Overlay (Mobile only) - blocks clicks behind sidebar */}
      {!isDesktop && isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9998,
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        style={{
          position: isDesktop ? 'relative' : 'fixed',
          top: 0,
          left: isDesktop ? 'auto' : (shouldShowSidebar ? 0 : -288),
          width: 288,
          minWidth: isDesktop ? 288 : 0,
          height: isDesktop ? 'auto' : '100%',
          backgroundColor: '#09090b',
          borderRight: '1px solid #27272a',
          transition: isDesktop ? 'none' : 'left 0.3s ease-in-out',
          zIndex: isDesktop ? 'auto' : 9999,
          display: isDesktop ? 'flex' : (shouldShowSidebar ? 'flex' : 'none'),
          flexDirection: 'column',
          flexShrink: 0,
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #27272a' }}>
          {/* Header Top Row: Menu Button only (ETERNAL is in main header) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Hamburger Menu Button - Always visible, toggles sidebar */}
              <button
                onClick={onToggle}
                style={{
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  transition: 'background-color 0.2s',
                  color: '#71717a',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Menu style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
              {/* EternalLogo removed - now in main header */}
            </div>

            {/* Close button - Mobile only */}
            <button
              onClick={onClose}
              style={{
                padding: '0.25rem',
                borderRadius: '0.25rem',
                color: '#71717a',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: isDesktop ? 'none' : 'block',
              }}
            >
              <X style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>

          <button
            onClick={() => {
              onNewConversation();
              navigate("/");
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              color: '#d4d4d8',
              borderRadius: '0.25rem',
              transition: 'all 0.3s',
            }}
          >
            <Plus style={{ width: '1rem', height: '1rem' }} />
            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 'bold' }}>NEW SIGNAL</span>
          </button>
        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto py-6">

          {/* RED GARAGE Section */}
          <div style={{ marginBottom: '2rem', paddingLeft: '0.25rem' }}>
            <button
              onClick={() => setIsGarageOpen(!isGarageOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.25rem',
                marginBottom: '0.75rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LayoutGrid style={{ width: '1rem', height: '1rem', color: '#52525b' }} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold', color: '#71717a', letterSpacing: '0.1em' }}>
                  RED GARAGE
                </span>
              </div>
              {isGarageOpen ? (
                <ChevronDown style={{ width: '0.75rem', height: '0.75rem', color: '#52525b' }} />
              ) : (
                <ChevronRight style={{ width: '0.75rem', height: '0.75rem', color: '#52525b' }} />
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
      </aside>
    </>
  );
}
