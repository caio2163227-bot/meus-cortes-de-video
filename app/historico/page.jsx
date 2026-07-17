import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllJobs, ensureCleanupScheduler } from '@/lib/jobIndex';
import DeleteButton from './DeleteButton';

// Impede o Next.js de "engessar" essa página numa versão fixa do build —
// assim ela sempre confere o histórico atualizado a cada visita.
export const dynamic = 'force-dynamic';

// Garante que o relógio de limpeza automática esteja rodando mesmo se
// ninguém tiver gerado corte ainda nessa instância do servidor.
ensureCleanupScheduler();

function formatDate(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default async function Historico() {
  const session = await getServerSession(authOptions);
  const jobs = getAllJobs(session?.user?.id);

  return (
    <main className="min-h-screen">
      <header className="border-b border-wire px-8 py-5 flex items-center justify-between">
        <a href="/" className="font-mono text-xs tracking-widest text-paper/40 hover:text-signal transition-colors">
          ← VOLTAR
        </a>
        <span className="font-display italic text-2xl">histórico</span>
        <span className="font-mono text-xs tracking-widest text-paper/40">{jobs.length} vídeos</span>
      </header>

      <section className="px-8 py-16 max-w-5xl mx-auto">
        <p className="text-center font-mono text-[10px] text-paper/30 tracking-wide mb-10">
          OS CORTES FICAM DISPONÍVEIS SÓ POR 1 MINUTO APÓS SEREM GERADOS · BAIXE NA HORA
        </p>
        {jobs.length === 0 ? (
          <p className="text-center text-paper/40 font-mono text-sm">
            Nenhum vídeo processado ainda (ou os últimos já expiraram).
          </p>
        ) : (
          <div className="space-y-16">
            {jobs.map((job) => (
              <div key={job.jobId}>
                <div className="flex items-baseline justify-between mb-4 border-b border-wire pb-2 gap-4">
                  <p className="font-mono text-xs text-timecode truncate">{job.sourceLabel}</p>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-mono text-[10px] text-paper/30 whitespace-nowrap">
                      {formatDate(job.createdAt)}
                    </p>
                    <DeleteButton jobId={job.jobId} />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {job.clips.map((clip, i) => (
                    <div key={i} className="border border-wire rounded-md overflow-hidden">
                      <video src={clip.file} controls className="w-full aspect-[9/16] bg-black" />
                      <div className="p-3">
                        <p className="font-display italic text-base leading-snug mb-1 truncate">
                          {clip.title}
                        </p>
                        <p className="font-mono text-[9px] text-timecode">
                          {formatTime(clip.start)} → {formatTime(clip.end)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
