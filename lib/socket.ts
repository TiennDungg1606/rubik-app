

import { io, Socket } from "socket.io-client";

let socket: Socket;

export function getSocket(): Socket {
  if (!socket) {
  // Sử dụng biến môi trường SOCKET_SERVER_URL
  const serverUrl = process.env.SOCKET_SERVER_URL || "http://localhost:3001";
  socket = io(serverUrl, {
      transports: ["websocket"], // required if Railway blocks polling
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connect error:", err.message);
    });
  }

  return socket;
}

