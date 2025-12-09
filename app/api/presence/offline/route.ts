import { NextResponse } from "next/server";

import { markPresenceOffline } from "@/lib/presenceService";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    await markPresenceOffline(userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Presence offline proxy failed", error);
    return NextResponse.json(
      { message: "Failed to forward offline notification" },
      { status: 502 }
    );
  }
}
