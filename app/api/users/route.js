import dbConnect from "@/lib/dbConnect";
import User from "@/lib/userModel";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const requestedLimit = Number(searchParams.get("limit"));
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const query = User.find({}, { email: 0, password: 0 })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .setOptions({ allowDiskUse: true });

    const users = await query.lean();
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

    return new Response(
      JSON.stringify({
        users: sanitized,
        page,
        total: sanitized.length
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
