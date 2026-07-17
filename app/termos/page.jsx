export const metadata = {
  title: 'Termos de Uso — Recorte',
};

export default function Termos() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-wire px-8 py-5 flex items-center justify-between">
        <a href="/" className="font-mono text-xs tracking-widest text-paper/40 hover:text-signal transition-colors">
          ← VOLTAR
        </a>
        <span className="font-display italic text-2xl">termos</span>
        <span className="w-16" />
      </header>

      <section className="px-8 py-16 max-w-2xl mx-auto text-paper/70 text-sm leading-relaxed space-y-8">
        <div>
          <h1 className="font-display italic text-3xl text-paper mb-2">Termos de Uso</h1>
          <p className="text-paper/40 text-xs font-mono">Última atualização: 2026</p>
        </div>

        <p>
          Ao usar o Recorte, você concorda com o que está descrito aqui. É um texto curto de
          propósito — se tiver dúvida sobre algum ponto, manda uma mensagem pelo{' '}
          <a href="/suporte" className="text-signal hover:underline">suporte</a>.
        </p>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">O que o site faz</h2>
          <p>
            O Recorte recebe um vídeo (enviado ou por link) e usa inteligência artificial pra
            transcrever, encontrar os melhores trechos e gerar cortes verticais com legenda, prontos
            pra postar em redes sociais.
          </p>
        </div>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">Responsabilidade sobre o conteúdo enviado</h2>
          <p>
            Você é responsável pelo vídeo que envia — só use conteúdo que você tem direito de usar
            (seu próprio, ou com autorização). O Recorte não analisa direitos autorais do material
            enviado; isso é responsabilidade de quem envia.
          </p>
        </div>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">Sobre a IA</h2>
          <p>
            Os cortes, títulos, legendas e ganchos são gerados automaticamente por modelos de IA.
            Eles podem errar — um corte pode sair maior/menor que o pedido, uma legenda pode ter
            typo, um título pode não fazer tanto sentido. Sempre revise o resultado antes de postar.
          </p>
        </div>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">Armazenamento temporário</h2>
          <p>
            Os cortes gerados ficam disponíveis por apenas 1 minuto no servidor — baixe assim que
            estiverem prontos. Depois disso, não temos como recuperá-los; você vai precisar gerar de
            novo.
          </p>
        </div>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">Sem garantias</h2>
          <p>
            O site é oferecido "como está". Não garantimos disponibilidade contínua, nem que o
            resultado da IA vai ser perfeito. Fazemos o melhor possível pra manter tudo funcionando,
            mas coisas podem falhar — se falharem, avisa a gente pelo suporte.
          </p>
        </div>

        <div>
          <h2 className="font-display italic text-xl text-paper mb-2">Mudanças nesses termos</h2>
          <p>
            Podemos atualizar esse texto conforme o site evolui. Mudanças relevantes serão refletidas
            aqui, com a data de atualização no topo da página.
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
