import dbConnect from '@/lib/dbConnect';
import User from '@/lib/userModel';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function PATCH(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/token=([^;]+)/);
  if (!match) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    await dbConnect();
    const { firstName, lastName } = await req.json();
    if (!firstName || !lastName) {
      return new Response(JSON.stringify({ error: 'Missing firstName or lastName' }), { status: 400 });
    }
    const user = await User.findByIdAndUpdate(
      payload.userId,
      { firstName, lastName },
      { new: true }
    ).select('-password');
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    return new Response(JSON.stringify({ user }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }
}




