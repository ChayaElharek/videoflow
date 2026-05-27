import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/embed') ||
    pathname.startsWith('/player') ||
    pathname.startsWith('/api/videos') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/videos') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }

  const auth = req.cookies.get('auth');
  if (!auth || auth.value !== 'logged') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};