'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Video {
  id: string;
  title: string;
  status: string;
  duration: number;
  created_at: string;
  allowed_domains?: string;
}

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [domains, setDomains] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const loadVideos = async () => {
    const res = await fetch('/api/videos');
    setVideos(await res.json());
  };

  useEffect(() => { loadVideos(); }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    const title = titleRef.current?.value;
    if (!file) return;

    setUploading(true);
    setProgress('Enviando...');

    const form = new FormData();
    form.append('video', file);
    form.append('title', title || file.name);
    if (domains.trim()) form.append('allowed_domains', domains.trim());

    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();

    setProgress('Processando HLS...');

    const check = setInterval(async () => {
      const r = await fetch(`/api/videos/${data.id}`);
      const v = await r.json();
      if (v.status === 'ready') {
        clearInterval(check);
        setUploading(false);
        setProgress('');
        setDomains('');
        loadVideos();
      }
      if (v.status === 'error') {
        clearInterval(check);
        setUploading(false);
        setProgress('Erro no processamento');
      }
    }, 2000);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Deletar "${title}"?`)) return;
    await fetch(`/api/videos/${id}`, { method: 'DELETE' });
    loadVideos();
  };

  const copyEmbed = (id: string) => {
    const code = `<iframe src="${window.location.origin}/embed/${id}" width="100%" style="aspect-ratio:16/9;border:none;" allowfullscreen allow="autoplay;fullscreen"></iframe>`;
    navigator.clipboard.writeText(code);
  };

  const fmt = (s: number) => {
    if (!s) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-8">VideoFlow</h1>

      {/* Upload */}
      <div className="bg-zinc-900 rounded-xl p-6 mb-8 max-w-lg space-y-3">
        <h2 className="font-semibold">Enviar vídeo</h2>

        <input
          ref={titleRef}
          type="text"
          placeholder="Título"
          className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
        />

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="w-full text-sm text-zinc-400"
        />

        <div>
          <input
            type="text"
            placeholder="Domínios permitidos (ex: meusite.com, loja.com.br)"
            value={domains}
            onChange={e => setDomains(e.target.value)}
            className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="text-xs text-zinc-600 mt-1">Deixe vazio para permitir qualquer domínio</p>
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition"
        >
          {uploading ? progress : 'Enviar'}
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-3 max-w-2xl">
        {videos.map(v => (
          <div key={v.id} className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium truncate">{v.title}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {fmt(v.duration)} · {
                    v.status === 'ready' ? '✅ Pronto' :
                    v.status === 'processing' ? '⏳ Processando' : '❌ Erro'
                  }
                </p>
                {v.allowed_domains && (
                  <p className="text-xs text-zinc-600 mt-1">🔒 {v.allowed_domains}</p>
                )}
              </div>

              {v.status === 'ready' && (
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/player/${v.id}`}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition"
                  >
                    Player
                  </Link>
                  <button
                    onClick={() => copyEmbed(v.id)}
                    className="text-xs bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg transition"
                  >
                    Embed
                  </button>
                  <button
                    onClick={() => handleDelete(v.id, v.title)}
                    className="text-xs bg-red-900/50 hover:bg-red-800 px-3 py-1.5 rounded-lg transition"
                  >
                    Deletar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}