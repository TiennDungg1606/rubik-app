import { NextResponse } from "next/server";
import { sendResetPasswordEmail } from "@/lib/mailer";
import dbConnect from "@/lib/dbConnect";
import ResetToken from "@/lib/resetTokenModel";

export async function POST(req) {
  const { email } = await req.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
  }
  await dbConnect();
  // Xóa token cũ nếu có
  await ResetToken.deleteMany({ email });
  // Sinh token mới
  const token = Math.random().toString(36).substring(2) + Date.now();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 phút
  await ResetToken.create({ email, token, expiresAt });
  const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  try {
    await sendResetPasswordEmail(email, resetLink);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Không gửi được email. Vui lòng thử lại." }, { status: 500 });
  }
}
