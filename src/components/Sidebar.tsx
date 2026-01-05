import { useState, useEffect } from "react";
import { Plus, Trash2, X, BookOpen, FileText, Users, ChevronDown, ChevronRight, LayoutGrid, Menu, Search, SquarePen, Settings, MoreHorizontal, Pencil, Brain } from "lucide-react";
import { SettingsMenu } from "./SettingsMenu";
import { EternalLogo } from "./EternalLogo";
import { useNavigate, useLocation } from "react-router-dom";
import type { Conversation, Message, PersonaInstruction } from "../types";

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
  onRenameConversation: (id: string, newTitle: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  counts: StackCounts;
  onLogout: () => void;
  onResetLanguage: () => void;
  onResetVocabulary?: () => void;
  personaInstructions?: PersonaInstruction[];
  onUpdatePersonaInstructions?: (newInstructions: PersonaInstruction[]) => void;
  learningMode?: 'knowledge' | 'language';
  isAutoTTS?: boolean;
  onToggleAutoTTS?: () => void;
  vocabCount?: number;
  onOpenQuiz?: () => void;
}





export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onClose,
  onToggle,
  counts,
  onLogout,
  onResetLanguage,
  onResetVocabulary,
  personaInstructions,
  onUpdatePersonaInstructions,
  learningMode = 'knowledge',
  isAutoTTS = false,
  onToggleAutoTTS,
  vocabCount = 0,
  onOpenQuiz
}: SidebarProps) {




  const navigate = useNavigate();
  const location = useLocation();

  // Detect desktop screen size (Changed to 768px to allow Mini Sidebar on tablets/800px)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    const handleResize = () => {
      const nowDesktop = window.innerWidth >= 768;
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

  const [editingId, setEditingId] = useState<string | null>(null); // Legacy (Removed)
  const [editTitle, setEditTitle] = useState("");
  const [renameModalId, setRenameModalId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const startEditing = (id: string, currentTitle: string) => {
    setRenameModalId(id);
    setEditTitle(currentTitle);
    setActiveMenuId(null);
  };

  const handleRenameSubmit = () => {
    if (renameModalId && editTitle.trim()) {
      onRenameConversation(renameModalId, editTitle.trim());
      setRenameModalId(null);
    }
  };

  const collapsed = isDesktop && !isOpen;

  const MenuItem = ({
    path,
    onClick,
    icon,
    label,
    count,
    activeColor = "red",
    isSubItem = false,
  }: {
    path?: string;
    onClick?: () => void;
    icon: React.ReactNode;
    label: string;
    count?: number;
    activeColor?: string;
    isSubItem?: boolean;
  }) => {
    const active = path ? isActive(path) : false;
    return (
      <button
        onClick={() => {
          if (onClick) {
            onClick();
          } else if (path) {
            navigate(path);
          }
          onClose();
        }}
        className={`w-full flex items-center text-sm py-2 transition-colors relative font-mono group
          ${active
            ? "bg-zinc-800/50 text-white"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
          }
          ${!collapsed && isSubItem ? "pl-8" : ""}
        `}
        title={collapsed ? label : undefined}
      >
        {active && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-600" />
        )}
        {/* Icon Container - Fixed width to match Header Hamburger (w-10) for perfect alignment */}
        <div className="w-10 flex items-center justify-center shrink-0">
          {icon}
        </div>

        {/* Text Content - Expands/Collapses */}
        <div className={`flex items-center justify-between overflow-hidden transition-[width,opacity] duration-300 ${collapsed ? 'w-0 opacity-0' : 'flex-1 opacity-100 ml-2'}`}>
          <span className={`${active ? "font-bold" : "font-medium"} truncate`}>{label}</span>
           {count !== undefined && count > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 ${active ? `text-${activeColor}-500 bg-${activeColor}-500/10` : "text-zinc-600 bg-zinc-800"
              }`}>
              {count}
            </span>
          )}
        </div>
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
        className="bg-[#09090b] flex flex-col transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          position: isDesktop ? 'relative' : 'fixed',
          top: 0,
          left: isDesktop ? 'auto' : (isOpen ? 0 : '-100%'),
          // Desktop: Expanded 280px, Collapsed (Mini) 72px. Mobile: 280px or 0.
          width: isDesktop ? (isOpen ? '280px' : '72px') : '280px',
          height: '100vh',
          zIndex: isDesktop ? 50 : 200,
          // Always visible on desktop (either full or mini)
          visibility: (isDesktop) ? 'visible' : (isOpen ? 'visible' : 'hidden'),
          opacity: 1,
        }}
      >
        {/* UNIFIED SIDEBAR CONTENT - Single structure that transitions smoothly */}
        <div className="flex flex-col h-full w-full">
          {/* Header - Icon position fixed */}
          <div className="flex items-center justify-between py-3 px-4" style={{ minHeight: '60px' }}>
            {/* Left Section - Icons always left-aligned */}
            <div className="flex items-center gap-0">
              {/* Hamburger Menu - Always visible */}
              <button
                onClick={onToggle}
                className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Eternal Logo - Only visible when expanded */}
              <div 
                className="transition-all duration-300 overflow-hidden flex items-center h-10"
                style={{
                  opacity: (isDesktop && !isOpen) ? 0 : 1,
                  width: (isDesktop && !isOpen) ? 0 : 'auto',
                  marginLeft: (isDesktop && !isOpen) ? 0 : '0.5rem',
                }}
              >
                 {/* <EternalLogo /> Saved as requested */}
                 <div 
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (onNewConversation) onNewConversation();
                      else window.location.href = '/';
                    }}
                  >
                     {/* Signal Lights */}
                     <div className="flex items-center gap-1">
                       <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                       <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                       <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                     </div>
                     {/* Brand Name */}
                     <span className="text-white font-bold tracking-tight text-lg">
                       Signal <span className="text-zinc-500 font-light">VOCA</span>
                     </span>
                  </div>
              </div>
            </div>

            {/* Close button - Mobile only */}
            {!isDesktop && (
              <button
                onClick={onClose}
                className="p-1 text-zinc-500 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* New Signal Button - Icon position fixed */}
          <div className="py-3 px-4">
            <button
              onClick={() => {
                onNewConversation();
                if (!isDesktop) onClose();
              }}
              className="w-10 h-10 flex items-center justify-center bg-[#1e1f20] hover:bg-[#333333] text-zinc-400 hover:text-white rounded-full transition-colors flex-shrink-0"
              title={collapsed ? "New Chat" : undefined}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>


          {/* Scrollable Content - Only visible when expanded */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-4 custom-scrollbar transition-all duration-300"
            style={{
               // Always visible opacity, just layout shift
              opacity: 1, 
              visibility: 'visible',
            }}
          >
            {/* THE ARMORY Section */}
            <div className="mb-6">
              {!collapsed && (
                <div className="mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-600" />
                  <span className="font-mono text-xs font-bold text-zinc-500 tracking-widest">
                    THE ARMORY
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
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

            {!collapsed && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-zinc-500 tracking-widest">
                  RECENT ROOM
                </span>
              </div>
              <div className="space-y-0.5">
                {conversations.map((conv) => (
                  <div key={conv.id} className="relative group">
                    <button
                      onClick={() => {
                        navigate(`/chat/${conv.id}`);
                        if (!isDesktop) onClose();
                      }}
                      className={`w-full flex items-center text-left py-2 text-sm truncate rounded-lg transition-colors pr-8 ${
                        currentConversationId === conv.id
                          ? "bg-[#27272a] text-white"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a]/50"
                      }`}
                    >
                      {/* Spacer to align text with items that have icons */}
                      <div className="w-10 flex-shrink-0" />
                      <span className="truncate whitespace-nowrap">{conv.title}</span>
                    </button>
                    
                    {/* More Options Button */}
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
                            startEditing(conv.id, conv.title);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:bg-[#27272a] hover:text-white text-left"
                        >
                          <Pencil className="w-3 h-3" />
                          이름 변경
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalId(conv.id);
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
            )}
          </div>

          {/* Spacer for mini mode */}
          {isDesktop && !isOpen && <div className="flex-1" />}

          {/* Bottom Section */}
          <div className="bg-[#09090b] flex flex-col py-2 gap-1 px-4">
            {/* Language Quiz Button */}
            <MenuItem
              onClick={() => onOpenQuiz?.()}
              label="Interactive Quiz"
              icon={<Brain className="w-4 h-4 text-blue-400" />}
              activeColor="blue"
            />

            {/* Red Signal Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate("/stack/red");
                if (!isDesktop) onClose();
              }}
              className={`relative z-10 flex items-center py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all duration-300 w-full`}
            >
              <div className="w-10 flex items-center justify-center flex-shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_6px_rgba(220,38,38,0.5)] bg-red-600 shadow-red-600/50`} />
              </div>
              {!(isDesktop && !isOpen) && (
                <div className="flex-1 flex items-center justify-between ml-2 overflow-hidden">
                  <span className="text-sm font-medium whitespace-nowrap truncate">
                    Red Room
                  </span>
                  {counts.red > 0 && (
                    <span className="text-xs font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded ml-2">
                      {counts.red}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* Yellow Room Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate("/stack/yellow");
                if (!isDesktop) onClose();
              }}
              className={`relative z-10 flex items-center py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all duration-300 w-full`}
            >
              <div className="w-10 flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]" />
              </div>
              {!(isDesktop && !isOpen) && (
                <div className="flex-1 flex items-center justify-between ml-2 overflow-hidden">
                  <span className="text-sm font-medium whitespace-nowrap truncate">
                    Yellow Room
                  </span>
                  {counts.yellow > 0 && (
                    <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded ml-2">
                      {counts.yellow}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* Green Room Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate("/stack/green");
                if (!isDesktop) onClose();
              }}
              className={`relative z-10 flex items-center py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all duration-300 w-full`}
            >
              <div className="w-10 flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              </div>
              {!(isDesktop && !isOpen) && (
                <div className="flex-1 flex items-center justify-between ml-2 overflow-hidden">
                  <span className="text-sm font-medium whitespace-nowrap truncate">
                    Green Room
                  </span>
                  {counts.green > 0 && (
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-2">
                      {counts.green}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* Settings - Using SettingsMenu Component */}
            <SettingsMenu
              onLogout={onLogout}
              onResetLanguage={onResetLanguage}
              onResetVocabulary={onResetVocabulary}
              personaInstructions={personaInstructions}
              onUpdatePersonaInstructions={onUpdatePersonaInstructions}
              isAutoTTS={isAutoTTS}
              onToggleAutoTTS={onToggleAutoTTS}
              vocabularyCount={vocabCount}
              isCollapsed={isDesktop && !isOpen}
            />




          </div>
        </div>
        {/* Rename Modal (Gemini Style) */}
        {renameModalId && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setRenameModalId(null)}>
                <div 
                    className="w-[400px] bg-[#1e1f20] border border-[#27272a] rounded-2xl shadow-2xl p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-lg font-semibold text-white mb-4">채팅 이름 변경</h3>
                    <p className="text-sm text-zinc-400 mb-4">
                        채팅의 새로운 이름을 입력해주세요. 명확하고 기억하기 쉬운 이름이 좋습니다.
                    </p>
                    <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                             if (e.key === "Enter") handleRenameSubmit();
                             if (e.key === "Escape") setRenameModalId(null);
                        }}
                        autoFocus
                        className="w-full bg-[#27272a] text-white px-4 py-3 rounded-xl border border-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all mb-6 placeholder-zinc-500"
                        placeholder="채팅 이름 입력"
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setRenameModalId(null)}
                            className="px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors rounded-lg hover:bg-white/5"
                        >
                            취소
                        </button>
                        <button 
                            onClick={handleRenameSubmit}
                            className="px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors rounded-lg hover:bg-white/5"
                        >
                            이름 변경
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalId && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModalId(null)}>
                <div
                    className="w-[480px] bg-[#1e1f20] border border-[#27272a] rounded-2xl shadow-2xl p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-lg font-semibold text-white mb-4">채팅을 삭제하시겠습니까?</h3>
                    <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                        프롬프트, 대답, 의견이 Gemini 앱 활동에서 삭제될 뿐만 아니라, 사용자가 만든 콘텐츠도 삭제됩니다.
                        <br />
                        <button className="text-blue-400 hover:text-blue-300 mt-2 block text-sm font-medium">자세히 알아보기</button>
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setDeleteModalId(null)}
                            className="px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors rounded-lg hover:bg-white/5"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => {
                                if (deleteModalId) {
                                    onDeleteConversation(deleteModalId);
                                    setDeleteModalId(null);
                                }
                            }}
                            className="px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors rounded-lg hover:bg-white/5"
                        >
                            삭제
                        </button>
                    </div>
                </div>
            </div>
        )}
      </aside>
    </>
  );
}
