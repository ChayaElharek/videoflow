import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'videos.json');

export interface VideoRecord {
  id: string;
  title: string;
  status: 'processing' | 'ready' | 'error';
  hls_path: string | null;
  duration: number | null;
  created_at: string;
  allowed_domains?: string; // domínios separados por vírgula
}

export function getAll(): VideoRecord[] {
  if (!existsSync(DB_PATH)) return [];
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
}

export function getById(id: string): VideoRecord | null {
  return getAll().find(v => v.id === id) ?? null;
}

export function insert(video: VideoRecord) {
  const all = getAll();
  all.unshift(video);
  writeFileSync(DB_PATH, JSON.stringify(all, null, 2));
}

export function update(id: string, data: Partial<VideoRecord>) {
  const all = getAll();
  const idx = all.findIndex(v => v.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...data };
    writeFileSync(DB_PATH, JSON.stringify(all, null, 2));
  }
}

export function remove(id: string) {
  const all = getAll().filter(v => v.id !== id);
  writeFileSync(DB_PATH, JSON.stringify(all, null, 2));
}