// Khai báo window._roomPassword để tránh lỗi TS
declare global {
  interface Window { _roomPassword?: string }
}
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

type RoomTabProps = {
  roomInput: string;
  setRoomInput: (v: string) => void;
  handleCreateRoom: (event: '2x2' | '3x3', displayName: string, password: string) => void;
  handleJoinRoom: (roomId: string) => void;
};

export default function RoomTab({ roomInput, setRoomInput, handleCreateRoom, handleJoinRoom }: RoomTabProps) {

  // Skeleton loading state
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState("");
  const [activeRooms, setActiveRooms] = useState<string[]>([]);
  const [competingRooms, setCompetingRooms] = useState<string[]>([]);
  // Lưu meta phòng để kiểm tra mật khẩu
  const [roomMetas, setRoomMetas] = useState<Record<string, { password?: string; event?: string; displayName?: string }>>({});

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1); // 1: chọn loại phòng, 2: nhập chi tiết
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEvent, setModalEvent] = useState<'2x2' | '3x3'>("3x3");
  const [modalRoomName, setModalRoomName] = useState("");
  const [modalPassword, setModalPassword] = useState("");
  const [modalPasswordConfirm, setModalPasswordConfirm] = useState("");
  const [modalError, setModalError] = useState("");
  // Modal nhập mật khẩu khi join phòng kín
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [joinPasswordError, setJoinPasswordError] = useState("");
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
        const metaMap: Record<string, { password?: string }> = {};
        for (const roomObj of roomObjs) {
          const roomId = typeof roomObj === 'string' ? roomObj : roomObj.roomId;
          const meta = typeof roomObj === 'object' && roomObj.meta ? roomObj.meta : {};
          if (!roomId) continue;
          metaMap[roomId] = meta;
          try {
            const res = await fetch(`${API_BASE}/room-users/${roomId}`);
            const users = await res.json();
            if (Array.isArray(users) && users.length > 0) {
              if (users.length === 1) {
                active.push(roomId);
              } else if (users.length === 2) {
                competing.push(roomId);
              }
            }
          } catch {}
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

    // Interval để cập nhật danh sách phòng mỗi 3s (không ảnh hưởng đến loading state)
    const interval = setInterval(() => {
      if (!stopped) fetchRooms();
    }, 3000);

    // Lắng nghe sự kiện update-active-rooms từ server để reload danh sách phòng ngay lập tức
    socket = io(API_BASE, { transports: ["websocket"] });
    socket.on("update-active-rooms", () => {
      fetchRooms();
    });

    return () => {
      stopped = true;
      clearTimeout(loadingTimer);
      clearInterval(interval);
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
    setModalStep(1);
    setIsPrivateRoom(false);
    setTimeout(() => setModalVisible(true), 10);
    setModalEvent("3x3");
    setModalRoomName("");
    setModalPassword("");
    setModalPasswordConfirm("");
    setModalError("");
  }

  function closeCreateModal() {
    setModalVisible(false);
    setTimeout(() => setShowCreateModal(false), 200);
    setModalError("");
  }

  function handleModalNext() {
    setModalError("");
    setModalStep(2);
  }

  function handleModalBack() {
    setModalError("");
    setModalStep(1);
  }

  function handleModalConfirm() {
    // Validate room name
    if (!modalRoomName.trim() || modalRoomName.length > 8) {
      setModalError("Tên phòng phải từ 1 đến 8 ký tự.");
      return;
    }
    // Nếu là phòng kín, kiểm tra mật khẩu
    if (isPrivateRoom && (!modalPassword || modalPassword !== modalPasswordConfirm)) {
      setModalError("Mật khẩu không khớp hoặc bị trống.");
      return;
    }
    setModalError("");
    setShowCreateModal(false);
    setModalVisible(false);
    handleCreateRoom(modalEvent, modalRoomName, isPrivateRoom ? modalPassword : "");
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

  return (
    <div className="w-full flex flex-col items-center bg-neutral-900/50 justify-center">
      {/* Modal tạo phòng 2 bước */}
      {showCreateModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-200 ${modalVisible ? 'opacity-100' : 'opacity-0'}`} onClick={e => { if (e.target === e.currentTarget) closeCreateModal(); }}>
          <div className={`bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-2xl flex flex-col md:flex-row transform transition-all duration-200 ${modalVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
            {modalStep === 1 ? (
              // Bước 1: chọn loại phòng
              <div className="flex flex-col items-center w-full gap-4">
                <div className="text-xl font-semibold text-white mb-6">Chọn loại phòng</div>
                <div className="flex flex-col md:flex-row w-full justify-center gap-4">
                  <button onClick={() => { setIsPrivateRoom(false); setModalStep(2); }} className="flex-1 p-6 rounded-xl border-2 border-green-500 bg-green-500/20 hover:bg-green-500/40 transition-colors duration-200">
                    <div className="text-2xl font-bold text-green-300">Phòng mở</div>
                    <div className="text-sm text-gray-400 mt-1">Ai cũng có thể vào</div>
                  </button>
                  <button onClick={() => { setIsPrivateRoom(true); setModalStep(2); }} className="flex-1 p-6 rounded-xl border-2 border-red-500 bg-red-500/20 hover:bg-red-500/40 transition-colors duration-200">
                    <div className="text-2xl font-bold text-red-300">Phòng kín</div>
                    <div className="text-sm text-gray-400 mt-1">Yêu cầu mã phòng để vào.</div>
                  </button>
                </div>
                <button className="mt-6 modal-button modal-button-cancel px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500" onClick={closeCreateModal}>Hủy</button>
              </div>
            ) : (
              // Bước 2: nhập chi tiết phòng
              <div className="flex-1 flex flex-col justify-between w-full">
                <div className="text-lg font-semibold text-white mb-4 text-center">Tạo phòng mới</div>
                <div className="flex flex-col items-center justify-start w-full mb-4">
                  <div className="text-sm font-semibold text-gray-400 mb-2">Thể loại</div>
                  <div className="flex gap-4">
                    <button className={`px-4 py-2 rounded-lg w-full text-white font-bold transition-colors ${modalEvent === '2x2' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`} onClick={() => setModalEvent('2x2')}>2x2</button>
                    <button className={`px-4 py-2 rounded-lg w-full text-white font-bold transition-colors ${modalEvent === '3x3' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`} onClick={() => setModalEvent('3x3')}>3x3</button>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-gray-300 mb-1">Tên phòng (tối đa 8 ký tự)</label>
                  <input className="w-full px-3 py-2 rounded border border-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" maxLength={8} value={modalRoomName} onChange={e => setModalRoomName(e.target.value)} placeholder="Nhập tên phòng" />
                </div>
                {isPrivateRoom && (
                  <>
                    <div className="mb-3">
                      <label className="block text-gray-300 mb-1">Mật khẩu</label>
                      <input className="w-full px-3 py-2 rounded border border-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" type="password" value={modalPassword} onChange={e => setModalPassword(e.target.value)} placeholder="Nhập mật khẩu" />
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-300 mb-1">Nhập lại mật khẩu</label>
                      <input className="w-full px-3 py-2 rounded border border-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" type="password" value={modalPasswordConfirm} onChange={e => setModalPasswordConfirm(e.target.value)} placeholder="Nhập lại mật khẩu" />
                    </div>
                  </>
                )}
                {modalError && <div className="text-red-400 text-sm mb-2">{modalError}</div>}
                <div className="flex flex-row justify-end gap-3 mt-4">
                  <button className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500 transition-colors" onClick={handleModalBack}>Quay lại</button>
                  <button className="px-4 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-500 transition-colors" onClick={handleModalConfirm}>Xác nhận</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal nhập mật khẩu khi vào phòng kín */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={e => { if (e.target === e.currentTarget) setShowPasswordModal(false); }}>
          <div className="bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-sm flex flex-col">
            <div className="text-xl font-semibold text-white mb-4 text-center">Nhập mật khẩu</div>
            <div className="text-gray-300 mb-2 text-center">Phòng này yêu cầu mật khẩu.</div>
            <input type="password" className="w-full px-3 py-2 rounded border border-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} placeholder="Nhập mật khẩu" />
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500" onClick={() => { setShowPasswordModal(false); setJoinPassword(""); setJoinPasswordError(""); }}>Hủy</button>
              <button className="px-4 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-500" onClick={() => {
                if (joiningRoom && joinPassword === (roomMetas[joiningRoom]?.password || "")) {
                  window._roomPassword = joinPassword;
                  setShowPasswordModal(false);
                  setJoinPassword("");
                  setJoinPasswordError("");
                  handleJoinRoom(joiningRoom);
                } else {
                  setJoinPasswordError("Mật khẩu không đúng!");
                  setJoinPassword("");
                }
              }}>Xác nhận</button>
            </div>
            {joinPasswordError && <div className="text-red-400 text-sm mt-2 text-center">{joinPasswordError}</div>}
          </div>
        </div>
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
                    {/* Icon dạng lưới: 2x2 nếu là phòng 2x2, 3x3 nếu là phòng 3x3 */}
                    {roomMetas[room] && roomMetas[room].event && typeof roomMetas[room].event === 'string' && roomMetas[room].event.includes('2x2') ? (
                      <div className="grid grid-cols-2 grid-rows-2 gap-1 w-16 h-16">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="bg-red-300 rounded-sm w-full h-full opacity-80"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-16 h-16">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="bg-red-300 rounded-sm w-full h-full opacity-80"></div>
                        ))}
                      </div>
                    )}
                    {/* Icon thi đấu hoặc ổ khóa nếu có mật khẩu */}
                    {roomMetas[room]?.password ? (
                      <span className="absolute top-1 right-1 text-orange-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14h4a1 1 0 010 2h-4v2a1 1 0 11-2 0v-2H6a1 1 0 110-2h4a1 1 0 01.743-.743A6 6 0 1118 8zM6 8a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="absolute top-1 right-1 text-yellow-300"></span>
                    )}
                  </div>
                  <div className="text-base text-gray-200">{roomMetas[room] && roomMetas[room].displayName ? roomMetas[room].displayName : room}</div>
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
                    if (meta.password) {
                      setJoiningRoom(room);
                      setShowPasswordModal(true);
                      setJoinPassword("");
                      setJoinPasswordError("");
                    } else {
                      handleJoinRoom(room);
                    }
                  }}
                  className="flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl"
                >
                  <div className="w-24 h-24 bg-blue-800 rounded-xl flex items-center justify-center text-3xl text-gray-100 mb-2 relative">
                    {/* Icon dạng lưới: 2x2 nếu là phòng 2x2, 3x3 nếu là phòng 3x3 */}
                    {roomMetas[room] && roomMetas[room].event && typeof roomMetas[room].event === 'string' && roomMetas[room].event.includes('2x2') ? (
                      <div className="grid grid-cols-2 grid-rows-2 gap-1 w-16 h-16">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="bg-gray-300 rounded-sm w-full h-full opacity-80"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 grid-rows-3 gap-1 w-16 h-16">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="bg-gray-300 rounded-sm w-full h-full opacity-80"></div>
                        ))}
                      </div>
                    )}
                    {/* Icon ổ khóa nếu có mật khẩu, icon xanh nếu không */}
                    {roomMetas[room]?.password ? (
                      <span className="absolute top-1 right-1 text-orange-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14h4a1 1 0 010 2h-4v2a1 1 0 11-2 0v-2H6a1 1 0 110-2h4a1 1 0 01.743-.743A6 6 0 1118 8zM6 8a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="absolute top-1 right-1 text-green-300"></span>
                    )}
                  </div>
                  <div className="text-base text-gray-200">{roomMetas[room] && roomMetas[room].displayName ? roomMetas[room].displayName : room}</div>
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
