"use client";

import { useEffect, useState, useRef } from 'react';

interface GoogleAdProps {
  adSlot: string;
  className?: string;
}

export default function GoogleAd({ adSlot, className = '' }: GoogleAdProps) {
  const [adBlocked, setAdBlocked] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    // Kiểm tra xem script Google AdSense đã sẵn sàng chưa
    const checkScriptReady = () => {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        setScriptReady(true);
        // Kiểm tra quảng cáo bị chặn sau khi script sẵn sàng
        checkAdBlock();
      } else {
        // Script chưa sẵn sàng, thử lại sau
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          setTimeout(checkScriptReady, 1000);
        } else {
          // Đã thử quá nhiều lần, coi như bị chặn
          setAdBlocked(true);
        }
      }
    };

    // Bắt đầu kiểm tra script
    checkScriptReady();
  }, []);

  const checkAdBlock = () => {
    try {
      const testAd = document.createElement('div');
      testAd.className = 'adsbox';
      testAd.style.position = 'absolute';
      testAd.style.left = '-10000px';
      testAd.style.top = '-1000px';
      testAd.style.width = '1px';
      testAd.style.height = '1px';
      testAd.style.overflow = 'hidden';
      
      document.body.appendChild(testAd);
      const isBlocked = testAd.offsetHeight === 0;
      document.body.removeChild(testAd);
      
      if (isBlocked) {
        setAdBlocked(true);
        return;
      }
      
      // Nếu không bị chặn, load quảng cáo
      loadAd();
    } catch (error) {
      console.warn('Error checking ad block:', error);
      setAdBlocked(true);
    }
  };

  const loadAd = () => {
    if (!scriptReady || !adRef.current) {
      return;
    }

    try {
      // Đảm bảo window.adsbygoogle tồn tại
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        // Push quảng cáo vào Google AdSense
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true);
      }
    } catch (error) {
      console.warn('Error loading ad:', error);
      setAdBlocked(true);
    }
  };

  // Nếu script chưa sẵn sàng, hiển thị loading
  if (!scriptReady && !adBlocked) {
    return (
      <div className={`ad-loading ${className}`} style={{
        minHeight: '250px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Đang tải quảng cáo...</p>
        </div>
      </div>
    );
  }

  // Nếu quảng cáo bị chặn, hiển thị fallback
  if (adBlocked) {
    return (
      <div className={`ad-fallback ${className}`} style={{
        minHeight: '250px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '2px dashed #dee2e6',
        borderRadius: '8px'
      }}>
        <div className="text-center p-4">
          <p className="text-sm text-gray-500 mb-2">Quảng cáo bị chặn</p>
          <p className="text-xs text-gray-400">Vui lòng tắt trình chặn quảng cáo</p>
        </div>
      </div>
    );
  }

  // Nếu quảng cáo đang load, hiển thị loading
  if (!adLoaded) {
    return (
      <div className={`ad-loading ${className}`} style={{
        minHeight: '250px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Đang tải quảng cáo...</p>
        </div>
      </div>
    );
  }

  // Hiển thị quảng cáo
  return (
    <div className={`google-ad ${className}`} ref={adRef}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-8360769059197588"
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
