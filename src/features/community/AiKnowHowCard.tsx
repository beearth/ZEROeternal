import React from "react";

interface AiKnowHowCardProps {
    category: string;
    title: string;
    description: string;
    onAction?: () => void;
}

export function AiKnowHowCard({ category, title, description, onAction }: AiKnowHowCardProps) {
    return (
        <div className="bg-[#2a2b2c] p-6 rounded-2xl border border-[#3a3b3c] shadow-lg hover:border-white/20 transition-all duration-300">
            {/* 1. 카테고리 태그 (아주 어두운 흰색) */}
            <span className="text-xs font-medium text-zinc-500 mb-2 block uppercase tracking-wider">
                {category}
            </span>

            {/* 2. 메인 타이틀 (가장 밝은 흰색 - Bright White) */}
            <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                {title}
            </h3>

            {/* 3. 설명 텍스트 (어두운 흰색 - Muted White) */}
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                {description}
            </p>

            {/* 4. 버튼 (은은한 보더 + 밝은 텍스트) */}
            <button
                onClick={onAction}
                className="mt-4 px-4 py-2 rounded-lg border border-white/20 text-zinc-300 hover:text-white hover:border-white transition-all duration-200 text-sm font-medium"
            >
                Use Signal
            </button>
        </div>
    );
}
