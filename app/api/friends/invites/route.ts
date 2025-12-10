import { NextResponse } from "next/server";

import { fetchFriendInvites, sendFriendInviteRequest } from "@/lib/presenceService";
import { extractUserId } from "../utils";

type Direction = "incoming" | "outgoing" | "all";
type InviteStatusFilter = "pending" | "accepted" | "declined";

function normalizeDirection(raw: string | null): Direction {
  if (raw === "incoming" || raw === "all" || raw === "outgoing") {
    return raw;
  }
  return "outgoing";
}

function normalizeStatus(raw: string | null): InviteStatusFilter {
  if (raw === "accepted" || raw === "declined" || raw === "pending") {
    return raw;
  }
  return "pending";
}

export async function GET(request: Request) {
  const userId = extractUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const direction = normalizeDirection(searchParams.get("direction"));
  const status = normalizeStatus(searchParams.get("status"));

  try {
    const data = await fetchFriendInvites({ userId, direction, status });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Failed to load invites", error);
    return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = extractUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
  const targetDisplayName = typeof body.targetDisplayName === "string" ? body.targetDisplayName.trim() : "";
  if (!targetUserId || !targetDisplayName) {
    return NextResponse.json({ error: "Missing target user" }, { status: 400 });
  }
  if (targetUserId === userId) {
    return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
  }

  const requesterDisplayName =
    typeof body.requesterDisplayName === "string" && body.requesterDisplayName.trim().length > 0
      ? body.requesterDisplayName.trim()
      : "Người chơi";
  const requesterAvatar = typeof body.requesterAvatar === "string" ? body.requesterAvatar : null;
  const targetAvatar = typeof body.targetAvatar === "string" ? body.targetAvatar : null;
  const requesterGoal33 = typeof body.requesterGoal33 === "string" ? body.requesterGoal33 : null;
  const targetGoal33 = typeof body.targetGoal33 === "string" ? body.targetGoal33 : null;

  try {
    const data = await sendFriendInviteRequest({
      requesterId: userId,
      requesterDisplayName,
      requesterAvatar,
      requesterGoal33,
      targetUserId,
      targetDisplayName,
      targetAvatar,
      targetGoal33
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Failed to send friend invite", error);
    return NextResponse.json({ error: "Failed to send friend invite" }, { status: 500 });
  }
}
