import React, { useState, useEffect } from "react";

type RoomTabProps = {
  roomInput: string;
  setRoomInput: (v: string) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: (roomId: string) => void;
};

export default function RoomTab({ roomInput, setRoomInput, handleCreateRoom, handleJoinRoom }: RoomTabProps) {
  const [error, setError] = useState("");
  const [activeRooms, setActiveRooms] = useState<string[]>([]);
  const [competingRooms, setCompetingRooms] = useState<string[]>([]);
  const [roomSpectators, setRoomSpectators] = useState<{[key: string]: number}>({});
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
        const roomIds = await res.json();
        if (!Array.isArray(roomIds)) {
          setActiveRooms([]);
          setCompetingRooms([]);
          return;
        }
        
        const active: string[] = [];
        const competing: string[] = [];
        
        for (const roomId of roomIds) {
          try {
            const res = await fetch(`${API_BASE}/room-users/${roomId}`);
            const users = await res.json();
            if (Array.isArray(users) && users.length > 0) {
              // Phòng có 1 người = đang hoạt động (chờ người thứ 2)
              if (users.length === 1) {
                active.push(roomId);
              }
              // Phòng có 2 người = đang thi đấu
              else if (users.length === 2) {
                competing.push(roomId);
              }
            }
          } catch {}
        }
        
        setActiveRooms(active);
        setCompetingRooms(competing);
        
        // Lấy số lượng spectator cho các phòng đang thi đấu
        const spectatorCounts: {[key: string]: number} = {};
        for (const roomId of competing) {
          try {
            const res = await fetch(`${API_BASE}/room-spectators/${roomId}`);
            const spectators = await res.json();
            if (Array.isArray(spectators)) {
              spectatorCounts[roomId] = spectators.length;
            }
          } catch {}
        }
        setRoomSpectators(spectatorCounts);
      } catch {
        setActiveRooms([]);
        setCompetingRooms([]);
        setRoomSpectators({});
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
          🏆 Phòng đang thi đấu ({competingRooms.length} phòng)
        </div>
        <div className="h-64 overflow-y-auto border border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
            {competingRooms.map((room: string) => (
              <div
                key={room}
                // onClick={() => handleJoinRoom(room)} // Tạm thời vô hiệu hóa
                className="flex flex-col items-center cursor-not-allowed opacity-60" // Thay đổi style để thể hiện không thể click
              >
                <div className="w-24 h-24 bg-red-800 rounded-xl flex items-center justify-center text-3xl text-gray-100 mb-2 relative">
                  {/* Icon dạng lưới với màu đỏ */}
                  <div className="grid grid-cols-3 grid-rows-3 gap-1 w-16 h-16">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="bg-red-300 rounded-sm w-full h-full opacity-80"></div>
                    ))}
                  </div>
                  {/* Icon thi đấu */}
                  <span className="absolute top-1 right-1 text-yellow-300">⚡</span>
                  {/* Số lượng spectator */}
                  {roomSpectators[room] > 0 && (
                    <span className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-50 text-white px-1 rounded">
                      👁️ {roomSpectators[room]}/5
                    </span>
                  )}
                </div>
                <div className="text-base text-gray-200">{room}</div>
                <div className="text-xs text-gray-400 mt-1">(Tạm thời khóa)</div>
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
          🔵 Phòng đang hoạt động ({activeRooms.length} phòng)
        </div>
        <div className="h-64 overflow-y-auto border border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
            {/* Nút tạo phòng */}
            <div onClick={handleCreateRoom} className="flex flex-col items-center cursor-pointer">
              <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center text-5xl text-gray-300 mb-2 hover:bg-gray-600 transition-all">+</div>
              <div className="text-base text-gray-200">Tạo phòng</div>
            </div>
            {/* Hiển thị các phòng đang hoạt động */}
            {activeRooms.map((room: string) => (
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
                  {/* Icon chờ người */}
                  <span className="absolute top-1 right-1 text-green-300">👤</span>
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
