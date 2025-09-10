"use client";
// Khai báo window._roomPassword để tránh lỗi TS
declare global {
  interface Window { _roomPassword?: string }
}


import { useState, useEffect, Suspense } from "react";
import TimerTab from "./components/TimerTab";
import RoomTab from "./components/RoomTab";
import AccountTab from "./components/AccountTab";
import AccountTabWrapper from "./components/AccountTabWrapper";
import ProfileTab from "./components/ProfileTab";
import NewTab from "./components/NewTab";
import AboutTab from "./components/AboutTab";
import ShopTab from "./components/ShopTab";
import PracticeTab from "./components/PracticeTab";
import { useRouter, useSearchParams } from "next/navigation";



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

// Component that uses useSearchParams
function LobbyContent() {
  // Modal chọn background
  const [showBgModal, setShowBgModal] = useState(false);
  const [selectedBg, setSelectedBg] = useState<string>("");
  const bgImages = [
    "images.jpg",
    "images1.jpg",
    "images2.jpg",
    "images3.jpg",
    "images4.jpg",
    "images5.jpg",
    "images6.jpg",
    "images7.jpg",
  ];
  // Gán hàm mở modal vào window để ProfileTab gọi được
  useEffect(() => {
    (window as any).openBgModal = () => {
      setSelectedBg("");
      setShowBgModal(true);
    };
    return () => { delete (window as any).openBgModal; };
  }, []);
  // Hàm xác nhận chọn background
  const handleConfirmBg = async () => {
    if (selectedBg) {
      try {
        let imageToSend = selectedBg;
        
        // Nếu là ảnh có sẵn (không phải data:image), chuyển thành base64
        if (!selectedBg.startsWith('data:')) {
          // Load ảnh và chuyển thành base64
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                imageToSend = canvas.toDataURL('image/jpeg', 0.85);
                resolve(imageToSend);
              } else {
                reject(new Error('Cannot create canvas context'));
              }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = `/${selectedBg}`;
          });
        }
        
        // Gửi ảnh base64 lên server
        const res = await fetch('/api/user/custom-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageToSend })
        });
        
        if (res.ok) {
          // Refetch user để cập nhật customBg từ server
          await refetchUser();
        } else {
          // Failed to save background to server
        }
      } catch (err) {
        // Error saving background to server
      }
      
      setShowBgModal(false);
    }
  };
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Hiệu ứng chuyển tab
  const [tab, setTab] = useState("new");
  const [displayedTab, setDisplayedTab] = useState("new");
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string>("");
  const [loadingBg, setLoadingBg] = useState(false);
  // Lấy customBg từ user profile (MongoDB)


  useEffect(() => {
    if (tab !== displayedTab) {
      setTabTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayedTab(tab);
        setTabTransitioning(false);
      }, 300); // thời gian hiệu ứng
      return () => clearTimeout(timer);
    }
  }, [tab, displayedTab]);
  // Theo dõi customBg từ user (server)
  useEffect(() => {
    if (user && user.customBg) {
      setCustomBg(user.customBg);
    } else {
      setCustomBg(null);
    }
  }, [user]);

  // Set background cho body khi customBg từ server
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (customBg) {
      // Luôn sử dụng customBg từ server (đã là base64)
      document.body.style.backgroundImage = `url('${customBg}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
    }
  }, [customBg]);

  // Xử lý upload ảnh nền cá nhân hóa lên API MongoDB và refetch user
  const refetchUser = async () => {
    try {
      const res = await fetch("/api/user/me", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (data && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      // Error refetching user data
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgError("");
    setLoadingBg(true);
    const reader = new FileReader();
    reader.onload = async function(ev) {
      const img = new window.Image();
      img.onload = async function() {
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
        // Gửi lên API
        try {
          const res = await fetch('/api/user/custom-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl })
          });
          
          if (res.ok) {
            await refetchUser();
          } else {
            setBgError(`Lưu ảnh thất bại! Status: ${res.status}`);
          }
        } catch (err) {
          setBgError('Lỗi mạng khi lưu ảnh!');
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

  // State theo dõi trạng thái toàn màn hình
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Tự động yêu cầu chế độ toàn màn hình khi sử dụng điện thoại
  useEffect(() => {
    if (typeof window !== 'undefined' && isMobile) {
      // Hàm kiểm tra trạng thái toàn màn hình
      const checkFullscreenStatus = () => {
        const fullscreenElement = 
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement;
        
        const wasFullscreen = isFullscreen;
        setIsFullscreen(!!fullscreenElement);
        
        if (fullscreenElement && !wasFullscreen) {
          // Vừa vào chế độ toàn màn hình - dừng interval
          if (interval) {
            clearInterval(interval);
            interval = undefined;
          }
        } else if (!fullscreenElement && wasFullscreen && isMobile) {
          // Vừa thoát khỏi chế độ toàn màn hình - khởi động lại interval
          startInterval();
          // Và ngay lập tức yêu cầu lại
          requestFullscreen();
        } else if (!fullscreenElement && isMobile) {
          // Không ở chế độ toàn màn hình và đang dùng điện thoại
          requestFullscreen();
        }
      };

      // Hàm yêu cầu chế độ toàn màn hình
      const requestFullscreen = () => {
        try {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
          } else if ((document.documentElement as any).webkitRequestFullscreen) {
            (document.documentElement as any).webkitRequestFullscreen();
          } else if ((document.documentElement as any).mozRequestFullScreen) {
            (document.documentElement as any).mozRequestFullScreen();
          } else if ((document.documentElement as any).msRequestFullscreen) {
            (document.documentElement as any).msRequestFullscreen();
          }
        } catch (error) {
          // Không thể chuyển sang chế độ toàn màn hình
          console.log('Không thể chuyển sang chế độ toàn màn hình:', error);
        }
      };

      // Kiểm tra trạng thái ban đầu
      checkFullscreenStatus();

      // Thêm event listeners để theo dõi thay đổi trạng thái toàn màn hình
      const fullscreenChangeEvents = [
        'fullscreenchange',
        'webkitfullscreenchange',
        'mozfullscreenchange',
        'MSFullscreenChange'
      ];

      fullscreenChangeEvents.forEach(event => {
        document.addEventListener(event, checkFullscreenStatus);
      });

      // Tự động yêu cầu chế độ toàn màn hình sau 1 giây
      const initialTimeout = setTimeout(requestFullscreen, 1000);

      // Chỉ kiểm tra định kỳ khi KHÔNG ở chế độ toàn màn hình
      let interval: NodeJS.Timeout | undefined;
      
      const startInterval = () => {
        if (!isFullscreen && !interval) {
          interval = setInterval(() => {
            if (isMobile && !isFullscreen) {
              requestFullscreen();
            } else {
              // Nếu đã ở chế độ toàn màn hình, dừng interval
              if (interval) {
                clearInterval(interval);
                interval = undefined;
              }
            }
          }, 3000);
        }
      };

      // Bắt đầu interval ban đầu
      startInterval();

      return () => {
        clearTimeout(initialTimeout);
        if (interval) {
          clearInterval(interval);
        }
        fullscreenChangeEvents.forEach(event => {
          document.removeEventListener(event, checkFullscreenStatus);
        });
      };
    }
  }, [isMobile, isFullscreen]);
  const [roomInput, setRoomInput] = useState("");
  // Đã chuyển khai báo tab lên trên để dùng cho hiệu ứng chuyển tab
  // Đã chuyển lên trên để tránh lỗi khai báo trước khi dùng

  // Luôn fetch user khi vào trang
  useEffect(() => {
    fetch("/api/user/me", { credentials: "include", cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data || !data.user) {
          router.replace("/");
          return;
        }
        setUser(data.user);
      });
  }, [router]);

  // Kiểm tra tham số tab từ URL và tự động chuyển tab
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && ["new", "timer", "room", "practice", "shop", "about"].includes(tabParam)) {
      setTab(tabParam);
    }
  }, [searchParams]);

  const handleCreateRoom = (event: '2x2' | '3x3' | '4x4' | 'pyraminx', displayName: string, password: string) => {
    const roomId = generateRoomId();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('justCreatedRoom', roomId);
      // Lưu meta phòng để trang room/[roomId] lấy khi join-room
      sessionStorage.setItem(`roomMeta_${roomId}`, JSON.stringify({ event, displayName, password }));
      // Không lưu password vào roomPassword_{roomId} khi tạo phòng mới!
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

  // Hàm xem phòng: vào với vai trò người xem
  const handleWatchRoom = (roomId: string) => {
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
    // Lưu flag để biết đây là chế độ xem
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`watchMode_${code}`, "true");
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
  return (
    <main
      className="flex flex-col items-center justify-start min-h-screen text-white px-4 font-sans"
      style={{ paddingTop: 80 }} // Để tránh bị che bởi nav fixed
    >
      {/* Hiển thị lỗi chọn ảnh nền nếu có */}
      {(bgError || loadingBg) && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow-lg z-50 text-sm font-semibold animate-pulse"
          style={{ background: loadingBg ? '#2563eb' : '#dc2626', color: 'white' }}>
          {loadingBg ? 'Đang xử lý ảnh nền...' : bgError}
        </div>
      )}
      {/* Tab Navigation Bar */}
      <nav className="tab-navbar w-full max-w-7xl flex items-center justify-between bg-gray-900 rounded-b-2xl shadow-lg px-8 py-3 mx-auto fixed top-0 left-1/2 -translate-x-1/2 z-[100]" style={{width: '100vw', maxWidth: '100vw'}}>
        <div className="flex items-center gap-1  ">
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
          <button
            className={`text-base font-semibold px-5 py-2 rounded-lg transition-all shadow-sm
              ${tab === "new"
                ? "bg-blue-100 text-blue-700 shadow-md"
                : "bg-transparent text-white hover:bg-blue-900/30 hover:text-blue-400"}
            `}
            onClick={() => setTab("new")}
          >New</button>
          <button
            className={`text-base font-semibold px-5 py-2 rounded-lg transition-all shadow-sm
              ${tab === "timer"
                ? "bg-blue-100 text-blue-700 shadow-md"
                : "bg-transparent text-white hover:bg-blue-900/30 hover:text-blue-400"}
            `}
            onClick={() => setTab("timer")}
          >Timer</button>
          <button
            className={`text-base font-semibold px-5 py-2 rounded-lg transition-all shadow-sm
              ${tab === "room"
                ? "bg-blue-100 text-blue-700 shadow-md"
                : "bg-transparent text-white hover:bg-blue-900/30 hover:text-blue-400"}
            `}
            onClick={() => setTab("room")}
          >Room</button>
          <button
            className={`text-base font-semibold px-5 py-2 rounded-lg transition-all shadow-sm
              ${tab === "practice"
                ? "bg-blue-100 text-blue-700 shadow-md"
                : "bg-transparent text-white hover:bg-blue-900/30 hover:text-blue-400"}
            `}
            onClick={() => setTab("practice")}
          >Practice</button>
          <button
            className={`text-base font-semibold px-5 py-2 rounded-lg transition-all shadow-sm
              ${tab === "shop"
                ? "bg-blue-100 text-blue-700 shadow-md"
                : "bg-transparent text-white hover:bg-blue-900/30 hover:text-blue-400"}
            `}
            onClick={() => setTab("shop")}
          >Shop</button>
          <button
            className={`text-base font-semibold px-5 py-2 rounded-lg transition-all shadow-sm
              ${tab === "about"
                ? "bg-blue-100 text-blue-700 shadow-md"
                : "bg-transparent text-white hover:bg-blue-900/30 hover:text-blue-400"}
            `}
            onClick={() => setTab("about")}
          >About</button>
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
        </div>
      </nav>
      {/* Overlay profile menu ngoài nav, phủ toàn trang */}
      {showProfileMenu && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-end bg-black/30" onClick={() => setShowProfileMenu(false)}>
          <div onClick={e => e.stopPropagation()}>
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
      {/* Tab Content với hiệu ứng chuyển tab */}
      <div className={`w-full transition-all duration-300 ${tabTransitioning ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        {displayedTab === "timer" && (
          <TimerTab />
        )}
        {displayedTab === "room" && (
          <>
            <RoomTab
              roomInput={roomInput}
              setRoomInput={setRoomInput}
              handleCreateRoom={handleCreateRoom}
              handleJoinRoom={handleJoinRoom}
              handleWatchRoom={handleWatchRoom}
            />
            {joinError && <div className="text-red-400 text-center mt-2">{joinError}</div>}
          </>
        )}
        {displayedTab === "practice" && (
          <PracticeTab />
        )}
        {displayedTab === "new" && (
          <NewTab />
        )}
        {displayedTab === "shop" && (
          <ShopTab />
        )}
        {displayedTab === "about" && (
          <AboutTab />
        )}
      </div>
      {/* Không render AccountTabWrapper nữa, đã chuyển vào avatar menu */}
      
      {/* Modal chọn background toàn trang */}
      {showBgModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
          <div className="bg-[#181926] rounded-2xl p-4 sm:p-6 shadow-2xl border border-blue-700 w-[95vw] max-w-2xl sm:max-w-3xl flex flex-col items-center max-h-[90vh]">
            <div className="text-lg sm:text-2xl font-bold text-blue-300 mb-3">Chọn ảnh nền</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 w-full overflow-y-auto pr-2" style={{maxHeight: '45vh'}}>
              {/* Ô chọn ảnh từ thiết bị */}
              <div className={`rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all h-[128px] w-40`}
                onClick={() => document.getElementById('bg-upload-input')?.click()}>
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <span className="text-3xl text-blue-400">+</span>
                  <span className="text-xs text-blue-300 mt-1">Chọn ảnh từ thiết bị</span>
                </div>
                <input id="bg-upload-input" type="file" accept="image/*" style={{display:'none'}}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // Gọi handleBgUpload để xử lý và lưu lên server
                    handleBgUpload(e);
                    // Đóng modal ngay sau khi chọn ảnh
                    setShowBgModal(false);
                  }}
                />
              </div>
              {/* Không hiển thị preview ảnh upload từ thiết bị trong modal */}
              {/* Các ảnh mặc định */}
              {bgImages.map(img => (
                <div key={img} className={`rounded-lg cursor-pointer transition-all ${selectedBg === img ? 'ring-2 ring-blue-400' : ''}`}
                  onClick={() => setSelectedBg(img)}>
                  <img src={`/${img}`} alt={img} className="w-40 h-32 object-cover rounded-lg" />
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button className="px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition" onClick={handleConfirmBg} disabled={!selectedBg || selectedBg.startsWith('data:')}>Xác nhận</button>
              <button className="px-4 py-2 rounded bg-gray-600 text-white font-semibold hover:bg-gray-700 transition" onClick={()=>setShowBgModal(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Main component with minimal Suspense boundary
export default function Lobby() {
  return (
    <Suspense fallback={null}>
      <LobbyContent />
    </Suspense>
  );
}