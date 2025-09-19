// rubik-app/app/api/room/[roomId]/users/route.js

// API route: trả về danh sách user thực tế trong phòng từ socket server
export async function GET(req, { params }) {
  const { roomId } = params;
  // Gọi socket server REST API (giả lập) để lấy danh sách user
  // Giả sử socket server chạy ở https://rubik-socket-server-production-3b21.up.railway.app
  // Lấy URL socket server từ biến môi trường, fallback về localhost nếu chưa cấu hình
  const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL;
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/room-users/${roomId}`, { next: { revalidate: 0 } });
    if (!res.ok) return new Response(JSON.stringify([]), { status: 200 });
    const users = await res.json();
    return Response.json(users);
  } catch (e) {
    return new Response(JSON.stringify([]), { status: 200 });
  }
}
