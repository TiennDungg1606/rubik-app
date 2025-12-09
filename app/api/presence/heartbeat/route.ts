import { NextResponse } from "next/server";

import { sendPresenceHeartbeat } from "@/lib/presenceService";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    const payload = {
      userId,
      status: body.status,
      ttlMs: body.ttlMs,
      metadata: body.metadata
    };

    const response = await sendPresenceHeartbeat(payload);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Presence heartbeat proxy failed", error);
    return NextResponse.json(
      { message: "Failed to forward presence heartbeat" },
      { status: 502 }
    );
  }
}
