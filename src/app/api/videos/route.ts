import { NextResponse } from 'next/server';
import { getAll } from '@/lib/videos';

export async function GET() {
  return NextResponse.json(getAll());
}