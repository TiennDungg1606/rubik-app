"use client";
import React, { useRef } from "react";
import { useState, useEffect } from "react";

export default function ProfilePage() {
      const [showMenu, setShowMenu] = useState(false);
      const menuRef = useRef<HTMLDivElement>(null);
      const [isMobileLandscape, setIsMobileLandscape] = useState(false);
      const [mobileShrink, setMobileShrink] = useState(false);
      useEffect(() => {
        if (!showMenu) return;
        function handleClick(e: MouseEvent) {
          if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            setShowMenu(false);
          }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
      }, [showMenu]);
    const handleCopyProfileLink = () => {
      navigator.clipboard.writeText(window.location.href);
    };
  const [user, setUser] = React.useState<any>(null);
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        const data = await res.json();
        if (data && data.user) setUser(data.user);
      } catch {}
    }
    fetchUser();
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

  const avatarText = user && (user.firstName || user.lastName)
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "👤";

  // mobileShrink logic (assume you already have useEffect and state)
  // Variables for responsive sizes
  const avatarSize = mobileShrink ? "w-20 h-20 text-3xl" : "w-32 h-32 text-5xl";
  const nameSize = mobileShrink ? "text-2xl" : "text-5xl";
  const pxSize = mobileShrink ? "px-8" : "px-10";
  const pySize = mobileShrink ? "py-5" : "py-10";
  const aboutTitleSize = mobileShrink ? "text-xl mb-3" : "text-3xl mb-6";
  const bioTextSize = mobileShrink ? "text-sm" : "text-lg";
  const cardPadding = mobileShrink ? "p-3" : "p-6";
  const cardTitleSize = mobileShrink ? "text-base" : "text-lg";
  const cardBadgeSize = mobileShrink ? "px-2 py-0.5 text-xs" : "px-3 py-1";
  const publishBtnSize = mobileShrink ? "px-3 py-2 text-sm" : "px-6 py-3";
  const chevronBtnSize = mobileShrink ? "px-2 py-1 text-sm" : "px-3 py-2";

  return (
    <div className={`relative min-h-screen overflow-hidden bg-[#23242a] flex flex-col ${pySize} ${pxSize}`}>
      {/* Back button top left */}
      <button
        className={`absolute top-4 left-6 z-20 bg-neutral-900/70 hover:bg-neutral-900/90 text-white rounded-full shadow-lg flex items-center gap-2 ${chevronBtnSize}`}
        onClick={() => window.location.href = '/lobby'}
        aria-label="Quay về lobby"
      >
        <svg width={mobileShrink ? 18 : 24} height={mobileShrink ? 18 : 24} fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        <span className="hidden md:inline font-semibold">Quay về</span>
      </button>
      {/* Banner + Avatar + Name */}
      <div className={`w-full rounded-3xl overflow-hidden relative ${mobileShrink ? "mb-4" : "mb-8"}`} style={{ background: "#181926" }}>
        {/* Background lấy từ customBg */}
        <img src={user?.customBg || "/profile-bg.jpg"} alt="Profile background" className={`w-full object-cover opacity-80 ${mobileShrink ? "h-[120px]" : "h-[260px]"}`} />
        <div className={`absolute left-4 top-4 flex items-center ${mobileShrink ? "gap-3" : "gap-6"}`}>
          <div className={`rounded-full bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold border-4 border-white shadow ${avatarSize}`}>
            {avatarText}
          </div>
          <div>
            <h1 className={`${nameSize} font-bold text-white drop-shadow`}>{user?.firstName} {user?.lastName ? user.lastName : ""}</h1>
          </div>
        </div>
      </div>
      {/* About Me Section */}
      <div className={`w-full flex flex-col md:flex-row ${mobileShrink ? "gap-4" : "gap-8"}`}>
        <div className="flex-1">
          <h2 className={`font-extrabold text-white ${aboutTitleSize}`}>About me</h2>
          <div className={mobileShrink ? "mb-2" : "mb-4"}>
            <span className={`bg-neutral-800 text-white rounded-full font-semibold mr-2 ${cardBadgeSize}`}>Bio</span>
          </div>
          <div className={`${bioTextSize} italic text-white/70 ml-2`}>No bio yet</div>
        </div>
        {/* Profile Info Cards */}
        <div className={`flex-1 grid grid-cols-1 md:grid-cols-2 ${mobileShrink ? "gap-3" : "gap-6"}`}>
          <div className={`bg-[#23242a] rounded-2xl shadow border border-neutral-700 ${cardPadding}`}>
            <span className={`bg-neutral-800 text-white rounded-full font-semibold mb-2 inline-block ${cardBadgeSize}`}>3x3 Method</span>
            <div className={`${cardTitleSize} text-white mt-2`}>-</div>
          </div>
          <div className={`bg-[#23242a] rounded-2xl shadow border border-neutral-700 ${cardPadding}`}>
            <span className={`bg-neutral-800 text-white rounded-full font-semibold mb-2 inline-block ${cardBadgeSize}`}>3x3 Goal</span>
            <div className={`${cardTitleSize} text-white mt-2`}>-</div>
          </div>
          <div className={`bg-[#23242a] rounded-2xl shadow border border-neutral-700 ${cardPadding}`}>
            <span className={`bg-neutral-800 text-white rounded-full font-semibold mb-2 inline-block ${cardBadgeSize}`}>Main 3x3 Cube</span>
            <div className={`${cardTitleSize} text-white mt-2`}>-</div>
          </div>
          <div className={`bg-[#23242a] rounded-2xl shadow border border-neutral-700 ${cardPadding}`}>
            <span className={`bg-neutral-800 text-white rounded-full font-semibold mb-2 inline-block ${cardBadgeSize}`}>Favorite Event</span>
            <div className={`${cardTitleSize} text-white mt-2`}>-</div>
          </div>
        </div>
        {/* Publish PBs Button */}
        <div className="flex flex-col items-end w-full md:w-auto mt-6 md:mt-0 relative">
          <button className={`bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow flex items-center gap-2 ${publishBtnSize}`}>
            Publish Your PBs
            <span className={mobileShrink ? "text-lg" : "text-xl"}>+</span>
          </button>
          <button
            className={`ml-2 mt-2 bg-neutral-800 text-white rounded-lg shadow ${chevronBtnSize}`}
            onMouseDown={e => {
              e.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            aria-label="Mở menu profile"
            style={{ position: 'relative', zIndex: 40 }}
          >
            {showMenu ? (
              <svg width={mobileShrink ? 16 : 20} height={mobileShrink ? 16 : 20} fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2" d="M7 14l5-5 5 5"/>
              </svg>
            ) : (
              <svg width={mobileShrink ? 16 : 20} height={mobileShrink ? 16 : 20} fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2" d="M7 10l5 5 5-5"/>
              </svg>
            )}
          </button>
          {showMenu && (
            <div ref={menuRef} className={`absolute right-0 ${mobileShrink ? "mt-10 w-40 p-2" : "mt-20 w-56 p-3"} bg-[#23242a] border border-neutral-700 rounded-xl shadow-xl z-30 flex flex-col gap-2`}>
              <button
                className={`flex items-center gap-2 text-white hover:text-blue-300 rounded-lg transition font-semibold ${chevronBtnSize}`}
                onClick={handleCopyProfileLink}
              >
                Copy Profile Link
                <svg width={mobileShrink ? 14 : 18} height={mobileShrink ? 14 : 18} fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="3" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/></svg>
              </button>
              <button
                className={`flex items-center gap-2 text-white hover:text-blue-300 rounded-lg transition font-semibold ${chevronBtnSize}`}
                onClick={() => window.location.href = '/account?tab=profile'}
              >
                Edit
                <svg width={mobileShrink ? 14 : 18} height={mobileShrink ? 14 : 18} fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M16.475 5.475a2.121 2.121 0 1 1 3 3L8.5 19.45l-4 1 1-4 10.975-10.975Z"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
