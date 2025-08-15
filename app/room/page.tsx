"use client"
import React, { useState } from "react";
import RoomTab from "../lobby/components/RoomTab";

export default function RoomPage() {
  // State and handlers for RoomTab
  const [roomInput, setRoomInput] = useState("");

  // Handler to create a room
  const handleCreateRoom = (event: '2x2' | '3x3', displayName: string, password: string) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('justCreatedRoom', roomId);
      sessionStorage.setItem(`roomMeta_${roomId}`, JSON.stringify({ event, displayName, password }));
    }
    window.location.href = `/room/${roomId}`;
  };

  // Handler to join a room
  const handleJoinRoom = (roomId: string) => {
    const code = roomId.trim().toUpperCase();
    if (!code) return;
    let password = "";
    if (typeof window !== "undefined" && window._roomPassword) {
      password = window._roomPassword;
      sessionStorage.setItem(`roomPassword_${code}`, password);
      delete window._roomPassword;
    }
    window.location.href = `/room/${code}`;
  };

  return (
    <main className="flex flex-col items-center justify-start min-h-screen text-white px-4 font-sans bg-black">
      <div className="w-full max-w-2xl mx-auto mt-8">
        <RoomTab
          roomInput={roomInput}
          setRoomInput={setRoomInput}
          handleCreateRoom={handleCreateRoom}
          handleJoinRoom={handleJoinRoom}
        />
      </div>
    </main>
  );
}
