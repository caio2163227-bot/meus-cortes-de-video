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
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 select-none pointer-events-none">
          <div className="w-1 h-9 bg-signal rounded-full" />
          <div className="bg-ink/90 border border-wire rounded px-3 py-1.5 backdrop-blur-sm">
            <p className="font-display italic text-sm leading-tight">Caio Brito</p>
            <p className="font-mono text-[9px] text-timecode tracking-wide">FUNDADOR · CBZ COMPANY</p>
          </div>
        </div>
      </body>
    </html>
  );
}
