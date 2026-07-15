import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { cutClip } from '@/lib/cutVideo';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Recorta de novo um trecho já identificado pela IA, mas com a duração
// que a pessoa escolheu (30s, 1min, 1:30) em vez do tamanho original.
export async function POST(req) {
  try {
    const { jobId, start, duration } = await req.json();

    if (jobId === undefined || start === undefined || !duration) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const workDir = path.join(process.cwd(), 'tmp', jobId);
    const inputPath = path.join(workDir, 'original.mp4');
    const segmentsPath = path.join(workDir, 'segments.json');

    if (!fs.existsSync(inputPath) || !fs.existsSync(segmentsPath)) {
      return NextResponse.json(
        { error: 'Esse vídeo já expirou no servidor. Gere os cortes de novo.' },
        { status: 404 }
      );
    }

    const segments = JSON.parse(await readFile(segmentsPath, 'utf-8'));

    const end = start + duration;
    const filename = `reclip-${Math.round(start)}-${duration}s.mp4`;
    const outputPath = path.join(workDir, filename);

    await cutClip({
      inputPath,
      segments,
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
