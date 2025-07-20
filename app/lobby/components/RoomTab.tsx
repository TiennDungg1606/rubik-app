import React, { useState } from "react";

type RoomTabProps = {
  roomInput: string;
  setRoomInput: (v: string) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: () => void;
};

export default function RoomTab({ roomInput, setRoomInput, handleCreateRoom, handleJoinRoom }: RoomTabProps) {
  const [error, setError] = useState("");

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
    handleJoinRoom();
  }

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-6">Phòng giải Rubik Online</h2>
      <div className="flex flex-col gap-4 w-full max-w-md bg-gray-800 rounded-xl p-8 shadow-lg">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
          onClick={handleCreateRoom}
        >
          Tạo phòng mới
        </button>
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
    </div>
  );
}
