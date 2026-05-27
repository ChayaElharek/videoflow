import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { user, password } = await req.json();

  if (user !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth', 'logged', {
    httpOnly: true,
    secure: false,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
  });

  return res;
}