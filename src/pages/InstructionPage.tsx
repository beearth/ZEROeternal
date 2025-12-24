import React, { useState } from "react";
import { 
    Plus, Trash2, ToggleLeft, ToggleRight, Check, 
    X as CloseIcon, ChevronLeft, Info, MoreVertical, 
    Lightbulb, Trash
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PersonaInstruction } from "../types";

interface InstructionPageProps {
    personaInstructions: PersonaInstruction[];
    onUpdatePersonaInstructions: (newInstructions: PersonaInstruction[]) => void;
}

export function InstructionPage({ 
    personaInstructions, 
    onUpdatePersonaInstructions 
}: InstructionPageProps) {
    const navigate = useNavigate();
    const [isAdding, setIsAdding] = useState(false);
    const [newInstruction, setNewInstruction] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Master toggle logic: if any is active, master is ON. Switching OFF master disables all.
    const isMasterOn = personaInstructions.some(p => p.isActive);

    const handleToggleMaster = () => {
        const newState = !isMasterOn;
        onUpdatePersonaInstructions(
            personaInstructions.map(p => ({ ...p, isActive: newState }))
        );
    };

    const handleAddInstruction = () => {
        if (!newInstruction.trim()) return;
        const newItem: PersonaInstruction = {
            id: Date.now().toString(),
            content: newInstruction.trim(),
            isActive: true
        };
        onUpdatePersonaInstructions([...personaInstructions, newItem]);
        setNewInstruction("");
        setIsAdding(false);
    };

    const handleDeleteAll = () => {
        if (window.confirm("모든 지침을 삭제하시겠습니까?")) {
            onUpdatePersonaInstructions([]);
        }
    };

    const handleDelete = (id: string) => {
        onUpdatePersonaInstructions(personaInstructions.filter(p => p.id !== id));
        setActiveMenuId(null);
    };

    const handleToggle = (id: string) => {
        onUpdatePersonaInstructions(
            personaInstructions.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)
        );
    };

    return (
        <div className="flex-1 flex flex-col bg-[#131314] text-[#E3E3E3] min-h-screen">
            {/* Header Area */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-[#2a2b2c] bg-[#131314] sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-[#27272a] rounded-full transition-colors text-zinc-400"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-medium">ZERO ETERNAL 요청 사항</h1>
                        <Info className="w-4 h-4 text-zinc-500 cursor-help" />
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <span className="text-sm text-zinc-400 font-medium">기능 활성화</span>
                    <button 
                        onClick={handleToggleMaster}
                        className={`transition-colors ${isMasterOn ? "text-blue-500" : "text-zinc-700"}`}
                    >
                        {isMasterOn ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
                <section className="mb-10">
                    <p className="text-[#E3E3E3] text-base leading-relaxed mb-8">
                        더 유용한 대답을 얻으려면 개인적인 생활과 관심사에 대한 정보를 공유하세요. 
                        여기서 새로운 정보를 추가하거나 채팅 중에 ZERO ETERNAL에게 구체적인 정보를 기억해 달라고 요청하세요.
                    </p>

                    <div className="flex items-center gap-2 mb-8">
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#c2e7ff] hover:bg-[#b3d9f0] text-[#001d35] rounded-full text-sm font-semibold transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            추가
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 border border-[#444746] hover:bg-[#27272a] text-[#E3E3E3] rounded-full text-sm font-semibold transition-colors">
                            <Lightbulb className="w-4 h-4 text-blue-400" />
                            예시 표시
                        </button>
                        <button 
                            onClick={handleDeleteAll}
                            className="ml-auto flex items-center gap-2 px-4 py-2 border border-[#444746] hover:bg-red-500/10 text-red-400 rounded-full text-sm font-semibold transition-colors"
                        >
                            <Trash className="w-4 h-4" />
                            모두 삭제
                        </button>
                    </div>

                    {isAdding && (
                        <div className="mb-6 p-4 bg-[#1e1f20] rounded-2xl border border-blue-500/50 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                            <textarea
                                autoFocus
                                value={newInstruction}
                                onChange={(e) => setNewInstruction(e.target.value)}
                                placeholder="예: 나는 항상 비즈니스 영어 공부에 집중하고 있어. 답변할 때 격식 있는 표현을 많이 사용해줘."
                                className="w-full h-32 bg-transparent text-white outline-none resize-none mb-4 placeholder-zinc-600 font-sans leading-relaxed"
                            />
                            <div className="flex justify-end gap-3">
                                <button 
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                                >
                                    취소
                                </button>
                                <button 
                                    onClick={handleAddInstruction}
                                    disabled={!newInstruction.trim()}
                                    className="px-6 py-2 bg-blue-600 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold transition-all"
                                >
                                    저장
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Instruction List */}
                    <div className="space-y-4">
                        {personaInstructions.length === 0 && !isAdding && (
                            <div className="text-center py-20 bg-[#1e1f20] rounded-3xl border border-dashed border-[#444746]">
                                <div className="w-16 h-16 bg-[#27272a] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Info className="w-8 h-8 text-zinc-600" />
                                </div>
                                <h3 className="text-lg font-medium text-zinc-400 mb-2">등록된 요청 사항이 없습니다</h3>
                                <p className="text-sm text-zinc-500">추가 버튼을 눌러 ZERO ETERNAL이 기억할 나만의 정보를 입력해보세요.</p>
                            </div>
                        )}
                        
                        {personaInstructions.map((p) => (
                            <div 
                                key={p.id} 
                                className={`group relative p-6 rounded-2xl border transition-all duration-300 ${
                                    p.isActive 
                                    ? "bg-[#1e1f20] border-[#444746] hover:border-zinc-500" 
                                    : "bg-[#09090b] border-transparent opacity-60"
                                }`}
                            >
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <p className={`text-[#e3e3e3] text-base leading-relaxed ${!p.isActive && "line-through text-zinc-600"}`}>
                                            {p.content}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-start gap-2">
                                        <button 
                                            onClick={() => handleToggle(p.id)}
                                            className={`transition-colors ${p.isActive ? "text-blue-500" : "text-zinc-700"}`}
                                            title={p.isActive ? "비활성화" : "활성화"}
                                        >
                                            {p.isActive ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                                        </button>
                                        
                                        <div className="relative">
                                            <button 
                                                onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                                                className="p-1 hover:bg-[#27272a] rounded-full text-zinc-400 hover:text-white transition-colors"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                            
                                            {activeMenuId === p.id && (
                                                <div className="absolute right-0 top-full mt-2 w-32 bg-[#1e1f20] border border-[#2a2b2c] rounded-xl shadow-2xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingId(p.id);
                                                            setNewInstruction(p.content);
                                                            setActiveMenuId(null);
                                                            setIsAdding(true);
                                                            onUpdatePersonaInstructions(personaInstructions.filter(item => item.id !== p.id));
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-[#27272a] hover:text-white"
                                                    >
                                                        수정
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(p.id)}
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Close Overlay for Dropdown */}
            {activeMenuId && (
                <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setActiveMenuId(null)}
                />
            )}
        </div>
    );
}
