declare global {
  interface Window { userName?: string }
}
"use client"


import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import AuthForm from "@/components/AuthForm";

export default function HomePage() {
  // Tự động chuyển hướng nếu đã đăng nhập (còn cookie)
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const backgroundVideoRef = useRef<HTMLVideoElement|null>(null);
  const [forceMuted, setForceMuted] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [mobileShrink, setMobileShrink] = useState(false);
  useEffect(() => {
    async function checkLogin() {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.firstName && data.lastName) {
            window.userName = data.firstName + " " + data.lastName;
          } else {
            window.userName = undefined;
          }
          setTimeout(() => {
            window.location.href = "/lobby";
          }, 5000); // Độ trễ 5 giây
        } else {
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    }
    checkLogin();
  }, []);

  useEffect(() => {
    function evaluateViewport() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      const portrait = window.innerHeight > window.innerWidth;
      const mobileLandscape = mobile && !portrait && window.innerWidth < 1200;
      setIsMobileLandscape(mobileLandscape);
      const compactWidth = window.innerWidth < 768;
      setMobileShrink(compactWidth || mobileLandscape);
    }

    if (typeof window !== "undefined") {
      evaluateViewport();
      window.addEventListener("resize", evaluateViewport);
      window.addEventListener("orientationchange", evaluateViewport);
      return () => {
        window.removeEventListener("resize", evaluateViewport);
        window.removeEventListener("orientationchange", evaluateViewport);
      };
    }
  }, []);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video) return;
    setForceMuted(false);
    video.muted = false;
    const playResult = video.play();
    if (playResult instanceof Promise) {
      playResult.catch(() => setForceMuted(true));
    }
  }, [checking]);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video || !forceMuted) return;
    video.muted = true;
    video.play().catch(() => {});
  }, [forceMuted, checking]);

  const effectiveMobileShrink = mobileShrink || isMobileLandscape;
  const loadingLogoSize = effectiveMobileShrink ? 40 : 48;
  const loadingTitleClasses = `${effectiveMobileShrink ? "text-xl" : "text-2xl sm:text-3xl"} font-extrabold text-center tracking-tight text-gray-200 drop-shadow mb-3`;
  const brandLogoSize = effectiveMobileShrink ? 48 : 64;
  const brandTitleClasses = `${effectiveMobileShrink ? "text-lg" : "text-2xl sm:text-3xl"} font-extrabold text-center tracking-tight text-gray-200 drop-shadow mb-1`;
  const brandSubtitleClasses = `text-center text-gray-300 ${effectiveMobileShrink ? "text-[11px]" : "text-xs sm:text-sm"} mb-2`;
  const cardPaddingClasses = effectiveMobileShrink ? "p-3" : "p-8";

  if (checking) {
    return (
      <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Background Rubik video */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <video
            ref={backgroundVideoRef}
            autoPlay
            loop
            muted={forceMuted}
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{ objectFit: 'cover' }}
          >
            <source src="/rubik-bg.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="z-10 w-full max-w-md bg-black/40 rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-gray-700">
          <h1 className={loadingTitleClasses}>Rubik App</h1>
          <span className="mb-6">
            <svg width={loadingLogoSize} height={loadingLogoSize} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="18" height="18" rx="3" fill="#F59E42" stroke="#222" strokeWidth="2"/>
              <rect x="23" y="2" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2"/>
              <rect x="44" y="2" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2"/>
              <rect x="2" y="23" width="18" height="18" rx="3" fill="#FDE047" stroke="#222" strokeWidth="2"/>
              <rect x="23" y="23" width="18" height="18" rx="3" fill="#22D3EE" stroke="#222" strokeWidth="2"/>
              <rect x="44" y="23" width="18" height="18" rx="3" fill="#22C55E" stroke="#222" strokeWidth="2"/>
              <rect x="2" y="44" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2"/>
              <rect x="23" y="44" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2"/>
              <rect x="44" y="44" width="18" height="18" rx="3" fill="#F59E42" stroke="#222" strokeWidth="2"/>
            </svg>
          </span>
          <span className="mb-3 animate-spin">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="20" stroke="#3B82F6" strokeWidth="6" strokeDasharray="60 40"/>
            </svg>
          </span>
          <div className="text-lg text-gray-200 font-semibold mb-1">Đang kiểm tra đăng nhập...</div>
          <div className="text-gray-400 text-sm mt-1">Nếu đã lưu cookie, bạn sẽ được tự động đăng nhập.</div>
        </div>
      </main>
    );
  }
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Background Rubik video */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <video
          ref={backgroundVideoRef}
          autoPlay
          loop
          muted={forceMuted}
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ objectFit: 'cover' }}
        >
          <source src="/rubik-bg.mp4" type="video/mp4" />
        </video>
      </div>
  <div className={`z-10 w-full max-w-md bg-black/40 rounded-2xl shadow-2xl ${cardPaddingClasses} flex flex-col items-center border border-gray-700`}>
        <span className="mb-2">
          <svg width={brandLogoSize} height={brandLogoSize} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="18" height="18" rx="3" fill="#F59E42" stroke="#222" strokeWidth="2"/>
            <rect x="23" y="2" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2"/>
            <rect x="44" y="2" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2"/>
            <rect x="2" y="23" width="18" height="18" rx="3" fill="#FDE047" stroke="#222" strokeWidth="2"/>
            <rect x="23" y="23" width="18" height="18" rx="3" fill="#22D3EE" stroke="#222" strokeWidth="2"/>
            <rect x="44" y="23" width="18" height="18" rx="3" fill="#22C55E" stroke="#222" strokeWidth="2"/>
            <rect x="2" y="44" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2"/>
            <rect x="23" y="44" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2"/>
            <rect x="44" y="44" width="18" height="18" rx="3" fill="#F59E42" stroke="#222" strokeWidth="2"/>
          </svg>
        </span>
        <h1 className={brandTitleClasses}>Rubik App Online</h1>
        <div className={brandSubtitleClasses}>Giải đấu Rubik trực tuyến, giao lưu rubik, hiện đại</div>
        <div className="w-full flex flex-col gap-2">
          <AuthForm onLogin={() => {
            // Đăng nhập thành công thì chuyển hướng sang /lobby
            window.location.href = "/lobby";
          }} />
        </div>
      </div>
    </main>
  );
}
