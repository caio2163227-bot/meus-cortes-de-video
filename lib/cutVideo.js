import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

// Quanto tempo o gancho visual fica na tela, no início do corte.
const HOOK_DURATION = 2.5;

function toSrtTime(t) {
  const h = String(Math.floor(t / 3600)).padStart(2, '0');
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(t % 60)).padStart(2, '0');
  const ms = String(Math.floor((t % 1) * 1000)).padStart(3, '0');
  return `${h}:${m}:${s},${ms}`;
}

/**
 * Legenda em blocos curtos (3 palavras por vez, estilo CapCut/Opus Clip)
 * usando o timestamp de cada palavra — bem mais fácil de ler rápido do
 * que uma frase inteira parada na tela. Devolve [] se não tiver
 * timestamp por palavra disponível (aí quem chama cai pro modo por frase).
 */
function cuesFromWords(words, clipStart, clipEnd, chunkSize = 3) {
  const relevant = words.filter((w) => w.end > clipStart && w.start < clipEnd);
  if (relevant.length === 0) return [];

  const chunks = [];
  for (let i = 0; i < relevant.length; i += chunkSize) {
    chunks.push(relevant.slice(i, i + chunkSize));
  }

  return chunks.map((chunk, i) => {
    const start = Math.max(0, chunk[0].start - clipStart);
    let end = Math.min(clipEnd - clipStart, chunk[chunk.length - 1].end - clipStart);
    end = Math.max(end, start + 0.35); // duração mínima, senão pisca rápido demais

    const nextChunk = chunks[i + 1];
    if (nextChunk) {
      end = Math.min(end, Math.max(0, nextChunk[0].start - clipStart));
    }

    return { start, end, text: chunk.map((w) => w.word).join(' ') };
  });
}

/**
 * Alternativa por frase inteira (como a transcrição veio do Whisper) —
 * usada só quando não temos timestamp por palavra.
 */
function cuesFromSegments(segments, clipStart, clipEnd) {
  return segments
    .filter((s) => s.end > clipStart && s.start < clipEnd)
    .map((s) => ({
      start: Math.max(0, s.start - clipStart),
      end: Math.min(clipEnd - clipStart, s.end - clipStart),
      text: s.text,
    }));
}

// Empurra pra fora (ou encurta) as cues que cairiam em cima do gancho
// visual, senão os dois textos ficam sobrepostos e ilegíveis no mesmo
// canto da tela nos primeiros segundos.
function clampCuesAfter(cues, minStart) {
  return cues
    .filter((c) => c.end > minStart)
    .map((c) => ({ ...c, start: Math.max(c.start, minStart) }));
}

function writeSrt(cues, outPath) {
  const lines = cues
    .map((c, i) => `${i + 1}\n${toSrtTime(c.start)} --> ${toSrtTime(c.end)}\n${c.text}\n`)
    .join('\n');
  fs.writeFileSync(outPath, lines);
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
 * Duração de um arquivo de áudio/vídeo em segundos, via ffprobe.
 */
export function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(data.format.duration);
    });
  });
}

/**
 * Monta um vídeo vertical do zero a partir só de um áudio (fala gerada
 * por TTS) — sem nenhum vídeo original. O fundo é uma cor sólida (a
 * mesma do site) do tamanho exato da fala, com a legenda em blocos
 * curtos queimada por cima, igual ao estilo dos cortes normais.
 */
export function renderTextVideo({ audioPath, words, duration, outputPath }) {
  return new Promise((resolve, reject) => {
    const srtPath = outputPath.replace(/\.mp4$/, '.srt');
    const cues = words && words.length > 0 ? cuesFromWords(words, 0, duration) : [];

    const captionStyle =
      "force_style='FontName=Arial,FontSize=34,Bold=1,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=2,Alignment=2,MarginV=160'";

    const filters = [];
    if (cues.length > 0) {
      writeSrt(cues, srtPath);
      const escapedSrt = srtPath.replace(/:/g, '\\:');
      filters.push(`subtitles=${escapedSrt}:${captionStyle}`);
    }

    let command = ffmpeg()
      .input(`color=c=0x0B0E11:s=720x1280:d=${duration}:r=30`)
      .inputFormat('lavfi')
      .input(audioPath);

    if (filters.length) {
      command = command.videoFilters(filters);
    }

    command
      .outputOptions([
        '-c:a aac',
        '-b:a 192k',
        '-preset medium',
        '-crf 18',
        '-threads 1',
        '-shortest',
        '-map_metadata', '-1',
        '-map_chapters', '-1',
        '-fflags', '+bitexact',
        '-flags:v', '+bitexact',
        '-flags:a', '+bitexact',
      ])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

/**
 * Extrai um único frame do vídeo, num instante específico, como JPEG —
 * usado pra rodar a detecção de rosto num ponto representativo do corte,
 * sem precisar analisar o vídeo inteiro.
 */
export function extractFrame(inputPath, time, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(Math.max(0, time))
      .frames(1)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Corta o vídeo original no intervalo [start, end], reenquadra para
 * 9:16 (vertical) — seguindo o rosto detectado (faceCenterXRatio) se
 * vier um, ou centralizado como sempre se não vier —, queima a legenda
 * em blocos curtos e, se vier um gancho visual, mostra ele em destaque
 * (maiúsculo) nos primeiros segundos, antes da legenda normal começar.
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
  faceCenterXRatio,
}) {
  return new Promise((resolve, reject) => {
    const duration = end - start;
    const srtPath = outputPath.replace(/\.mp4$/, '.srt');
    const hookSrtPath = outputPath.replace(/\.mp4$/, '.hook.srt');
    const hasHook = Boolean(hookText && hookText.trim());

    let command = ffmpeg(inputPath)
      .setStartTime(start)
      .duration(duration);

    const filters = [];
    if (vertical) {
      // 720x1280 — 1080x1920 chegou a rodar aqui, mas o servidor não tem
      // memória suficiente pra codificar nessa resolução (o processo do
      // ffmpeg morria no meio, gerando corte corrompido toda vez). A
      // qualidade real (CRF mais baixo, ver outputOptions) continua valendo.
      filters.push('scale=720:1280:force_original_aspect_ratio=increase');

      if (typeof faceCenterXRatio === 'number') {
        // "iw"/"ow" são resolvidos pelo próprio ffmpeg em tempo real (largura
        // da imagem já escalada / largura do corte) — não precisamos saber
        // essas dimensões aqui no Node. clip() mantém o corte dentro da
        // imagem mesmo se o rosto estiver bem na borda.
        filters.push(`crop=720:1280:x='clip(${faceCenterXRatio}*iw-ow/2\\,0\\,iw-ow)':y=0`);
      } else {
        filters.push('crop=720:1280');
      }
    }

    // IMPORTANTE: o binário do ffmpeg-static usado em produção não tem o
    // filtro `drawtext` compilado (dá "Filter not found"), e o libass
    // dessa build só escala o texto certo com Alignment=2 (base-centro)
    // — qualquer outro alinhamento (topo, meio) faz a legenda sair
    // gigante e cortada da tela. Por isso o gancho visual usa o mesmo
    // `subtitles` + Alignment=2 da legenda normal, só aparecendo ANTES
    // dela (a legenda normal é cortada/adiada pra não sobrepor).
    const captionStyle =
      "force_style='FontName=Arial,FontSize=30,Bold=1,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=2,Alignment=2,MarginV=120'";

    if (hasHook) {
      const wrapped = wrapHookText(hookText.trim().toUpperCase());
      writeSrt([{ start: 0, end: HOOK_DURATION, text: wrapped }], hookSrtPath);
      const escapedHookSrt = hookSrtPath.replace(/:/g, '\\:');
      filters.push(`subtitles=${escapedHookSrt}:${captionStyle}`);
    }

    if (burnCaptions) {
      let cues = words && words.length > 0 ? cuesFromWords(words, start, end) : [];
      if (cues.length === 0) {
        cues = cuesFromSegments(segments, start, end);
      }
      if (hasHook) {
        cues = clampCuesAfter(cues, HOOK_DURATION);
      }
      if (cues.length > 0) {
        writeSrt(cues, srtPath);
        const escapedSrt = srtPath.replace(/:/g, '\\:');
        filters.push(`subtitles=${escapedSrt}:${captionStyle}`);
      }
    }

    if (filters.length) {
      command = command.videoFilters(filters);
    }

    command
      .outputOptions([
        '-c:a aac',
        '-b:a 192k',
        '-preset medium',
        '-crf 18',
        '-threads 1',
        // Limpa metadados de privacidade do arquivo final — o vídeo
        // original enviado pode ter localização, autor, dispositivo,
        // data de gravação etc; nada disso deve ir pro corte publicado.
        '-map_metadata', '-1',
        '-map_chapters', '-1',
        '-fflags', '+bitexact',
        '-flags:v', '+bitexact',
        '-flags:a', '+bitexact',
      ])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}
