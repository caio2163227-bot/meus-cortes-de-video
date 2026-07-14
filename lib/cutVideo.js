import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

/**
 * Gera um arquivo .srt a partir dos segmentos de transcrição
 * que caem dentro da janela [start, end] do clipe, com timestamps
 * relativos ao início do clipe (senão a legenda aparece torta).
 */
function buildSrt(segments, clipStart, clipEnd, outPath) {
  const toSrtTime = (t) => {
    const h = String(Math.floor(t / 3600)).padStart(2, '0');
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(t % 60)).padStart(2, '0');
    const ms = String(Math.floor((t % 1) * 1000)).padStart(3, '0');
    return `${h}:${m}:${s},${ms}`;
  };

  const relevant = segments.filter((s) => s.end > clipStart && s.start < clipEnd);

  const lines = relevant
    .map((s, i) => {
      const start = Math.max(0, s.start - clipStart);
      const end = Math.min(clipEnd - clipStart, s.end - clipStart);
      return `${i + 1}\n${toSrtTime(start)} --> ${toSrtTime(end)}\n${s.text}\n`;
    })
    .join('\n');

  fs.writeFileSync(outPath, lines);
  return outPath;
}

/**
 * Corta o vídeo original no intervalo [start, end], reenquadra para
 * 9:16 (vertical) centralizando no meio do frame, e queima a legenda.
 */
export function cutClip({ inputPath, segments, start, end, outputPath, vertical = true, burnCaptions = true }) {
  return new Promise((resolve, reject) => {
    const duration = end - start;
    const srtPath = outputPath.replace(/\.mp4$/, '.srt');

    if (burnCaptions) {
      buildSrt(segments, start, end, srtPath);
    }

    let command = ffmpeg(inputPath)
      .setStartTime(start)
      .duration(duration);

    // Reenquadra pro formato vertical 1080x1920: escala pela altura
    // e corta as laterais, centralizando (bom padrão pra rosto centralizado;
    // reenquadramento inteligente com detecção de rosto pode ser adicionado depois).
    const filters = [];
    if (vertical) {
      filters.push('scale=1080:1920:force_original_aspect_ratio=increase');
      filters.push('crop=1080:1920');
    }
    if (burnCaptions) {
      const escapedSrt = srtPath.replace(/:/g, '\\:');
      filters.push(
        `subtitles=${escapedSrt}:force_style='FontName=Arial,FontSize=16,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=2,Alignment=2,MarginV=80'`
      );
    }

    if (filters.length) {
      command = command.videoFilters(filters);
    }

    command
      .outputOptions(['-c:a aac', '-b:a 128k'])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}
