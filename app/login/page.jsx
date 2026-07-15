'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Email ou senha inválidos.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="font-display italic text-3xl">recorte</span>
          <p className="font-mono text-xs tracking-widest text-paper/40 mt-2">ENTRAR NA SUA CONTA</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-signal/30 bg-ink/60 p-6"
          style={{ boxShadow: '0 0 80px -20px rgba(46, 95, 255, 0.45)' }}
        >
          <div className="border border-wire focus-within:border-signal/60 transition-colors rounded-md px-4 py-3 mb-3">
            <label className="block font-mono text-[9px] text-paper/40 tracking-wide mb-1">EMAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none text-paper placeholder:text-paper/30"
              placeholder="voce@email.com"
            />
          </div>

          <div className="border border-wire focus-within:border-signal/60 transition-colors rounded-md px-4 py-3">
            <label className="block font-mono text-[9px] text-paper/40 tracking-wide mb-1">SENHA</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent outline-none text-paper placeholder:text-paper/30"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-center text-sm text-record mt-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-signal text-paper font-medium py-3 rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-signal/90 transition-colors"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center font-mono text-xs text-paper/40 mt-6">
          Ainda não tem conta?{' '}
          <a href="/cadastro" className="text-signal hover:underline">
            Criar conta
          </a>
        </p>
      </div>
    </main>
  );
}
