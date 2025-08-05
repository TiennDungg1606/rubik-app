import dbConnect from '@/lib/dbConnect';
import User from '@/lib/userModel';

export async function POST(req) {
  const { email, password, firstName, lastName, birthday } = await req.json();
  if (!email || !password || !firstName || !lastName || !birthday) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }
  await dbConnect();
  const existing = await User.findOne({ email });
  if (existing) {
    return new Response(JSON.stringify({ error: 'Email already exists' }), { status: 409 });
  }
  const user = new User({ email, password, firstName, lastName, birthday });
  await user.save();
  return new Response(JSON.stringify({ success: true }), { status: 201 });
}
