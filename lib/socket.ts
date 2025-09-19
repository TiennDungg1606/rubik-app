

import { io, Socket } from "socket.io-client";
import { getSocketUrl } from "./socketConfig";

let socket1vs1: Socket;
let socket2vs2: Socket;

export function getSocket(gameMode: '1vs1' | '2vs2' = '1vs1'): Socket {
  if (gameMode === '2vs2') {
    if (!socket2vs2) {
      const serverUrl = getSocketUrl('2vs2');
      console.log(`🔌 Connecting to 2vs2 server: ${serverUrl}`);
      
      socket2vs2 = io(serverUrl, {
        transports: ["websocket"],
      });

      socket2vs2.on("connect", () => {
        console.log("✅ 2vs2 Socket connected:", socket2vs2.id);
      });

      socket2vs2.on("connect_error", (err) => {
        console.error("❌ 2vs2 Socket connect error:", err.message);
      });
    }
    return socket2vs2;
  } else {
    if (!socket1vs1) {
      const serverUrl = getSocketUrl('1vs1');
      console.log(`🔌 Connecting to 1vs1 server: ${serverUrl}`);
      
      socket1vs1 = io(serverUrl, {
        transports: ["websocket"],
      });

      socket1vs1.on("connect", () => {
        console.log("✅ 1vs1 Socket connected:", socket1vs1.id);
      });

      socket1vs1.on("connect_error", (err) => {
        console.error("❌ 1vs1 Socket connect error:", err.message);
      });
    }
    return socket1vs1;
  }
}

// Hàm disconnect tất cả socket
export function disconnectAllSockets(): void {
  if (socket1vs1) {
    socket1vs1.disconnect();
    socket1vs1 = null as any;
  }
  if (socket2vs2) {
    socket2vs2.disconnect();
    socket2vs2 = null as any;
  }
}

