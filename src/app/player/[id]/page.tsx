'use client';

import { useEffect, useState, use } from 'react';
import Player from '@/components/Player';

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [video, setVideo] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/videos/${id}`)
      .then(r => r.json())
      .then(setVideo);
  }, [id]);

  if (!video) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  if (video.status !== 'ready') return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      {video.status === 'processing' ? '⏳ Processando...' : '❌ Erro no vídeo'}
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Player src={video.hls_path} title={video.title} />
        <h1 className="text-white text-xl font-semibold mt-4">{video.title}</h1>
      </div>
    </div>
  );
}