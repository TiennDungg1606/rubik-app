export async function POST(request) {
  try {
    const { roomId, gameMode, event, displayName, password } = await request.json();
    
    // Gọi đến socket server để tạo waiting room
    const response = await fetch(`${process.env.SOCKET_SERVER_URL || 'https://rubik-socket-server-production-3b21.up.railway.app'}/create-waiting-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        gameMode,
        event,
        displayName,
        password
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return Response.json(data);
    } else {
      console.error('Failed to create waiting room on socket server');
      return Response.json({ error: 'Failed to create waiting room' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating waiting room:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
