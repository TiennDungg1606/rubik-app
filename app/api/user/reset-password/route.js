import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ResetToken from "@/lib/resetTokenModel";
import User from "@/lib/userModel";
import bcrypt from "bcryptjs";

export async function POST(req) {
  const { token, password } = await req.json();
  if (!token || !password || password.length < 6) {
    return NextResponse.json({ error: "Thiếu token hoặc mật khẩu không hợp lệ." }, { status: 400 });
  }
  await dbConnect();
  const reset = await ResetToken.findOne({ token });
  if (!reset || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token không hợp lệ hoặc đã hết hạn." }, { status: 400 });
  }
  const user = await User.findOne({ email: reset.email });
  if (!user) {
    return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
  }
  user.password = password;
  await user.save();
  await ResetToken.deleteOne({ token });
  return NextResponse.json({ ok: true });
}
