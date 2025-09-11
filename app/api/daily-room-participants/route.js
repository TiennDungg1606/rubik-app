import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get('roomName');
    
    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    // Lấy thông tin participants từ Daily.co
    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Daily.co API error:', error);
      return NextResponse.json({ error: 'Failed to get room info' }, { status: 500 });
    }

    const roomData = await response.json();
    
    return NextResponse.json({ 
      roomName,
      participants: roomData.participants || [],
      participantCount: roomData.participants ? roomData.participants.length : 0,
      roomData
    });
    
  } catch (error) {
    console.error('Error getting room participants:', error);
    return NextResponse.json({ error: 'Failed to get participants' }, { status: 500 });
  }
}
