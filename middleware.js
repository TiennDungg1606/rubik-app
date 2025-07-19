import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/user/me')) {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/token=([^;]+)/);
    if (!match) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    try {
      jwt.verify(match[1], JWT_SECRET);
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/user/me'],
};
