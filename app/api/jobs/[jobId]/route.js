import { NextResponse } from 'next/server';
import { removeJobFromIndex } from '@/lib/jobIndex';

// Apaga um vídeo específico do histórico (índice + arquivos em disco).
export async function DELETE(req, { params }) {
  try {
    const { jobId } = params;

    if (!jobId || jobId.includes('..')) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    removeJobFromIndex(jobId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
