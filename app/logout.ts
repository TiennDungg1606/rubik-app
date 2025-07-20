
import { NextResponse } from "next/server";

export async function GET() {
  // Trả về header Set-Cookie để xóa token
  return NextResponse.redirect("/", {
    headers: {
      "Set-Cookie": "token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
    },
  });
}
