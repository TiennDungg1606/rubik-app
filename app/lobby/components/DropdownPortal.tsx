"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLElement | HTMLButtonElement | null>;
  children: React.ReactNode;
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
}

export default function DropdownPortal({
  isOpen,
  triggerRef,
  children,
  placement = 'bottom-left',
  className = ''
}: DropdownPortalProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'bottom-left':
          top = rect.bottom + scrollTop;
          left = rect.left + scrollLeft;
          break;
        case 'bottom-right':
          top = rect.bottom + scrollTop;
          left = rect.right + scrollLeft;
          break;
        case 'top-left':
          top = rect.top + scrollTop;
          left = rect.left + scrollLeft;
          break;
        case 'top-right':
          top = rect.top + scrollTop;
          left = rect.right + scrollLeft;
          break;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, placement, triggerRef]);

  if (!isOpen || !isMounted) return null;

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: position.top,
    left: position.left,
    zIndex: 9999,
  };

  // Adjust positioning based on placement
  if (placement.includes('right')) {
    dropdownStyle.transform = 'translateX(-100%)';
  }
  if (placement.includes('top')) {
    dropdownStyle.transform = `${dropdownStyle.transform || ''} translateY(-100%)`.trim();
  }

  return createPortal(
    <div style={dropdownStyle} className={className}>
      {children}
    </div>,
    document.body
  );
}
