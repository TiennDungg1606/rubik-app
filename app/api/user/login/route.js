import dbConnect from '@/lib/dbConnect';
import User from '@/lib/userModel';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function POST(req) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }
  await dbConnect();
  const user = await User.findOne({ email });
  if (!user) {
    return new Response(JSON.stringify({ error: 'Tài khoản hoặc mật khẩu không đúng' }), { status: 401 });
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return new Response(JSON.stringify({ error: 'Tài khoản hoặc mật khẩu không đúng' }), { status: 401 });
  }
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
  // Trả về userId và thông tin user cho frontend
  return new Response(JSON.stringify({
    success: true,
    user: {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      birthday: user.birthday
    },
    userId: user._id
  }), {
    status: 200,
    headers: {
      'Set-Cookie': `token=${token}; Path=/; HttpOnly; Max-Age=604800; SameSite=Lax`
    }
  });
}
