"use client";

import { useState, useEffect } from 'react';
import GoogleAd from './GoogleAd';

interface SmartAdWrapperProps {
  adSlot: string;
  className?: string;
  fallbackContent?: React.ReactNode;
  showAd?: boolean;
}

export default function SmartAdWrapper({ 
  adSlot, 
  className = '', 
  fallbackContent,
  showAd = true 
}: SmartAdWrapperProps) {
  const [adBlocked, setAdBlocked] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    // Kiểm tra xem user đã tương tác với website chưa
    const handleUserInteraction = () => {
      setUserInteracted(true);
    };

    // Lắng nghe các sự kiện tương tác của user
    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);

  // Nếu không hiển thị quảng cáo hoặc user chưa tương tác, return null
  if (!showAd || !userInteracted) {
    return null;
  }

  // Nếu quảng cáo bị chặn và có fallback content
  if (adBlocked && fallbackContent) {
    return <div className={className}>{fallbackContent}</div>;
  }

  // Hiển thị quảng cáo
  return (
    <GoogleAd 
      adSlot={adSlot} 
      className={className}
    />
  );
}
