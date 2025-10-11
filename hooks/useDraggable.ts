

import { useState, useCallback, useRef, RefObject, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

export const useDraggable = (handleRef: RefObject<HTMLElement>): { position: Position } => {
  const [position, setPosition] = useState<Position>({ x: 100, y: 100 });
  const dragInfo = useRef<{ isDragging: boolean; startX: number; startY: number; lastX: number; lastY: number }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 100,
    lastY: 100,
  });

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (handleRef.current && handleRef.current.contains(e.target as Node)) {
      dragInfo.current = {
        ...dragInfo.current,
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
      };
    }
  }, [handleRef]);

  const onMouseUp = useCallback(() => {
    if (dragInfo.current.isDragging) {
      dragInfo.current = {
        ...dragInfo.current,
        isDragging: false,
        lastX: position.x,
        lastY: position.y,
      };
    }
  }, [position.x, position.y]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (dragInfo.current.isDragging) {
      const deltaX = e.clientX - dragInfo.current.startX;
      const deltaY = e.clientY - dragInfo.current.startY;
      setPosition({
        x: dragInfo.current.lastX + deltaX,
        y: dragInfo.current.lastY + deltaY,
      });
    }
  }, []);

  // FIX: Replaced useState with useEffect for managing side effects (event listeners).
  useEffect(() => {
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [onMouseDown, onMouseUp, onMouseMove]);

  return { position };
};