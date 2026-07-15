import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJobById, removeJobFromIndex } from '@/lib/jobIndex';

// Apaga um vídeo específico do histórico (índice + arquivos em disco).
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { jobId } = params;

    if (!jobId || jobId.includes('..')) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const job = getJobById(jobId);
    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Vídeo não encontrado.' }, { status: 404 });
    }

    removeJobFromIndex(jobId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
