'use client';

import { useEffect, useState, use } from 'react';
import Player from '@/components/Player';

export default function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [video, setVideo] = useState<any>(null);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    fetch(`/api/videos/${id}`)
      .then(r => r.json())
      .then(v => {
        // Verifica se o domínio atual é permitido
        if (v.allowed_domains) {
          const domains = v.allowed_domains.split(',').map((d: string) => d.trim()).filter(Boolean);
          if (domains.length > 0) {
            const current = window.location.hostname;
            const ok = domains.some((d: string) =>
              current === d || current.endsWith('.' + d)
            );
            if (!ok) { setAllowed(false); return; }
          }
        }
        setVideo(v);
      });
  }, [id]);

  if (!allowed) return (
    <div className="bg-black w-screen h-screen flex items-center justify-center">
      <p className="text-white/40 text-sm">Embed não autorizado neste domínio</p>
    </div>
  );

  if (!video || video.status !== 'ready') return (
    <div className="bg-black w-screen h-screen" />
  );

  return (
    <div className="bg-black w-screen h-screen flex items-center justify-center">
      <div className="w-full h-full">
        <Player src={video.hls_path} />
      </div>
    </div>
  );
}