import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { transcribeVideo } from '@/lib/transcribe';
import { findHighlights } from '@/lib/highlights';
import { cutClip } from '@/lib/cutVideo';
import { extractAudio } from '@/lib/extractAudio';
import { downloadFromUrl, isVideoUrl } from '@/lib/downloadVideo';
import { DATA_DIR, addJobToIndex, cleanupOldOriginals } from '@/lib/jobIndex';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req) {
  let workDir;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Faça login para gerar cortes.' }, { status: 401 });
    }

    // Libera espaço apagando vídeos originais de jobs antigos, antes
    // de processar um novo (mantém os cortes finais no histórico).
    cleanupOldOriginals();

    const formData = await req.formData();
    const file = formData.get('video');
    const videoUrl = formData.get('videoUrl');
    const duration = parseInt(formData.get('duration'), 10) || 60;

    if (!file && !videoUrl) {
      return NextResponse.json({ error: 'Envie um vídeo ou cole um link.' }, { status: 400 });
    }

    const jobId = uuid();
    workDir = path.join(DATA_DIR, jobId);
    await mkdir(workDir, { recursive: true });

    let inputPath;
    let sourceLabel;
    if (videoUrl) {
      if (!isVideoUrl(videoUrl)) {
        return NextResponse.json({ error: 'Link inválido.' }, { status: 400 });
      }
      inputPath = await downloadFromUrl(videoUrl, workDir);
      sourceLabel = videoUrl;
    } else {
      inputPath = path.join(workDir, 'original.mp4');
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(inputPath, bytes);
      sourceLabel = file.name || 'arquivo enviado';
    }

    const audioPath = path.join(workDir, 'audio.mp3');
    await extractAudio(inputPath, audioPath);

    const { segments, words } = await transcribeVideo(audioPath);
    await writeFile(path.join(workDir, 'segments.json'), JSON.stringify({ segments, words }));

    const highlights = await findHighlights(segments, { targetDuration: duration });

    const clips = [];
    for (let i = 0; i < highlights.length; i++) {
      const h = highlights[i];
      const outputPath = path.join(workDir, `clip-${i + 1}.mp4`);
      await cutClip({
        inputPath,
        segments,
        words,
        start: h.start,
        end: h.end,
        outputPath,
        vertical: true,
        burnCaptions: true,
        hookText: h.hookText,
      });
      clips.push({ ...h, file: `/api/clips/${jobId}/clip-${i + 1}.mp4` });
    }

    // Guarda esse vídeo no histórico permanente, vinculado a essa conta
    addJobToIndex({
      jobId,
      userId: session.user.id,
      createdAt: new Date().toISOString(),
      sourceLabel,
      clips,
    });

    return NextResponse.json({ jobId, clips });
  } catch (err) {
    console.error(err);

    // Se algo deu errado no meio do caminho, apaga a pasta desse job —
    // senão fica lixo órfão ocupando espaço.
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
