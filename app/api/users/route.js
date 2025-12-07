import dbConnect from "@/lib/dbConnect";
import User from "@/lib/userModel";
import mongoose from "mongoose";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const requestedLimit = Number(searchParams.get("limit"));
    const cursor = searchParams.get("cursor");

    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

    const filters = {};
    if (cursor) {
      try {
        filters._id = { $lt: new mongoose.Types.ObjectId(cursor) };
      } catch {
        // Ignore malformed cursor and fall back to newest users
      }
    }

    const users = await User.find(filters, { email: 0, password: 0 })
      .sort({ _id: -1 })
      .limit(limit)
      .lean();

    const sanitized = users.map(user => ({
      id: user._id?.toString(),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      avatar: user.avatar || "",
      bio: user.bio || "",
      md33: user.md33 || "",
      goal33: user.goal33 || "",
      main33: user.main33 || "",
      Feevent: user.Feevent || "",
      customBg: user.customBg || "",
      birthday: user.birthday || null,
      createdAt: user.createdAt || null,
      updatedAt: user.updatedAt || null
    }));

    const nextCursor = sanitized.length === limit ? sanitized[sanitized.length - 1].id : null;

    return new Response(
      JSON.stringify({
        users: sanitized,
        limit,
        nextCursor
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch users", error);
    return new Response(JSON.stringify({ error: "Failed to fetch users" }), {
      status: 500
    });
  }
}
