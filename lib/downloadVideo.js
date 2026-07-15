import ytDlp from 'yt-dlp-exec';
import path from 'path';
import fs from 'fs';

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
    format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    mergeOutputFormat: 'mp4',
    noPlaylist: true,
    maxFilesize: '2G',
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
