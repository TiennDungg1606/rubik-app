import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import User from "@/lib/userModel";

async function persistFriendship(userA: string, userB: string) {
  await dbConnect();
  await Promise.all([
    User.updateOne({ _id: userA }, { $addToSet: { friends: userB } }),
    User.updateOne({ _id: userB }, { $addToSet: { friends: userA } })
  ]);
}

export async function POST(request: Request) {
  const expectedSecret = process.env.PRESENCE_SECRET;
  if (expectedSecret) {
    const incomingSecret = request.headers.get("x-presence-secret") || "";
    if (incomingSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const fromUserId = typeof body.fromUserId === "string" ? body.fromUserId.trim() : "";
  const toUserId = typeof body.toUserId === "string" ? body.toUserId.trim() : "";
  if (!fromUserId || !toUserId) {
    return NextResponse.json({ error: "Missing users" }, { status: 400 });
  }

  if (fromUserId === toUserId) {
    return NextResponse.json({ error: "Cannot friend self" }, { status: 400 });
  }

  try {
    await persistFriendship(fromUserId, toUserId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to persist friendship", error);
    return NextResponse.json({ error: "Failed to persist friendship" }, { status: 500 });
  }
}
