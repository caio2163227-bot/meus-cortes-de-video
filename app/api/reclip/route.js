import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cutClip } from '@/lib/cutVideo';
import { DATA_DIR, getJobById } from '@/lib/jobIndex';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { jobId, start, duration } = await req.json();

    if (jobId === undefined || start === undefined || !duration) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const job = getJobById(jobId);
    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Vídeo não encontrado.' }, { status: 404 });
    }

    const workDir = path.join(DATA_DIR, jobId);
    const inputPath = path.join(workDir, 'original.mp4');
    const segmentsPath = path.join(workDir, 'segments.json');

    if (!fs.existsSync(inputPath) || !fs.existsSync(segmentsPath)) {
      return NextResponse.json(
        { error: 'Esse vídeo já expirou no servidor. Gere os cortes de novo.' },
        { status: 404 }
      );
    }

    const parsed = JSON.parse(await readFile(segmentsPath, 'utf-8'));
    // Jobs antigos guardavam só o array de segments; jobs novos guardam
    // { segments, words } pra dar pra legenda em blocos curtos também.
    const segments = Array.isArray(parsed) ? parsed : parsed.segments;
    const words = Array.isArray(parsed) ? [] : parsed.words || [];

    const end = start + duration;
    const filename = `reclip-${Math.round(start)}-${duration}s.mp4`;
    const outputPath = path.join(workDir, filename);

    await cutClip({
      inputPath,
      segments,
      words,
      start,
      end,
      outputPath,
      vertical: true,
      burnCaptions: true,
    });

    return NextResponse.json({ file: `/api/clips/${jobId}/${filename}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
