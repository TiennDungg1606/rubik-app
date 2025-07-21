import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  // Gọi backend Node.js để lấy accessToken
  const backendUrl = `http://localhost:3001/stringee-token?userId=${encodeURIComponent(userId)}`;
  try {
    const res = await fetch(backendUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Backend error' }, { status: 500 });
    }
    const data = await res.json();
    return NextResponse.json({ accessToken: data.accessToken });
  } catch (err) {
    return NextResponse.json({ error: 'Fetch backend failed' }, { status: 500 });
  }
}
