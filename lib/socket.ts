

import { io, Socket } from "socket.io-client";

let socket: Socket;

export function getSocket(): Socket {
  if (!socket) {
    // Sử dụng localhost khi development, production server khi production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const serverUrl = isDevelopment 
      ? "https://rubik-socket-server-production-3b21.up.railway.app" 
      : "https://rubik-socket-server-production-3b21.up.railway.app";
    
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

