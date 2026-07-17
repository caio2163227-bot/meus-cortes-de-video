'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TicketStatusButton({ ticketId, status }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggleStatus() {
    setLoading(true);
    const newStatus = status === 'resolvido' ? 'aberto' : 'resolvido';

    try {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar.');
      router.refresh();
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggleStatus}
      disabled={loading}
      className={`font-mono text-[10px] tracking-wide rounded px-3 py-1.5 border transition-colors disabled:opacity-40 ${
        status === 'resolvido'
          ? 'border-wire text-paper/40 hover:border-signal hover:text-signal'
          : 'border-record/50 text-record hover:bg-record/10'
      }`}
    >
      {loading ? 'salvando…' : status === 'resolvido' ? 'reabrir' : '✓ marcar como resolvido'}
    </button>
  );
}
