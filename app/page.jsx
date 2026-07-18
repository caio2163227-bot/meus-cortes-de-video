'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import AuthoritySection from './AuthoritySection';
import AdSlot from './AdSlot';

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const DURATION_OPTIONS = [
  { label: '0:30', seconds: 30 },
  { label: '1:00', seconds: 60 },
  { label: '1:30', seconds: 90 },
];

const FEATURE_BADGES = [
  {
    label: 'Cortes automáticos',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    label: 'Reenquadramento vertical',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v14a2 2 0 0 0 2 2h14" />
        <path d="M18 22V8a2 2 0 0 0-2-2H2" />
      </svg>
    ),
  },
  {
    label: 'Legenda automática',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="14" x="3" y="5" rx="2" />
        <path d="M7 15h4M7 11h6" />
      </svg>
    ),
  },
  {
    label: 'Baixe vídeos por link',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

const FORMATS = [
  {
    label: 'PODCAST',
    description: 'Puxa as histórias e opiniões mais fortes da conversa.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
  },
  {
    label: 'ENTREVISTA',
    description: 'Isola as respostas que prendem mais atenção.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'AULA',
    description: 'Corta os pontos que valem revisão rápida.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h20" />
        <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
        <path d="m7 21 5-5 5 5" />
      </svg>
    ),
  },
  {
    label: 'LIVE',
    description: 'Encontra os picos de reação do público.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
        <circle cx="12" cy="12" r="2" />
        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
        <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
      </svg>
    ),
  },
];

export default function Home() {
  const { data: session } = useSession();
  const [mode, setMode] = useState('link'); // 'link' | 'file'
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | done | error
  const [jobId, setJobId] = useState(null);
  const [clips, setClips] = useState([]);
  const [error, setError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [deleteCountdown, setDeleteCountdown] = useState(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Cronômetro: conta os segundos enquanto o vídeo está sendo processado
  useEffect(() => {
    if (status !== 'processing') return;
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Contagem regressiva pro apagão automático — os cortes somem do
  // servidor 1 minuto depois de prontos, pra não pesar o armazenamento.
  useEffect(() => {
    if (status !== 'done') return;
    setDeleteCountdown(60);
    const interval = setInterval(() => {
      setDeleteCountdown((s) => (s !== null && s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Os cortes ficam prontos, mas a seção de resultados nasce lá embaixo,
  // depois de uma seção inteira de marketing — sem isso, quem gerou o
  // corte acha que "não aconteceu nada" porque nunca rola até ver.
  useEffect(() => {
    if (status === 'done' && clips.length > 0) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [status, clips]);

  function formatElapsed(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'file' && !file) return;
    if (mode !== 'file' && !videoUrl.trim()) return;

    setStatus('processing');
    setError(null);

    try {
      const formData = new FormData();
      if (mode !== 'file') {
        formData.append('videoUrl', videoUrl.trim());
      } else {
        formData.append('video', file);
      }
      formData.append('duration', String(duration));

      const res = await fetch('/api/process', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao processar vídeo.');

      setJobId(data.jobId);
      setClips(data.clips);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen">
      {/* Cabeçalho — luz de gravação piscando, como a tally light de uma câmera */}
      <header className="border-b border-wire px-4 sm:px-8 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-record opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-record" />
          </span>
          <span className="font-mono text-xs tracking-widest text-paper/70">REC</span>
        </div>
        <span className="font-display italic text-2xl">recorte</span>
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end order-3 sm:order-none">
          <a href="/dashboard" className="font-mono text-[10px] sm:text-xs tracking-widest text-paper/40 hover:text-signal transition-colors">
            DASHBOARD
          </a>
          <a href="/historico" className="font-mono text-[10px] sm:text-xs tracking-widest text-paper/40 hover:text-signal transition-colors">
            HISTÓRICO →
          </a>
          {session?.user ? (
            <div className="flex items-center gap-2 border-l border-wire pl-3 sm:pl-4">
              <span className="font-mono text-xs text-paper/40 hidden sm:inline">
                {session.user.name}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="font-mono text-[10px] sm:text-xs tracking-widest text-paper/40 hover:text-record transition-colors"
              >
                SAIR
              </button>
            </div>
          ) : (
            <a href="/login" className="font-mono text-[10px] sm:text-xs tracking-widest text-paper/40 hover:text-signal transition-colors border-l border-wire pl-3 sm:pl-4">
              ENTRAR
            </a>
          )}
        </div>
      </header>

      {/* Hero — a linha do tempo é a tese do produto */}
      <section className="px-8 pt-16 pb-10 max-w-4xl mx-auto text-center">
        <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-6">
          Seu vídeo tem <span className="italic text-signal">3 horas</span>
          <br />que valem 20 segundos de atenção.
        </h1>
        <p className="text-paper/60 max-w-xl mx-auto mb-16 text-lg">
          Envie a gravação completa. A IA lê a transcrição, encontra os melhores
          momentos e devolve cortes verticais, com legenda, prontos pra postar.
        </p>

        {/* Signature: monitor de edição — linha do tempo com trecho destacado */}
        <div className="relative h-9 mb-8 select-none">
          <div className="absolute inset-x-0 top-1/2 h-px bg-wire" />
          {Array.from({ length: 41 }).map((_, i) => (
            <div
              key={i}
              className={`absolute top-1/2 -translate-y-1/2 w-px bg-wire ${i % 5 === 0 ? 'h-4' : 'h-2'}`}
              style={{ left: `${(i / 40) * 100}%` }}
            />
          ))}
          <div className="absolute left-[38%] w-[22%] top-1/2 h-9 -translate-y-1/2 bg-signal/10 border border-signal rounded-sm flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />
            <span className="font-mono text-[10px] text-signal tracking-wide">01:42 → 02:19</span>
          </div>
          <span className="absolute left-0 top-full mt-2 font-mono text-[10px] text-timecode/60">00:00:00</span>
          <span className="absolute right-0 top-full mt-2 font-mono text-[10px] text-timecode/60">03:00:00</span>
        </div>
      </section>

      {/* Upload */}
      <section className="px-8 pb-24 max-w-xl mx-auto">
        {/* Cartão com brilho — como um monitor aceso num estúdio escuro */}
        <div
          className="rounded-xl border border-signal/30 bg-ink/60 p-6"
          style={{ boxShadow: '0 0 80px -20px rgba(46, 95, 255, 0.45)' }}
        >
          {/* Seletor de modo: colar link ou enviar arquivo */}
          <div className="flex gap-1 mb-4 font-mono text-xs">
            <button
              type="button"
              onClick={() => setMode('link')}
              className={`flex-1 py-2.5 rounded-t-md border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'link' ? 'border-signal text-signal' : 'border-wire text-paper/40 hover:text-paper/70'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              COLAR LINK
            </button>
            <button
              type="button"
              onClick={() => setMode('shorts')}
              className={`flex-1 py-2.5 rounded-t-md border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'shorts' ? 'border-signal text-signal' : 'border-wire text-paper/40 hover:text-paper/70'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="7" y="2" width="10" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="11" y1="18" x2="13" y2="18" strokeLinecap="round" />
              </svg>
              LINK DO SHORTS
            </button>
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`flex-1 py-2.5 rounded-t-md border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'file' ? 'border-signal text-signal' : 'border-wire text-paper/40 hover:text-paper/70'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" x2="12" y1="3" y2="15" strokeLinecap="round" />
              </svg>
              ENVIAR ARQUIVO
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode !== 'file' ? (
              <div className="border border-wire focus-within:border-signal/60 transition-colors rounded-md px-4 py-4">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={
                    mode === 'shorts'
                      ? 'https://youtube.com/shorts/...'
                      : 'https://youtube.com/watch?v=...'
                  }
                  className="w-full bg-transparent outline-none text-paper placeholder:text-paper/30"
                />
              </div>
            ) : (
              <div
                onClick={() => inputRef.current?.click()}
                className="border border-dashed border-wire hover:border-signal/60 transition-colors rounded-md p-10 text-center cursor-pointer"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <p className="font-mono text-xs tracking-widest text-paper/40 mb-2">
                  ARRASTE OU CLIQUE
                </p>
                <p className="text-paper/80">
                  {file ? file.name : 'Selecione o vídeo original (.mp4, .mov)'}
                </p>
              </div>
            )}

            {/* Duração escolhida ANTES de gerar — a IA já entrega cortada nesse tamanho */}
            <div className="mt-5">
              <p className="font-mono text-[10px] text-paper/40 mb-2 tracking-wide">
                DURAÇÃO DO CORTE
              </p>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.seconds}
                    type="button"
                    onClick={() => setDuration(opt.seconds)}
                    className={`flex-1 border rounded-md py-2 text-xs font-mono transition-colors ${
                      duration === opt.seconds
                        ? 'border-signal bg-signal/10 text-signal'
                        : 'border-wire text-paper/50 hover:border-signal/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={(mode === 'file' ? !file : !videoUrl.trim()) || status === 'processing'}
              className="mt-6 w-full bg-signal text-paper font-medium py-3 rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-signal/90 transition-colors"
            >
              {status === 'processing' ? 'Analisando e cortando…' : 'Gerar cortes'}
            </button>
          </form>

          {/* Selos — o que o site faz, à mostra logo abaixo do botão principal */}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {FEATURE_BADGES.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 border border-wire rounded-full px-3 py-1.5 text-[10px] font-mono text-paper/50"
              >
                {b.icon}
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {status === 'processing' && (
          <div className="text-center mt-6">
            <p className="font-mono text-3xl text-timecode tabular-nums tracking-wider">
              {formatElapsed(elapsedSeconds)}
            </p>
            <p className="font-mono text-xs text-paper/40 mt-2 animate-pulse">
              transcrevendo → identificando destaques → cortando → legendando
            </p>
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-record mt-4">{error}</p>
        )}
      </section>

      {/* Formatos — como os botões de seleção de fonte num switcher de vídeo */}
      <section className="px-8 py-16 border-t border-wire">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs tracking-widest text-paper/40 text-center mb-10">
            FUNCIONA COM QUALQUER GRAVAÇÃO LONGA
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FORMATS.map((f, i) => (
              <div
                key={f.label}
                className="group border border-wire rounded-md p-5 hover:border-signal/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="font-mono text-[10px] text-timecode">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="text-paper/40 group-hover:text-signal transition-colors">
                    {f.icon}
                  </div>
                </div>
                <p className="font-display italic text-lg mb-1.5">{f.label}</p>
                <p className="text-paper/40 text-xs leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resultados */}
      {clips.length > 0 && (
        <section ref={resultsRef} className="px-8 pb-24 max-w-5xl mx-auto">
          {/* Aviso de apagão — os cortes não ficam guardados no servidor */}
          <div className="border border-record/40 bg-record/10 rounded-md px-4 py-3 mb-6 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-paper/80">
              <strong className="text-record">Baixe seus cortes agora.</strong> Pra não pesar o
              servidor, eles são apagados automaticamente depois disso.
            </p>
            {deleteCountdown !== null && (
              <span className="font-mono text-xs text-record tracking-wide whitespace-nowrap">
                APAGA EM {formatTime(deleteCountdown)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="font-mono text-xs tracking-widest text-paper/40">
              {clips.length} CORTES ENCONTRADOS
            </h2>
            <a
              href={`/api/clips/${jobId}/zip`}
              className="flex items-center gap-1.5 border border-signal/40 hover:border-signal hover:bg-signal/10 text-signal rounded-md px-3 py-1.5 text-xs font-mono transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 3v13m0 0l-5-5m5 5l5-5M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Baixar tudo (.zip)
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {clips.map((clip, i) => (
              <div
                key={i}
                className={`rounded-md overflow-hidden transition-all hover:-translate-y-0.5 ${
                  i === 0
                    ? 'border border-signal/60 hover:border-signal'
                    : 'border border-wire hover:border-signal/40'
                }`}
                style={i === 0 ? { boxShadow: '0 0 40px -16px rgba(46, 95, 255, 0.5)' } : undefined}
              >
                <div className="relative">
                  <video
                    src={clip.file}
                    controls
                    preload="metadata"
                    playsInline
                    className="w-full aspect-[9/16] bg-black"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-ink/80 rounded font-mono text-[9px] text-timecode tracking-wide pointer-events-none">
                    {formatTime(clip.start)} → {formatTime(clip.end)} · {formatTime(clip.end - clip.start)}
                  </div>
                  {i === 0 ? (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-signal rounded font-mono text-[9px] text-paper tracking-wide pointer-events-none flex items-center gap-1">
                      ★ MELHOR CORTE
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 h-5 w-5 flex items-center justify-center bg-ink/80 rounded-full font-mono text-[9px] text-paper/60 tracking-wide pointer-events-none">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-display text-xl italic leading-snug mb-2">{clip.title}</p>
                  {clip.hook && (
                    <p className="font-mono text-[10px] text-signal/80 border-l-2 border-signal/40 pl-2 mb-2 leading-relaxed">
                      "{clip.hook}"
                    </p>
                  )}
                  <p className="text-paper/50 text-sm mb-4">{clip.reason}</p>

                  {/* Potencial viral — barra em vez de número solto */}
                  <div className="mb-4">
                    <div className="flex justify-between font-mono text-[9px] text-paper/40 mb-1 tracking-wide">
                      <span>POTENCIAL VIRAL</span>
                      <span className="text-timecode">{clip.score}/100</span>
                    </div>
                    <div className="h-1 bg-wire rounded-full overflow-hidden">
                      <div
                        className="h-full bg-timecode rounded-full"
                        style={{ width: `${clip.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Baixar — a duração já veio certa desde a geração */}
                  <a
                    href={clip.file}
                    download={`corte-${i + 1}.mp4`}
                    className="flex items-center justify-center gap-1.5 border border-wire hover:border-signal hover:text-signal rounded-md py-2 text-xs font-mono transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 3v13m0 0l-5-5m5 5l5-5M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Baixar corte
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <AuthoritySection />

      <AdSlot slot="5890317581" />

      <footer className="border-t border-wire px-8 py-6 text-center">
        <p className="font-mono text-[10px] text-paper/30 tracking-[0.2em] mb-3">
          RECORTE · CORTES AUTOMÁTICOS POR IA
        </p>
        <p className="font-mono text-[10px] text-paper/30 tracking-wide">
          <a href="/privacidade" className="hover:text-signal transition-colors">Privacidade</a>
          <span className="mx-2">·</span>
          <a href="/termos" className="hover:text-signal transition-colors">Termos</a>
        </p>
      </footer>
    </main>
  );
}
