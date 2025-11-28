import dbConnect from '@/lib/dbConnect';
import User from '@/lib/userModel';

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  let user;
  if (userId) {
    user = await User.findById(userId);
  }
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }
  // Chỉ trả về thông tin công khai
  const publicFields = {
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    bio: user.bio,
    md33: user.md33,
    goal33: user.goal33,
    main33: user.main33,
    Feevent: user.Feevent,
    customBg: user.customBg,
    username: user.username,
  };
  return new Response(JSON.stringify({ user: publicFields }), { status: 200 });
}
