

import { io, Socket } from "socket.io-client";

let socket: Socket;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("https://rubik-socket-server-production.up.railway.app", {
      transports: ["websocket"], // bắt buộc nếu Railway chặn polling
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

