import jwt from 'jsonwebtoken';
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/userModel";

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/token=([^;]+)/);
  if (!match) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    const { image } = await req.json();
    
    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Invalid image" }), { status: 400 });
    }
    
    await dbConnect();
    await User.updateOne(
      { _id: payload.userId },
      { $set: { customBg: image } }
    );
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Custom background upload error:', error);
    return new Response(JSON.stringify({ error: "Invalid token or server error" }), { status: 401 });
  }
}

export async function DELETE(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/token=([^;]+)/);
  if (!match) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    await dbConnect();
    await User.updateOne(
      { _id: payload.userId },
      { $unset: { customBg: 1 } }
    );
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Custom background delete error:', error);
    return new Response(JSON.stringify({ error: "Invalid token or server error" }), { status: 401 });
  }
}
