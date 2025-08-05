
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/userModel';

export async function POST(req) {
  const { email, password, firstName, lastName, birthday, recaptchaToken } = await req.json();
  if (!email || !password || !firstName || !lastName || !birthday || !recaptchaToken) {
    return new Response(JSON.stringify({ error: 'Missing fields or captcha' }), { status: 400 });
  }
  // Xác thực reCAPTCHA với Google
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return new Response(JSON.stringify({ error: 'Captcha server error' }), { status: 500 });
  }
  const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${secret}&response=${recaptchaToken}`
  });
  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    return new Response(JSON.stringify({ error: 'Captcha verification failed' }), { status: 400 });
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
