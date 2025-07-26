import React, { useState, useEffect } from "react";

type RoomTabProps = {
  roomInput: string;
  setRoomInput: (v: string) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: (roomId: string) => void;
};

export default function RoomTab({ roomInput, setRoomInput, handleCreateRoom, handleJoinRoom }: RoomTabProps) {
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState<string[]>([]);
  const API_BASE = "https://rubik-socket-server-production-3b21.up.railway.app";
  // Lấy danh sách phòng đang hoạt động
  useEffect(() => {
    let stopped = false;
    async function fetchRooms() {
      try {
        const res = await fetch(`${API_BASE}/active-rooms`);
        const roomIds = await res.json();
        if (!Array.isArray(roomIds)) {
          setRooms([]);
          return;
        }
        const filteredRooms: string[] = [];
        for (const roomId of roomIds) {
          try {
            const res = await fetch(`${API_BASE}/room-users/${roomId}`);
            const users = await res.json();
            if (Array.isArray(users) && users.length === 1 && users[0]) {
              filteredRooms.push(roomId);
            }
          } catch {}
        }
        setRooms(filteredRooms);
      } catch {
        setRooms([]);
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

  function handleJoin() {
    const err = validateRoomCode(roomInput);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    handleJoinRoom(roomInput);
  }

  return (
    <div className="w-full flex flex-col items-center justify-center">
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
      {/* Danh sách phòng đang hoạt động */}
      <div className="w-full max-w-3xl">
        <div className="text-lg font-semibold mb-2 text-center">Tổng cộng có {rooms.length} phòng đang hoạt động</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
          {/* Nút tạo phòng */}
          <div onClick={handleCreateRoom} className="flex flex-col items-center cursor-pointer">
            <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center text-5xl text-gray-300 mb-2 hover:bg-gray-600 transition-all">+</div>
            <div className="text-base text-gray-200">Tạo phòng</div>
          </div>
          {/* Hiển thị các phòng */}
          {rooms.map((room, idx) => (
            <div
              key={room}
              onClick={() => handleJoinRoom(room)}
              className="flex flex-col items-center cursor-pointer"
            >
              <div className="w-24 h-24 bg-blue-800 rounded-xl flex items-center justify-center text-3xl text-gray-100 mb-2 relative">
                {/* Icon dạng lưới */}
                <div className="grid grid-cols-3 grid-rows-3 gap-1 w-16 h-16">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="bg-gray-300 rounded-sm w-full h-full opacity-80"></div>
                  ))}
                </div>
                {/* Có thể thêm icon khoá nếu phòng có mật khẩu */}
                {/* <span className="absolute top-1 right-1 text-yellow-300">🔒</span> */}
              </div>
              <div className="text-base text-gray-200">{room}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
