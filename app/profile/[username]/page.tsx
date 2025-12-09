"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type User = {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  md33?: string;
  goal33?: string;
  main33?: string;
  Feevent?: string;
  customBg?: string;
  username?: string;
};

import { useRouter } from "next/navigation";

  
export default function PublicProfilePage() {
  const [myId, setMyId] = useState<string | null>(null);
  const { username: userId } = useParams();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [mobileShrink, setMobileShrink] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false); // Giữ lại khai báo này ở đầu hàm
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    async function fetchUser() {
      const res = await fetch(`/api/user/public-profile?userId=${userId}`);
      const data = await res.json();
      setUser(data.user);
    }
    fetchUser();
  }, [userId]);

  useEffect(() => {
    function checkDevice() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      const viewportWidth = window.innerWidth;
      const enableMobileLayout = mobile && viewportWidth >= 768;
      setIsMobileDevice(mobile);
      setIsMobile(enableMobileLayout);
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(mobile ? portrait : false);
      setMobileShrink(false);
    }
    if (typeof window !== 'undefined') {
      checkDevice();
      window.addEventListener('resize', checkDevice);
      window.addEventListener('orientationchange', checkDevice);
      return () => {
        window.removeEventListener('resize', checkDevice);
        window.removeEventListener('orientationchange', checkDevice);
      };
    }
  }, []);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        const data = await res.json();
        if (data && data.user && data.user._id) setMyId(data.user._id);
      } catch {}
    }
    fetchMe();
  }, []);




  // Move redirect logic to line 54 (before render)
  if (myId && userId === myId) {
    if (typeof window !== "undefined") {
      router.replace("/profile");
    }
    return null;
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !isMobile) return;

    const requestFullscreen = () => {
      try {
        const el: any = document.documentElement;
        const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (typeof fn === 'function') {
          fn.call(el);
        }
      } catch (error) {
        console.log('Không thể chuyển sang chế độ toàn màn hình:', error);
      }
    };

    const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    const gestureEvents: Array<keyof DocumentEventMap> = ['click', 'touchstart'];
    let gestureAttached = false;

    const removeGestureListeners = () => {
      if (!gestureAttached) return;
      gestureEvents.forEach(event => document.removeEventListener(event, handleGesture));
      gestureAttached = false;
    };

    const addGestureListeners = () => {
      if (gestureAttached) return;
      gestureEvents.forEach(event => document.addEventListener(event, handleGesture, { passive: true }));
      gestureAttached = true;
    };

    function handleGesture() {
      removeGestureListeners();
      requestFullscreen();
    }

    const updateFullscreenState = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      const active = Boolean(fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        addGestureListeners();
      } else {
        removeGestureListeners();
      }
    };

    addGestureListeners();
    fullscreenEvents.forEach(event => document.addEventListener(event, updateFullscreenState));
    updateFullscreenState();

    return () => {
      removeGestureListeners();
      fullscreenEvents.forEach(event => document.removeEventListener(event, updateFullscreenState));
    };
  }, [isMobile]);

  if (!user && !loadTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-800/20 text-white">
        <button
          type="button"
          disabled
          className="flex items-center gap-3 px-6 py-3 rounded-full bg-emerald-400/30 border border-emerald-300/60 text-lg font-semibold shadow-lg shadow-emerald-500/20"
        >
          <span className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
          Đang tải
        </button>
      </div>
    );
  }
  if (!user && loadTimeout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="text-2xl font-bold mb-4">Không tìm thấy người dùng</div>
        <div className="text-base text-white/70 mb-8">UserId không tồn tại hoặc đã bị xóa khỏi hệ thống.</div>
        <button
          className="px-5 py-2 rounded-full bg-neutral-900/80 text-white font-semibold shadow hover:bg-neutral-800/90 transition"
            onClick={() => router.replace("/lobby")}
        >
          Trở về
        </button>
      </div>
    );
  }

    // Các return sớm phải nằm sau tất cả các hook
  if (isMobileDevice && isPortrait) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white py-4">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-red-500/40 shadow-xl">
          <video
            src="/xoay.mp4"
            className="h-auto w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex flex-col py-10 px-10">
      {/* Back button */}
      <button
        className="absolute left-6 top-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900/80 text-white font-semibold shadow hover:bg-neutral-800/90 transition"
          onClick={() => router.replace("/lobby")}
        aria-label="Quay lại"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Trở về
      </button>
      <div className="w-full rounded-3xl overflow-hidden relative mb-8" style={{ background: "#181926" }}>
        <img src={user?.customBg || "/profile-bg.jpg"} alt="Profile background" className="w-full h-[260px] object-cover opacity-80" />
        <div className="absolute left-8 top-8 flex items-center gap-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold border-4 border-white shadow text-5xl">
            {user?.avatar ? (
              <img
                src={user?.avatar}
                alt="avatar"
                className="w-full h-full object-cover rounded-full"
                style={{ display: "block" }}
              />
            ) : (
              `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-5xl font-bold text-white drop-shadow">{user?.firstName} {user?.lastName}</h1>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h2 className="text-3xl font-extrabold text-white mb-6">About me</h2>
          <div className="mb-4">
            <span className="bg-neutral-800 text-white px-4 py-2 rounded-full font-semibold mr-2">Bio</span>
          </div>
            <div className="text-lg italic text-white/70 ml-2">{user?.bio || "No bio yet"}</div>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#23242a] rounded-2xl p-6 shadow border border-neutral-700">
            <span className="bg-neutral-800 text-white px-3 py-1 rounded-full font-semibold mb-2 inline-block">3x3 Method</span>
            <div className="text-lg text-white mt-2">{user?.md33 || "-"}</div>
          </div>
          <div className="bg-[#23242a] rounded-2xl p-6 shadow border border-neutral-700">
            <span className="bg-neutral-800 text-white px-3 py-1 rounded-full font-semibold mb-2 inline-block">3x3 Goal</span>
            <div className="text-lg text-white mt-2">{user?.goal33 || "-"}</div>
          </div>
          <div className="bg-[#23242a] rounded-2xl p-6 shadow border border-neutral-700">
            <span className="bg-neutral-800 text-white px-3 py-1 rounded-full font-semibold mb-2 inline-block">Main 3x3 Cube</span>
            <div className="text-lg text-white mt-2">{user?.main33 || "-"}</div>
          </div>
          <div className="bg-[#23242a] rounded-2xl p-6 shadow border border-neutral-700">
            <span className="bg-neutral-800 text-white px-3 py-1 rounded-full font-semibold mb-2 inline-block">Favorite Event</span>
            <div className="text-lg text-white mt-2">{user?.Feevent || "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
