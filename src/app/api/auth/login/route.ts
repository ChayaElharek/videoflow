import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { user, password } = await req.json();
  console.log('Recebido:', user, password);
  console.log('Esperado:', process.env.ADMIN_USER, process.env.ADMIN_PASSWORD);
  
  if (user !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }

  const session = await getSession();
  session.user = user;
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ ok: true });
}