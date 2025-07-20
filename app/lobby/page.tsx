
"use client"

import { useState, useEffect } from "react";
import TimerTab from "./components/TimerTab";
import RoomTab from "./components/RoomTab";
import AccountTab from "./components/AccountTab";
import { useRouter } from "next/navigation";



function generateRoomId() {
  // Simple random 6-character alphanumeric
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type User = {
  email?: string;
  firstName?: string;
  lastName?: string;
  // Thêm các trường khác nếu cần
};

export default function Lobby() {
  const [roomInput, setRoomInput] = useState("");
  const [tab, setTab] = useState("room");
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (tab === "account") {
      fetch("/api/user/me", { credentials: "include" })
        .then(res => res.ok ? res.json() : null)
        .then(data => setUser(data));
    }
  }, [tab]);

  const handleCreateRoom = () => {
    const roomId = generateRoomId();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('justCreatedRoom', roomId);
    }
    router.push(`/room/${roomId}`);
  };

  const [joinError, setJoinError] = useState("");

  // Hàm kiểm tra phòng tồn tại và có nhiều hơn 1 user
  const handleJoinRoom = async () => {
    const code = roomInput.trim().toUpperCase();
    if (!code) return;
    setJoinError("");
    // Giả sử có API /api/room/[roomId]/users trả về danh sách user trong phòng
    try {
      const res = await fetch(`/api/room/${code}/users`);
      if (!res.ok) {
        setJoinError("Không thể kiểm tra phòng. Vui lòng thử lại.");
        return;
      }
      const users = await res.json();
      if (!Array.isArray(users) || users.length <= 1) {
        setJoinError("Phòng đã đóng hoặc không tồn tại.");
        return;
      }
      router.push(`/room/${code}`);
    } catch (e) {
      setJoinError("Lỗi kết nối. Vui lòng thử lại.");
    }
  };

  return (
    <main className="flex flex-col items-center justify-start min-h-screen text-white px-4 font-sans" style={{ backgroundImage: 'url(/images.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Tab Navigation Bar */}
      <nav className="w-full max-w-2xl flex items-center justify-between bg-gray-900 rounded-b-2xl shadow-lg px-6 py-3 mt-2 mb-10">
        <div className="flex gap-6">
          <button className={`text-base font-semibold transition-colors ${tab === "timer" ? "text-blue-400" : "text-white hover:text-blue-400"}`} onClick={() => setTab("timer")}>Timer</button>
          <button className={`text-base font-semibold transition-colors ${tab === "room" ? "text-blue-400" : "text-white hover:text-blue-400"}`} onClick={() => setTab("room")}>Room</button>
          <button className={`text-base font-semibold transition-colors ${tab === "account" ? "text-blue-400" : "text-white hover:text-blue-400"}`} onClick={() => setTab("account")}>Account</button>
        </div>
        <button className="text-white font-semibold text-base hover:text-red-400 transition-colors" onClick={() => {
          fetch('/api/user/logout', { method: 'POST' }).then(() => {
            router.push('/');
          });
        }}>Sign out</button>
      </nav>
      {/* Tab Content */}
      {tab === "timer" && (
        <TimerTab />
      )}
      {tab === "room" && (
        <>
          <RoomTab
            roomInput={roomInput}
            setRoomInput={setRoomInput}
            handleCreateRoom={handleCreateRoom}
            handleJoinRoom={handleJoinRoom}
          />
          {joinError && <div className="text-red-400 text-center mt-2">{joinError}</div>}
        </>
      )}
      {tab === "account" && (
        <AccountTab user={user} loading={user === null && tab === "account"} />
      )}
    </main>
  );
}
