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
    // Pede um formato que já vem com vídeo+áudio juntos (em vez de
    // baixar separado e juntar depois) — a junção precisa guardar os
    // dois arquivos E o resultado final ao mesmo tempo, o que estoura
    // nosso espaço mesmo pra vídeos de tamanho médio.
    format: 'best[height<=480][ext=mp4]/best[height<=480]/best[ext=mp4]/best',
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

  // Sem isso, um download que trava (bloqueio de bot do YouTube, busca
  // do componente JS externo que não retorna etc.) deixa a requisição
  // pendurada pra sempre — o usuário vê o cronômetro rodando e nunca
  // recebe erro nem resultado. Com o timeout, falha com uma mensagem
  // clara em vez de travar indefinidamente.
  try {
    await ytDlp.exec(url, options, { timeout: 120_000 });
  } catch (err) {
    if (err.timedOut) {
      throw new Error('O download desse link demorou demais e foi cancelado. O site de origem pode estar bloqueando o download — tenta baixar o vídeo manualmente e enviar o arquivo.');
    }
    throw err;
  }

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
