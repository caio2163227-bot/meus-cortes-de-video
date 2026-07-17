import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Recorte — cortes automáticos por IA',
  description: 'Envie um vídeo longo e receba os melhores cortes verticais, com legenda, prontos pra postar.',
};

const LED_TEXT = 'CBZ COMPANY •  '.repeat(30);

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink text-paper font-body p-4">
        <Providers>{children}</Providers>

        {/* Letreiro — como o "lower third" que identifica alguém na TV, agora linkando pro Instagram */}
        <a href="https://instagram.com/eo_cbz" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 left-6 z-50 flex items-center gap-2 select-none group">
          <div className="w-1 h-9 bg-signal rounded-full" />
          <div className="bg-ink/90 border border-wire group-hover:border-signal/60 rounded px-3 py-1.5 backdrop-blur-sm flex items-center gap-2 transition-colors">
            <div>
              <p className="font-display italic text-sm leading-tight">Caio Brito</p>
              <p className="font-mono text-[9px] text-timecode tracking-wide">FUNDADOR · CBZ COMPANY</p>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-paper/40 group-hover:text-signal transition-colors shrink-0"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
          </div>
        </a>

        {/* Suporte — sempre visível, em qualquer página, mesmo se o site
            estiver com problema pra fazer login */}
        <a
          href="/suporte"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 bg-ink/90 border border-wire hover:border-signal/60 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors group"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-paper/40 group-hover:text-signal transition-colors"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
          <span className="font-mono text-[10px] tracking-widest text-paper/50 group-hover:text-signal transition-colors">
            SUPORTE
          </span>
        </a>

        {/* Moldura de LED — texto correndo ao redor da tela, tipo luz de marquise */}
        <div className="fixed inset-0 z-30 pointer-events-none">
          {/* Cima — corre pra direita */}
          <div className="absolute top-0 left-0 right-0 h-4 overflow-hidden bg-ink border-b border-signal/40">
            <div
              className="led-marquee flex whitespace-nowrap"
              style={{ animation: 'marquee-x 25s linear infinite reverse' }}
            >
              <span className="font-mono text-[9px] text-signal tracking-[0.3em] pr-4">{LED_TEXT}</span>
              <span className="font-mono text-[9px] text-signal tracking-[0.3em] pr-4">{LED_TEXT}</span>
            </div>
          </div>

          {/* Baixo — corre pra esquerda */}
          <div className="absolute bottom-0 left-0 right-0 h-4 overflow-hidden bg-ink border-t border-signal/40">
            <div
              className="led-marquee flex whitespace-nowrap"
              style={{ animation: 'marquee-x 25s linear infinite' }}
            >
              <span className="font-mono text-[9px] text-signal tracking-[0.3em] pr-4">{LED_TEXT}</span>
              <span className="font-mono text-[9px] text-signal tracking-[0.3em] pr-4">{LED_TEXT}</span>
            </div>
          </div>

          {/* Esquerda — corre pra cima */}
          <div className="absolute top-0 bottom-0 left-0 w-4 overflow-hidden bg-ink border-r border-signal/40">
            <div
              className="led-marquee flex flex-col whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', animation: 'marquee-y 25s linear infinite reverse' }}
            >
              <span className="font-mono text-[9px] text-signal tracking-[0.3em] pb-4">{LED_TEXT}</span>
              <span className="font-mono text-[9px] text-signal tracking-[0.3em] pb-4">{LED_TEXT}</span>
            </div>
          </div>

          {/* Direita — corre pra baixo */}
          <div className="absolute top-0 bottom-0 right-0 w-4 overflow-hidden bg-ink border-l border-signal/40">
            <div
              className="led-marquee flex flex-col whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', animation: 'marquee-y 25s linear infinite' }}
            >
              <span className="font-mono text-[9px] text-signal tracking-[0.3em] pb-4">{LED_TEXT}</span>
              <span className="font-mono text-[9px] text-signal tracking-[0.3em] pb-4">{LED_TEXT}</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
