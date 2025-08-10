import dbConnect from '@/lib/dbConnect';
import User from '@/lib/userModel';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/token=([^;]+)/);
  if (!match) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    await dbConnect();
    const { oldPassword, newPassword } = await req.json();
    const user = await User.findById(payload.userId);
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    const matchPwd = await bcrypt.compare(oldPassword, user.password);
    if (!matchPwd) return new Response(JSON.stringify({ error: 'Mật khẩu cũ không đúng' }), { status: 400 });
  user.password = newPassword;
    await user.save();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }
}
