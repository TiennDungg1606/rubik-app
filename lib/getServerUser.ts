import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import dbConnect from "@/lib/dbConnect";
import User from "@/lib/userModel";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

export type SessionUser = {
  id: string;
  _id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  md33?: string;
  goal33?: string;
  main33?: string;
  Feevent?: string;
  customBg?: string;
  birthday?: string | Date | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  [key: string]: unknown;
};

type RawUser = Omit<SessionUser, "id" | "_id"> & {
  _id?: string | { toString?: () => string };
  id?: string;
};

function toPlainObject<T>(value: T): T {
  // Ensures no Date, Buffer, or class instances leak into client components.
  return JSON.parse(JSON.stringify(value));
}

export async function getServerUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return null;
  }

  let payload: { userId?: string } | null = null;
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId?: string };
  } catch {
    return null;
  }

  if (!payload?.userId) {
    return null;
  }

  await dbConnect();
  const record = await User.findById(payload.userId)
    .select("-password")
    .lean<RawUser>();
  if (!record) {
    return null;
  }

  const rawId = record._id;
  const normalizedId =
    typeof rawId === "string"
      ? rawId
      : typeof rawId === "object" && rawId !== null && "toString" in rawId
        ? rawId.toString?.() ?? ""
        : record.id ?? "";

  const { _id: _discardedId, id: _discardedClientId, ...rest } = record;

  return toPlainObject({
    ...rest,
    id: normalizedId,
    _id: normalizedId,
  }) satisfies SessionUser;
}
