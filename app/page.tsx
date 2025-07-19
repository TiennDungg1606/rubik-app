"use client"


import { useRouter } from "next/navigation"
import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import AuthForm from "@/components/AuthForm";

export default function HomePage() {
  const router = useRouter();
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // TODO: Kiểm tra cookie hoặc gọi API /api/user/me để xác định đăng nhập

  const handleCreateRoom = () => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    router.push(`/room/${roomId}`);
  };

  const handleJoinRoom = () => {
    const code = joinRoomCode.trim().toUpperCase();
    if (code) {
      router.push(`/room/${code}`);
    }
  };



  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 px-4">
      <div className="absolute inset-0 opacity-10 bg-[url('/bg-cube.svg')] bg-center bg-no-repeat bg-cover pointer-events-none" />
      <div className="z-10 w-full max-w-md bg-black/80 rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-gray-700">
        <div className="flex flex-col items-center mb-8">
          <img src="/cube-logo.png" alt="Rubik Logo" className="w-16 h-16 mb-2" />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-center tracking-tight text-white drop-shadow mb-1">Rubik 1v1 Online</h1>
          <div className="text-gray-400 text-sm text-center">Giải đấu Rubik 3x3 trực tuyến, solo 1v1, giao diện hiện đại</div>
        </div>

        {isLoggedIn ? (
          <>
            {/* Thông tin user sẽ hiển thị ở đây nếu đã đăng nhập */}
            <button
              onClick={handleCreateRoom}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold py-3 rounded-xl mb-5 text-lg shadow-lg transition-all duration-200"
            >
              <span className="inline-flex items-center gap-2">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Tạo phòng mới
              </span>
            </button>
            <div className="w-full flex flex-col items-center gap-3 mb-2">
              <input
                type="text"
                placeholder="Nhập mã phòng..."
                value={joinRoomCode}
                onChange={e => setJoinRoomCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 rounded-lg text-black bg-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 border-2 border-blue-400 tracking-widest uppercase placeholder-gray-400 shadow"
              />
              <button
                onClick={handleJoinRoom}
                className="w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-bold py-2 rounded-lg text-base shadow-lg transition-all duration-200"
              >
                <span className="inline-flex items-center gap-2">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Tham gia phòng
                </span>
              </button>
            </div>
          </>
        ) : (
          <AuthForm type="login" />
        )}
      </div>
    </main>
  );
}
