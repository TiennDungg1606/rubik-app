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
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    async function fetchUser() {
      const res = await fetch(`/api/user/public-profile?userId=${userId}`);
      const data = await res.json();
      setUser(data.user);
    }
    fetchUser();
  }, [userId]);

  // Fetch logged-in user's _id
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

  const [loadTimeout, setLoadTimeout] = useState(false);
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => setLoadTimeout(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  if (!user && !loadTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white text-xl font-bold">
        Đang tải...
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
          onClick={() => router.back()}
        >
          Trở về
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex flex-col py-10 px-10">
      {/* Back button */}
      <button
        className="absolute left-6 top-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900/80 text-white font-semibold shadow hover:bg-neutral-800/90 transition"
        onClick={() => router.back()}
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
