import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rotas públicas — não precisa de login
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

  // Verifica cookie de sessão
  const session = req.cookies.get('videoflow_session');
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};