import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecommendedFriend {
    id: string;
    name: string;
    avatar: string;
    streak: number;
    studies: number;
}

const MOCK_FRIENDS: RecommendedFriend[] = [];

export function FriendRecommendations() {
    if (MOCK_FRIENDS.length === 0) return null;

    const navigate = useNavigate();


    // Initialize follow state from localStorage or default to false
    const [followedFriends, setFollowedFriends] = React.useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('followed_friends');
        return saved ? JSON.parse(saved) : {};
    });

    const toggleFollow = (friendId: string) => {
        const newState = {
            ...followedFriends,
            [friendId]: !followedFriends[friendId]
        };
        setFollowedFriends(newState);
        localStorage.setItem('followed_friends', JSON.stringify(newState));
    };

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
                {MOCK_FRIENDS.map((friend) => {
                    const isFollowed = followedFriends[friend.id] || false;
                    return (
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

                                <Button
                                    onClick={() => toggleFollow(friend.id)}
                                    className={`w-full h-9 text-xs border-none shadow-sm font-bold rounded-xl transition-colors ${isFollowed
                                        ? "bg-purple-200 text-purple-800 hover:bg-purple-300"
                                        : "bg-[#ffe587] text-slate-900 hover:bg-[#ffd700]"
                                        }`}
                                >
                                    {isFollowed ? "FOLLOWING" : "FOLLOW"}
                                </Button>
                            </div>
                        </div>
                    );
                })}
                {/* Add a placeholder card to ensure right padding/margin visibility */}
                <div className="w-2 flex-shrink-0" />
            </div>
        </div>
    );

}
