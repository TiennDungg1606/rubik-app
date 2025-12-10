import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

type TokenPayload = {
  userId?: string;
};

export function extractUserId(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/token=([^;]+)/);
  if (!match) {
    return null;
  }

  try {
    const decoded = jwt.verify(match[1], JWT_SECRET) as TokenPayload | string;
    if (typeof decoded === "string") {
      return null;
    }
    return typeof decoded?.userId === "string" ? decoded.userId : null;
  } catch {
    return null;
  }
}
