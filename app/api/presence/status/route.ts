import { NextResponse } from "next/server";

import { fetchPresenceBulk } from "@/lib/presenceService";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawIds = url.searchParams.get("userIds");

  if (!rawIds) {
    return NextResponse.json({ message: "Provide userIds query param" }, { status: 400 });
  }

  const userIds = rawIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (userIds.length === 0) {
    return NextResponse.json({ message: "Provide at least one userId" }, { status: 400 });
  }

  try {
    const users = await fetchPresenceBulk(userIds);
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Presence status proxy failed", error);
    return NextResponse.json(
      { message: "Failed to fetch presence data" },
      { status: 502 }
    );
  }
}
