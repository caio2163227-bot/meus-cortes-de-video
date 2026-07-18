import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DATA_DIR, getJobById } from '@/lib/jobIndex';

// Empacota todos os cortes de um job num .zip só — útil porque os
// cortes somem do servidor 1 minuto depois de gerados, então baixar
// um por um correndo é ruim.
export async function GET(req, { params }) {
  const { jobId } = params;

  if (!jobId || jobId.includes('..')) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const job = getJobById(jobId);
  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: 'Vídeo não encontrado.' }, { status: 404 });
  }

  const workDir = path.join(DATA_DIR, jobId);

  const existingClips = job.clips
    .map((clip, i) => ({ filePath: path.join(workDir, path.basename(clip.file)), name: `corte-${i + 1}.mp4` }))
    .filter((c) => fs.existsSync(c.filePath));

  if (existingClips.length === 0) {
    return NextResponse.json(
      { error: 'Esses cortes já expiraram no servidor. Gere de novo.' },
      { status: 404 }
    );
  }

  const zip = new JSZip();
  for (const clip of existingClips) {
    zip.file(clip.name, fs.readFileSync(clip.filePath));
  }
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="cortes.zip"',
      'Cache-Control': 'no-store',
    },
  });
}
