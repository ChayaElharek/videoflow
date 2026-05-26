import { NextRequest, NextResponse } from 'next/server';
import { getById, remove } from '@/lib/videos';
import { rmSync } from 'fs';
import path from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = getById(id);
  if (!video) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(video);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = getById(id);
  if (!video) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  // Remove arquivos do disco
  try {
    const videoDir = path.join(process.cwd(), 'public', 'videos', id);
    rmSync(videoDir, { recursive: true, force: true });
  } catch {}

  remove(id);
  return NextResponse.json({ ok: true });
}