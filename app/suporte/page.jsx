'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

const CATEGORIES = [
  { value: 'login', label: 'Não consigo entrar / criar conta' },
  { value: 'processamento', label: 'O vídeo não processou' },
  { value: 'corte', label: 'Problema com um corte gerado' },
  { value: 'pagamento', label: 'Cobrança / pagamento' },
  { value: 'outro', label: 'Outro' },
];

export default function Suporte() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [category, setCategory] = useState('login');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category, message, website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar sua mensagem.');
      setStatus('sent');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-wire px-8 py-5 flex items-center justify-between">
        <a href="/" className="font-mono text-xs tracking-widest text-paper/40 hover:text-signal transition-colors">
          ← VOLTAR
        </a>
        <span className="font-display italic text-2xl">suporte</span>
        <span className="w-16" />
      </header>

      <section className="px-8 py-16 max-w-lg mx-auto">
        <h1 className="font-display text-3xl md:text-4xl italic text-center mb-3">
          Não conseguiu usar o site?
        </h1>
        <p className="text-paper/50 text-center text-sm mb-10">
          Conta o que aconteceu que a gente resolve. Respondemos pelo email que você deixar aqui.
        </p>

        {status === 'sent' ? (
          <div
            className="rounded-xl border border-signal/30 bg-ink/60 p-8 text-center"
            style={{ boxShadow: '0 0 80px -20px rgba(46, 95, 255, 0.45)' }}
          >
            <p className="font-display italic text-2xl mb-2">Mensagem enviada.</p>
            <p className="text-paper/50 text-sm">
              Recebemos seu chamado e vamos te responder por email o quanto antes.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-signal/30 bg-ink/60 p-6"
            style={{ boxShadow: '0 0 80px -20px rgba(46, 95, 255, 0.45)' }}
          >
            {/* Campo armadilha pra robô — invisível pra gente, mas um bot preenche */}
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

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
              <label className="block font-mono text-[9px] text-paper/40 tracking-wide mb-1">QUAL O PROBLEMA</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-transparent outline-none text-paper [&>option]:bg-ink"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="border border-wire focus-within:border-signal/60 transition-colors rounded-md px-4 py-3">
              <label className="block font-mono text-[9px] text-paper/40 tracking-wide mb-1">MENSAGEM</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-transparent outline-none text-paper placeholder:text-paper/30 resize-none"
                placeholder="Descreve o que aconteceu, com o máximo de detalhe possível…"
              />
            </div>

            {error && <p className="text-center text-sm text-record mt-4">{error}</p>}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="mt-6 w-full bg-signal text-paper font-medium py-3 rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-signal/90 transition-colors"
            >
              {status === 'sending' ? 'Enviando…' : 'Enviar pro suporte'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
