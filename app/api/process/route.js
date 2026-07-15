import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { transcribeVideo } from '@/lib/transcribe';
import { findHighlights } from '@/lib/highlights';
import { cutClip } from '@/lib/cutVideo';
import { extractAudio } from '@/lib/extractAudio';
import { downloadFromUrl, isVideoUrl } from '@/lib/downloadVideo';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('video');
    const videoUrl = formData.get('videoUrl');

    if (!file && !videoUrl) {
      return NextResponse.json({ error: 'Envie um vídeo ou cole um link.' }, { status: 400 });
    }

    const jobId = uuid();
    const workDir = path.join(process.cwd(), 'tmp', jobId);
    await mkdir(workDir, { recursive: true });

    let inputPath;
    if (videoUrl) {
      if (!isVideoUrl(videoUrl)) {
        return NextResponse.json({ error: 'Link inválido.' }, { status: 400 });
      }
      inputPath = await downloadFromUrl(videoUrl, workDir);
    } else {
      inputPath = path.join(workDir, 'original.mp4');
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(inputPath, bytes);
    }

    const audioPath = path.join(workDir, 'audio.mp3');
    await extractAudio(inputPath, audioPath);

    const { segments } = await transcribeVideo(audioPath);
    const highlights = await findHighlights(segments);

    const clips = [];
    for (let i = 0; i < highlights.length; i++) {
      const h = highlights[i];
      const outputPath = path.join(workDir, `clip-${i + 1}.mp4`);
      await cutClip({
        inputPath,
        segments,
        start: h.start,
        end: h.end,
        outputPath,
        vertical: true,
        burnCaptions: true,
      });
      clips.push({ ...h, file: `/api/clips/${jobId}/clip-${i + 1}.mp4` });
    }

    return NextResponse.json({ jobId, clips });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
