"use client";

import { useEffect, useState } from 'react';

export default function GoogleAdScript() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    // Kiểm tra xem script đã được load chưa
    if (typeof window !== 'undefined' && !window.adsbygoogle) {
      try {
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8360769059197588';
        script.async = true;
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
          console.log('Google AdSense script loaded successfully');
          setScriptLoaded(true);
        };
        
        script.onerror = (error) => {
          console.warn('Failed to load Google AdSense script:', error);
          setScriptError(true);
        };
        
        // Thêm timeout để tránh treo
        const timeout = setTimeout(() => {
          if (!scriptLoaded && !scriptError) {
            console.warn('Google AdSense script load timeout');
            setScriptError(true);
          }
        }, 10000); // 10 giây timeout
        
        script.onload = () => {
          clearTimeout(timeout);
          console.log('Google AdSense script loaded successfully');
          setScriptLoaded(true);
        };
        
        script.onerror = (error) => {
          clearTimeout(timeout);
          console.warn('Failed to load Google AdSense script:', error);
          setScriptError(true);
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error creating Google AdSense script:', error);
        setScriptError(true);
      }
    } else if (window.adsbygoogle) {
      // Script đã có sẵn
      setScriptLoaded(true);
    }
  }, [scriptLoaded, scriptError]);

  // Component này không render gì, chỉ load script
  return null;
}

// Thêm type declaration cho window.adsbygoogle
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}
