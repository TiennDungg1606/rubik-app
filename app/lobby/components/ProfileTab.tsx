"use client";
import React, { useEffect, useState } from "react";

interface ProfileTabProps {
  user: {
    email?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string;
  } | null;
  onLogout: () => void;
  onThemeSwitch?: () => void;
  onBgUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBgRemove?: () => void;
  hasCustomBg?: boolean;
  mobileShrink?: boolean;
}

const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  onLogout,
  onThemeSwitch,
  onBgUpload,
  onBgRemove,
  hasCustomBg,
  mobileShrink = false,
}) => {
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    function checkDevice() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      const portrait = window.innerHeight > window.innerWidth;
      const mobileLandscape = mobile && !portrait && window.innerWidth < 1200;
      setIsMobileLandscape(mobileLandscape);
    }

    if (typeof window !== "undefined") {
      checkDevice();
      window.addEventListener("resize", checkDevice);
      window.addEventListener("orientationchange", checkDevice);
      return () => {
        window.removeEventListener("resize", checkDevice);
        window.removeEventListener("orientationchange", checkDevice);
      };
    }
  }, []);

  const effectiveMobileShrink = mobileShrink || isMobileLandscape;
  // Tính toán lời chào theo giờ
  let greeting = "";
  const now = new Date();
  const hour = now.getHours();
  if (hour < 12) greeting = "Chào buổi sáng👋";
  else if (hour < 18) greeting = "Chào buổi chiều👋";
  else greeting = "Chào buổi tối👋";
  const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "";

  const containerClassName = `mt-4 ${effectiveMobileShrink ? "mr-2 w-[90vw] max-w-xs rounded-xl shadow-xl" : "mr-4 w-[340px] rounded-2xl shadow-2xl"} max-w-full bg-[#181926] border border-blue-700 flex flex-col items-center p-0 relative`;
  const headerPadding = effectiveMobileShrink ? "pt-5 pb-2" : "pt-6 pb-2";
  const avatarClassName = `${effectiveMobileShrink ? "w-16 h-16 text-3xl" : "w-20 h-20 text-4xl"} rounded-full bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold border-4 border-white shadow mb-2`;
  const emailClassName = effectiveMobileShrink ? "text-base font-semibold text-white mb-1" : "text-lg font-semibold text-white mb-1";
  const greetingClassName = effectiveMobileShrink ? "text-sm text-white-300 font-medium mb-1" : "text-base text-white-300 font-medium mb-1";
  const actionWrapperClass = `${effectiveMobileShrink ? "w-full flex flex-col gap-1.5 px-4 py-3" : "w-full flex flex-col gap-2 px-6 py-4"} border-t border-gray-700 mt-auto`;
  const buttonSpacing = effectiveMobileShrink ? "gap-1" : "gap-2";
  const buttonTextSize = effectiveMobileShrink ? "text-sm" : "text-base";
  const logoutIconClass = effectiveMobileShrink ? "w-5 h-5" : "w-6 h-6";

  return (
    <div className={containerClassName}>
      {/* Avatar lớn */}
      <div className={`w-full flex flex-col items-center ${headerPadding} border-b border-gray-700`}>
        <div className={avatarClassName}>
          {user && (user.firstName || user.lastName)
            ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
            : <span>👤</span>}
        </div>
        <div className={emailClassName}>{user?.email || ""}</div>
        <div className={greetingClassName}>
          {greeting}{userName ? `, ${userName}` : ""} !
        </div>
      </div>
      {/* Profile, Account Setting và Logout */}
      <div className={actionWrapperClass}>
        <button
          className={`flex items-center ${buttonSpacing} text-blue-400 hover:text-blue-600 font-bold transition ${buttonTextSize} justify-start`}
          onClick={() => window.location.href = '/profile'}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path stroke="currentColor" strokeWidth="2" d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"/></svg>
          Profile
        </button>
        <button
          className={`flex items-center ${buttonSpacing} text-blue-400 hover:text-blue-600 font-bold transition ${buttonTextSize} justify-start mt-1`}
          onClick={() => window.location.href = '/account'}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <path stroke="currentColor" strokeWidth="2" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 9 4.09V4a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Account setting
        </button>
        {/* Chỉ còn 1 nút Change background, gọi callback mở modal ở page.tsx */}
        <button
          className={`flex items-center ${buttonSpacing} text-blue-400 hover:text-blue-600 font-bold transition ${buttonTextSize} justify-start mt-1`}
          onClick={() => {
            if (typeof window !== 'undefined' && typeof (window as any).openBgModal === 'function') {
              (window as any).openBgModal();
            }
          }}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
            <circle cx="8" cy="10" r="2" stroke="currentColor" strokeWidth="2" />
            <path d="M21 19l-5.5-7-4.5 6-3-4-4 5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          Change background
        </button>
        <button
          className={`flex items-center ${buttonSpacing} text-red-400 hover:text-red-600 font-bold transition ${buttonTextSize} mt-2 px-0 py-0`}
          style={{ alignSelf: 'flex-start' }}
          onClick={onLogout}
        >
          Logout <img src="/power.svg" alt="logout" className={`${logoutIconClass} inline-block align-middle ml-1`} />
        </button>
      </div>
    </div>
  );
};

export default ProfileTab;


