'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Cadastro() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não são iguais.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta.');

      const signInRes = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (signInRes?.error) throw new Error('Conta criada, mas não consegui entrar automaticamente. Tente fazer login.');

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="font-display italic text-3xl">recorte</span>
          <p className="font-mono text-xs tracking-widest text-paper/40 mt-2">CRIAR CONTA</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-signal/30 bg-ink/60 p-6"
          style={{ boxShadow: '0 0 80px -20px rgba(46, 95, 255, 0.45)' }}
        >
          <div className="border border-wire focus-within:border-signal/60 transition-colors rounded-md px-4 py-3 mb-3">
            <label className="block font-mono text-[9px] text-paper/40 tracking-wide mb-1">NOME</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent outline-none text-paper placeholder:text-paper/30"
              placeholder="Seu nome"
            />
          </div>

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

          <div className="border border-wire focus-within:border-signal/60 transition-colors rounded-md px-4 py-3 mb-3">
            <label className="block font-mono text-[9px] text-paper/40 tracking-wide mb-1">SENHA</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent outline-none text-paper placeholder:text-paper/30"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className="border border-wire focus-within:border-signal/60 transition-colors rounded-md px-4 py-3">
            <label className="block font-mono text-[9px] text-paper/40 tracking-wide mb-1">CONFIRMAR SENHA</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center font-mono text-xs text-paper/40 mt-6">
          Já tem conta?{' '}
          <a href="/login" className="text-signal hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}
