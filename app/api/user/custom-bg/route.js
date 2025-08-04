import { getServerSession } from "next-auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/userModel";

export async function POST(req) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const { image } = await req.json();
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return new Response(JSON.stringify({ error: "Invalid image" }), { status: 400 });
  }
  await dbConnect();
  await User.updateOne(
    { email: session.user.email },
    { $set: { customBg: image } }
  );
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

export async function DELETE(req) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  await dbConnect();
  await User.updateOne(
    { email: session.user.email },
    { $unset: { customBg: 1 } }
  );
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
