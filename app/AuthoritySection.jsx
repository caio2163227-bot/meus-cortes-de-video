'use client';

import { useEffect, useState } from 'react';

const AUTHORITY_MESSAGES = [
  'Mais de R$ 1 milhão movimentados com negócios digitais.',
  'Experiência em criação de conteúdo e monetização de vídeos.',
  'Atuação com criptomoedas e ativos digitais.',
  'Mercado de infoprodutos.',
  'Marketing de afiliados.',
  'Corretor de seguros.',
  'TikTok Shop Seller.',
  'Venda de produtos físicos.',
  'Tráfego pago.',
  'Google Ads.',
  'Facebook Ads.',
  'Estratégias de monetização na internet.',
  'Diversas fontes de renda construídas no mercado digital.',
];

const ROTATE_MS = 3200;
const TRANSITION_MS = 500;

// Destaca valores em R$ na frase, tipo capa de revista de negócios —
// se a frase não tiver nenhum, some sem quebrar nada.
function renderMessage(text) {
  const parts = text.split(/(R\$\s?[\d.,]+(?:\s?(?:milhões|milhão|mil))?)/gi);
  return parts.map((part, i) =>
    /^R\$/i.test(part) ? (
      <span key={i} className="text-gold">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function AuthoritySection() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % AUTHORITY_MESSAGES.length);
        setVisible(true);
      }, TRANSITION_MS);
    }, ROTATE_MS);
    return () => clearInterval(cycle);
  }, []);

  return (
    <section className="relative px-8 py-32 md:py-40 overflow-hidden bg-ink border-t border-wire">
      {/* Brilho dourado no fundo, tipo luz de estúdio — dá o toque "premium" */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 45% at 50% 0%, rgba(212, 175, 55, 0.10), transparent)',
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        <p className="font-mono text-xs tracking-[0.35em] text-gold/70 mb-10">
          CAIO BRITO · AUTORIDADE DIGITAL
        </p>

        <div className="min-h-[8rem] md:min-h-[10rem] flex items-center justify-center">
          <p
            className={`font-display italic text-3xl md:text-5xl leading-tight text-paper transition-all ease-out ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
            }`}
            style={{ transitionDuration: `${TRANSITION_MS}ms` }}
          >
            {renderMessage(AUTHORITY_MESSAGES[index])}
          </p>
        </div>

        <div className="w-16 h-px bg-gold/40 mx-auto mt-10" />

        <p className="font-mono text-[10px] text-paper/30 tracking-widest mt-6">
          EXPERIÊNCIA REAL · MÚLTIPLOS MODELOS DE NEGÓCIO NA INTERNET
        </p>
      </div>
    </section>
  );
}
