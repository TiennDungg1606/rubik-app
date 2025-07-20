import { NextResponse } from "next/server";

export async function POST() {
  // Xóa cookie token
  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Set-Cookie": `token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    },
  });
}
