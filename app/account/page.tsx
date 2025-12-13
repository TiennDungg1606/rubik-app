"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSessionUser } from "../SessionProviderWrapper";

// Tái sử dụng AccountTab từ components
import AccountTab from "./AccountTab";

export default function AccountPage() {
  const router = useRouter();
  const { user, refreshUser } = useSessionUser();
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    if (user === null) {
      router.replace("/");
    }
  }, [user, router]);

  // Theo dõi customBg từ user
  useEffect(() => {
    if (user && user.customBg) {
      setCustomBg(user.customBg);
    } else {
      setCustomBg(null);
    }
  }, [user?.customBg, user]);

  // Set background cho body khi customBg từ server
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (customBg) {
      document.body.style.backgroundImage = `url('${customBg}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
    }
  }, [customBg]);

  useEffect(() => {
    function checkDevice() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      setIsMobileDevice(mobile);
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(mobile ? portrait : false);
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

  if (!user) return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: customBg
          ? `url('${customBg}') center center / cover no-repeat fixed`
          : 'linear-gradient(135deg, #181926 60%, #22223b 100%)'
      }}
    >
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400"></div>
    </div>
  );

  return (
    <main
      className="min-h-screen flex flex-col justify-start text-white pt-4"
      style={{
        // backgroundColor: '#181926',
        // Không set backgroundImage ở đây nữa, đã set qua body
      }}
    >
      <div className="w-full max-w-7xl px-2 md:px-4 flex gap-2 ">
        <button
          aria-label="Quay lại Lobby"
          className="inline-flex items-center justify-center size-10 rounded-full border border-neutral-700 bg-black/30 hover:bg-black/50 transition"
          onClick={() => router.push('/lobby')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-3xl font-bold">Account Settings</h1>
      </div>
      <div className="w-full max-w-7xl px-2 md:px-1">
        <AccountTab
          user={user}
          onUserUpdated={async () => {
            await refreshUser();
          }}
        />
      </div>
    </main>
  );
}
