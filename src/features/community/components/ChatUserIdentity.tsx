
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";

interface ChatUserIdentityProps {
    userId: string;
    name: string;
    avatar?: string;
    className?: string;
    showName?: boolean;
    location?: string;
    flag?: string;
}

export const ChatAvatar = ({ userId, name, avatar, className }: { userId: string, name: string, avatar?: string, className?: string }) => {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${userId}`, {
            state: { userName: name, userAvatar: avatar }
        });
    };

    return (
        <Avatar
            className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
            onClick={handleClick}
        >
            <AvatarImage src={avatar} />
            <AvatarFallback>{name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
    );
};

export const ChatUserName = ({ userId, name, className }: { userId: string, name: string, className?: string }) => {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${userId}`, {
            state: { userName: name }
        });
    };

    return (
        <span
            className={`cursor-pointer hover:underline hover:text-blue-600 transition-colors ${className}`}
            onClick={handleClick}
        >
            {name}
        </span>
    );
};
