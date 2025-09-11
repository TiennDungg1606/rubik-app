import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { roomName } = await request.json();
    
    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    // Tạo room thật trên Daily.co
    const response = await fetch(`https://api.daily.co/v1/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          max_participants: 100,
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: false,
          enable_transcription: false,
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Daily.co API error:', error);
      return NextResponse.json({ error: 'Failed to create room on Daily.co' }, { status: 500 });
    }

    const roomData = await response.json();
    const roomUrl = `https://rubik-app.daily.co/${roomName}`;
    
    return NextResponse.json({ 
      roomUrl,
      roomName,
      roomData,
      message: 'Room created successfully on Daily.co'
    });
    
  } catch (error) {
    console.error('Error creating Daily room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
