import './globals.css';

export const metadata = {
  title: 'Recorte — cortes automáticos por IA',
  description: 'Envie um vídeo longo e receba os melhores cortes verticais, com legenda, prontos pra postar.',
};

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
      <body className="bg-ink text-paper font-body">
        {children}

        {/* Letreiro — como o "lower third" que identifica alguém na TV */}
        <a
          href="https://instagram.com/eo_cbz"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 select-none group"
        >
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
      </body>
    </html>
  );
}
