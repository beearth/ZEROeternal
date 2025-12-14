import React, { useMemo } from "react";
import { BookOpen, Star, Volume2, Search, X, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

export type RadialDirection = "left" | "right" | "top" | "bottom";

interface RadialMenuProps {
    isOpen: boolean;
    center: { x: number; y: number } | null;
    word: string;
    onClose: () => void;
    onSelect: (direction: RadialDirection) => void;
    variant?: "chat" | "list";
}

export const RadialMenu: React.FC<RadialMenuProps> = ({
    isOpen,
    center,
    word,
    onClose,
    onSelect,
    variant = "chat",
}) => {
    const [activeDirection, setActiveDirection] = React.useState<RadialDirection | null>(null);

    // Memoize boundary logic
    const buttonSize = 44;
    const radius = 55;
    const safePadding = 10;
    const menuExtent = radius + buttonSize / 2 + safePadding;

    const adjustedCenter = useMemo(() => {
        if (!center) return { x: 0, y: 0 };
        let { x, y } = center;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        if (x - menuExtent < 0) x = menuExtent;
        if (x + menuExtent > screenW) x = screenW - menuExtent;

        if (y - menuExtent < 0) y = menuExtent;
        if (y + menuExtent > screenH) y = screenH - menuExtent;

        return { x, y };
    }, [center]);

    const { x, y } = adjustedCenter;

    const activeDirectionRef = React.useRef<RadialDirection | null>(null);

    // Sync ref with state
    React.useEffect(() => {
        activeDirectionRef.current = activeDirection;
    }, [activeDirection]);

    // Reset state when opening (Fixes stale state issue)
    React.useEffect(() => {
        if (isOpen) {
            setActiveDirection(null);
            activeDirectionRef.current = null;
        }
    }, [isOpen]);

    // Gesture Handling
    React.useEffect(() => {
        if (!isOpen || !center) return;

        const handlePointerMove = (e: PointerEvent) => {
            // Use logical center (finger position) for gesture
            const originX = center.x;
            const originY = center.y;

            const dx = e.clientX - originX;
            const dy = e.clientY - originY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let newDirection: RadialDirection | null = null;

            // Deadzone check (don't activate if too close to center)
            if (dist >= 25) {
                // Calculate angle
                let angle = Math.atan2(dy, dx) * (180 / Math.PI);

                // Navigate quadrants
                if (angle >= -45 && angle < 45) {
                    newDirection = "right";
                } else if (angle >= 45 && angle < 135) {
                    newDirection = "bottom";
                } else if (angle >= -135 && angle < -45) {
                    newDirection = "top";
                } else {
                    newDirection = "left";
                }
            }

            // Only update if changed to avoid unnecessary renders
            if (activeDirectionRef.current !== newDirection) {
                activeDirectionRef.current = newDirection;
                setActiveDirection(newDirection);
            }
        };

        const handlePointerUp = (e: PointerEvent) => {
            // Use ref to get the absolute latest value, ignoring render cycles
            const currentDir = activeDirectionRef.current;

            e.preventDefault();
            e.stopPropagation();

            if (currentDir) {
                onSelect(currentDir);
            }
            // Always close on release (User request: "Release to Cancel")
            onClose();
        };

        // Bind both listeners in the same effect to ensure they share context if needed
        // but strictly speaking they can be separate. Merging them here simplifies lifecycle.
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [isOpen, center, onSelect, onClose]);


    if (!isOpen || !center) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none" style={{ touchAction: 'none' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/10 pointer-events-auto"
                onClick={onClose}
            />

            {/* Menu Container */}
            <div
                className="absolute w-0 h-0 pointer-events-none"
                style={{ left: x, top: y }}
            >
                {/* Center Button (Close) */}
                <button
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center font-bold z-20 pointer-events-auto transition-transform"
                    style={{ width: buttonSize, height: buttonSize }}
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Top: Detail */}
                <RadialButton
                    icon={<Search className="w-5 h-5 text-slate-700" />}
                    angle={-90}
                    radius={radius}
                    size={buttonSize}
                    isActive={activeDirection === "top"}
                    onClick={() => onSelect("top")}
                />

                {/* Right: Important */}
                <RadialButton
                    icon={<Star className="w-5 h-5 text-slate-700" />}
                    angle={0}
                    radius={radius}
                    size={buttonSize}
                    isActive={activeDirection === "right"}
                    onClick={() => onSelect("right")}
                />

                {/* Bottom: TTS */}
                <RadialButton
                    icon={<Volume2 className="w-5 h-5 text-slate-700" />}
                    angle={90}
                    radius={radius}
                    size={buttonSize}
                    isActive={activeDirection === "bottom"}
                    onClick={() => onSelect("bottom")}
                />

                {/* Left: Sentence (Chat) or Delete (List) */}
                <RadialButton
                    icon={variant === "list" ? <Trash2 className="w-5 h-5 text-slate-700" /> : <BookOpen className="w-5 h-5 text-slate-700" />}
                    angle={180}
                    radius={radius}
                    size={buttonSize}
                    isActive={activeDirection === "left"}
                    onClick={() => onSelect("left")}
                />
            </div>
        </div>,
        document.body
    );
};

interface RadialButtonProps {
    icon: React.ReactNode;
    angle: number;
    radius: number;
    size: number;
    isActive?: boolean;
    onClick: () => void;
}

const RadialButton: React.FC<RadialButtonProps> = ({
    icon,
    angle,
    radius,
    size,
    isActive,
    onClick,
}) => {
    const radian = (angle * Math.PI) / 180;
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`absolute flex items-center justify-center rounded-full shadow-lg transition-all duration-150 pointer-events-auto z-10 ${isActive
                ? "bg-blue-500 text-white scale-125 shadow-blue-300/50"
                : "bg-slate-200 hover:bg-white hover:scale-110 active:scale-95"
                }`}
            style={{
                width: size,
                height: size,
                transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
            }}
        >
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                className: isActive ? "w-5 h-5 text-white" : "w-5 h-5 text-slate-700",
            })}
        </button>
    );
};
