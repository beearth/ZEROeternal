import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Star,
  FileText,
  Volume2,
  X,
} from "lucide-react";

export type RadialDirection =
  | "none"
  | "right" // East
  | "bottom" // South
  | "left" // West
  | "top"; // North

interface RadialMenuProps {
  center: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
  onSelect: (direction: RadialDirection) => void;
  selectedWord: string;
}

export function RadialMenu({
  center,
  isOpen,
  onClose,
  onSelect,
  selectedWord,
}: RadialMenuProps) {
  const [activeDirection, setActiveDirection] =
    useState<RadialDirection>("none");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveDirection("none");
    }
  }, [isOpen]);

  // Handle pointer move to determine direction
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - center.x;
      const deltaY = e.clientY - center.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Minimum distance to trigger selection (deadzone)
      if (distance < 30) {
        setActiveDirection("none");
        return;
      }

      // Calculate angle in degrees (-180 to 180)
      const angleRad = Math.atan2(deltaY, deltaX);
      let angleDeg = angleRad * (180 / Math.PI);
      if (angleDeg < 0) angleDeg += 360; // Normalize to 0-360

      // Map angle to 4 directions (90 degrees each)
      // Right: 315-45
      // Bottom: 45-135
      // Left: 135-225
      // Top: 225-315

      let newDirection: RadialDirection = "none";

      if (angleDeg >= 315 || angleDeg < 45) newDirection = "right";
      else if (angleDeg >= 45 && angleDeg < 135) newDirection = "bottom";
      else if (angleDeg >= 135 && angleDeg < 225) newDirection = "left";
      else if (angleDeg >= 225 && angleDeg < 315) newDirection = "top";

      setActiveDirection(newDirection);
    };

    const handlePointerUp = () => {
      // Only close if a direction is selected
      if (activeDirection !== "none") {
        onSelect(activeDirection);
        onClose();
      }
      // If activeDirection is "none", do NOT close.
      // This allows the user to release the mouse button and then click an item.
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isOpen, center, activeDirection, onSelect, onClose]);

  if (!isOpen) return null;

  // Helper to render menu items
  const renderMenuItem = (
    direction: RadialDirection,
    icon: React.ReactNode,
    label: string,
    bgColor: string,
    borderColor: string,
    textColor: string,
    position: { x: number; y: number }
  ) => {
    const isActive = activeDirection === direction;

    return (
      <div
        onPointerDown={(e) => {
          e.stopPropagation(); // Prevent bubbling
          onSelect(direction);
          onClose();
        }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: `2px solid ${isActive ? borderColor : 'rgba(255, 255, 255, 0.5)'}`,
          backgroundColor: isActive ? bgColor : 'rgba(255, 255, 255, 0.9)',
          color: isActive ? textColor : '#64748b',
          transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) ${isActive ? 'scale(1.25)' : 'scale(1)'}`,
          zIndex: isActive ? 20 : 10,
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>

        {/* Label */}
        {(isActive || label) && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: direction === 'top' ? '-40px' : direction === 'bottom' ? '80px' : '80px',
              transform: 'translateX(-50%)',
              opacity: isActive ? 1 : 0,
              transition: 'all 0.2s ease',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              fontSize: '14px',
              fontWeight: 'bold',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'white',
              color: '#0f172a',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}>
              {label}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Radius for menu items
  const radius = 110;

  // Calculate positions for 4 directions
  const positions = {
    right: { x: radius, y: 0 },
    bottom: { x: 0, y: radius },
    left: { x: -radius, y: 0 },
    top: { x: 0, y: -radius },
  };

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {/* Full Screen Dimmed Background */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'auto', // Capture clicks to prevent them reaching underlying elements
        }}
      />

      {/* Menu Container - Positioned at the touch point */}
      <div
        style={{
          position: 'absolute',
          left: center.x,
          top: center.y,
          width: 0,
          height: 0,
        }}
      >
        {/* Center Indicator (Selected Word) */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%)',
          zIndex: 30,
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid #dbeafe',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
              {selectedWord.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Menu Items */}

        {/* Right: Save Important */}
        {renderMenuItem(
          "right",
          <Star size={32} color={activeDirection === "right" ? "white" : "currentColor"} fill={activeDirection === "right" ? "white" : "none"} />,
          "중요 단어",
          "#facc15", // yellow-400
          "#eab308", // yellow-500
          "white",
          positions.right
        )}

        {/* Bottom: TTS */}
        {renderMenuItem(
          "bottom",
          <Volume2 size={32} color={activeDirection === "bottom" ? "white" : "currentColor"} />,
          "발음 듣기",
          "#3b82f6", // blue-500
          "#2563eb", // blue-600
          "white",
          positions.bottom
        )}

        {/* Left: Save Sentence */}
        {renderMenuItem(
          "left",
          <FileText size={32} color={activeDirection === "left" ? "white" : "currentColor"} />,
          "문장 저장",
          "#6366f1", // indigo-500
          "#4f46e5", // indigo-600
          "white",
          positions.left
        )}

        {/* Top: Close/Cancel */}
        {renderMenuItem(
          "top",
          <X size={32} color={activeDirection === "top" ? "white" : "currentColor"} />,
          "취소",
          "#94a3b8", // slate-400
          "#64748b", // slate-500
          "white",
          positions.top
        )}

      </div>
    </div>,
    document.body
  );
}
