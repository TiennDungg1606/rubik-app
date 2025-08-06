import dbConnect from '@/lib/dbConnect';
import User from '@/lib/userModel';
import axios from 'axios';

export async function POST(req) {
  const { email, password, firstName, lastName, birthday, "g-recaptcha-response": recaptchaToken } = await req.json();
  if (!email || !password || !firstName || !lastName || !birthday || !recaptchaToken) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }

  // Xác thực reCAPTCHA
  try {
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=6Ld2h5srAAAAAO1J0xKR0OFPcDmwUO7kIHKEPBEx&response=${recaptchaToken}`;
    const response = await axios.post(verifyUrl);
    const data = response.data;
    if (!data.success || (typeof data.score === 'number' && data.score < 0.5)) {
      return new Response(JSON.stringify({ error: 'Captcha verification failed' }), { status: 400 });
    }
  } catch (err) {
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
