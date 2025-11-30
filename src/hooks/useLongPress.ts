import { useRef, useCallback, useEffect } from 'react';

interface UseLongPressOptions {
  onLongPress: (event: React.PointerEvent) => void;
  onClick?: (event: React.MouseEvent | React.PointerEvent) => void;
  delay?: number;
  threshold?: number; // 최소 이동 거리 (px)
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  threshold = 10,
}: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);
  const hasMovedRef = useRef(false);
  const isPressedRef = useRef(false);

  const start = useCallback(
    (event: React.PointerEvent) => {
      // 기본 동작 방지
      event.preventDefault();
      event.stopPropagation();
      
      startPosRef.current = { x: event.clientX, y: event.clientY };
      isLongPressRef.current = false;
      hasMovedRef.current = false;
      isPressedRef.current = true;

      timeoutRef.current = setTimeout(() => {
        // 움직임이 없었을 때만 롱프레스 실행
        if (!hasMovedRef.current && isPressedRef.current) {
          isLongPressRef.current = true;
          onLongPress(event);
        }
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isPressedRef.current = false;
  }, []);

  const move = useCallback((event: React.PointerEvent) => {
    if (!startPosRef.current || !isPressedRef.current) return;

    const deltaX = event.clientX - startPosRef.current.x;
    const deltaY = event.clientY - startPosRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // threshold 이상 움직이면 롱프레스 취소
    if (distance > threshold) {
      hasMovedRef.current = true;
      clear();
    }
  }, [threshold, clear]);

  const end = useCallback(
    (event: React.MouseEvent | React.PointerEvent, isActualClick: boolean = false) => {
      const wasLongPress = isLongPressRef.current;
      const hadMoved = hasMovedRef.current;
      
      clear();

      // 실제 클릭(포인터 다운 + 포인터 업)이고 롱프레스가 아니었고 움직임이 없었을 때만 onClick 실행
      if (isActualClick && !wasLongPress && !hadMoved && onClick && startPosRef.current) {
        onClick(event as React.MouseEvent | React.PointerEvent);
      }

      isLongPressRef.current = false;
      hasMovedRef.current = false;
      startPosRef.current = null;
    },
    [onClick, clear]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      end(event, true); // 실제 클릭으로 표시
    },
    [end]
  );

  const handlePointerLeave = useCallback(
    (event: React.PointerEvent) => {
      // 포인터가 떠났을 때는 롱프레스만 취소하고 클릭은 실행하지 않음
      clear();
      isLongPressRef.current = false;
      hasMovedRef.current = false;
      startPosRef.current = null;
    },
    [clear]
  );

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
  };
}

