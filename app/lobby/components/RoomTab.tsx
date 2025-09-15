// Khai báo window._roomPassword và _roomDisplayName để tránh lỗi TS
declare global {
  interface Window { 
    _roomPassword?: string;
    _roomDisplayName?: string;
  }
}
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { io } from "socket.io-client";

type RoomTabProps = {
  roomInput: string;
  setRoomInput: (v: string) => void;
  handleCreateRoom: (event: '2x2' | '3x3' | '4x4' | 'pyraminx', displayName: string, password: string, gameMode: '1vs1' | '2vs2') => void;
  handleJoinRoom: (roomId: string) => void;
};


export default function RoomTab({ roomInput, setRoomInput, handleCreateRoom, handleJoinRoom }: RoomTabProps) {

  // Skeleton loading state
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState("");
  const [activeRooms, setActiveRooms] = useState<string[]>([]);
  const [competingRooms, setCompetingRooms] = useState<string[]>([]);
  // Lưu meta phòng để kiểm tra mật khẩu
  const [roomMetas, setRoomMetas] = useState<Record<string, { password?: string; event?: string; displayName?: string; gameMode?: string; isWaitingRoom?: boolean }>>({});

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalRoomId, setPasswordModalRoomId] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordModalError, setPasswordModalError] = useState("");
  // Ngăn cuộn nền khi mở modal
  useEffect(() => {
    if (showCreateModal || showPasswordModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalOverflow; };
    }
  }, [showCreateModal, showPasswordModal]);
  // Animation state for modal
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [modalEvent, setModalEvent] = useState<'2x2' | '3x3' | '4x4' | 'pyraminx'>("3x3");
  const [modalGameMode, setModalGameMode] = useState<'1vs1' | '2vs2'>("1vs1");
  const [modalRoomName, setModalRoomName] = useState("");
  const [modalPassword, setModalPassword] = useState("");
  const [modalPasswordConfirm, setModalPasswordConfirm] = useState("");
  const [modalError, setModalError] = useState("");
  // Đã loại bỏ logic spectator
  // Sử dụng localhost khi development, production server khi production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const API_BASE = isDevelopment 
    ? "http://localhost:3001" 
    : "https://rubik-socket-server-production-3b21.up.railway.app";
  

  // Lấy danh sách phòng và phân loại - đã gộp logic Skeleton loading vào đây
  useEffect(() => {
    let stopped = false;
    let socket;
    
    async function fetchRooms() {
      console.log('=== FETCHROOMS CALLED ===');
      try {
        const res = await fetch(`${API_BASE}/active-rooms`);
        const roomObjs = await res.json();
        console.log('Fetched rooms:', roomObjs);
        if (!Array.isArray(roomObjs)) {
          setActiveRooms([]);
          setCompetingRooms([]);
          return;
        }
        const active: string[] = [];
        const competing: string[] = [];
        const metaMap: Record<string, { password?: string; gameMode?: string; isWaitingRoom?: boolean; displayName?: string; event?: string }> = {};
        for (const roomObj of roomObjs) {
          const roomId = typeof roomObj === 'string' ? roomObj : roomObj.roomId;
          const meta = typeof roomObj === 'object' && roomObj.meta ? roomObj.meta : {};
          const usersCount = typeof roomObj === 'object' && typeof roomObj.usersCount === 'number' ? roomObj.usersCount : undefined;
          const isWaitingRoom = typeof roomObj === 'object' && roomObj.isWaitingRoom === true;
          if (!roomId) continue;
          metaMap[roomId] = { ...meta, isWaitingRoom };
          
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

  function handlePasswordConfirm() {
    if (!passwordModalRoomId) return;
    
    // Kiểm tra mật khẩu
    const meta = roomMetas[passwordModalRoomId] || {};
    if (meta.password && meta.password !== passwordInput) {
      setPasswordModalError("Mật khẩu không đúng.");
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
    setError("");
    handleJoinRoom(roomInput);
  }

  // Ẩn thanh tab khi modal mở
  React.useEffect(() => {
    const tabBar = document.querySelector('.tab-navbar');
    if ((showCreateModal || showPasswordModal) && tabBar) {
      tabBar.classList.add('hidden');
    } else if (tabBar) {
      tabBar.classList.remove('hidden');
    }
    return () => {
      if (tabBar) tabBar.classList.remove('hidden');
    };
  }, [showCreateModal, showPasswordModal]);

  return (
    <div className="w-full flex flex-col items-center bg-neutral-900/50 justify-center">
      {/* Modal tạo phòng */}
      {showCreateModal && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div
          className={`fixed inset-0 z-50 bg-transparent transition-opacity duration-200 ${modalVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ minHeight: '100dvh', minWidth: '100vw', padding: 0 }}
        >
          <div
            className={`bg-gray-900 rounded-xl shadow-2xl flex flex-col sm:flex-row w-full max-w-[98vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] p-2 sm:p-6 box-border transform transition-all duration-200 ${modalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            style={{
              overflowY: 'auto',
              borderRadius: 16,
              position: 'absolute',
              ...(window.innerWidth < 640
                ? {
                    top: 16,
                    left: '50%',
                    width: '90vw',
                    minWidth: '0',
                    maxWidth: '90vw',
                    height: 'auto',
                    maxHeight: '92dvh',
                    padding: 4,
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
            <div className="flex flex-col items-center justify-start w-1/4 px-4 border-r border-gray-700">
              <div className="text-lg font-semibold text-white mb-4">Thể loại</div>
              <button
                className={`mb-2 px-4 py-2 rounded-lg w-full text-white font-bold transition-colors ${modalEvent === '2x2' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => setModalEvent('2x2')}
              >2x2</button>
              <button
                className={`mb-2 px-4 py-2 rounded-lg w-full text-white font-bold transition-colors ${modalEvent === '3x3' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => setModalEvent('3x3')}
              >3x3</button>
              <button
                className={`mb-2 px-4 py-2 rounded-lg w-full text-white font-bold transition-colors ${modalEvent === '4x4' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => setModalEvent('4x4')}
              >4x4</button>
              <button
                className={`px-4 py-2 rounded-lg w-full text-white font-bold transition-colors ${modalEvent === 'pyraminx' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => setModalEvent('pyraminx')}
              >Pyraminx</button>
            </div>
            {/* Cột 2: Chọn chế độ đấu */}
            <div className="flex flex-col items-center justify-start w-1/4 px-4 border-r border-gray-700">
              <div className="text-lg font-semibold text-white mb-4">Chế độ đấu</div>
              <button
                className={`mb-2 px-4 py-2 rounded-lg w-full text-white font-bold transition-colors ${modalGameMode === '1vs1' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => setModalGameMode('1vs1')}
              >1vs1</button>
              <button
                className={`px-4 py-2 rounded-lg w-full text-white font-bold transition-colors ${modalGameMode === '2vs2' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => setModalGameMode('2vs2')}
              >2vs2</button>
            </div>
            {/* Cột 3: Nhập tên phòng, mật khẩu, xác nhận */}
            <div className="flex-1 px-4 flex flex-col justify-between">
              <div>
                <div className="text-lg font-semibold text-white mb-4">Tạo phòng mới</div>
                <div className="mb-3">
                  <label className="block text-gray-300 mb-1">Tên phòng (tối đa 10 ký tự)</label>
                  <input
                    className="w-full px-3 py-2 rounded border border-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    maxLength={10}
                    value={modalRoomName}
                    onChange={e => setModalRoomName(e.target.value)}
                    placeholder="Nhập tên phòng"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-gray-300 mb-1">Mật khẩu (có thể để trống)</label>
                  <input
                    className="w-full px-3 py-2 rounded border border-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    type="password"
                    value={modalPassword}
                    onChange={e => setModalPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-gray-300 mb-1">Nhập lại mật khẩu</label>
                  <input
                    className="w-full px-3 py-2 rounded border border-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    type="password"
                    value={modalPasswordConfirm}
                    onChange={e => setModalPasswordConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                  />
                </div>
                {modalError && <div className="text-red-400 text-sm mb-2">{modalError}</div>}
              </div>
              <div className="flex flex-row justify-end gap-3 mt-4">
                <button
                  className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                  onClick={closeCreateModal}
                >Hủy</button>
                <button
                  className="px-4 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-500 transition-colors"
                  onClick={handleModalConfirm}
                >Xác nhận</button>
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

      <h2 className="text-2xl font-bold mb-6">Phòng giải Rubik Online</h2>
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
      <div className="w-full max-w-3xl mb-8">
        <div className="text-lg font-semibold mb-4 text-center text-white">
          🔴 Phòng đang thi đấu ({competingRooms.length} phòng)
        </div>
        <div className="h-64 overflow-y-auto border border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {loadingRooms ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center animate-pulse">
                  <div className="w-24 h-24 bg-red-900/40 rounded-xl mb-2 flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-300/30 rounded grid place-items-center" />
                  </div>
                  <div className="h-4 w-20 bg-red-300/30 rounded mb-1" />
                </div>
              ))
            ) : (
              competingRooms.map((room: string) => (
                <div
                  key={room}
                  className="flex flex-col items-center transition-transform duration-200 hover:scale-105 hover:shadow-xl"
                >
                  <div className="w-24 h-24 bg-red-800 rounded-xl flex items-center justify-center text-3xl text-gray-100 mb-2 relative">
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
                  <div className="text-base text-gray-200">
                    {roomMetas[room]?.isWaitingRoom ? `Phòng chờ ${room}` : (roomMetas[room]?.displayName || room)}
                  </div>
                  {roomMetas[room]?.gameMode && (
                    <div className="text-xs text-gray-400 mt-1">
                      {roomMetas[room].gameMode === '2vs2' ? '2vs2' : '1vs1'}
                    </div>
                  )}
                  {roomMetas[room]?.isWaitingRoom && (
                    <div className="text-xs text-yellow-400 mt-1">
                      Đang chờ
                    </div>
                  )}
                </div>
              ))
            )}
            {competingRooms.length === 0 && (
              <div className="col-span-full text-center text-white py-8">
                Chưa có phòng nào đang thi đấu
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách phòng đang hoạt động */}
      <div className="w-full max-w-3xl">
        <div className="text-lg font-semibold mb-4 text-center text-white">
          🟢 Phòng đang hoạt động ({activeRooms.length} phòng)
        </div>
        <div className="h-64 overflow-y-auto border border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {/* Nút tạo phòng */}
            <div onClick={openCreateModal} className="flex flex-col items-center cursor-pointer">
              <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center text-5xl text-gray-300 mb-2 hover:bg-gray-600 transition-all">+</div>
              <div className="text-base text-gray-200">Tạo phòng</div>
            </div>
            {/* Hiển thị các phòng đang hoạt động */}
            {loadingRooms ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center animate-pulse">
                  <div className="w-24 h-24 bg-blue-900/40 rounded-xl mb-2 flex items-center justify-center">
                    <div className="w-16 h-16 bg-blue-300/30 rounded grid place-items-center" />
                  </div>
                  <div className="h-4 w-20 bg-blue-300/30 rounded mb-1" />
                </div>
              ))
            ) : (
              activeRooms.map((room: string) => (
                <div
                  key={room}
                  onClick={() => {
                    const meta = roomMetas[room] || {};
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
                  className="flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl"
                >
                  <div className={`w-24 h-24 rounded-xl flex items-center justify-center text-3xl text-gray-100 mb-2 relative ${
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
                  <div className="text-base text-gray-200">
                    {roomMetas[room]?.displayName || room}
                  </div>
                  {roomMetas[room]?.gameMode && (
                    <div className="text-xs text-gray-400 mt-1">
                      {roomMetas[room].gameMode === '2vs2' ? '2vs2' : '1vs1'}
                    </div>
                  )}
                  {roomMetas[room]?.isWaitingRoom && (
                    <div className="text-xs text-yellow-400 mt-1">
                      Đang chờ
                    </div>
                  )}
                </div>
              ))
            )}
            {activeRooms.length === 0 && (
              <div className="col-span-full text-center text-white py-8">
                Chưa có phòng nào đang hoạt động
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
