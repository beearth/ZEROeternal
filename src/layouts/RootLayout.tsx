import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Layers, Sparkles, Menu, ChevronDown } from 'lucide-react';

export function RootLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { label: 'Chat', path: '/', icon: MessageSquare },
        { label: 'Garage', path: '/garage', icon: Layers },
        { label: 'Know-How', path: '/knowhow', icon: Sparkles },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
            {/* Background Grid Pattern */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <header className="sticky top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                    <div className="container flex items-center justify-between h-14 px-4 mx-auto max-w-screen-xl">
                        {/* Logo */}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-brand font-bold text-lg tracking-tight text-white">
                                Signal AI
                            </span>
                        </div>

                        {/* Model Selector (Desktop) */}
                        <div className="hidden md:flex items-center px-3 py-1.5 rounded-full bg-secondary/50 border border-white/5 hover:border-white/10 transition-colors cursor-pointer gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            <span className="text-sm font-medium text-zinc-300">Signal 1.0</span>
                            <ChevronDown className="w-3 h-3 text-zinc-500" />
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${active
                                                ? 'text-white bg-white/5 shadow-[0_0_10px_rgba(255,255,255,0.05)] border border-white/10'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 ${active ? 'text-primary' : ''}`} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Mobile Menu Button */}
                        <button className="md:hidden p-2 text-zinc-400 hover:text-white">
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 container mx-auto px-4 py-6 max-w-screen-xl relative">
                    <Outlet />
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/10 pb-safe">
                    <div className="flex items-center justify-around h-16">
                        {navItems.map((item) => {
                            const active = isActive(item.path);
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`flex flex-col items-center justify-center gap-1 w-full h-full
                    ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
                                >
                                    <div className={`p-1.5 rounded-full transition-all ${active ? 'bg-white/10' : ''}`}>
                                        <Icon className={`w-5 h-5 ${active ? 'text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}`} />
                                    </div>
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </div>
    );
}
