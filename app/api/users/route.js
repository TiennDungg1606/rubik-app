import dbConnect from "@/lib/dbConnect";
import User from "@/lib/userModel";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 0;
    const page = Number(searchParams.get("page")) || 1;
    const skip = limit > 0 ? (page - 1) * limit : 0;

    const query = User.find({}, { email: 0, password: 0 }).sort({ createdAt: -1 });
    if (limit > 0) {
      query.limit(limit).skip(skip);
    }

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
        page: limit > 0 ? page : 1,
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
