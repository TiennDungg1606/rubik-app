// Khai báo window._roomPassword để tránh lỗi TS
declare global {
  interface Window { _roomPassword?: string }
}
import React, { useState, useEffect } from "react";

type RoomTabProps = {
  roomInput: string;
  setRoomInput: (v: string) => void;
  handleCreateRoom: (event: '2x2' | '3x3', displayName: string, password: string) => void;
  handleJoinRoom: (roomId: string) => void;
};

export default function RoomTab({ roomInput, setRoomInput, handleCreateRoom, handleJoinRoom }: RoomTabProps) {
  const [error, setError] = useState("");
  const [activeRooms, setActiveRooms] = useState<string[]>([]);
  const [competingRooms, setCompetingRooms] = useState<string[]>([]);
  // Lưu meta phòng để kiểm tra mật khẩu
  const [roomMetas, setRoomMetas] = useState<Record<string, { password?: string; event?: string; displayName?: string }>>({});

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalEvent, setModalEvent] = useState<'2x2' | '3x3'>("3x3");
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
  
  // Lấy danh sách phòng và phân loại
  useEffect(() => {
    let stopped = false;
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
        
        // Đã loại bỏ fetch số lượng spectator
      } catch {
        setActiveRooms([]);
        setCompetingRooms([]);
      }
    }
    fetchRooms();
    const interval = setInterval(() => {
      if (!stopped) fetchRooms();
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(interval);
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
    setModalEvent("3x3");
    setModalRoomName("");
    setModalPassword("");
    setModalPasswordConfirm("");
    setModalError("");
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setModalError("");
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
    // Truyền event, tên phòng, mật khẩu cho handleCreateRoom
    handleCreateRoom(modalEvent, modalRoomName, modalPassword);
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
    <div className="w-full flex flex-col items-center justify-center">
      {/* Modal tạo phòng */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-2xl flex flex-row">
            {/* Cột 1: Chọn thể loại rubik */}
            <div className="flex flex-col items-center justify-start w-1/3 pr-4 border-r border-gray-700">
              <div className="text-lg font-semibold text-white mb-4">Thể loại</div>
              <button
                className={`mb-2 px-4 py-2 rounded-lg w-full text-white font-bold transition-colors ${modalEvent === '2x2' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => setModalEvent('2x2')}
              >2x2</button>
              <button
                className={`px-4 py-2 rounded-lg w-full text-white font-bold transition-colors ${modalEvent === '3x3' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => setModalEvent('3x3')}
              >3x3</button>
            </div>
            {/* Cột 2: Nhập tên phòng, mật khẩu, xác nhận */}
            <div className="flex-1 pl-6 flex flex-col justify-between">
              <div>
                <div className="text-lg font-semibold text-white mb-4">Tạo phòng mới</div>
                <div className="mb-3">
                  <label className="block text-gray-300 mb-1">Tên phòng (tối đa 8 ký tự)</label>
                  <input
                    className="w-full px-3 py-2 rounded border border-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    maxLength={8}
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
        </div>
      )}
      <h2 className="text-2xl font-bold mb-6">Phòng giải Rubik Online</h2>
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
      {/* Danh sách phòng đang thi đấu */}
      <div className="w-full max-w-3xl mb-8">
        <div className="text-lg font-semibold mb-4 text-center text-white">
          🔴 Phòng đang thi đấu ({competingRooms.length} phòng)
        </div>
        <div className="h-64 overflow-y-auto border border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
            {competingRooms.map((room: string) => (
              <div
                key={room}
                // onClick={() => handleJoinRoom(room)}
                className="flex flex-col items-center" // Hiển thị bình thường, không làm mờ
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
                  {/* Icon thi đấu */}
                  <span className="absolute top-1 right-1 text-yellow-300"></span>
                </div>
                <div className="text-base text-gray-200">{roomMetas[room] && roomMetas[room].displayName ? roomMetas[room].displayName : room}</div>
                {/* Đã loại bỏ dòng (Tạm thời khóa chế độ xem) */}
              </div>
            ))}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
            {/* Nút tạo phòng */}
            <div onClick={openCreateModal} className="flex flex-col items-center cursor-pointer">
              <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center text-5xl text-gray-300 mb-2 hover:bg-gray-600 transition-all">+</div>
              <div className="text-base text-gray-200">Tạo phòng</div>
            </div>
            {/* Hiển thị các phòng đang hoạt động */}
            {activeRooms.map((room: string) => (
              <div
                key={room}
                onClick={async () => {
                  const meta = roomMetas[room] || {};
                  let password = "";
                  if (meta.password) {
                    password = window.prompt("Phòng này có mật khẩu. Vui lòng nhập mật khẩu để vào:") || "";
                  }
                  // handleJoinRoom cần truyền password nếu có
                  // Nếu handleJoinRoom không nhận password, bạn cần sửa lại hàm này ở App để truyền password vào socket.emit
                  // Ở đây tạm truyền qua window (hoặc sửa lại App để nhận password)
                  window._roomPassword = password;
                  handleJoinRoom(room);
                }}
                className="flex flex-col items-center cursor-pointer"
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
                  {/* Icon chờ người */}
                  <span className="absolute top-1 right-1 text-green-300"></span>
                </div>
                <div className="text-base text-gray-200">{room}</div>
              </div>
            ))}
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
