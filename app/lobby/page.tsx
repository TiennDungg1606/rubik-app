// Khai báo window._roomPassword để tránh lỗi TS
declare global {
  interface Window { _roomPassword?: string }
}
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
  customBg?: string;
  // Thêm các trường khác nếu cần
};

export default function Lobby() {
  const [user, setUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string>("");
  const [loadingBg, setLoadingBg] = useState(false);
  // Lấy customBg từ user profile (MongoDB)
  useEffect(() => {
    console.log('[Lobby] useEffect user:', user);
    if (user && user.customBg) setCustomBg(user.customBg);
    else setCustomBg(null);
  }, [user]);

  // Xử lý upload ảnh nền cá nhân hóa lên API MongoDB và refetch user
  const refetchUser = async () => {
    try {
      const res = await fetch("/api/user/me", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      console.log('[Lobby] refetchUser data:', data);
      if (data && data.user) setUser(data.user);
    } catch (err) {
      console.log('[Lobby] refetchUser error:', err);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgError("");
    setLoadingBg(true);
    console.log('[Lobby] handleBgUpload file:', file);
    const reader = new FileReader();
    reader.onload = async function(ev) {
      const img = new window.Image();
      img.onload = async function() {
        console.log('[Lobby] handleBgUpload img loaded:', img.width, img.height);
        if (img.width < img.height) {
          setBgError("Vui lòng chọn ảnh ngang (chiều rộng lớn hơn chiều cao)!");
          setLoadingBg(false);
          return;
        }
        // Resize/crop về 16:9, làm mờ
        const targetW = 1920;
        const targetH = 1080;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setBgError('Không thể xử lý ảnh');
          setLoadingBg(false);
          return;
        }
        // Tính toán crop 16:9
        const imgRatio = img.width / img.height;
        const targetRatio = targetW / targetH;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > targetRatio) {
          // Crop chiều ngang
          sw = img.height * targetRatio;
          sx = (img.width - sw) / 2;
        } else {
          // Crop chiều dọc
          sh = img.width / targetRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
        // Overlay màu đen mờ
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        console.log('[Lobby] handleBgUpload dataUrl length:', dataUrl.length);
        // Gửi lên API
        try {
          const res = await fetch('/api/user/custom-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl })
          });
          console.log('[Lobby] handleBgUpload POST result:', res.status);
          if (res.ok) {
            await refetchUser();
          } else {
            setBgError('Lưu ảnh thất bại!');
          }
        } catch (err) {
          setBgError('Lỗi mạng khi lưu ảnh!');
          console.log('[Lobby] handleBgUpload POST error:', err);
        }
        setLoadingBg(false);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Xóa ảnh nền khỏi server và refetch user
  const handleBgRemove = async () => {
    setLoadingBg(true);
    try {
      const res = await fetch('/api/user/custom-bg', { method: 'DELETE' });
      if (res.ok) await refetchUser();
      else setBgError('Xóa ảnh thất bại!');
    } catch (err) {
      setBgError('Lỗi mạng khi xóa ảnh!');
    }
    setLoadingBg(false);
  };

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
  // Đã chuyển lên trên để tránh lỗi khai báo trước khi dùng
  const router = useRouter();

  // Luôn fetch user khi vào trang
  useEffect(() => {
    fetch("/api/user/me", { credentials: "include", cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        console.log('[Lobby] initial fetch user:', data);
        if (!data || !data.user) {
          router.replace("/");
          return;
        }
        setUser(data.user);
      });
  }, [router]);

  const handleCreateRoom = () => {
    const roomId = generateRoomId();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('justCreatedRoom', roomId);
    }
    router.push(`/room/${roomId}`);
  };

  const [joinError, setJoinError] = useState("");

  // Hàm join phòng: chỉ cho phép vào với vai trò người chơi
  const handleJoinRoom = (roomId: string) => {
    const code = roomId.trim().toUpperCase();
    if (!code) return;
    setJoinError("");
    // Lấy password từ window._roomPassword nếu có (do RoomTab truyền vào)
    let password = "";
    if (typeof window !== "undefined" && window._roomPassword) {
      password = window._roomPassword;
      // Lưu tạm vào sessionStorage để trang room/[roomId] lấy khi join-room
      sessionStorage.setItem(`roomPassword_${code}`, password);
      // Xóa biến tạm sau khi dùng
      delete window._roomPassword;
    }
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
  console.log('[Lobby] Render Lobby, customBg:', customBg?.slice(0, 50));
  return (
    <main
      className="flex flex-col items-center justify-start min-h-screen text-white px-4 font-sans backdrop-blur-3xl"
      style={{
        backgroundImage: customBg ? `url(${customBg})` : 'url(/images.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s',
      }}
    >
      {/* Hiển thị lỗi chọn ảnh nền nếu có */}
      {(bgError || loadingBg) && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow-lg z-50 text-sm font-semibold animate-pulse"
          style={{ background: loadingBg ? '#2563eb' : '#dc2626', color: 'white' }}>
          {loadingBg ? 'Đang xử lý ảnh nền...' : bgError}
        </div>
      )}
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
              <div>
                <ProfileTab
                  user={user}
                  onLogout={() => {
                    fetch('/api/user/logout', { method: 'POST' }).then(() => {
                      router.push('/');
                    });
                  }}
                  onThemeSwitch={() => {}}
                  onBgUpload={handleBgUpload}
                  onBgRemove={handleBgRemove}
                  hasCustomBg={!!customBg}
                />
              </div>
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
