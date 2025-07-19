
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

function generateRoomId() {
  // Simple random 6-character alphanumeric
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Lobby() {
  const [roomInput, setRoomInput] = useState("");
  const router = useRouter();

  const handleCreateRoom = () => {
    const roomId = generateRoomId();
    router.push(`/room/${roomId}`);
  };

  const handleJoinRoom = () => {
    if (roomInput.trim()) {
      router.push(`/room/${roomInput.trim().toUpperCase()}`);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-black text-white px-4 font-sans">
      <h1 className="text-3xl font-bold mb-8 text-center">Chọn chế độ</h1>
      <button
        className="bg-blue-500 px-8 py-3 rounded-xl hover:bg-blue-600 transition-colors font-medium mb-8"
        onClick={handleCreateRoom}
      >
        Tạo phòng
      </button>
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <input
          className="w-full px-4 py-2 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="text"
          placeholder="Nhập mã phòng..."
          value={roomInput}
          onChange={e => setRoomInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleJoinRoom(); }}
        />
        <button
          className="bg-green-500 w-full py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
          onClick={handleJoinRoom}
        >
          Tham gia
        </button>
      </div>
    </main>
  );
}
