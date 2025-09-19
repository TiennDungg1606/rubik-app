// API route: /api/room-meta/[roomId]
// Trả về meta phòng từ socket-server

export async function GET(req, { params }) {
  const { roomId } = params;
  const API_BASE = process.env.NODE_ENV === 'development'
    ? 'https://rubik-socket-server-production-3b21.up.railway.app'
    : 'https://rubik-socket-server-production-3b21.up.railway.app';
  try {
    const res = await fetch(`${API_BASE}/room-meta/${roomId.toUpperCase()}`);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
