"use client";
// Khai báo window._roomPassword để tránh lỗi TS
declare global {
  interface Window { _roomPassword?: string }
}


import { useState, useEffect, Suspense, type ReactNode } from "react";
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

type TabKey = "new" | "timer" | "room" | "practice" | "shop" | "about";

const ALL_TABS: TabKey[] = ["new", "timer", "room", "practice", "shop", "about"];

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
  const navItems: { id: TabKey; label: string; icon: ReactNode }[] = [
    {
      id: "new",
      label: "New",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
        </svg>
      ),
    },
    {
      id: "timer",
      label: "Timer",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <circle cx="12" cy="13" r="7" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4l2.5 1.5M9 5h6" />
        </svg>
      ),
    },
    {
      id: "room",
      label: "Room",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11a4 4 0 1 1 8 0v1M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
        </svg>
      ),
    },
    {
      id: "practice",
      label: "Practice",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 5 6 6-6 6-6-6z" />
          <circle cx="12" cy="11" r="1.5" />
        </svg>
      ),
    },
    {
      id: "shop",
      label: "Shop",
      icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M6 8a6 6 0 0 1 12 0" />
        <rect x="4" y="8" width="16" height="12" rx="2" ry="2" />
      </svg>
      ),
    },
    {
      id: "about",
      label: "About",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v-4m0-6h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
    },
  ];
  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  };

  const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === "undefined") return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}`;
  };
  useEffect(() => {
    const cookie = getCookie("sidebarCollapsed");
    if (cookie === "1") {
      setIsSidebarCollapsed(true);
    } else if (cookie === "0") {
      setIsSidebarCollapsed(false);
    } else {
      setCookie("sidebarCollapsed", "1");
      setIsSidebarCollapsed(true);
    }
  }, []);
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
  const [tab, setTab] = useState<TabKey>("new");
  const [displayedTab, setDisplayedTab] = useState<TabKey>("new");
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [mobileShrink, setMobileShrink] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string>("");
  const [loadingBg, setLoadingBg] = useState(false);
  // Lấy customBg từ user profile (MongoDB)

  const handleTabSelect = (nextTab: TabKey) => {
    setTab(nextTab);
    if (isMobile) {
      setIsNavOpen(false);
    }
  };

  const openProfileMenu = () => {
    setShowProfileMenu(true);
    if (isMobile) {
      setIsNavOpen(false);
    }
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      setCookie("sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  };

  const userInitials = user && (user.firstName || user.lastName)
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";
  const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Tài khoản";

  const renderNavButtons = (className?: string, collapsed = false) => (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      {navItems.map(item => {
        const isActive = tab === item.id;
        const baseClasses = collapsed
          ? "flex items-center justify-center rounded-xl px-2 py-2.5 text-sm font-medium transition-colors"
          : "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors md:gap-3 md:px-4 md:py-2.5 md:text-sm";
        const iconSizing = collapsed ? "h-10 w-10" : "h-8 w-8 md:h-9 md:w-9";
        return (
          <button
            key={item.id}
            aria-label={item.label}
            title={collapsed ? item.label : undefined}
            className={`${baseClasses}
              ${isActive ? "bg-blue-500/20 text-blue-200" : "text-slate-300 hover:bg-slate-800/70 hover:text-white"}`}
            onClick={() => handleTabSelect(item.id)}
          >
            <span className={`flex ${iconSizing} items-center justify-center rounded-lg border border-white/10 transition-colors
              ${isActive ? "bg-blue-500/30 text-blue-100" : "bg-slate-900/60 text-slate-400"}`}>
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        );
      })}
    </div>
  );

  const tabLabelMap: Record<TabKey, string> = {
    new: "New",
    timer: "Timer",
    room: "Room",
    practice: "Practice",
    shop: "Shop",
    about: "About",
  };


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
      const viewportWidth = window.innerWidth;
  const enableMobileLayout = mobile && viewportWidth >= 768;
  setIsMobileDevice(mobile);
  setIsMobile(enableMobileLayout);
      const portrait = window.innerHeight > window.innerWidth;
  setIsPortrait(mobile ? portrait : false);
      setMobileShrink(false);
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

  useEffect(() => {
    if (!isMobile) {
      setIsNavOpen(false);
    }
  }, [isMobile]);

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
    if (tabParam && ALL_TABS.includes(tabParam as TabKey)) {
      setTab(tabParam as TabKey);
    }
  }, [searchParams]);

  const handleCreateRoom = async (event: '2x2' | '3x3' | '4x4' | 'pyraminx', displayName: string, password: string, gameMode: '1vs1' | '2vs2') => {
    const roomId = generateRoomId();
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('justCreatedRoom', roomId);
      // Lưu meta phòng để trang room/[roomId] lấy khi join-room
      sessionStorage.setItem(`roomMeta_${roomId}`, JSON.stringify({ event, displayName, password, gameMode }));
      // Không lưu password vào roomPassword_{roomId} khi tạo phòng mới!
    }

    // Nếu là chế độ 2vs2, tạo room trên Daily.co và waiting room
    if (gameMode === '2vs2') {
      try {
        const response = await fetch('/api/daily-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, gameMode, event, displayName })
        });
        
        if (response.ok) {
          const data = await response.json();
          // Lưu room URL vào sessionStorage để page2 sử dụng
          sessionStorage.setItem(`dailyRoomUrl_${roomId}`, data.roomUrl);
        } else {
          console.error('Failed to create Daily.co room:', await response.text());
        }
      } catch (error) {
        console.error('Error creating Daily.co room:', error);
      }
      
      // Tạo waiting room trên server
      try {
        const waitingResponse = await fetch('/api/waiting-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, gameMode, event, displayName, password })
        });
        
        if (waitingResponse.ok) {
          console.log('Waiting room created successfully');
        } else {
          console.error('Failed to create waiting room:', await waitingResponse.text());
        }
      } catch (error) {
        console.error('Error creating waiting room:', error);
      }
      
      router.push(`/room/${roomId}/waiting?roomId=${roomId}`);
    } else {
      router.push(`/room/${roomId}`);
    }
  };

  const [joinError, setJoinError] = useState("");

  // Hàm join phòng: chỉ cho phép vào với vai trò người chơi
  const handleJoinRoom = async (roomId: string) => {
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
    
    try {
      const res = await fetch(`/api/room-meta/${code}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.gameMode === '2vs2') {
          // Tạo room trên Daily.co nếu chưa có
          try {
            const dailyRes = await fetch('/api/daily-room', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                roomId: code, 
                gameMode: '2vs2', 
                event: data.event || '3x3',
                displayName: data.displayName || 'Room'
              })
            });
            
            if (dailyRes.ok) {
              const dailyData = await dailyRes.json();
              sessionStorage.setItem(`dailyRoomUrl_${code}`, dailyData.roomUrl);
            }
          } catch (error) {
            console.error('Error creating Daily.co room for join:', error);
          }
          
          router.push(`/room/${code}/waiting?roomId=${code}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error fetching room meta:', error);
    }
    
    // Mặc định chuyển đến page thường (1vs1)
    router.push(`/room/${code}`);
  };

  if (isMobileDevice && isPortrait) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white py-4">
        <div className="text-2xl font-bold text-red-400 mb-4 text-center">VUI LÒNG XOAY NGANG MÀN HÌNH ĐỂ SỬ DỤNG ỨNG DỤNG!</div>
        <div className="text-lg text-red-300 mb-2 text-center">Nhớ tắt chế độ khóa xoay màn hình ở bảng điều khiển của thiết bị.</div>
      </div>
    );
  }
  return (
    <main className="relative flex h-screen flex-col overflow-hidden font-sans text-white">
      {(bgError || loadingBg) && (
        <div className="fixed left-1/2 top-3 z-[120] -translate-x-1/2 rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {loadingBg ? "Đang xử lý ảnh nền..." : bgError}
        </div>
      )}

      {isNavOpen && mobileShrink && (
        <div className="fixed inset-0 z-[100] flex md:hidden" onClick={() => setIsNavOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="relative z-[110] flex h-full w-64 max-w-[75vw] flex-col gap-4 overflow-hidden bg-slate-900/95 px-4 py-5 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <button
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:text-white"
              onClick={() => setIsNavOpen(false)}
              aria-label="Đóng menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
            <div className="mt-1.5 flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 64 64" fill="none" className="drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="18" height="18" rx="3" fill="#F9E042" stroke="#222" strokeWidth="2" />
                <rect x="23" y="2" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2" />
                <rect x="44" y="2" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2" />
                <rect x="2" y="23" width="18" height="18" rx="3" fill="#FDE047" stroke="#222" strokeWidth="2" />
                <rect x="23" y="23" width="18" height="18" rx="3" fill="#22D3EE" stroke="#222" strokeWidth="2" />
                <rect x="44" y="23" width="18" height="18" rx="3" fill="#22C55E" stroke="#222" strokeWidth="2" />
                <rect x="2" y="44" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2" />
                <rect x="23" y="44" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2" />
                <rect x="44" y="44" width="18" height="18" rx="3" fill="#F9E042" stroke="#222" strokeWidth="2" />
              </svg>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-white">Rubik App</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {renderNavButtons()}
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4">
              <button
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-xs font-medium text-white transition hover:border-blue-400/50 hover:text-blue-200"
                onClick={openProfileMenu}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-base font-semibold text-white shadow">
                  {userInitials || "👤"}
                </span>
                <span className="text-sm md:text-base">{userName}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {showProfileMenu && (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-start bg-black/40 backdrop-blur-sm"
          onClick={() => setShowProfileMenu(false)}
        >
          <div
            onClick={event => event.stopPropagation()}
            className="mb-16 ml-12 w-full max-w-md px-4 pb-2 md:ml-24 md:pl-12"
          >
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

  <div className={`flex flex-1 overflow-hidden ${mobileShrink ? "flex-col" : "flex-row"} md:flex-row`}>
    <aside className={`${mobileShrink ? "hidden md:flex" : "flex"} ${isSidebarCollapsed ? "w-20 md:w-20 lg:w-24" : "w-56 md:w-56 lg:w-64"} flex-shrink-0`}>
          <div className="flex h-full w-full flex-col overflow-hidden border border-white/5 bg-slate-900/60 backdrop-blur-xl transition-all duration-200">
            <div className={`flex items-center pt-4 pb-4 ${isSidebarCollapsed ? "justify-center gap-2 px-2" : "gap-3 px-5"}`}>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:text-white"
                onClick={toggleSidebarCollapse}
                aria-label={isSidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
                aria-pressed={isSidebarCollapsed}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <svg width="36" height="36" viewBox="0 0 64 64" fill="none" className="drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="18" height="18" rx="3" fill="#F9E042" stroke="#222" strokeWidth="2" />
                <rect x="23" y="2" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2" />
                <rect x="44" y="2" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2" />
                <rect x="2" y="23" width="18" height="18" rx="3" fill="#FDE047" stroke="#222" strokeWidth="2" />
                <rect x="23" y="23" width="18" height="18" rx="3" fill="#22D3EE" stroke="#222" strokeWidth="2" />
                <rect x="44" y="23" width="18" height="18" rx="3" fill="#22C55E" stroke="#222" strokeWidth="2" />
                <rect x="2" y="44" width="18" height="18" rx="3" fill="#3B82F6" stroke="#222" strokeWidth="2" />
                <rect x="23" y="44" width="18" height="18" rx="3" fill="#F43F5E" stroke="#222" strokeWidth="2" />
                <rect x="44" y="44" width="18" height="18" rx="3" fill="#F9E042" stroke="#222" strokeWidth="2" />
              </svg>
              {!isSidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-xl font-semibold text-white">Rubik App</span>
                </div>
              )}
            </div>
            <div className={`overflow-y-auto pb-5 ${isSidebarCollapsed ? "px-2" : "px-3"}`}>
              {renderNavButtons(undefined, isSidebarCollapsed)}
            </div>
            <div className={`mt-auto pb-5 ${isSidebarCollapsed ? "px-5" : "px-5"}`}>
              <button
                className={`flex w-full items-center rounded-xl border border-white/10 bg-slate-800/80 text-sm font-medium text-white transition hover:border-blue-400/60 hover:text-blue-200 ${isSidebarCollapsed ? "justify-center px-2 py-1" : "justify-between px-2 py-1"}`}
                onClick={openProfileMenu}
                aria-label="Tài khoản"
                title={isSidebarCollapsed ? "Tài khoản" : undefined}
              >
                <span className={`flex items-center ${isSidebarCollapsed ? "" : "gap-3"}`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-lg font-semibold text-white shadow">
                    {userInitials || "👤"}
                  </span>
                  {!isSidebarCollapsed && <span>{userName}</span>}
                </span>
                {!isSidebarCollapsed && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          {mobileShrink && (
          <div className="sticky top-0 z-20 flex items-center justify-between bg-slate-950/95 px-4 py-4 shadow md:hidden">
            <div className="flex items-center gap-3">
              <button
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-white shadow"
                onClick={() => setIsNavOpen(true)}
                aria-label="Mở menu"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex flex-col leading-tight">
                <span className="text-xs uppercase tracking-wide text-slate-400">Menu</span>
                <span className="text-base font-semibold text-white">{tabLabelMap[tab]}</span>
              </div>
            </div>
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500 text-lg font-semibold text-white shadow"
              onClick={openProfileMenu}
              aria-label="Mở hồ sơ"
            >
              {userInitials || "👤"}
            </button>
          </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="w-full px-3 pb-10 pt-6 sm:px-6 lg:px-8 xl:px-10">
              <div className={`transition-all duration-300 ${tabTransitioning ? 'pointer-events-none translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
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
                    />
                    {joinError && <div className="mt-3 text-center text-sm text-red-400">{joinError}</div>}
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
            </div>
          </div>
        </section>
      </div>

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