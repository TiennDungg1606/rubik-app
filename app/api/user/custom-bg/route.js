import jwt from 'jsonwebtoken';
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/userModel";

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req) {
  console.log('[Custom-BG API] POST request received');
  const cookie = req.headers.get('cookie') || '';
  console.log('[Custom-BG API] Cookie:', cookie.substring(0, 100) + '...');
  
  const match = cookie.match(/token=([^;]+)/);
  if (!match) {
    console.log('[Custom-BG API] No token found in cookie');
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  
  try {
    console.log('[Custom-BG API] Token found, verifying...');
    const payload = jwt.verify(match[1], JWT_SECRET);
    console.log('[Custom-BG API] Token verified, userId:', payload.userId);
    
    const { image } = await req.json();
    console.log('[Custom-BG API] Image received, length:', image ? image.length : 0);
    
    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      console.log('[Custom-BG API] Invalid image data');
      return new Response(JSON.stringify({ error: "Invalid image" }), { status: 400 });
    }
    
    console.log('[Custom-BG API] Connecting to database...');
    await dbConnect();
    console.log('[Custom-BG API] Database connected, updating user...');
    
    const result = await User.updateOne(
      { _id: payload.userId },
      { $set: { customBg: image } }
    );
    console.log('[Custom-BG API] Update result:', result);
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('[Custom-BG API] Error:', error);
    return new Response(JSON.stringify({ error: "Invalid token or server error" }), { status: 401 });
  }
}

export async function DELETE(req) {
  console.log('[Custom-BG API] DELETE request received');
  const cookie = req.headers.get('cookie') || '';
  console.log('[Custom-BG API] Cookie:', cookie.substring(0, 100) + '...');
  
  const match = cookie.match(/token=([^;]+)/);
  if (!match) {
    console.log('[Custom-BG API] No token found in cookie');
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  
  try {
    console.log('[Custom-BG API] Token found, verifying...');
    const payload = jwt.verify(match[1], JWT_SECRET);
    console.log('[Custom-BG API] Token verified, userId:', payload.userId);
    
    console.log('[Custom-BG API] Connecting to database...');
    await dbConnect();
    console.log('[Custom-BG API] Database connected, removing customBg...');
    
    const result = await User.updateOne(
      { _id: payload.userId },
      { $unset: { customBg: 1 } }
    );
    console.log('[Custom-BG API] Remove result:', result);
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('[Custom-BG API] Error:', error);
    return new Response(JSON.stringify({ error: "Invalid token or server error" }), { status: 401 });
  }
}
