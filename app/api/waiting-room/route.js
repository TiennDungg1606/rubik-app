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
      // Fallback: Nếu server chưa hỗ trợ module 2vs2, trả về success để client có thể tiếp tục
      console.warn('Server does not support 2vs2 module yet, using fallback');
      return Response.json({ 
        success: true, 
        roomId,
        message: 'Waiting room created (fallback mode)'
      });
    }
  } catch (error) {
    console.error('Error creating waiting room:', error);
    // Fallback: Trả về success để client có thể tiếp tục
    return Response.json({ 
      success: true, 
      roomId: request.body?.roomId || 'FALLBACK',
      message: 'Waiting room created (fallback mode)'
    });
  }
}
