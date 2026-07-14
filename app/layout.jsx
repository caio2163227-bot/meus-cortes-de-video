import './globals.css';

export const metadata = {
  title: 'Recorte — cortes automáticos por IA',
  description: 'Envie um vídeo longo e receba os melhores cortes verticais, com legenda, prontos pra postar.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4861808033042845"
     crossorigin="anonymous"></script>
<!-- Anuncio De Cortes -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-4861808033042845"
     data-ad-slot="1449239619"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink text-paper font-body">{children}</body>
    </html>
  );
}
