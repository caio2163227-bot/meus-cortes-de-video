import ytDlp from 'yt-dlp-exec';
import path from 'path';
import fs from 'fs';
import ffmpegPath from 'ffmpeg-static';

/**
 * Baixa um vídeo a partir de uma URL. Se houver cookies configurados
 * (variável de ambiente YT_COOKIES), usa eles pra se autenticar como
 * usuário logado — isso evita o bloqueio "Sign in to confirm you're
 * not a bot" que o YouTube aplica em pedidos vindos de servidor.
 *
 * IMPORTANTE: o conteúdo de YT_COOKIES nunca deve ir pro GitHub — só
 * existe como variável de ambiente no Railway, e é escrito num arquivo
 * temporário aqui, dentro da pasta do job (que não é versionada).
 */
export async function downloadFromUrl(url, outputDir) {
  const outputPath = path.join(outputDir, 'original.mp4');

  const options = {
    output: outputPath,
    format: 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]',
    mergeOutputFormat: 'mp4',
    noPlaylist: true,
    maxFilesize: '400M', // limite realista pro tamanho do nosso Volume (500MB)
    // O YouTube exige resolver um desafio de JavaScript pra liberar os
    // formatos de vídeo de verdade (sem isso, só vêm imagens). O servidor
    // já tem Node.js instalado (é o que roda o site), então usamos ele.
    jsRuntimes: 'node',
    remoteComponents: 'ejs:github',
    // Avisa o yt-dlp onde está o ffmpeg do projeto, senão ele não
    // consegue juntar o vídeo e o áudio baixados separadamente.
    ffmpegLocation: ffmpegPath,
  };

  if (process.env.YT_COOKIES) {
    const cookiesPath = path.join(outputDir, 'cookies.txt');
    fs.writeFileSync(cookiesPath, process.env.YT_COOKIES);
    options.cookies = cookiesPath;
  }

  await ytDlp(url, options);

  return outputPath;
}

export function isVideoUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}
