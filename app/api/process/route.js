import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { transcribeVideo } from '@/lib/transcribe';
import { findHighlights } from '@/lib/highlights';
import { cutClip, extractFrame, getAudioDuration } from '@/lib/cutVideo';
import { extractAudio } from '@/lib/extractAudio';
import { downloadFromUrl, isVideoUrl } from '@/lib/downloadVideo';
import { DATA_DIR, addJobToIndex, cleanupOldOriginals, ensureCleanupScheduler } from '@/lib/jobIndex';
import { incrementUsage } from '@/lib/usage';
import { detectFaceCenterX } from '@/lib/faceDetect';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Garante que o relógio de limpeza automática (apaga cortes com mais
// de 1 minuto) esteja rodando — só precisa ligar uma vez por processo.
ensureCleanupScheduler();

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

    if (highlights.length === 0) {
      throw new Error('Não consegui identificar nenhum trecho de destaque nesse vídeo — tenta um vídeo com mais fala, ou um link diferente.');
    }

    const clips = [];
    const failureReasons = [];
    for (let i = 0; i < highlights.length; i++) {
      const h = highlights[i];
      const outputPath = path.join(workDir, `clip-${i + 1}.mp4`);

      // Detecta o rosto num frame perto do início do corte, pra seguir
      // quem está falando em vez de sempre cortar centralizado. Se
      // falhar por qualquer motivo, cai pro corte centralizado de sempre.
      let faceCenterXRatio;
      const framePath = path.join(workDir, `frame-${i + 1}.jpg`);
      try {
        const frameTime = h.start + Math.min(1, (h.end - h.start) * 0.1);
        await extractFrame(inputPath, frameTime, framePath);
        faceCenterXRatio = await detectFaceCenterX(framePath);
      } catch (err) {
        console.error('Falha ao detectar rosto pro corte', i + 1, ':', err.message);
      } finally {
        if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
      }

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
        faceCenterXRatio,
      });

      // Confere se o corte saiu de verdade (arquivo com duração real) antes
      // de oferecer ele. IMPORTANTE: só descarta quando o ffprobe CONSEGUE
      // rodar e confirma um arquivo inválido — se a checagem em si falhar
      // (ex: ffprobe indisponível nesse ambiente), não é sinal de que o
      // corte está quebrado, então deixa passar em vez de derrubar cortes
      // bons por causa de uma checagem extra que não funcionou.
      try {
        const clipDuration = await getAudioDuration(outputPath);
        if (!clipDuration || clipDuration < 0.5) {
          const fileSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
          const reason = `Corte ${i + 1}: duração ${clipDuration}s, arquivo ${fileSize} bytes`;
          console.error(`Corte descartado — ${reason}`);
          failureReasons.push(reason);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          continue;
        }
      } catch (err) {
        console.error(`Não consegui checar o corte ${i + 1} via ffprobe (mantendo o corte mesmo assim):`, err.message);
      }

      clips.push({ ...h, file: `/api/clips/${jobId}/clip-${i + 1}.mp4` });
    }

    if (clips.length === 0) {
      // Mensagem temporária com o motivo técnico real (em vez de um aviso
      // genérico) — isso já falhou 3x seguidas com a mensagem genérica, e
      // sem ver o motivo de verdade não dá pra saber o que está quebrando.
      throw new Error(`Nenhum corte saiu válido. Detalhe técnico: ${failureReasons.join(' | ') || 'sem detalhe'}`);
    }

    // Guarda esse vídeo no histórico permanente, vinculado a essa conta
    addJobToIndex({
      jobId,
      userId: session.user.id,
      createdAt: new Date().toISOString(),
      sourceLabel,
      clips,
    });

    // Só soma no limite diário depois de um processamento bem-sucedido —
    // erro no meio do caminho não deve "gastar" a cota da pessoa.
    incrementUsage(session.user.id);

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
