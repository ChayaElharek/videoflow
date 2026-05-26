'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface PlayerProps {
  src: string;
  title?: string;
}

interface Quality {
  id: number;
  name: string;
  height: number;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function Player({ src, title }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<NodeJS.Timeout>();

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'quality' | 'speed'>('quality');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setLoading(false);
        setQualities(data.levels.map((l, i) => ({ id: i, name: `${l.height}p`, height: l.height })));
      });
      hlsRef.current = hls;
      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      setLoading(false);
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const h: Record<string, () => void> = {
      timeupdate: () => setCurrentTime(video.currentTime),
      loadedmetadata: () => setDuration(video.duration),
      waiting: () => setLoading(true),
      canplay: () => setLoading(false),
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      ended: () => setPlaying(false),
      volumechange: () => { setVolume(video.volume); setMuted(video.muted); },
    };
    Object.entries(h).forEach(([e, fn]) => video.addEventListener(e, fn));
    return () => Object.entries(h).forEach(([e, fn]) => video.removeEventListener(e, fn));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      const video = videoRef.current;
      if (!video) return;
      if (e.code === 'Space' || e.code === 'KeyK') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight') { e.preventDefault(); video.currentTime += 5; }
      if (e.code === 'ArrowLeft') { e.preventDefault(); video.currentTime -= 5; }
      if (e.code === 'ArrowUp') { e.preventDefault(); video.volume = Math.min(video.volume + 0.1, 1); }
      if (e.code === 'ArrowDown') { e.preventDefault(); video.volume = Math.max(video.volume - 0.1, 0); }
      if (e.code === 'KeyM') video.muted = !video.muted;
      if (e.code === 'KeyF') toggleFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playing]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const changeVolume = (val: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = val;
    videoRef.current.muted = val === 0;
  };

  const changeQuality = (id: number | 'auto') => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = id === 'auto' ? -1 : id;
    setCurrentQuality(id === 'auto' ? 'auto' : qualities[id as number]?.name || 'auto');
    setShowSettings(false);
  };

  const changeSpeed = (s: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = s;
    setSpeed(s);
    setShowSettings(false);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full aspect-video rounded-xl overflow-hidden"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={() => setShowSettings(false)}
    >
      <video ref={videoRef} className="w-full h-full" onClick={togglePlay} playsInline />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {!playing && !loading && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition">
            <svg className="w-7 h-7 fill-white ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </button>
      )}

      {/* Controles */}
      <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-10">

          {/* Progresso */}
          <div className="w-full h-1 hover:h-2 bg-white/20 rounded-full cursor-pointer mb-3 transition-all group" onClick={seek}>
            <div className="h-full bg-indigo-500 rounded-full relative" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition shadow" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-white/80 transition">
              {playing
                ? <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                : <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              }
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group/vol">
              <button onClick={() => changeVolume(muted || volume === 0 ? 0.8 : 0)} className="text-white hover:text-white/80 transition">
                {muted || volume === 0
                  ? <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18l2 2.01L21 18.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                  : <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
                }
              </button>
              <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-200">
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={muted ? 0 : volume}
                  onChange={e => changeVolume(parseFloat(e.target.value))}
                  className="w-20 accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Tempo */}
            <span className="text-white text-xs font-mono">{fmt(currentTime)} / {fmt(duration)}</span>

            <div className="flex-1" />

            {/* Settings (qualidade + velocidade) */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowSettings(v => !v)}
                className="text-white text-xs hover:text-white/80 transition px-2 py-1 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
                {speed !== 1 && <span>{speed}x</span>}
              </button>

              {showSettings && (
                <div className="absolute bottom-10 right-0 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl w-40">
                  {/* Tabs */}
                  <div className="flex border-b border-white/10">
                    {(['quality', 'speed'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSettingsTab(tab)}
                        className={`flex-1 py-2 text-xs transition ${settingsTab === tab ? 'text-white bg-white/10' : 'text-white/50 hover:text-white'}`}
                      >
                        {tab === 'quality' ? 'Qualidade' : 'Velocidade'}
                      </button>
                    ))}
                  </div>

                  {settingsTab === 'quality' && (
                    <div>
                      <button
                        onClick={() => changeQuality('auto')}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition ${currentQuality === 'auto' ? 'text-indigo-400' : 'text-white'}`}
                      >
                        Auto
                      </button>
                      {[...qualities].reverse().map(q => (
                        <button
                          key={q.id}
                          onClick={() => changeQuality(q.id)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition ${currentQuality === q.name ? 'text-indigo-400' : 'text-white'}`}
                        >
                          {q.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {settingsTab === 'speed' && (
                    <div>
                      {SPEEDS.map(s => (
                        <button
                          key={s}
                          onClick={() => changeSpeed(s)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition ${speed === s ? 'text-indigo-400' : 'text-white'}`}
                        >
                          {s === 1 ? 'Normal' : `${s}x`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white hover:text-white/80 transition">
              {fullscreen
                ? <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" /></svg>
                : <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}