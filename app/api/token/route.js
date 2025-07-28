import jwt from "jsonwebtoken";

const STRINGEE_API_KEY = process.env.STRINGEE_API_KEY;
const STRINGEE_API_SECRET = process.env.STRINGEE_API_SECRET;
const APP_ID = process.env.STRINGEE_APP_ID;

export async function POST(req) {
  const { userId } = await req.json();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 });
  }
  if (!STRINGEE_API_KEY || !STRINGEE_API_SECRET || !APP_ID) {
    return new Response(JSON.stringify({ error: "Missing Stringee config" }), { status: 500 });
  }
  // Stringee JWT payload
  const payload = {
    jti: `${userId}-${Date.now()}`,
    iss: STRINGEE_API_KEY,
    userId,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    appId: APP_ID,
  };
  const token = jwt.sign(payload, STRINGEE_API_SECRET, { algorithm: "HS256" });
  return new Response(JSON.stringify({ token }), { status: 200 });
}
