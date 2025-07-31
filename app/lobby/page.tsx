"use client"

import { useState, useEffect } from "react";
import TimerTab from "./components/TimerTab";
import RoomTab from "./components/RoomTab";
import AccountTab from "./components/AccountTab";
import AccountTabWrapper from "./components/AccountTabWrapper";
import ProfileTab from "./components/ProfileTab";
import NewTab from "./components/NewTab";
import AboutTab from "./components/AboutTab";
import ShopTab from "./components/ShopTab";
import { useRouter } from "next/navigation";



function generateRoomId() {
  // Simple random 6-character alphanumeric
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type User = {
  email?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  // Thêm các trường khác nếu cần
};

export default function Lobby() {
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    function checkDevice() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      setIsMobile(mobile);
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
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
  const [roomInput, setRoomInput] = useState("");
  // Mặc định tab New được chọn đầu tiên khi đăng nhập
  const [tab, setTab] = useState("new");
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // Luôn fetch user khi vào trang
  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        if (data.user) setUser(data.user);
        else setUser(data);
      });
  }, []);

  const handleCreateRoom = () => {
    const roomId = generateRoomId();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('justCreatedRoom', roomId);
    }
    router.push(`/room/${roomId}`);
  };

  const [joinError, setJoinError] = useState("");

  // Hàm join phòng: không kiểm tra phòng, luôn cho phép vào
  const handleJoinRoom = (roomId: string) => {
    const code = roomId.trim().toUpperCase();
    if (!code) return;
    setJoinError("");
    router.push(`/room/${code}`);
  };

  if (isMobile && isPortrait) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white py-4">
        <div className="text-2xl font-bold text-red-400 mb-4 text-center">VUI LÒNG XOAY NGANG MÀN HÌNH ĐỂ SỬ DỤNG ỨNG DỤNG!</div>
        <div className="text-lg text-red-300 mb-2 text-center">Nhớ tắt chế độ khóa xoay màn hình ở bảng điều khiển của thiết bị.</div>
      </div>
    );
  }
  return (
    <main className="flex flex-col items-center justify-start min-h-screen text-white px-4 font-sans backdrop-blur-3xl" style={{ backgroundImage: 'url(/images.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Tab Navigation Bar */}
      <nav className="w-full max-w-2xl flex items-center justify-between bg-gray-900 rounded-b-2xl shadow-lg px-6 py-3 mt-2 mb-2">
        <div className="flex items-center gap-6">
          <svg width="32" height="32" viewBox="0 0 64 64" fill="none" className="mr-2 drop-shadow-lg" style={{marginLeft: -8}} xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="18" height="18" rx="3" fill="#F9E042" stroke="#222" strokeWidth="2"/>
            <rect x="23" y="2" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2"/>
            <rect x="44" y="2" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2"/>
            <rect x="2" y="23" width="18" height="18" rx="3" fill="#FDE047" stroke="#222" strokeWidth="2"/>
            <rect x="23" y="23" width="18" height="18" rx="3" fill="#22D3EE" stroke="#222" strokeWidth="2"/>
            <rect x="44" y="23" width="18" height="18" rx="3" fill="#22C55E" stroke="#222" strokeWidth="2"/>
            <rect x="2" y="44" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2"/>
            <rect x="23" y="44" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2"/>
            <rect x="44" y="44" width="18" height="18" rx="3" fill="#F9E042" stroke="#222" strokeWidth="2"/>
          </svg>
          <button className={`text-base font-semibold transition-colors ${tab === "new" ? "text-blue-400" : "text-white hover:text-blue-400"}`} onClick={() => setTab("new")}>New</button>
          <button
            className={`text-base font-semibold transition-colors ${tab === "timer" ? "text-blue-400" : "text-white hover:text-blue-400"}`}
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open("https://cstimer.net", "_blank");
              }
              // Không setTab("timer") để không chuyển tab trong app
            }}
          >
            Timer
          </button>
          <button className={`text-base font-semibold transition-colors ${tab === "room" ? "text-blue-400" : "text-white hover:text-blue-400"}`} onClick={() => setTab("room")}>Room</button>
          <button className={`text-base font-semibold transition-colors ${tab === "shop" ? "text-blue-400" : "text-white hover:text-blue-400"}`} onClick={() => setTab("shop")}>Shop</button>
          <button className={`text-base font-semibold transition-colors ${tab === "about" ? "text-blue-400" : "text-white hover:text-blue-400"}`} onClick={() => setTab("about")}>About</button>
          {/* Ẩn tab Account trên menu */}
        </div>
        {/* Avatar + Popup menu */}
        <div className="relative">
          <button
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow hover:opacity-90 transition-all"
            onClick={() => setShowProfileMenu(v => !v)}
            title="Tài khoản"
          >
            {user && (user.firstName || user.lastName)
              ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
              : <span>👤</span>}
          </button>
          {showProfileMenu && (
            <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30" onClick={() => setShowProfileMenu(false)}>
              <ProfileTab
                user={user}
                onLogout={() => {
                  fetch('/api/user/logout', { method: 'POST' }).then(() => {
                    router.push('/');
                  });
                }}
                onThemeSwitch={() => {}}
              />
            </div>
          )}
        </div>
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
      {tab === "new" && (
        <NewTab />
      )}
      {tab === "shop" && (
        <ShopTab />
      )}
      {tab === "about" && (
        <AboutTab />
      )}
      {/* Không render AccountTabWrapper nữa, đã chuyển vào avatar menu */}
    </main>
  );
}
