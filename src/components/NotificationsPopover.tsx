import React, { useState, useEffect } from 'react';
import { Bell, Check, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { subscribeToNotifications, markNotificationAsRead } from '../services/userData';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Notification {
    id: string;
    recipientId: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    type: 'follow' | 'like' | 'comment';
    message: string;
    read: boolean;
    createdAt: any; // Firestore Timestamp
}

interface NotificationsPopoverProps {
    userId: string;
}

export function NotificationsPopover({ userId }: NotificationsPopoverProps) {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeToNotifications(userId, (data) => {
            setNotifications(data as Notification[]);
        });
        return () => unsubscribe();
    }, [userId]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await markNotificationAsRead(notification.id);
        }

        // Navigation Logic
        if (notification.type === 'follow') {
            navigate(`/profile/${notification.senderId}`);
        } else {
            // For like/comment, maybe go to post (need postId in notification schema first, but for now profile is safe or just stay)
            // Ideally we should add postId to notification schema later.
        }
        setIsOpen(false);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <div className="relative inline-flex">
                    <Button variant="ghost" size="icon" className="relative rounded-lg hover:bg-slate-100">
                        <Bell className="h-5 w-5 text-slate-600" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
                        )}
                    </Button>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 shadow-xl border-slate-200 p-0 rounded-xl overflow-hidden bg-white">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-900">알림</span>
                    {unreadCount > 0 && (
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                <ScrollArea className="h-[320px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                            <Bell className="h-8 w-8 opacity-20" />
                            <span className="text-sm">알림이 없습니다</span>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`flex items-start gap-3 p-3 text-left transition-colors hover:bg-slate-50 border-b border-slate-50 last:border-0 ${!notification.read ? 'bg-blue-50/50' : 'bg-white'
                                        }`}
                                >
                                    <Avatar className="h-9 w-9 border border-slate-200">
                                        <AvatarImage src={notification.senderAvatar} />
                                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-900 truncate">
                                            {notification.senderName}
                                        </div>
                                        <div className="text-sm text-slate-600 leading-snug line-clamp-2">
                                            {notification.message}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {notification.createdAt?.seconds
                                                ? formatDistanceToNow(new Date(notification.createdAt.seconds * 1000), { addSuffix: true, locale: ko })
                                                : '방금 전'
                                            }
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
