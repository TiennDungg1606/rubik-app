// Khai báo window._roomPassword và _roomDisplayName để tránh lỗi TS
declare global {
  interface Window { 
    _roomPassword?: string;
    _roomDisplayName?: string;
  }
}
import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { io } from "socket.io-client";

type RoomTabProps = {
  roomInput: string;
  setRoomInput: (v: string) => void;
  handleCreateRoom: (event: '2x2' | '3x3' | '4x4' | 'pyraminx' | 'relay2-4', displayName: string, password: string, gameMode: '1vs1' | '2vs2') => void;
  handleJoinRoom: (roomId: string) => void;
  mobileShrink?: boolean;
  registerPlayersModalTrigger?: (open: (() => void) | null) => void;
};

type PublicUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar?: string | null;
  goal33?: string | null;
};


export default function RoomTab({ roomInput, setRoomInput, handleCreateRoom, handleJoinRoom, mobileShrink, registerPlayersModalTrigger }: RoomTabProps) {

  // Skeleton loading state
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState("");
  const [activeRooms, setActiveRooms] = useState<string[]>([]);
  const [competingRooms, setCompetingRooms] = useState<string[]>([]);
  // Lưu meta phòng để kiểm tra mật khẩu
  const [roomMetas, setRoomMetas] = useState<Record<string, { password?: string; event?: string; displayName?: string; gameMode?: string; isWaitingRoom?: boolean; usersCount?: number }>>({});
  const roomMetasRef = useRef(roomMetas);

  useEffect(() => {
    roomMetasRef.current = roomMetas;
  }, [roomMetas]);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalRoomId, setPasswordModalRoomId] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordModalError, setPasswordModalError] = useState("");
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [playersModalVisible, setPlayersModalVisible] = useState(false);
  const [players, setPlayers] = useState<PublicUser[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersAppending, setPlayersAppending] = useState(false);
  const [playersError, setPlayersError] = useState("");
  const [playersCursor, setPlayersCursor] = useState<string | null>(null);
  const [playersHasMore, setPlayersHasMore] = useState(true);
  const [playerActionTarget, setPlayerActionTarget] = useState<PublicUser | null>(null);
  // Ngăn cuộn nền khi mở modal
  useEffect(() => {
    if (showCreateModal || showPasswordModal || showPlayersModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalOverflow; };
    }
  }, [showCreateModal, showPasswordModal, showPlayersModal]);
  useEffect(() => {
    return () => {
      if (roomFullTimerRef.current) {
        clearTimeout(roomFullTimerRef.current);
      }
      if (roomFullHideTimerRef.current) {
        clearTimeout(roomFullHideTimerRef.current);
      }
    };
  }, []);
  // Animation state for modal
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [modalEvent, setModalEvent] = useState<'2x2' | '3x3' | '4x4' | 'pyraminx' | 'relay2-4'>("3x3");
  const [modalGameMode, setModalGameMode] = useState<'1vs1' | '2vs2'>("1vs1");
  const [modalRoomName, setModalRoomName] = useState("");
  const [modalPassword, setModalPassword] = useState("");
  const [modalPasswordConfirm, setModalPasswordConfirm] = useState("");
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [isCompactWidth, setIsCompactWidth] = useState(false);
  const [modalError, setModalError] = useState("");
  const [showRoomFullModal, setShowRoomFullModal] = useState(false);
  const [roomFullModalVisible, setRoomFullModalVisible] = useState(false);
  const [roomFullMessage, setRoomFullMessage] = useState("");
  const roomFullTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomFullHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveMobileShrink = Boolean(mobileShrink || isMobileLandscape || isCompactWidth);
  const modalInputClasses = `w-full rounded border border-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${effectiveMobileShrink ? 'px-3 py-1.5 text-sm' : 'px-3 py-2'}`;
  const modalHeadingClass = `${effectiveMobileShrink ? 'text-base' : 'text-lg'} font-semibold text-white mb-4`;
  const modalSectionTitleClass = `${effectiveMobileShrink ? 'text-sm' : 'text-lg'} font-semibold text-white mb-4`;
  const modalButtonBase = `${effectiveMobileShrink ? 'px-3 py-2 text-sm' : 'px-4 py-2'} rounded text-white font-bold transition-colors`;
  const modalContainerClasses = effectiveMobileShrink
    ? 'flex flex-row gap-3 p-3 w-[95vw] max-w-[95vw] overflow-x-auto'
    : 'flex flex-col sm:flex-row w-full max-w-[98vw] sm:max-w-[720px] md:max-w-[880px] lg:max-w-[1040px] xl:max-w-[1180px] p-2 sm:p-6';
  const selectionColumnClass = effectiveMobileShrink
    ? 'flex flex-col items-center justify-start w-1/4 min-w-[120px] px-2 border-r border-white/10'
    : 'flex flex-col items-center justify-start w-1/4 px-4 border-r border-white/10';
  const formColumnClass = effectiveMobileShrink
    ? 'flex-1 min-w-[200px] px-2 flex flex-col justify-between'
    : 'flex-1 px-4 flex flex-col justify-between';
  const listSectionWrapperClass = effectiveMobileShrink ? 'w-full max-w-lg' : 'w-full max-w-3xl';
  const listSectionSpacingClass = effectiveMobileShrink ? 'mb-2' : 'mb-5';
  const listHeadingClass = `${effectiveMobileShrink ? 'text-base' : 'text-lg'} font-semibold mb-4 text-center text-white`;
  const listContainerClass = effectiveMobileShrink
    ? 'h-62 overflow-y-auto border border-gray-700 rounded-xl p-1'
    : 'h-74 overflow-y-auto border border-gray-700 rounded-lg p-2';
  const listGridClass = effectiveMobileShrink
    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center'
    : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center';
  const roomCardWrapperClass = `flex flex-col items-center transition-transform duration-200 hover:scale-105 hover:shadow-xl ${effectiveMobileShrink ? 'gap-1 text-sm' : ''}`;
  const roomTileBaseClass = `${effectiveMobileShrink ? 'w-20 h-20 text-2xl' : 'w-24 h-24 text-3xl'} rounded-xl flex items-center justify-center text-gray-100 mb-2 relative`;
  const createTileClass = `${effectiveMobileShrink ? 'w-20 h-20 text-4xl' : 'w-24 h-24 text-5xl'} bg-gray-700 rounded-xl flex items-center justify-center text-gray-300 mb-2 hover:bg-gray-600 transition-all`;
  const skeletonTileClass = `${effectiveMobileShrink ? 'w-20 h-20' : 'w-24 h-24'} rounded-xl mb-2 flex items-center justify-center`;
  const skeletonInnerTileClass = `${effectiveMobileShrink ? 'w-14 h-14' : 'w-16 h-16'} rounded grid place-items-center`;
  const skeletonLabelClass = `${effectiveMobileShrink ? 'h-3 w-16' : 'h-4 w-20'} rounded`;
  const roomNameClass = `${effectiveMobileShrink ? 'text-sm' : 'text-base'} text-gray-200 text-center`;
  const roomModeLabelClass = `${effectiveMobileShrink ? 'text-[10px]' : 'text-xs'} text-gray-400 ${effectiveMobileShrink ? 'mt-0.5' : 'mt-1'}`;
  const waitingBadgeTextClass = `${effectiveMobileShrink ? 'text-[10px]' : 'text-xs'} text-yellow-400 ${effectiveMobileShrink ? 'mt-0.5' : 'mt-1'}`;
  // Đã loại bỏ logic spectator
  // Sử dụng localhost khi development, production server khi production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const API_BASE = isDevelopment 
    ? "http://localhost:3001" 
    : "https://rubik-socket-server-production-3b21.up.railway.app";
  
  useEffect(() => {
    function checkDevice() {
      const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      const portrait = window.innerHeight > window.innerWidth;
      const viewportWidth = window.innerWidth;
      setIsMobileLandscape(mobile && !portrait && viewportWidth < 1200);
      setIsCompactWidth(viewportWidth <= 768);
    }

    if (typeof window !== "undefined") {
      checkDevice();
      window.addEventListener("resize", checkDevice);
      window.addEventListener("orientationchange", checkDevice);
      return () => {
        window.removeEventListener("resize", checkDevice);
        window.removeEventListener("orientationchange", checkDevice);
      };
    }
  }, []);

  // Lấy danh sách phòng và phân loại - đã gộp logic Skeleton loading vào đây
  useEffect(() => {
    let stopped = false;
    let socket;
    
    async function fetchRooms() {
      try {
        const res = await fetch(`${API_BASE}/active-rooms`);
        const roomObjs = await res.json();
        if (!Array.isArray(roomObjs)) {
          setActiveRooms([]);
          setCompetingRooms([]);
          return;
        }
        const active: string[] = [];
        const competing: string[] = [];
        const metaMap: Record<string, { password?: string; gameMode?: string; isWaitingRoom?: boolean; displayName?: string; event?: string; usersCount?: number }> = {};
        for (const roomObj of roomObjs) {
          const roomId = typeof roomObj === 'string' ? roomObj : roomObj.roomId;
          const meta = typeof roomObj === 'object' && roomObj.meta ? roomObj.meta : {};
          const usersCount = typeof roomObj === 'object' && typeof roomObj.usersCount === 'number' ? roomObj.usersCount : undefined;
          const isWaitingRoom = typeof roomObj === 'object' && (roomObj.isWaitingRoom === true || meta.isWaitingRoom === true);
          if (!roomId) continue;
          const previousMeta = roomMetasRef.current[roomId] || {};
          const mergedMeta = { ...previousMeta, ...meta, isWaitingRoom, usersCount };
          if (!mergedMeta.displayName) {
            const fallbackName = typeof meta.displayName === 'string'
              ? meta.displayName
              : typeof roomObj?.displayName === 'string'
                ? roomObj.displayName
                : previousMeta.displayName;
            if (fallbackName) mergedMeta.displayName = fallbackName;
          }
          if (mergedMeta.gameMode === '2vs2' && !isWaitingRoom) {
            delete mergedMeta.password;
          }
          metaMap[roomId] = mergedMeta;
          
          if (isWaitingRoom) {
            // Waiting rooms luôn hiển thị trong active rooms
            active.push(roomId);
          } else if (usersCount === 1) {
            active.push(roomId);
          } else if (usersCount === 2) {
            competing.push(roomId);
          }
        }
  setRoomMetas(metaMap);
  roomMetasRef.current = metaMap;
        setActiveRooms(active);
        setCompetingRooms(competing);
      } catch {
        setActiveRooms([]);
        setCompetingRooms([]);
      }
    }

    // Lần đầu tiên fetch ngay lập tức
    fetchRooms();
    
    // Timer để tắt Skeleton loading sau 3s
    const loadingTimer = setTimeout(() => {
      setLoadingRooms(false);
    }, 3000);

    // Lắng nghe sự kiện update-active-rooms từ server để reload danh sách phòng ngay lập tức
    socket = io(API_BASE, { transports: ["websocket"] });
    socket.on("update-active-rooms", () => {
      console.log('=== ROOMTAB RECEIVED UPDATE-ACTIVE-ROOMS ===');
      console.log('Refreshing rooms list...');
      fetchRooms();
    });

    return () => {
      stopped = true;
      clearTimeout(loadingTimer);
      if (socket) socket.disconnect();
    };
  }, []);

  // Kiểm tra hợp lệ mã phòng: 6 ký tự, chỉ chữ và số
  function validateRoomCode(code: string) {
    if (!/^[A-Za-z0-9]{6}$/.test(code)) {
      return "Mã phòng phải gồm 6 ký tự chữ hoặc số.";
    }
    return "";
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRoomInput(e.target.value.toUpperCase());
    setError("");
  }

  // Modal logic
  function openCreateModal() {
  setShowCreateModal(true);
  setTimeout(() => setModalVisible(true), 10); // trigger animation
    setModalEvent("3x3");
    setModalGameMode("1vs1");
    setModalRoomName("");
    setModalPassword("");
    setModalPasswordConfirm("");
    setModalError("");
  }

  function closeCreateModal() {
  setModalVisible(false);
  setTimeout(() => setShowCreateModal(false), 200); // wait for animation
  setModalError("");
  }

  // Password modal functions
  function openPasswordModal(roomId: string) {
    setPasswordModalRoomId(roomId);
    setPasswordInput("");
    setShowPasswordModal(true);
    setTimeout(() => setPasswordModalVisible(true), 10);
  }

  function closePasswordModal() {
    setPasswordModalVisible(false);
    setTimeout(() => {
      setShowPasswordModal(false);
      setPasswordModalRoomId("");
      setPasswordInput("");
      setPasswordModalError("");
    }, 200);
  }

  const PLAYERS_LIMIT = 120;

  const fetchPlayers = useCallback(async (cursor: string | null, append = false) => {
    const query = new URLSearchParams({ limit: PLAYERS_LIMIT.toString() });
    if (cursor) query.set("cursor", cursor);
    const setLoadingState = append ? setPlayersAppending : setPlayersLoading;
    setLoadingState(true);
    try {
      const res = await fetch(`/api/users?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to load players");
      const data = await res.json();
      const list: PublicUser[] = Array.isArray(data?.users) ? data.users : [];
      setPlayers(prev => (append ? [...prev, ...list] : list));
      const nextCursor = typeof data?.nextCursor === "string" ? data.nextCursor : null;
      setPlayersCursor(nextCursor);
      setPlayersHasMore(Boolean(nextCursor));
      setPlayersError("");
    } catch (err) {
      if (!append) {
        setPlayers([]);
        setPlayersError("Không thể tải danh sách người chơi.");
      } else {
        setPlayersError("Không thể tải thêm người chơi. Vui lòng thử lại.");
      }
    } finally {
      setLoadingState(false);
    }
  }, []);

  const openPlayersModal = useCallback(() => {
    setPlayersError("");
    setPlayersHasMore(true);
    setPlayersCursor(null);
    setPlayers([]);
    setShowPlayersModal(true);
    setTimeout(() => setPlayersModalVisible(true), 10);
    fetchPlayers(null, false);
  }, [fetchPlayers]);

  useEffect(() => {
    if (!registerPlayersModalTrigger) return;
    registerPlayersModalTrigger(openPlayersModal);
    return () => {
      registerPlayersModalTrigger(null);
    };
  }, [registerPlayersModalTrigger, openPlayersModal]);

  function closePlayersModal() {
    setPlayersModalVisible(false);
    setTimeout(() => setShowPlayersModal(false), 200);
  }

  function handlePasswordConfirm() {
    if (!passwordModalRoomId) return;
    
    // Kiểm tra mật khẩu
    const meta = roomMetas[passwordModalRoomId] || {};
    if (meta.password && meta.password !== passwordInput) {
      setPasswordModalError("Mật khẩu không đúng.");
      return;
    }
    if (meta.isWaitingRoom && meta.gameMode === '2vs2' && (meta.usersCount ?? 0) >= 4) {
      const displayName = meta.displayName || passwordModalRoomId;
      closePasswordModal();
      triggerRoomFullModal(displayName);
      return;
    }
    
    setPasswordModalError("");
    window._roomPassword = passwordInput;
    closePasswordModal();
    
    // Nếu là waiting room, chuyển hướng trực tiếp
    if (meta.isWaitingRoom) {
      window._roomDisplayName = meta.displayName || passwordModalRoomId;
      window.location.href = `/room/${passwordModalRoomId}/waiting?roomId=${passwordModalRoomId}`;
    } else {
      handleJoinRoom(passwordModalRoomId);
    }
  }

  function handleModalConfirm() {
    // Validate room name
    if (!modalRoomName.trim() || modalRoomName.length > 8) {
      setModalError("Tên phòng phải từ 1 đến 8 ký tự.");
      return;
    }
    // Validate password match
    if (modalPassword !== modalPasswordConfirm) {
      setModalError("Mật khẩu nhập lại không khớp.");
      return;
    }
    setModalError("");
    setShowCreateModal(false);
    // Truyền event, tên phòng, mật khẩu, gameMode cho handleCreateRoom
    handleCreateRoom(modalEvent, modalRoomName, modalPassword, modalGameMode);
  }

  function handleJoin() {
    const err = validateRoomCode(roomInput);
    if (err) {
      setError(err);
      return;
    }
    // Kiểm tra mã phòng có trong danh sách phòng đang hoạt động hoặc đang thi đấu không
    if (!activeRooms.includes(roomInput) && !competingRooms.includes(roomInput)) {
      setError("Mã phòng không tồn tại.");
      return;
    }
    const meta = roomMetas[roomInput] || {};
    if (meta.isWaitingRoom && meta.gameMode === '2vs2' && (meta.usersCount ?? 0) >= 4) {
      const displayName = meta.displayName || roomInput;
      setError("Phòng 2vs2 này đã đủ 4 người.");
      triggerRoomFullModal(displayName);
      return;
    }
    setError("");
    handleJoinRoom(roomInput);
  }

  // Ẩn thanh tab khi modal mở
  React.useEffect(() => {
    const tabBar = document.querySelector('.tab-navbar');
    if ((showCreateModal || showPasswordModal || showPlayersModal) && tabBar) {
      tabBar.classList.add('hidden');
    } else if (tabBar) {
      tabBar.classList.remove('hidden');
    }
    return () => {
      if (tabBar) tabBar.classList.remove('hidden');
    };
  }, [showCreateModal, showPasswordModal, showPlayersModal]);

  const closeRoomFullModal = React.useCallback(() => {
    if (roomFullTimerRef.current) {
      clearTimeout(roomFullTimerRef.current);
      roomFullTimerRef.current = null;
    }
    setRoomFullModalVisible(false);
    if (roomFullHideTimerRef.current) {
      clearTimeout(roomFullHideTimerRef.current);
    }
    roomFullHideTimerRef.current = setTimeout(() => {
      setShowRoomFullModal(false);
      setRoomFullMessage("");
      roomFullHideTimerRef.current = null;
    }, 300);
  }, []);

  const triggerRoomFullModal = (displayName: string) => {
    if (roomFullTimerRef.current) {
      clearTimeout(roomFullTimerRef.current);
      roomFullTimerRef.current = null;
    }
    if (roomFullHideTimerRef.current) {
      clearTimeout(roomFullHideTimerRef.current);
      roomFullHideTimerRef.current = null;
    }
    setRoomFullMessage(`${displayName} đã đủ 4 người chơi.`);
    setShowRoomFullModal(true);
    requestAnimationFrame(() => setRoomFullModalVisible(true));
    roomFullTimerRef.current = setTimeout(() => {
      closeRoomFullModal();
    }, 3000);
  };

  return (
  <div className="w-full flex flex-col items-center bg-neutral-900/50 justify-center rounded-2xl">
      {/* Modal tạo phòng */}
      {showCreateModal && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          className={`fixed inset-0 z-50 bg-transparent transition-opacity duration-200 ${modalVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ minHeight: '100dvh', minWidth: '100vw', padding: 0 }}
        >
          <div
            className={`rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950/95 via-slate-900/80 to-slate-950/95 shadow-[0_40px_120px_rgba(0,0,0,0.5)] backdrop-blur-2xl box-border transform transition-all duration-200 ${modalContainerClasses} ${modalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            style={{
              overflowY: 'auto',
              borderRadius: 16,
              position: 'absolute',
              ...(effectiveMobileShrink
                ? {
                    top: 16,
                    left: '50%',
                    maxHeight: '92dvh',
                    transform: `translateX(-50%) ${modalVisible ? '' : 'scale(0.97)'}`,
                  }
                : {
                    top: '50%',
                    left: '50%',
                    maxHeight: '95vh',
                    transform: `translate(-50%, -50%) ${modalVisible ? '' : 'scale(0.95)'}`,
                  }),
            }}
          >
            {/* Cột 1: Chọn thể loại rubik */}
            <div className={selectionColumnClass}>
              <div className="flex flex-col items-center text-center mb-4">
                <div className={`${modalSectionTitleClass} tracking-wide uppercase text-blue-200`}>Thể loại</div>
              </div>
              {[
                { id: '2x2', label: '2x2', hue: 'from-cyan-400/80 to-blue-500/70' },
                { id: '3x3', label: '3x3', hue: 'from-blue-500/85 to-indigo-600/70' },
                { id: '4x4', label: '4x4', hue: 'from-violet-500/85 to-purple-600/70' },
                { id: 'pyraminx', label: 'Pyraminx', hue: 'from-amber-400/80 to-orange-500/70' },
                { id: 'relay2-4', label: 'Relay 2-4', hue: 'from-pink-400/80 to-red-500/70' }
              ].map(option => (
                <button
                  key={option.id}
                  className={`w-full mb-3 rounded-2xl border px-3 py-3 text-sm font-semibold tracking-wide transition-all duration-200 flex flex-col items-center gap-1 shadow-sm ${modalEvent === option.id
                    ? `border-white/80 text-white bg-gradient-to-br ${option.hue} shadow-[0_12px_24px_rgba(0,0,0,0.35)]`
                    : 'border-white/10 text-slate-200 bg-white/5 hover:bg-white/10'}`}
                  onClick={() => setModalEvent(option.id as typeof modalEvent)}
                >
                  <span className="text-base">{option.label}</span>
                </button>
              ))}
            </div>
            {/* Cột 2: Chọn chế độ đấu */}
            <div className={selectionColumnClass}>
              <div className="flex flex-col items-center text-center mb-4">
                <div className={`${modalSectionTitleClass} tracking-wide uppercase text-emerald-200`}>Chế độ đấu</div>
              </div>
              {[
                { id: '1vs1', label: '1 vs 1', desc: 'Đối đầu trực tiếp' },
                { id: '2vs2', label: '2 vs 2', desc: 'Đồng đội kịch tính' }
              ].map(option => (
                <button
                  key={option.id}
                  className={`w-full mb-3 rounded-2xl border px-3 py-3 text-sm font-semibold tracking-wide transition-all duration-200 text-left shadow-sm ${modalGameMode === option.id
                    ? 'border-emerald-200/80 text-white bg-gradient-to-br from-emerald-500/80 to-teal-500/70 shadow-[0_12px_24px_rgba(16,185,129,0.35)]'
                    : 'border-white/10 text-slate-200 bg-white/5 hover:bg-white/10'}`}
                  onClick={() => setModalGameMode(option.id as typeof modalGameMode)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{option.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/60">Mode</span>
                  </div>
                  <p className="text-[11px] text-white/70 mt-1">{option.desc}</p>
                </button>
              ))}
            </div>
            {/* Cột 3: Nhập tên phòng, mật khẩu, xác nhận */}
            <div className={formColumnClass}>
              <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-5 shadow-inner shadow-black/40">
                <div className={`${modalHeadingClass} flex items-center justify-between`}>
                  <span>Tạo phòng mới</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-gray-200 mb-1 font-medium ${effectiveMobileShrink ? 'text-sm' : ''}`}>
                      Tên phòng <span className="text-white/50">(tối đa 10 ký tự)</span>
                    </label>
                    <div className="relative">
                      <input
                        className={`${modalInputClasses} pl-10 bg-white/10 border-white/20 focus:border-blue-400/70`}
                        maxLength={10}
                        value={modalRoomName}
                        onChange={e => setModalRoomName(e.target.value)}
                        placeholder="Nhập tên phòng"
                      />
                      <span className="absolute inset-y-0 left-3 flex items-center text-white/60 text-sm">#</span>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-gray-200 mb-1 font-medium ${effectiveMobileShrink ? 'text-sm' : ''}`}>
                      Mật khẩu <span className="text-white/50">(có thể để trống)</span>
                    </label>
                    <div className="relative">
                      <input
                        className={`${modalInputClasses} pr-10 bg-white/10 border-white/20 focus:border-blue-400/70`}
                        type="password"
                        value={modalPassword}
                        onChange={e => setModalPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-white/60 text-sm">🔒</span>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-gray-200 mb-1 font-medium ${effectiveMobileShrink ? 'text-sm' : ''}`}>Nhập lại mật khẩu</label>
                    <input
                      className={`${modalInputClasses} bg-white/10 border-white/20 focus:border-blue-400/70`}
                      type="password"
                      value={modalPasswordConfirm}
                      onChange={e => setModalPasswordConfirm(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                    />
                  </div>
                  {modalError && <div className="text-red-400 text-sm">{modalError}</div>}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                <span>Phòng riêng tư sẽ hiển thị biểu tượng khóa.</span>
                <span>{modalRoomName.length}/10</span>
              </div>
              <div className={`flex flex-row justify-end gap-3 mt-4 ${effectiveMobileShrink ? 'text-sm' : ''}`}>
                <button
                  className={`${modalButtonBase} bg-white/10 border border-white/20 text-white hover:bg-white/20 font-normal`}
                  onClick={closeCreateModal}
                >Hủy</button>
                <button
                  className={`${modalButtonBase} bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 shadow-lg shadow-emerald-500/30`}
                  onClick={handleModalConfirm}
                >Tạo phòng</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal nhập mật khẩu phòng */}
      {showPasswordModal && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          className={`fixed inset-0 z-50 bg-black/50 flex items-center justify-center transition-opacity duration-200 ${passwordModalVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ minHeight: '100dvh', minWidth: '100vw', padding: 0 }}
        >
          <div
            className={`bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-200 ${passwordModalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Phòng này có mật khẩu
              </h3>
              <p className="text-gray-300">
                Vui lòng nhập mật khẩu để vào phòng:
              </p>
            </div>
            <div className="mb-6">
              <input
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Nhập mật khẩu phòng"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordConfirm();
                  } else if (e.key === 'Escape') {
                    closePasswordModal();
                  }
                }}
                autoFocus
              />
              {passwordModalError && (
                <div className="text-red-400 text-sm mt-2">{passwordModalError}</div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-3 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                onClick={closePasswordModal}
              >
                Hủy
              </button>
              <button
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-semibold"
                onClick={handlePasswordConfirm}
              >
                Vào phòng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showPlayersModal && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 ${playersModalVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ minHeight: '100dvh', minWidth: '100vw', padding: 0 }}
        >
          <div
            className={`w-full max-w-3xl mx-4 rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-white shadow-2xl transition-all duration-200 ${playersModalVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">Danh sách người chơi</h3>
                <p className="text-sm text-white/60">Danh sách được đồng bộ trực tiếp từ server.</p>
              </div>
              <button
                onClick={closePlayersModal}
                className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            {playersError && (
              <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                {playersError}
              </div>
            )}
            {playersLoading ? (
              <div className="py-8 text-center text-white/80">Đang tải danh sách...</div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1">
                {players.length === 0 ? (
                  <div className="col-span-full text-center text-white/70 py-6">Chưa có người chơi nào.</div>
                ) : (
                  players.map((player, idx) => {
                    const displayName = [player.firstName, player.lastName].filter(Boolean).join(" ") || player.username || "Người chơi";
                    const avatarUrl = typeof player?.avatar === "string" && player.avatar.trim().length > 0 ? player.avatar : null;
                    const initialsSource = [player.firstName, player.lastName].filter(Boolean).map(name => name?.trim()?.charAt(0) || "").join("") || (player.username?.trim()?.charAt(0) || "N");
                    const initials = initialsSource.slice(0, 2).toUpperCase();
                    const goal = typeof player?.goal33 === "string" && player.goal33.trim().length > 0 ? player.goal33.trim() : null;
                    return (
                      <div
                        key={player.id || idx}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition"
                        onClick={() => setPlayerActionTarget(player)}
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="h-10 w-10 rounded-full object-cover border border-white/15"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-white/15 border border-white/10 text-white font-semibold uppercase flex items-center justify-center">
                            {initials}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-white tracking-wide">{displayName}</span>
                          {goal && (
                            <span className="text-xs text-white/70">{goal}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {playersHasMore && !playersLoading && (
                  <button
                    className="col-span-full mt-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition disabled:opacity-60"
                    onClick={() => fetchPlayers(playersCursor, true)}
                    disabled={playersAppending}
                  >
                    {playersAppending ? "Đang tải thêm..." : "Tải thêm"}
                  </button>
                )}
              </div>
            )}
            {playerActionTarget && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4" onClick={() => setPlayerActionTarget(null)}>
                <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-5 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-4">
                    {playerActionTarget.avatar ? (
                      <img src={playerActionTarget.avatar} alt="Avatar" className="h-12 w-12 rounded-full object-cover border border-white/15" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-white/15 border border-white/10 text-white font-semibold uppercase flex items-center justify-center">
                        {([playerActionTarget.firstName, playerActionTarget.lastName].filter(Boolean).map(name => name?.trim()?.charAt(0) || "").join("") || playerActionTarget.username?.charAt(0) || 'N').slice(0,2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-lg font-semibold">{[playerActionTarget.firstName, playerActionTarget.lastName].filter(Boolean).join(" ") || playerActionTarget.username || "Người chơi"}</div>
                      {playerActionTarget.goal33 && <div className="text-xs text-white/70">{playerActionTarget.goal33}</div>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20 transition"
                      onClick={() => {
                        if (playerActionTarget?.id) {
                          const profileUrl = `https://rubik-app-buhb.vercel.app/profile/${playerActionTarget.id}`;
                          window.location.href = profileUrl;
                        } else if (playerActionTarget?.username) {
                          // Fallback for legacy entries missing id
                          const fallbackUrl = `https://rubik-app-buhb.vercel.app/profile/${playerActionTarget.username}`;
                          window.location.href = fallbackUrl;
                        }
                      }}
                    >
                      Xem hồ sơ
                    </button>
                    <button
                      className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:to-indigo-400 transition"
                      onClick={() => {
                        alert('Tính năng kết bạn đang được phát triển.');
                      }}
                    >
                      Kết bạn
                    </button>
                  </div>
                  <button className="mt-4 w-full text-sm text-white/70 hover:text-white" onClick={() => setPlayerActionTarget(null)}>
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {showRoomFullModal && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          className={`fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${roomFullModalVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ minHeight: '100dvh', minWidth: '100vw' }}
          onClick={closeRoomFullModal}
        >
          <div
            className={`rounded-[26px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 shadow-[0_40px_120px_rgba(0,0,0,0.55)] px-6 py-8 w-full max-w-md text-center mx-4 transition-all duration-300 ${roomFullModalVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={event => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-300">
              <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0Z" />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-red-300 mb-2 tracking-wide">Phòng đã đầy</div>
            <p className="text-sm text-white/80 leading-relaxed">
              {roomFullMessage || 'Phòng chờ 2vs2 hiện đã đủ 4 người chơi. Vui lòng thử lại sau hoặc mở phòng mới cho bạn bè.'}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                className="px-5 py-2.5 rounded-2xl border border-white/15 text-white/90 hover:bg-white/10 transition-colors"
                onClick={closeRoomFullModal}
              >Quay lại</button>
              <button
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 text-white font-semibold shadow-lg shadow-rose-500/30 transition hover:translate-y-[-1px]"
                onClick={() => {
                  closeRoomFullModal();
                  openCreateModal();
                }}
              >Tạo phòng mới</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="w-full mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center">
        <h2 className="text-2xl font-bold">Phòng giải Rubik Online</h2>
      </div>
      {/*
      <div className="flex flex-col gap-4 w-full max-w-md bg-gray-800 rounded-xl p-8 shadow-lg mb-8">
        <div className="text-lg font-semibold text-center mb-2 text-white-300">
          Nếu có mã phòng từ bạn bè gửi, hãy nhập vào bên dưới để tham gia phòng!
        </div>
        <div className="flex flex-row items-center gap-2">
          <input
            className="flex-1 px-3 py-2 rounded border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-900 text-white"
            placeholder="Nhập mã phòng để tham gia"
            value={roomInput}
            onChange={handleInputChange}
            onKeyDown={e => { if (e.key === "Enter") handleJoin(); }}
            maxLength={6}
          />
          <button
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
            onClick={handleJoin}
          >
            Vào phòng
          </button>
        </div>
        {error && <div className="text-red-400 text-sm mt-1">{error}</div>}
      </div>
      */}
      {/* Danh sách phòng đang thi đấu */}
      <div className={`${listSectionWrapperClass} ${listSectionSpacingClass}`}>
        <div className={listHeadingClass}>
          🔴 Phòng đang thi đấu ({competingRooms.length} phòng)
        </div>
        <div className={listContainerClass}>
          <div className={listGridClass}>
            {loadingRooms ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className={`${roomCardWrapperClass} animate-pulse`}>
                  <div className={`${skeletonTileClass} bg-red-900/40`}>
                    <div className={`${skeletonInnerTileClass} bg-red-300/30`} />
                  </div>
                  <div className={`${skeletonLabelClass} bg-red-300/30 mb-1`} />
                </div>
              ))
            ) : (
              competingRooms.map((room: string) => (
                <div
                  key={room}
                  className={roomCardWrapperClass}
                >
                  <div className={`${roomTileBaseClass} bg-red-800`}>
                    {/* Icon dạng lưới: 2x2, 3x3, 4x4, hoặc Pyraminx */}
                    {roomMetas[room] && roomMetas[room].event && typeof roomMetas[room].event === 'string' ? (
                      roomMetas[room].event.includes('2x2') ? (
                        <div className="grid grid-cols-2 grid-rows-2 gap-1 w-16 h-16">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-red-300 rounded-sm w-full h-full opacity-80"></div>
                          ))}
                        </div>
                      ) : roomMetas[room].event.includes('4x4') ? (
                        <div className="grid grid-cols-4 grid-rows-4 gap-0.5 w-16 h-16">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className="bg-red-300 rounded-sm w-full h-full opacity-80"></div>
                          ))}
                        </div>
                      ) : roomMetas[room].event.includes('pyraminx') ? (
                        <div className="w-16 h-16 flex items-center justify-center">
                          <div className="w-14 h-14 relative" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', background: '#ef4444' }}>
                            {/* Vẽ các đường chia tam giác thành 9 phần */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              background: 'transparent'
                            }}>
                              {/* Đường ngang */}
                              <div style={{
                                position: 'absolute',
                                top: '33.33%',
                                left: '0%',
                                width: '100%',
                                height: '1px',
                                background: '#333',
                                transform: 'translateY(-0.5px)'
                              }}></div>
                              <div style={{
                                position: 'absolute',
                                top: '66.66%',
                                left: '0%',
                                width: '100%',
                                height: '1px',
                                background: '#333',
                                transform: 'translateY(-0.5px)'
                              }}></div>
                              {/* Đường chéo từ trái */}
                              <div style={{
                                position: 'absolute',
                                top: '0%',
                                left: '33.33%',
                                width: '1px',
                                height: '100%',
                                background: '#333',
                                transform: 'translateX(-0.5px) rotate(30deg)',
                                transformOrigin: 'bottom center'
                              }}></div>
                              <div style={{
                                position: 'absolute',
                                top: '0%',
                                left: '66.66%',
                                width: '1px',
                                height: '100%',
                                background: '#333',
                                transform: 'translateX(-0.5px) rotate(30deg)',
                                transformOrigin: 'bottom center'
                              }}></div>
                              {/* Đường chéo từ phải */}
                              <div style={{
                                position: 'absolute',
                                top: '0%',
                                right: '33.33%',
                                width: '1px',
                                height: '100%',
                                background: '#333',
                                transform: 'translateX(0.5px) rotate(-30deg)',
                                transformOrigin: 'bottom center'
                              }}></div>
                              <div style={{
                                position: 'absolute',
                                top: '0%',
                                right: '66.66%',
                                width: '1px',
                                height: '100%',
                                background: '#333',
                                transform: 'translateX(0.5px) rotate(-30deg)',
                                transformOrigin: 'bottom center'
                              }}></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-16 h-16">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="bg-red-300 rounded-sm w-full h-full opacity-80"></div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-16 h-16">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="bg-red-300 rounded-sm w-full h-full opacity-80"></div>
                        ))}
                      </div>
                    )}
                    {/* Icon indicator */}
                    {roomMetas[room]?.isWaitingRoom ? (
                      <span className="absolute top-1 right-1 text-yellow-300">⏳</span>
                    ) : (
                      <span className="absolute top-1 right-1 text-yellow-300"></span>
                    )}
                  </div>
                  <div className={roomNameClass}>
                    {roomMetas[room]?.isWaitingRoom ? `Phòng chờ ${room}` : (roomMetas[room]?.displayName || room)}
                  </div>
                  {roomMetas[room]?.gameMode && (
                    <div className={roomModeLabelClass}>
                      {roomMetas[room].gameMode === '2vs2' ? '2vs2' : '1vs1'}
                    </div>
                  )}
                  {roomMetas[room]?.isWaitingRoom && (
                    <div className={waitingBadgeTextClass}>
                      Đang chờ
                    </div>
                  )}
                </div>
              ))
            )}
            {competingRooms.length === 0 && (
              <div className="col-span-full text-center text-white py-1">
                Chưa có phòng nào đang thi đấu
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách phòng đang hoạt động */}
      <div className={listSectionWrapperClass}>
        <div className={listHeadingClass}>
          🟢 Phòng đang hoạt động ({activeRooms.length} phòng)
        </div>
        <div className={listContainerClass}>
          <div className={listGridClass}>
            {/* Nút tạo phòng */}
            <div onClick={openCreateModal} className={`${roomCardWrapperClass} cursor-pointer`}>
              <div className={createTileClass}>+</div>
              <div className={roomNameClass}>Tạo phòng</div>
            </div>
            {/* Hiển thị các phòng đang hoạt động */}
            {loadingRooms ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className={`${roomCardWrapperClass} animate-pulse`}>
                  <div className={`${skeletonTileClass} bg-blue-900/40`}>
                    <div className={`${skeletonInnerTileClass} bg-blue-300/30`} />
                  </div>
                  <div className={`${skeletonLabelClass} bg-blue-300/30 mb-1`} />
                </div>
              ))
            ) : (
              activeRooms.map((room: string) => (
                <div
                  key={room}
                  onClick={() => {
                    const meta = roomMetas[room] || {};
                    if (meta.isWaitingRoom && meta.gameMode === '2vs2' && (meta.usersCount ?? 0) >= 4) {
                      const displayName = meta.displayName || room;
                      triggerRoomFullModal(displayName);
                      return;
                    }
                    if (meta.isWaitingRoom) {
                      // Kiểm tra mật khẩu cho waiting room
                      if (meta.password) {
                        openPasswordModal(room);
                      } else {
                        // Chuyển hướng đến waiting room
                        window._roomDisplayName = meta.displayName || room;
                        window.location.href = `/room/${room}/waiting?roomId=${room}`;
                      }
                    } else if (meta.password) {
                      openPasswordModal(room);
                    } else {
                      window._roomPassword = "";
                      handleJoinRoom(room);
                    }
                  }}
                  className={`${roomCardWrapperClass} cursor-pointer`}
                >
                  <div className={`${roomTileBaseClass} ${
                    roomMetas[room]?.isWaitingRoom ? 'bg-yellow-800' : 'bg-blue-800'
                  }`}>
                    {/* Icon dạng lưới: 2x2, 3x3, 4x4, hoặc Pyraminx - áp dụng cho cả waiting room và phòng thường */}
                    {roomMetas[room] && roomMetas[room].event && typeof roomMetas[room].event === 'string' ? (
                      roomMetas[room].event.includes('2x2') ? (
                        <div className="grid grid-cols-2 grid-rows-2 gap-1 w-16 h-16">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-gray-300 rounded-sm w-full h-full opacity-80"></div>
                          ))}
                        </div>
                      ) : roomMetas[room].event.includes('4x4') ? (
                        <div className="grid grid-cols-4 grid-rows-4 gap-0.5 w-16 h-16">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className="bg-gray-300 rounded-sm w-full h-full opacity-80"></div>
                          ))}
                        </div>
                      ) : roomMetas[room].event.includes('pyraminx') ? (
                        <div className="w-16 h-16 flex items-center justify-center">
                          <div className="w-14 h-14 relative" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', background: '#d1d5db' }}>
                            {/* Vẽ các đường chia tam giác thành 9 phần */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              background: 'transparent'
                            }}>
                              {/* Đường ngang */}
                              <div style={{
                                position: 'absolute',
                                top: '33.33%',
                                left: '0%',
                                width: '100%',
                                height: '1px',
                                background: '#333',
                                transform: 'translateY(-0.5px)'
                              }}></div>
                              <div style={{
                                position: 'absolute',
                                top: '66.66%',
                                left: '0%',
                                width: '100%',
                                height: '1px',
                                background: '#333',
                                transform: 'translateY(-0.5px)'
                              }}></div>
                              {/* Đường chéo từ trái */}
                              <div style={{
                                position: 'absolute',
                                top: '0%',
                                left: '33.33%',
                                width: '1px',
                                height: '100%',
                                background: '#333',
                                transform: 'translateX(-0.5px) rotate(30deg)',
                                transformOrigin: 'bottom center'
                              }}></div>
                              <div style={{
                                position: 'absolute',
                                top: '0%',
                                left: '66.66%',
                                width: '1px',
                                height: '100%',
                                background: '#333',
                                transform: 'translateX(-0.5px) rotate(30deg)',
                                transformOrigin: 'bottom center'
                              }}></div>
                              {/* Đường chéo từ phải */}
                              <div style={{
                                position: 'absolute',
                                top: '0%',
                                right: '33.33%',
                                width: '1px',
                                height: '100%',
                                background: '#333',
                                transform: 'translateX(0.5px) rotate(-30deg)',
                                transformOrigin: 'bottom center'
                              }}></div>
                              <div style={{
                                position: 'absolute',
                                top: '0%',
                                right: '66.66%',
                                width: '1px',
                                height: '100%',
                                background: '#333',
                                transform: 'translateX(0.5px) rotate(-30deg)',
                                transformOrigin: 'bottom center'
                              }}></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-16 h-16">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="bg-gray-300 rounded-sm w-full h-full opacity-80"></div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-16 h-16">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="bg-gray-300 rounded-sm w-full h-full opacity-80"></div>
                        ))}
                      </div>
                    )}
                    {/* Icon indicator */}
                    {roomMetas[room]?.isWaitingRoom ? (
                      <span className="absolute top-1 right-1 text-yellow-300">⏳</span>
                    ) : (
                      <span className="absolute top-1 right-1 text-green-300"></span>
                    )}
                  </div>
                  <div className={roomNameClass}>
                    {roomMetas[room]?.displayName || room}
                  </div>
                  {roomMetas[room]?.gameMode && (
                    <div className={roomModeLabelClass}>
                      {roomMetas[room].gameMode === '2vs2' ? '2vs2' : '1vs1'}
                    </div>
                  )}
                  {roomMetas[room]?.isWaitingRoom && (
                    <div className={waitingBadgeTextClass}>
                      Đang chờ
                    </div>
                  )}
                </div>
              ))
            )}
            {activeRooms.length === 0 && (
              <div className="col-span-full text-center text-white py-5">
                Chưa có phòng nào đang hoạt động
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
