'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

const VOICES = [
  { id: 'pt-BR-Wavenet-A', label: 'Voz 1', desc: 'feminina' },
  { id: 'pt-BR-Wavenet-B', label: 'Voz 2', desc: 'masculina' },
];

const MAX_CHARS = 800;

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(VOICES[0].id);
  const [status, setStatus] = useState('idle'); // idle | processing | done | error
  const [clip, setClip] = useState(null);
  const [error, setError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [usage, setUsage] = useState(null);

  async function refreshUsage() {
    try {
      const res = await fetch('/api/usage');
      if (!res.ok) return;
      setUsage(await res.json());
    } catch {
      // não é crítico pra usar o site
    }
  }

  useEffect(() => {
    if (session?.user) refreshUsage();
  }, [session?.user]);

  useEffect(() => {
    if (status !== 'processing') return;
    setElapsedSeconds(0);
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;

    setStatus('processing');
    setError(null);
    setClip(null);

    try {
      const res = await fetch('/api/create-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), voice }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao gerar vídeo.');

      setClip(data.clips[0]);
      setStatus('done');
      refreshUsage();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-wire px-4 sm:px-8 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-3">
        <a href="/" className="font-mono text-[10px] sm:text-xs tracking-widest text-paper/40 hover:text-signal transition-colors">
          ← INÍCIO
        </a>
        <span className="font-display italic text-2xl">dashboard</span>
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end order-3 sm:order-none">
          <a href="/historico" className="font-mono text-[10px] sm:text-xs tracking-widest text-paper/40 hover:text-signal transition-colors">
            HISTÓRICO →
          </a>
          {session?.user ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="font-mono text-[10px] sm:text-xs tracking-widest text-paper/40 hover:text-record transition-colors border-l border-wire pl-3 sm:pl-4"
            >
              SAIR
            </button>
          ) : (
            <a href="/login" className="font-mono text-[10px] sm:text-xs tracking-widest text-paper/40 hover:text-signal transition-colors border-l border-wire pl-3 sm:pl-4">
              ENTRAR
            </a>
          )}
        </div>
      </header>

      <section className="px-8 pt-16 pb-10 max-w-3xl mx-auto text-center">
        <h1 className="font-display text-4xl md:text-5xl leading-[1.1] mb-4">
          Um texto vira <span className="italic text-signal">vídeo pronto</span>.
        </h1>
        <p className="text-paper/60 max-w-xl mx-auto text-lg">
          Sem gravar nada. Escreve o roteiro, escolhe uma voz e a IA narra, monta e
          legenda um vídeo vertical pra você.
        </p>
      </section>

      <section className="px-8 pb-24 max-w-xl mx-auto">
        <div
          className="rounded-xl border border-signal/30 bg-ink/60 p-6"
          style={{ boxShadow: '0 0 80px -20px rgba(46, 95, 255, 0.45)' }}
        >
          <form onSubmit={handleSubmit}>
            <div className="border border-wire focus-within:border-signal/60 transition-colors rounded-md px-4 py-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Escreve o texto que vai virar o vídeo…"
                rows={6}
                className="w-full bg-transparent outline-none text-paper placeholder:text-paper/30 resize-none"
              />
            </div>
            <p className="font-mono text-[10px] text-paper/30 mt-1.5 text-right">
              {text.length}/{MAX_CHARS}
            </p>

            <div className="mt-4">
              <p className="font-mono text-[10px] text-paper/40 mb-2 tracking-wide">VOZ</p>
              <div className="flex gap-2">
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoice(v.id)}
                    className={`flex-1 border rounded-md py-2.5 text-left px-3 transition-colors ${
                      voice === v.id
                        ? 'border-signal bg-signal/10 text-signal'
                        : 'border-wire text-paper/50 hover:border-signal/50'
                    }`}
                  >
                    <span className="block text-sm font-medium">{v.label}</span>
                    <span className="block font-mono text-[9px] tracking-wide opacity-70">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!text.trim() || status === 'processing' || (usage && usage.used >= usage.limit)}
              className="mt-6 w-full bg-signal text-paper font-medium py-3 rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-signal/90 transition-colors"
            >
              {status === 'processing'
                ? 'Narrando e montando…'
                : usage && usage.used >= usage.limit
                ? 'Limite diário atingido'
                : 'Gerar vídeo'}
            </button>

            {usage && (
              <p className="text-center font-mono text-[10px] text-paper/30 tracking-wide mt-3">
                {usage.used >= usage.limit
                  ? `Você usou os ${usage.limit} vídeos de hoje — volta amanhã.`
                  : `${usage.used}/${usage.limit} vídeos usados hoje`}
              </p>
            )}
          </form>
        </div>

        {status === 'processing' && (
          <div className="text-center mt-6">
            <p className="font-mono text-3xl text-timecode tabular-nums tracking-wider">
              {formatTime(elapsedSeconds)}
            </p>
            <p className="font-mono text-xs text-paper/40 mt-2 animate-pulse">
              narrando → montando fundo → legendando
            </p>
          </div>
        )}

        {error && <p className="text-center text-sm text-record mt-4">{error}</p>}

        {clip && (
          <div className="mt-10">
            <div className="border border-record/40 bg-record/10 rounded-md px-4 py-3 mb-6 text-sm text-paper/80">
              <strong className="text-record">Baixe seu vídeo agora.</strong> Pra não pesar o
              servidor, ele é apagado automaticamente em 1 minuto.
            </div>
            <div className="border border-signal/60 rounded-md overflow-hidden max-w-xs mx-auto">
              <video
                src={clip.file}
                controls
                preload="metadata"
                playsInline
                className="w-full aspect-[9/16] bg-black"
              />
              <div className="p-4">
                <p className="font-display text-lg italic leading-snug mb-3">{clip.title}</p>
                <a
                  href={clip.file}
                  download="video-gerado.mp4"
                  className="flex items-center justify-center gap-1.5 border border-wire hover:border-signal hover:text-signal rounded-md py-2 text-xs font-mono transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 3v13m0 0l-5-5m5 5l5-5M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Baixar vídeo
                </a>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
