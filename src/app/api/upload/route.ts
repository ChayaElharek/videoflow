import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
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
  const videoDir = path.join(process.cwd(), 'public', 'videos', id);
  await mkdir(videoDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const inputPath = path.join(videoDir, 'input.mp4');
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

  convertToHLS(id, inputPath, videoDir);

  return NextResponse.json({ id });
}

function getQualities(height: number) {
  const all = [
    { name: '360p', scale: '640:360', bitrate: '800k', audioBitrate: '96k' },
    { name: '720p', scale: '1280:720', bitrate: '2500k', audioBitrate: '128k' },
    { name: '1080p', scale: '1920:1080', bitrate: '5000k', audioBitrate: '192k' },
  ];
  return all.filter(q => parseInt(q.name) <= height);
}

function convertToHLS(id: string, inputPath: string, outputDir: string) {
  // Primeiro pega a resolução original
  ffmpeg.ffprobe(inputPath, (err, data) => {
    if (err) {
      update(id, { status: 'error' });
      return;
    }

    const videoStream = data.streams.find(s => s.codec_type === 'video');
    const height = videoStream?.height || 720;
    const duration = data.format.duration || null;
    const qualities = getQualities(height);

    // Gera cada qualidade
    let completed = 0;
    const masterLines = ['#EXTM3U', '#EXT-X-VERSION:3'];

    qualities.forEach(q => {
      const qualityDir = path.join(outputDir, q.name);
      require('fs').mkdirSync(qualityDir, { recursive: true });

      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(q.bitrate)
        .audioBitrate(q.audioBitrate)
        .outputOptions([
          `-vf scale=${q.scale}`,
          '-hls_time 10',
          '-hls_list_size 0',
          '-hls_segment_filename', path.join(qualityDir, 'seg%03d.ts'),
          '-f hls',
          '-preset fast',
          '-movflags +faststart',
        ])
        .output(path.join(qualityDir, 'index.m3u8'))
        .on('end', () => {
          const bandwidth = parseInt(q.bitrate) * 1000;
          masterLines.push(
            `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${q.scale.replace(':', 'x')},NAME="${q.name}"`,
            `${q.name}/index.m3u8`
          );

          completed++;
          if (completed === qualities.length) {
            // Escreve o master.m3u8
            require('fs').writeFileSync(
              path.join(outputDir, 'master.m3u8'),
              masterLines.join('\n')
            );
            update(id, {
              status: 'ready',
              hls_path: `/videos/${id}/master.m3u8`,
              duration,
            });
          }
        })
        .on('error', (err) => {
          console.error(`Erro na qualidade ${q.name}:`, err.message);
          update(id, { status: 'error' });
        })
        .run();
    });
  });
}