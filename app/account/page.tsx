"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Tái sử dụng AccountTab từ components
import AccountTab from "../lobby/components/AccountTab";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    email?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) setUser(null);
        else if (data.user) setUser(data.user);
        else setUser(data);
        setLoading(false);
      });
    // Nếu sau 5s vẫn loading, chuyển về trang đăng nhập
    const timeout = setTimeout(() => {
      if (loading) {
        window.location.href = "/";
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading) return <div className="text-white p-8">Loading...</div>;
  if (!user) return <div className="text-red-400 p-8">Bạn chưa đăng nhập.</div>;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-start text-white pt-10"
      style={{
        backgroundImage: 'url(/images.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#181926',
      }}
    >
      <div className="w-full max-w-7xl px-2 md:px-6 flex items-center gap-3 mb-4">
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
      <div className="w-full max-w-7xl px-2 md:px-6">
        <AccountTab user={user} onUserUpdated={(u) => setUser(u)} />

      </div>
    </main>
  );
}
