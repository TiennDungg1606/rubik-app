import { NextRequest, NextResponse } from 'next/server';
// Thay thế trực tiếp mảng dailyAccounts bằng 2 key mới
const dailyAccounts = [
  { apiKey: 'bcf5e293357d48ffd88210a91a9eb12428536762493175b4bb9c921691abf717' },
  { apiKey: 'f38963c77927e439d412a9d07e493cf2cfa33b3e8fa7bacdb04f7f5dd1c8e100' }, // Thay bằng key thứ hai bạn lấy từ tài khoản khác
];

// Helper to pick a Daily account (round-robin or random)
let lastIndex = 0;
function pickAccount() {
  lastIndex = (lastIndex + 1) % dailyAccounts.length;
  return dailyAccounts[lastIndex];
}

export async function POST(req: NextRequest) {
  const account = pickAccount();
  if (!account.apiKey) {
    return NextResponse.json({ error: 'No Daily API key configured' }, { status: 500 });
  }
  // Create a new Daily room
  const resp = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${account.apiKey}`,
    },
    body: JSON.stringify({
      properties: {
        enable_chat: false,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
        max_participants: 2,
      },
    }),
  });
  const data = await resp.json();
  if (!resp.ok || !data.url) {
    return NextResponse.json({ error: data.error || 'Failed to create room' }, { status: 500 });
  }
  return NextResponse.json({ room_url: data.url });
}
