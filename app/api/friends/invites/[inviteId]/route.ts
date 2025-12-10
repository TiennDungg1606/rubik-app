import { NextResponse } from "next/server";

import { fetchFriendInvites, updateFriendInviteStatus } from "@/lib/presenceService";
import { extractUserId } from "../../utils";

type InviteAction = "accept" | "decline";

function normalizeAction(raw: string | null): InviteAction | null {
  if (raw === "accept" || raw === "decline") {
    return raw;
  }
  return null;
}

export async function PATCH(request: Request, context: { params: { inviteId: string } }) {
  const userId = extractUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const inviteId = context.params?.inviteId;
  if (!inviteId) {
    return NextResponse.json({ error: "Invite ID required" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const action = normalizeAction(typeof body.action === "string" ? body.action : null);
  if (!action) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const targetStatus = action === "accept" ? "accepted" : "declined";
    const updateResult = await updateFriendInviteStatus({ inviteId, status: targetStatus, actorUserId: userId });
    const invite = updateResult?.invite;
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Return the caller's current pending invites for convenience
    const refreshed = await fetchFriendInvites({ userId, direction: "incoming", status: "pending" });
    return NextResponse.json({ invite, invites: refreshed?.invites ?? [] }, { status: 200 });
  } catch (error) {
    console.error("Failed to update invite", error);
    return NextResponse.json({ error: "Failed to update invite" }, { status: 500 });
  }
}
