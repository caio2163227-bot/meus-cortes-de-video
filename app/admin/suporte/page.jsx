import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllTickets } from '@/lib/support';
import TicketStatusButton from './TicketStatusButton';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS = {
  login: 'Login / conta',
  processamento: 'Processamento',
  corte: 'Corte gerado',
  pagamento: 'Pagamento',
  outro: 'Outro',
};

function formatDate(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

export default async function AdminSuporte() {
  const session = await getServerSession(authOptions);
  const isAdmin = Boolean(process.env.ADMIN_EMAIL && session?.user?.email === process.env.ADMIN_EMAIL);

  if (!isAdmin) {
    redirect('/');
  }

  const tickets = getAllTickets();
  const abertos = tickets.filter((t) => t.status !== 'resolvido');
  const resolvidos = tickets.filter((t) => t.status === 'resolvido');

  return (
    <main className="min-h-screen">
      <header className="border-b border-wire px-8 py-5 flex items-center justify-between">
        <a href="/" className="font-mono text-xs tracking-widest text-paper/40 hover:text-signal transition-colors">
          ← VOLTAR
        </a>
        <span className="font-display italic text-2xl">suporte · admin</span>
        <span className="font-mono text-xs tracking-widest text-paper/40">{abertos.length} abertos</span>
      </header>

      <section className="px-8 py-16 max-w-3xl mx-auto">
        {tickets.length === 0 ? (
          <p className="text-center text-paper/40 font-mono text-sm">Nenhum chamado ainda.</p>
        ) : (
          <div className="space-y-10">
            {[...abertos, ...resolvidos].map((ticket) => (
              <div
                key={ticket.id}
                className={`border rounded-md p-5 ${
                  ticket.status === 'resolvido' ? 'border-wire opacity-50' : 'border-record/40'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                  <div>
                    <p className="font-display italic text-lg leading-tight">{ticket.name}</p>
                    <a href={`mailto:${ticket.email}`} className="font-mono text-xs text-signal hover:underline">
                      {ticket.email}
                    </a>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-[9px] text-timecode tracking-wide">
                      {CATEGORY_LABELS[ticket.category] || ticket.category}
                    </p>
                    <p className="font-mono text-[9px] text-paper/30 mt-1">{formatDate(ticket.createdAt)}</p>
                  </div>
                </div>

                <p className="text-paper/80 text-sm whitespace-pre-wrap mb-4">{ticket.message}</p>

                <TicketStatusButton ticketId={ticket.id} status={ticket.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
