import { NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { synthesizeSpeech } from '@/lib/tts';
import { renderTextVideo, getAudioDuration } from '@/lib/cutVideo';
import { DATA_DIR, addJobToIndex, cleanupOldOriginals, ensureCleanupScheduler } from '@/lib/jobIndex';
import { incrementUsage } from '@/lib/usage';

export const runtime = 'nodejs';
export const maxDuration = 300;

ensureCleanupScheduler();

const MIN_CHARS = 10;
const MAX_CHARS = 800; // ~1-2 minutos falados, pra caber num formato de corte curto

export async function POST(req) {
  let workDir;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Faça login para gerar vídeos.' }, { status: 401 });
    }

    cleanupOldOriginals();

    const body = await req.json();
    const text = (body.text || '').trim();
    const voice = body.voice;

    if (text.length < MIN_CHARS) {
      return NextResponse.json({ error: 'Escreve um pouco mais de texto.' }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { error: `Texto muito longo — no máximo ${MAX_CHARS} caracteres.` },
        { status: 400 }
      );
    }

    const jobId = uuid();
    workDir = path.join(DATA_DIR, jobId);
    await mkdir(workDir, { recursive: true });

    const { audioPath, words } = await synthesizeSpeech(text, voice, workDir);
    const duration = await getAudioDuration(audioPath);

    const outputPath = path.join(workDir, 'clip-1.mp4');
    await renderTextVideo({ audioPath, words, duration, outputPath });

    // Mesma checagem do fluxo de cortes: garante que o vídeo final saiu
    // válido antes de entregar, em vez de arriscar mandar um arquivo
    // corrompido que "carrega e não mostra nada" pro usuário.
    const finalDuration = await getAudioDuration(outputPath).catch(() => 0);
    if (!finalDuration || finalDuration < 0.5) {
      throw new Error('O vídeo saiu inválido dessa vez — o servidor pode estar sobrecarregado. Tenta de novo em instantes.');
    }

    const title = text.length > 60 ? text.slice(0, 57) + '...' : text;
    const clip = { file: `/api/clips/${jobId}/clip-1.mp4`, title, start: 0, end: duration };

    addJobToIndex({
      jobId,
      userId: session.user.id,
      createdAt: new Date().toISOString(),
      sourceLabel: 'Texto → vídeo',
      clips: [clip],
    });

    incrementUsage(session.user.id);

    return NextResponse.json({ jobId, clips: [clip] });
  } catch (err) {
    console.error(err);

    if (workDir && fs.existsSync(workDir)) {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error('Falha ao limpar pasta após erro:', cleanupErr);
      }
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
