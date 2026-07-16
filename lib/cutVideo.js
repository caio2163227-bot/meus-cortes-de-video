import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

function toSrtTime(t) {
  const h = String(Math.floor(t / 3600)).padStart(2, '0');
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(t % 60)).padStart(2, '0');
  const ms = String(Math.floor((t % 1) * 1000)).padStart(3, '0');
  return `${h}:${m}:${s},${ms}`;
}

/**
 * Legenda em blocos curtos (3-4 palavras por vez, estilo CapCut/Opus
 * Clip) usando o timestamp de cada palavra — bem mais fácil de ler
 * rápido do que uma frase inteira parada na tela. Devolve false se
 * não tiver timestamp por palavra disponível (aí quem chama cai pro
 * modo por frase).
 */
function buildSrtFromWords(words, clipStart, clipEnd, outPath, chunkSize = 3) {
  const relevant = words.filter((w) => w.end > clipStart && w.start < clipEnd);
  if (relevant.length === 0) return false;

  const chunks = [];
  for (let i = 0; i < relevant.length; i += chunkSize) {
    chunks.push(relevant.slice(i, i + chunkSize));
  }

  const lines = chunks
    .map((chunk, i) => {
      const start = Math.max(0, chunk[0].start - clipStart);
      let end = Math.min(clipEnd - clipStart, chunk[chunk.length - 1].end - clipStart);
      end = Math.max(end, start + 0.35); // duração mínima, senão pisca rápido demais

      const nextChunk = chunks[i + 1];
      if (nextChunk) {
        end = Math.min(end, Math.max(0, nextChunk[0].start - clipStart));
      }

      const text = chunk.map((w) => w.word).join(' ');
      return `${i + 1}\n${toSrtTime(start)} --> ${toSrtTime(end)}\n${text}\n`;
    })
    .join('\n');

  fs.writeFileSync(outPath, lines);
  return true;
}

/**
 * Alternativa por frase inteira (como a transcrição veio do Whisper) —
 * usada só quando não temos timestamp por palavra.
 */
function buildSrtFromSegments(segments, clipStart, clipEnd, outPath) {
  const relevant = segments.filter((s) => s.end > clipStart && s.start < clipEnd);

  const lines = relevant
    .map((s, i) => {
      const start = Math.max(0, s.start - clipStart);
      const end = Math.min(clipEnd - clipStart, s.end - clipStart);
      return `${i + 1}\n${toSrtTime(start)} --> ${toSrtTime(end)}\n${s.text}\n`;
    })
    .join('\n');

  fs.writeFileSync(outPath, lines);
  return true;
}

// Quebra o gancho visual em até 2 linhas curtas, pra caber na largura
// do vídeo vertical sem estourar a tela.
function wrapHookText(text, maxLineLen = 18, maxLines = 2) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > maxLineLen && current) {
      lines.push(current);
      current = w;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);

  return lines.slice(0, maxLines).join('\n');
}

/**
 * Corta o vídeo original no intervalo [start, end], reenquadra para
 * 9:16 (vertical) centralizando no meio do frame, queima a legenda em
 * blocos curtos e, se vier um gancho visual, mostra ele em destaque
 * nos primeiros segundos — tipo capa de vídeo viral.
 */
export function cutClip({
  inputPath,
  segments,
  words,
  start,
  end,
  outputPath,
  vertical = true,
  burnCaptions = true,
  hookText,
}) {
  return new Promise((resolve, reject) => {
    const duration = end - start;
    const srtPath = outputPath.replace(/\.mp4$/, '.srt');
    const hookTxtPath = outputPath.replace(/\.mp4$/, '.hook.txt');

    if (burnCaptions) {
      const gotWordTimestamps = words && words.length > 0 && buildSrtFromWords(words, start, end, srtPath);
      if (!gotWordTimestamps) {
        buildSrtFromSegments(segments, start, end, srtPath);
      }
    }

    let command = ffmpeg(inputPath)
      .setStartTime(start)
      .duration(duration);

    const filters = [];
    if (vertical) {
      // Resolução um pouco menor (720x1280 em vez de 1080x1920) —
      // continua nítido em celular, mas usa bem menos memória pra codificar.
      filters.push('scale=720:1280:force_original_aspect_ratio=increase');
      filters.push('crop=720:1280');
    }

    if (hookText && hookText.trim()) {
      fs.writeFileSync(hookTxtPath, wrapHookText(hookText.trim().toUpperCase()));
      const escapedHookPath = hookTxtPath.replace(/:/g, '\\:');
      filters.push(
        `drawtext=textfile=${escapedHookPath}:font=Arial:fontsize=50:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=22:line_spacing=6:x=(w-text_w)/2:y=h*0.10:enable='between(t\\,0\\,2.5)'`
      );
    }

    if (burnCaptions) {
      const escapedSrt = srtPath.replace(/:/g, '\\:');
      // BorderStyle=3 (caixa preta opaca) é a combinação que o libass
      // escala certinho pro tamanho real do vídeo — testei a alternativa
      // com só contorno (BorderStyle=1) e ela sai gigante e mal
      // posicionada, então NÃO troque sem testar de novo antes.
      filters.push(
        `subtitles=${escapedSrt}:force_style='FontName=Arial,FontSize=30,Bold=1,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=2,Alignment=2,MarginV=120'`
      );
    }

    if (filters.length) {
      command = command.videoFilters(filters);
    }

    command
      .outputOptions([
        '-c:a aac',
        '-b:a 128k',
        '-preset veryfast',
        '-crf 26',
        '-threads 1',
      ])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}
