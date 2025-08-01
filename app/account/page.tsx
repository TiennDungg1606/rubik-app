"use client";
import React, { useEffect, useState } from "react";

// Tái sử dụng AccountTab từ components
import AccountTab from "../lobby/components/AccountTab";

export default function AccountPage() {
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
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
      <div className="w-full max-w-md bg-[#23243a]/70 rounded-2xl shadow-xl p-6 backdrop-blur-md">
        <AccountTab user={user} />
        <button
          className="w-full mt-4 py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition"
          onClick={() => {
            // Chuyển hướng hoặc mở popup đổi tên tuỳ vào logic của bạn
            window.alert('Tính năng đổi tên sẽ được bổ sung ở đây!');
          }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M16.862 5.487a2.06 2.06 0 0 1 2.915 2.914l-9.193 9.193a2 2 0 0 1-.707.464l-3.11 1.037a.5.5 0 0 1-.633-.633l1.037-3.11a2 2 0 0 1 .464-.707l9.193-9.193Z"/></svg>
          Thay đổi họ tên
        </button>
      </div>
    </main>
  );
}
