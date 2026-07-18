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

    // A duração vem do timestamp da própria síntese (último "word boundary"
    // + uma folga) em vez do ffprobe — assim esse passo, que é essencial
    // (define o tamanho do fundo do vídeo), não depende de um binário
    // externo que pode não estar disponível em todo ambiente.
    const lastWordEnd = words.length > 0 ? words[words.length - 1].end : 0;
    const duration = lastWordEnd > 0 ? lastWordEnd + 0.4 : await getAudioDuration(audioPath);

    const outputPath = path.join(workDir, 'clip-1.mp4');
    await renderTextVideo({ audioPath, words, duration, outputPath });

    // Confere se o vídeo final saiu válido antes de entregar — mas só
    // bloqueia quando o ffprobe CONSEGUE rodar e confirma o problema. Se a
    // checagem em si falhar (ex: ffprobe indisponível), não é sinal de que
    // o vídeo está quebrado, então deixa passar.
    try {
      const finalDuration = await getAudioDuration(outputPath);
      if (!finalDuration || finalDuration < 0.5) {
        const fileSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
        // Mensagem temporária com o motivo técnico real, pra diagnosticar.
        throw new Error(`Vídeo inválido — duração ${finalDuration}s, arquivo ${fileSize} bytes.`);
      }
    } catch (err) {
      if (err.message?.startsWith('Vídeo inválido')) throw err;
      console.error('Não consegui checar o vídeo final via ffprobe (mantendo mesmo assim):', err.message);
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
