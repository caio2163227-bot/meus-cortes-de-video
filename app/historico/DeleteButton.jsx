'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteButton({ jobId }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm('Apagar esse vídeo e todos os cortes dele? Não dá pra desfazer.')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao apagar.');
      router.refresh();
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="font-mono text-[9px] text-paper/30 hover:text-record transition-colors disabled:opacity-40 whitespace-nowrap"
    >
      {deleting ? 'apagando…' : '✕ apagar'}
    </button>
  );
}
