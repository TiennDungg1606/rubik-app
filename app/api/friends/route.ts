import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import User from "@/lib/userModel";
import { type PresenceStatus } from "@/lib/presenceService";
import { extractUserId } from "./utils";

type FriendPayload = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar: string;
  goal33: string;
  status: PresenceStatus | "offline";
  lastSeen: number | null;
};

type PresenceRecord = {
  userId: string;
  status: PresenceStatus | "offline";
  lastSeen: number;
  metadata: Record<string, unknown> | null;
};

export async function GET(request: Request) {
  const userId = extractUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await dbConnect();
    const userDoc = await User.findById(userId).select("friends");

    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const friendsField: Array<{ toString: () => string } | string> = Array.isArray(userDoc.friends)
      ? userDoc.friends
      : [];

    const friendIds = Array.from(
      new Set(
        friendsField
          .map((entry) => {
            try {
              return typeof entry === "string" ? entry : entry.toString();
            } catch {
              return null;
            }
          })
          .filter((value): value is string => Boolean(value))
      )
    );

    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [] }, { status: 200 });
    }

    const friendDocs = await User.find(
      { _id: { $in: friendIds } }
    )
      .select("firstName lastName username avatar goal33")
      .lean()
      .exec();

    // NOTE: Presence data is now fetched via WebSocket on client-side to avoid FOT
    // Server only returns friend profile data, presence will be merged client-side

    const orderedDocs = friendIds
      .map((id) => friendDocs.find((doc) => doc?._id?.toString() === id))
      .filter((doc): doc is typeof friendDocs[number] => Boolean(doc));

    const payload: FriendPayload[] = orderedDocs.map((doc) => {
      const id = doc._id?.toString() || "";
      return {
        id,
        firstName: doc.firstName || "",
        lastName: doc.lastName || "",
        username: doc.username || "",
        avatar: doc.avatar || "",
        goal33: doc.goal33 || "",
        status: "offline" as const, // Default to offline, will be updated via WebSocket
        lastSeen: null
      };
    });

    const sorted = payload.sort((a, b) => {
      const statusRank = (status: FriendPayload["status"]) => {
        switch (status) {
          case "online":
            return 0;
          case "away":
            return 1;
          case "busy":
            return 2;
          default:
            return 3;
        }
      };
      const diff = statusRank(a.status) - statusRank(b.status);
      if (diff !== 0) return diff;
      return (b.lastSeen || 0) - (a.lastSeen || 0);
    });

    return NextResponse.json({ friends: sorted }, { status: 200 });
  } catch (error) {
    console.error("Failed to load friends", error);
    return NextResponse.json({ error: "Failed to load friends" }, { status: 500 });
  }
}
