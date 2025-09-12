import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { roomId, gameMode = '1vs1', event = '3x3', displayName = 'Room' } = await request.json();
    
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Lấy API key từ environment variables
    const apiKey = process.env.DAILY_API_KEY_1 || process.env.DAILY_API_KEY_2;
    if (!apiKey) {
      return NextResponse.json({ error: 'Daily.co API key not configured' }, { status: 500 });
    }

    // Tạo room trên Daily.co với cấu hình đơn giản theo tài liệu
    const roomConfig = {
      name: roomId,
      privacy: 'public',
      properties: {
        start_audio_off: false,
        start_video_off: false,
        max_participants: gameMode === '2vs2' ? 4 : 2
      }
    };

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(roomConfig)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Daily.co API error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to create room on Daily.co',
        details: errorData 
      }, { status: response.status });
    }

    const roomData = await response.json();
    
    return NextResponse.json({ 
      roomUrl: roomData.url,
      roomName: roomData.name,
      gameMode,
      event,
      displayName
    });
  } catch (error) {
    console.error('Error creating daily room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
