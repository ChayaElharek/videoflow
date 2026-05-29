import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, rm } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import { insert, update } from '@/lib/videos';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('video') as File;
  const title = formData.get('title') as string;
  const allowedDomains = formData.get('allowed_domains') as string;

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo' }, { status: 400 });

  const id = randomUUID();
  const tmpDir = path.join(process.cwd(), 'tmp', id);
  await mkdir(tmpDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const inputPath = path.join(tmpDir, 'input.mp4');
  await writeFile(inputPath, buffer);

  insert({
    id,
    title: title || file.name,
    status: 'processing',
    hls_path: null,
    duration: null,
    created_at: new Date().toISOString(),
    allowed_domains: allowedDomains || undefined,
  });

  processVideo(id, inputPath, tmpDir);

  return NextResponse.json({ id });
}

async function processVideo(id: string, inputPath: string, tmpDir: string) {
  try {
    const metadata = await getMetadata(inputPath);
    const bunnyVideoId = await createBunnyVideo(id);
    await uploadToBunny(bunnyVideoId, inputPath);
    const hlsUrl = await waitBunnyReady(bunnyVideoId);
    update(id, {
      status: 'ready',
      hls_path: hlsUrl,
      duration: metadata.duration,
      bunny_video_id: bunnyVideoId,
    });
  } catch (err) {
    console.error('Erro no processamento:', err);
    update(id, { status: 'error' });
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

function getMetadata(filePath: string): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve({ duration: data.format.duration || 0 });
    });
  });
}

async function createBunnyVideo(title: string): Promise<string> {
  console.log('BUNNY_LIBRARY_ID:', process.env.BUNNY_LIBRARY_ID);
  console.log('BUNNY_API_KEY:', process.env.BUNNY_API_KEY);

  const res = await fetch(
    `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos`,
    {
      method: 'POST',
      headers: {
        'AccessKey': process.env.BUNNY_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    }
  );
  const data = await res.json();
  console.log('Bunny createVideo response:', JSON.stringify(data));
  return data.guid;
}

async function uploadToBunny(videoId: string, filePath: string): Promise<void> {
  const fs = await import('fs');
  const fileBuffer = fs.readFileSync(filePath);

  const res = await fetch(
    `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: 'PUT',
      headers: {
        'AccessKey': process.env.BUNNY_API_KEY!,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    }
  );
  console.log('Bunny upload status:', res.status);
}

async function waitBunnyReady(videoId: string): Promise<string> {
  const maxAttempts = 60;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));

    const res = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/${videoId}`,
      { headers: { 'AccessKey': process.env.BUNNY_API_KEY! } }
    );
    const data = await res.json();
    console.log(`Bunny status [${i}]:`, data.status);

    if (data.status === 4) {
      return `https://${process.env.BUNNY_CDN_HOSTNAME}/${videoId}/playlist.m3u8`;
    }
    if (data.status === 5) throw new Error('Bunny: erro no processamento');
  }

  throw new Error('Bunny: timeout');
}