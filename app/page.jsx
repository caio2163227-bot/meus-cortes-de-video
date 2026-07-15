'use client';

import { useState, useRef } from 'react';

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

export default function Home() {
  const [mode, setMode] = useState('link'); // 'link' | 'file'
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | done | error
  const [jobId, setJobId] = useState(null);
  const [clips, setClips] = useState([]);
  const [error, setError] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState(null);
  const [downloadedKey, setDownloadedKey] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const inputRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'file' && !file) return;
    if (mode === 'link' && !videoUrl.trim()) return;

    setStatus('processing');
    setError(null);

    try {
      const formData = new FormData();
      if (mode === 'link') {
        formData.append('videoUrl', videoUrl.trim());
      } else {
        formData.append('video', file);
      }

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

  async function handleDownload(clip, index, seconds) {
    const key = `${index}-${seconds}`;
    setDownloadingKey(key);
    setDownloadError(null);

    try {
      const res = await fetch('/api/reclip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, start: clip.start, duration: seconds }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao gerar o corte.');

      const a = document.createElement('a');
      a.href = data.file;
      a.download = `corte-${index + 1}-${seconds}s.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setDownloadedKey(key);
      setTimeout(() => setDownloadedKey((k) => (k === key ? null : k)), 2500);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloadingKey(null);
    }
  }

  return (
    <main className="min-h-screen">
      {/* Cabeçalho / marca */}
      <header className="border-b border-wire px-8 py-5 flex items-center justify-between">
        <span className="font-mono text-sm tracking-widest text-paper/70">REC · 01</span>
        <span className="font-display italic text-2xl">recorte</span>
        <span className="font-mono text-sm tracking-widest text-paper/40">v0.1</span>
      </header>

      {/* Hero — a linha do tempo é a tese do produto */}
      <section className="px-8 pt-16 pb-10 max-w-4xl mx-auto text-center">
        <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-6">
          Seu vídeo tem <span className="italic text-signal">3 minutos</span>
          <br />que valem a pena cortar.
        </h1>
        <p className="text-paper/60 max-w-xl mx-auto mb-12 text-lg">
          Envie a gravação completa. A IA lê a transcrição, encontra os melhores
          momentos e devolve cortes verticais, com legenda, prontos pra postar.
        </p>

        {/* Signature: linha do tempo com um trecho destacado — a metáfora do produto */}
        <div className="relative h-20 mb-14 select-none">
          <div className="absolute inset-x-0 top-1/2 h-px bg-wire" />
          <div className="absolute left-[38%] w-[22%] top-1/2 h-8 -translate-y-1/2 bg-signal/20 border border-signal rounded-sm flex items-center justify-center">
            <span className="font-mono text-[10px] text-signal">01:42 → 02:19</span>
          </div>
          {Array.from({ length: 21 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 w-px h-3 -translate-y-1/2 bg-wire"
              style={{ left: `${(i / 20) * 100}%` }}
            />
          ))}
        </div>
      </section>

      {/* Upload */}
      <section className="px-8 pb-24 max-w-xl mx-auto">
        {/* Seletor de modo: colar link ou enviar arquivo */}
        <div className="flex gap-1 mb-4 font-mono text-xs">
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex-1 py-2 rounded-t-md border-b-2 transition-colors ${
              mode === 'link' ? 'border-signal text-signal' : 'border-wire text-paper/40 hover:text-paper/70'
            }`}
          >
            COLAR LINK
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex-1 py-2 rounded-t-md border-b-2 transition-colors ${
              mode === 'file' ? 'border-signal text-signal' : 'border-wire text-paper/40 hover:text-paper/70'
            }`}
          >
            ENVIAR ARQUIVO
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'link' ? (
            <div className="border border-wire focus-within:border-signal/60 transition-colors rounded-md px-4 py-4">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
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

          <button
            type="submit"
            disabled={(mode === 'file' ? !file : !videoUrl.trim()) || status === 'processing'}
            className="mt-6 w-full bg-signal text-ink font-medium py-3 rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-signal/90 transition-colors"
          >
            {status === 'processing' ? 'Analisando e cortando…' : 'Gerar cortes'}
          </button>
        </form>

        {status === 'processing' && (
          <p className="text-center font-mono text-xs text-paper/40 mt-4 animate-pulse">
            transcrevendo → identificando destaques → cortando → legendando
          </p>
        )}

        {error && (
          <p className="text-center text-sm text-signal mt-4">{error}</p>
        )}
      </section>

      {/* Resultados */}
      {clips.length > 0 && (
        <section className="px-8 pb-24 max-w-5xl mx-auto">
          <h2 className="font-mono text-xs tracking-widest text-paper/40 mb-6">
            {clips.length} CORTES ENCONTRADOS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {clips.map((clip, i) => (
              <div key={i} className="border border-wire rounded-md overflow-hidden">
                <video src={clip.file} controls className="w-full aspect-[9/16] bg-black" />
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[10px] text-signal">
                      {formatTime(clip.start)} → {formatTime(clip.end)}
                    </span>
                    <span className="font-mono text-[10px] text-paper/40">
                      score {clip.score}
                    </span>
                  </div>
                  <p className="font-display text-xl italic leading-snug">{clip.title}</p>
                  <p className="text-paper/50 text-sm mt-2">{clip.reason}</p>

                  {/* Escolha de duração pra baixar */}
                  <div className="mt-4 pt-4 border-t border-wire">
                    <p className="font-mono text-[10px] text-paper/40 mb-2">
                      TOQUE PRA BAIXAR NESSA DURAÇÃO
                    </p>
                    <div className="flex gap-2">
                      {DURATION_OPTIONS.map((opt) => {
                        const key = `${i}-${opt.seconds}`;
                        const isLoading = downloadingKey === key;
                        const justDownloaded = downloadedKey === key;
                        return (
                          <button
                            key={opt.seconds}
                            onClick={() => handleDownload(clip, i, opt.seconds)}
                            disabled={downloadingKey !== null}
                            className={`flex-1 border rounded-md py-2 text-xs font-mono transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                              justDownloaded
                                ? 'border-signal bg-signal/10 text-signal'
                                : 'border-wire hover:border-signal hover:text-signal disabled:opacity-30'
                            }`}
                          >
                            {isLoading ? (
                              '···'
                            ) : justDownloaded ? (
                              <>✓ Baixado</>
                            ) : (
                              <>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M12 3v13m0 0l-5-5m5 5l5-5M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {opt.label}
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {downloadError && (
            <p className="text-center text-sm text-signal mt-6">{downloadError}</p>
          )}
        </section>
      )}
    </main>
  );
}
