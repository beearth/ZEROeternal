import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Sparkles, Layers, ArrowRight, Code2, Brain } from 'lucide-react';

export function Dashboard() {
    const navigate = useNavigate();

    const agents = [
        {
            id: 'deepseek',
            name: 'Code Master',
            description: 'Specialized in React, Tailwind, and System Architecture.',
            icon: Code2,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10',
            border: 'border-violet-500/20',
            glow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]',
            path: '/chat'
        },
        {
            id: 'gemini',
            name: 'General Assistant',
            description: 'Versatile helper for writing, analysis, and creative tasks.',
            icon: Bot,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
            path: '/chat'
        }
    ];

    const shortcuts = [
        {
            id: 'garage',
            name: 'Signal Garage',
            description: 'Review your captured knowledge and vocabulary.',
            icon: Layers,
            path: '/garage',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10'
        },
        {
            id: 'knowhow',
            name: 'AI Know-How',
            description: 'Explore community prompts and signals.',
            icon: Brain,
            path: '/knowhow',
            color: 'text-rose-400',
            bg: 'bg-rose-500/10'
        }
    ];

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Hero Section */}
            <div className="text-center py-10">
                <h1 className="text-4xl md:text-5xl font-brand font-bold text-white mb-4 tracking-tight">
                    Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">Signal AI</span>
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                    Your industrial-grade knowledge capture platform. Select an agent to begin.
                </p>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
                {agents.map((agent) => {
                    const Icon = agent.icon;
                    return (
                        <button
                            key={agent.id}
                            onClick={() => navigate(agent.path)}
                            className={`group relative flex flex-col items-start p-8 rounded-2xl border ${agent.border} ${agent.bg} ${agent.glow} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-white/30 text-left`}
                        >
                            <div className={`p-4 rounded-xl ${agent.bg} mb-6 group-hover:bg-white/10 transition-colors`}>
                                <Icon className={`w-8 h-8 ${agent.color}`} />
                            </div>
                            <h3 className="text-2xl font-brand font-bold text-white mb-2">{agent.name}</h3>
                            <p className="text-zinc-400 mb-6 flex-1">{agent.description}</p>

                            <div className="flex items-center gap-2 text-sm font-medium text-white/50 group-hover:text-white transition-colors">
                                Start Session <ArrowRight className="w-4 h-4" />
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto w-full mt-4">
                {shortcuts.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                        >
                            <div className={`p-2.5 rounded-lg ${item.bg}`}>
                                <Icon className={`w-5 h-5 ${item.color}`} />
                            </div>
                            <div>
                                <h4 className="font-bold text-zinc-200 group-hover:text-white transition-colors">{item.name}</h4>
                                <p className="text-xs text-zinc-500">{item.description}</p>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
