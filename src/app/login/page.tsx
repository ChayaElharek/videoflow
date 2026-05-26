'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password }),
    });

    if (res.ok) {
      router.push('/');
    } else {
      setError('Usuário ou senha incorretos');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="bg-zinc-900 rounded-xl p-8 w-full max-w-sm space-y-4">
        <div className="text-center mb-2">
          <h1 className="text-white text-2xl font-bold">VideoFlow</h1>
          <p className="text-zinc-500 text-sm mt-1">Acesso restrito</p>
        </div>
        <input
          type="text"
          placeholder="Usuário"
          value={user}
          onChange={e => setUser(e.target.value)}
          className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="w-full bg-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg py-2.5 text-sm font-medium text-white transition"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}