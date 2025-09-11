import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { roomName } = await request.json();
    
    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    // Daily.co sẽ tự động tạo room khi có người join
    // Chúng ta chỉ cần trả về room URL
    const roomUrl = `https://rubik-app.daily.co/${roomName}`;
    
    return NextResponse.json({ 
      roomUrl,
      roomName,
      message: 'Room created successfully'
    });
    
  } catch (error) {
    console.error('Error creating Daily room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
