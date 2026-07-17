export const metadata = {
  title: 'Política de Privacidade — Recorte',
};

export default function Privacidade() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-wire px-8 py-5 flex items-center justify-between">
        <a href="/" className="font-mono text-xs tracking-widest text-paper/40 hover:text-signal transition-colors">
          ← VOLTAR
        </a>
        <span className="font-display italic text-2xl">privacidade</span>
        <span className="w-16" />
      </header>

      <section className="px-8 py-16 max-w-2xl mx-auto text-paper/70 text-sm leading-relaxed space-y-8">
        <div>
          <h1 className="font-display italic text-3xl text-paper mb-2">Política de Privacidade</h1>
          <p className="text-paper/40 text-xs font-mono">Última atualização: 2026</p>
        </div>

        <p>
          Este documento explica, de forma direta, quais dados o Recorte coleta, pra que usa e por
          quanto tempo guarda. Se algo aqui não ficar claro, é só mandar uma mensagem pelo{' '}
          <a href="/suporte" className="text-signal hover:underline">suporte</a>.
        </p>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">O que coletamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nome e email, quando você cria uma conta.</li>
            <li>Senha — nunca guardada em texto puro, só um hash (não dá pra "ler" sua senha, nem nós conseguimos).</li>
            <li>O vídeo que você envia ou o link que você cola, só durante o processamento.</li>
            <li>Os cortes gerados pela IA, por um período curto (veja "Quanto tempo guardamos" abaixo).</li>
            <li>Nome, email e mensagem, se você enviar um chamado de suporte.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">Quanto tempo guardamos</h2>
          <p>
            O vídeo original e o áudio extraído são apagados do servidor logo depois de gerar os
            cortes. Os cortes finais (os vídeos verticais prontos) ficam disponíveis por{' '}
            <strong className="text-paper">apenas 1 minuto</strong> depois de gerados — passado esse
            tempo, são apagados automaticamente pra não sobrecarregar o servidor. Por isso pedimos
            pra baixar os cortes assim que ficarem prontos.
          </p>
          <p className="mt-2">
            Dados de conta (nome, email, senha com hash) ficam guardados enquanto sua conta existir.
          </p>
        </div>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">Serviços de terceiros que usamos</h2>
          <p>
            Pra transcrever e escolher os melhores trechos do seu vídeo, enviamos o áudio pra API da{' '}
            <strong className="text-paper">Groq</strong> (que roda modelos como Whisper e Llama/GPT-OSS).
            Se você cola um link de vídeo (YouTube, TikTok etc.), usamos a biblioteca{' '}
            <strong className="text-paper">yt-dlp</strong> pra baixar esse conteúdo antes de processar.
            Esses serviços recebem só o conteúdo necessário pra fazer o trabalho — não vendemos nem
            compartilhamos seus dados com ninguém além disso.
          </p>
        </div>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">Cookies e anúncios</h2>
          <p>
            Usamos um cookie de sessão só pra manter você logado — necessário pro site funcionar,
            nada de rastreamento além disso da nossa parte.
          </p>
          <p className="mt-2">
            Se o site exibir anúncios do Google AdSense, o Google e seus parceiros podem usar cookies
            próprios pra mostrar anúncios com base nas suas visitas a este e a outros sites. Você pode
            ver e ajustar essas preferências em{' '}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal hover:underline"
            >
              adssettings.google.com
            </a>
            , e ler mais sobre como o Google usa esses dados em{' '}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal hover:underline"
            >
              policies.google.com/technologies/ads
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">Seus direitos</h2>
          <p>
            Você pode pedir a exclusão da sua conta e dos seus dados a qualquer momento — é só
            mandar uma mensagem pelo <a href="/suporte" className="text-signal hover:underline">suporte</a>{' '}
            explicando o pedido.
          </p>
        </div>
      </section>

      <footer className="border-t border-wire px-8 py-6 text-center">
        <p className="font-mono text-[10px] text-paper/30 tracking-[0.2em]">
          RECORTE · CORTES AUTOMÁTICOS POR IA
        </p>
      </footer>
    </main>
  );
}
