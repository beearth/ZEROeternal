import { useState, useEffect } from "react";
import { Plus, Trash2, X, BookOpen, FileText, Users, ChevronDown, ChevronRight, LayoutGrid, Menu, Search, SquarePen, Settings, MoreHorizontal, Pencil } from "lucide-react";
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
      const nowDesktop = window.innerWidth >= 1024;
      setIsDesktop(nowDesktop);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sidebar visibility is controlled by isOpen prop from parent
  // Parent (App.tsx) manages the state and auto-opens on resize to desktop
  const shouldShowSidebar = isOpen;

  const isActive = (path: string) => location.pathname === path;

  const [isGarageOpen, setIsGarageOpen] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

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
      {/* Overlay (Mobile only) */}
      {!isDesktop && isOpen && (
        <div
          className="lg:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 150,
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className="bg-[#09090b] border-r border-[#27272a] flex flex-col transition-all duration-300 ease-in-out"
        style={{
          position: isDesktop ? 'relative' : 'fixed',
          top: 0,
          left: isDesktop ? 'auto' : (isOpen ? 0 : '-100%'),
          // Desktop: Expanded 280px, Collapsed (Mini) 72px. Mobile: 280px or 0.
          width: isDesktop ? (isOpen ? '280px' : '72px') : '280px',
          height: '100vh',
          zIndex: isDesktop ? 30 : 200,
          // Always visible on desktop (either full or mini)
          visibility: (isDesktop) ? 'visible' : (isOpen ? 'visible' : 'hidden'),
          opacity: 1,
        }}
      >
        {/* Render Mini or Full based on desktop state */}
        {isDesktop && !isOpen ? (
            // MINI SIDEBAR CONTENT
            <div className="flex flex-col h-full items-center py-4">
                {/* 1. Hamburger (Top) */}
                <button
                    onClick={onToggle}
                    className="p-2 mb-4 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* 2. New Signal (SquarePen) */}
                <button
                    onClick={() => {
                        onNewConversation();
                        navigate("/");
                    }}
                    className="p-3 bg-[#1e1e20] text-zinc-400 hover:text-white rounded-xl mb-4 transition-colors"
                >
                    <SquarePen className="w-5 h-5" />
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* 3. Red Signal (Red Dot) */}
                 <button
                    onClick={() => navigate("/stack/red")}
                    className="p-2 mb-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors relative"
                >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                    {counts.red > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                </button>

                {/* 4. Settings */}
                <button
                     // We might need a mini settings menu or just navigate to settings?
                     // For now, let's just trigger reset language as a placeholder or better yet, make SettingsMenu capable of mini mode?
                     // Or just a simple gear icon that maybe does nothing or toggles the full menu?
                     // Let's just put the gear icon. Parent SettingsMenu renders complex UI.
                     // Simplest: Click -> Open Sidebar? or Navigate to settings page (if exists)?
                     // The user asked for "Settings Icon".
                     // Let's just make it toggle sidebar + open settings menu?
                     // Or just a visual icon for now?
                     // "아래는 설정아이콘 깔끔하게 똑같이"
                     onClick={() => {/* Maybe toggle sidebar to show settings? */ onToggle(); }}
                     className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                    <Settings className="w-5 h-5" />
                </button>
                
                 {/* System Status Dot */}
                 <div className="mt-4 mb-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
        ) : (
            // FULL SIDEBAR CONTENT (Existing)
            <div className="flex flex-col h-full w-full">
            {/* Header - EXACT MATCH to MainContent Header */}
            <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem', // Match MainContent
            minHeight: '60px',       // Match MainContent
            borderBottom: '1px solid #27272a',
        }}>
           {/* Left Section: Hamburger > Search > ETERNAL */}
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* 1. Hamburger Menu */}
              <button
                onClick={onToggle}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  color: '#9ca3af',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Menu style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>

              {/* 2. Search Icon with Red Dot inside */}
              <button
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  color: '#9ca3af',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Search style={{ width: '1.25rem', height: '1.25rem' }} />
                {/* Embedded Red Dot */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#dc2626',
                  transform: 'translate(-50%, -50%)',
                  marginTop: '-1px',
                  marginLeft: '-1px',
                  boxShadow: '0 0 5px #dc2626',
                  pointerEvents: 'none',
                }} />
              </button>

              {/* 3. ETERNAL brand */}
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#e4e4e7',
                letterSpacing: '0.05em',
                marginLeft: '0.25rem'
              }}>
                ETERNAL
              </span>
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

        {/* Top Section: New Signal Button */}
        <div className="px-4 py-4">
          <button
            onClick={() => {
              onNewConversation();
              navigate("/");
              if (!isDesktop) onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#18181b] hover:bg-[#27272a] text-[#d4d4d8] rounded-full transition-colors group border border-[#3f3f46]"
          >
            <Plus className="w-5 h-5 text-[#9ca3af] group-hover:text-white transition-colors" />
            <span className="font-mono text-sm font-bold tracking-wide">NEW SIGNAL</span>
          </button>
        </div>

        {/* Scrollable Signal List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 custom-scrollbar">
          
          {/* Recent Signals */}
          <div className="mb-6">
            <div className="px-4 mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-zinc-500 tracking-widest">
                RECENT SIGNALS
              </span>
            </div>
            <div className="space-y-0.5">
              {conversations.slice(0, 5).map((conv) => (
                <div key={conv.id} className="relative group">
                    <button
                    onClick={() => {
                        onSelectConversation(conv.id);
                        navigate("/");
                        if (!isDesktop) onClose();
                    }}
                    className={`w-full text-left px-4 py-2 text-sm truncate rounded-lg transition-colors pr-12 ${
                        currentConversationId === conv.id
                        ? "bg-[#27272a] text-white"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a]/50"
                    }`}
                    >
                    {conv.title}
                    </button>
                    
                    {/* More Options Button (Visible on Hover or if Menu Active) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === conv.id ? null : conv.id);
                        }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors ${
                            activeMenuId === conv.id ? "opacity-100 bg-zinc-700 text-white" : "opacity-0 group-hover:opacity-100"
                        }`}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === conv.id && (
                        <div 
                            className="absolute right-0 top-full mt-1 w-32 bg-[#1e1f20] border border-[#27272a] rounded-lg shadow-xl z-50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()} 
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Handle Rename (Not implemented yet - maybe just prompt or toast)
                                    // onRenameConversation(conv.id); 
                                    setActiveMenuId(null);
                                    console.log("Rename clicked");
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:bg-[#27272a] hover:text-white text-left"
                            >
                                <Pencil className="w-3 h-3" />
                                이름 변경
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("정말 삭제하시겠습니까?")) {
                                        onDeleteConversation(conv.id);
                                    }
                                    setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-[#27272a] hover:text-red-300 text-left"
                            >
                                <Trash2 className="w-3 h-3" />
                                삭제
                            </button>
                        </div>
                    )}
                </div>
              ))}
            </div>
          </div>



          {/* THE ARMORY Section */}
          <div className="mb-8">
            <div className="px-4 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-600" />
              <span className="font-mono text-xs font-bold text-zinc-500 tracking-widest">
                THE ARMORY
              </span>
            </div>
            <div className="space-y-0.5 px-2">
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
        </div>

        {/* Bottom Fixed Section */}
        <div className="p-4 border-t border-[#27272a] bg-[#09090b]">
           {/* Red Signal - Fixed Bottom Left */}
           <button
            onClick={() => {
              navigate("/stack/red");
              if (!isDesktop) onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors mb-2"
          >
            <div
              className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"
            />
            <span className="text-sm font-medium">Red Signal</span>
            {counts.red > 0 && (
               <span className="ml-auto text-xs font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                 {counts.red}
               </span>
            )}
          </button>

          <SettingsMenu
            onLogout={onLogout}
            onResetLanguage={onResetLanguage}
            onResetVocabulary={onResetVocabulary}
          />
          <div className="mt-4 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider">SYSTEM READY</span>
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">v2.0</span>
          </div>
        </div>
            {/* End of Full Sidebar Content */}
            </div>
        )}
      </aside>
    </>
  );
}
