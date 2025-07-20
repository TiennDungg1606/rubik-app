"use client"


import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import AuthForm from "@/components/AuthForm";

export default function HomePage() {
  const router = useRouter();
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true);
  // Kiểm tra đăng nhập khi load trang
  useEffect(() => {
    async function checkLogin() { 
      try {
        const res = await fetch("/api/user/me", { credentials: "include" });
        if (res.ok) {
          setIsLoggedIn(true);
          setTimeout(() => {
            setCheckingLogin(false);
          }, 800); // Hiện thông báo 0.8s rồi vào app
        } else {
          setIsLoggedIn(false);
          setCheckingLogin(false);
        }
      } catch {
        setIsLoggedIn(false);
        setCheckingLogin(false);
      }
    }
    checkLogin();
  }, []);

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



  if (checkingLogin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 px-4">
        <div className="bg-black/80 rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-gray-700">
          <div className="flex flex-col items-center mb-4">
            <span className="mb-2 animate-spin-slow">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="20" stroke="#3B82F6" strokeWidth="6" strokeDasharray="60 40"/>
              </svg>
            </span>
            <div className="text-lg text-white font-semibold">Đang kiểm tra đăng nhập...</div>
            <div className="text-gray-400 text-sm mt-1">Nếu đã lưu cookie, bạn sẽ được tự động đăng nhập.</div>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 px-4 overflow-hidden">
      {/* Background Rubik động */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <g opacity="0.08">
            <rect x="200" y="200" width="180" height="180" rx="24" fill="#F59E42"/>
            <rect x="400" y="400" width="180" height="180" rx="24" fill="#3B82F6"/>
            <rect x="800" y="300" width="180" height="180" rx="24" fill="#F43F5E"/>
            <rect x="1200" y="500" width="180" height="180" rx="24" fill="#22D3EE"/>
            <rect x="1500" y="200" width="180" height="180" rx="24" fill="#FDE047"/>
            <rect x="1000" y="700" width="180" height="180" rx="24" fill="#22C55E"/>
            <rect x="600" y="800" width="180" height="180" rx="24" fill="#F43F5E"/>
            <rect x="300" y="700" width="180" height="180" rx="24" fill="#3B82F6"/>
            <rect x="1400" y="800" width="180" height="180" rx="24" fill="#F59E42"/>
          </g>
        </svg>
      </div>
      <div className="z-10 w-full max-w-md bg-black/80 rounded-2xl shadow-2xl p-8 flex flex-col items-center border border-gray-700">
        <div className="flex flex-col items-center mb-8">
          {/* Logo Rubik SVG */}
          <span className="mb-2">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <button
              onClick={() => {
                fetch("/api/user/logout", { method: "POST" }).then(() => {
                  setIsLoggedIn(false);
                  router.push("/");
                });
              }}
              className="w-full mt-2 bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 rounded-lg text-base shadow transition-all duration-150"
            >Đăng xuất</button>
          </>
        ) : (
          <AuthForm onLogin={() => {
            setIsLoggedIn(true);
            setCheckingLogin(false);
          }} />
        )}
      </div>
    </main>
  );
}
