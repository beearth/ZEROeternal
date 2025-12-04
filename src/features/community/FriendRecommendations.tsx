import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecommendedFriend {
    id: string;
    name: string;
    avatar: string;
    streak: number;
    studies: number;
}

const MOCK_FRIENDS: RecommendedFriend[] = [
    {
        id: '1',
        name: 'Study_Master',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        streak: 12,
        studies: 45
    },
    {
        id: '2',
        name: 'English_King',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop',
        streak: 5,
        studies: 23
    },
    {
        id: '3',
        name: 'Voca_Queen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        streak: 30,
        studies: 120
    },
    {
        id: '4',
        name: 'Daily_Learner',
        avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop',
        streak: 8,
        studies: 15
    }
];

export function FriendRecommendations() {
    const navigate = useNavigate();

    return (
        <div className="mb-8">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">친구 추천</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                {MOCK_FRIENDS.map((friend) => (
                    <div key={friend.id} className="snap-center flex-shrink-0 w-[calc((100%-32px)/3)] min-w-[200px] bg-[#d8b4fe] rounded-2xl p-4 shadow-sm border border-purple-300 relative group hover:shadow-md transition-all">
                        <button className="absolute top-2 right-2 text-purple-700 hover:text-purple-900 opacity-60 hover:opacity-100">
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div
                                className="cursor-pointer transition-transform hover:scale-105"
                                onClick={() => navigate(`/profile/${friend.id}`)}
                            >
                                <Avatar className="w-16 h-16 mb-3 border-2 border-purple-200 ring-2 ring-white">
                                    <AvatarImage src={friend.avatar} alt={friend.name} />
                                    <AvatarFallback>{friend.name[0]}</AvatarFallback>
                                </Avatar>
                            </div>

                            <h3 className="font-bold text-slate-900 text-sm mb-1 truncate w-full">{friend.name}</h3>

                            <div className="text-xs text-purple-900 mb-4 space-y-0.5 font-medium">
                                <p>SPEAKS {'>'} 🇰🇷</p>
                                <p>{'<'} STUDIES 🇺🇸</p>
                            </div>

                            <Button className="w-full h-9 text-xs bg-[#ffe587] text-slate-900 hover:bg-[#ffd700] border-none shadow-sm font-bold rounded-xl">
                                FOLLOW
                            </Button>
                        </div>
                    </div>
                ))}
                {/* Add a placeholder card to ensure right padding/margin visibility */}
                <div className="w-2 flex-shrink-0" />
            </div>
        </div>
    );
}
