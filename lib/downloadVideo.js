import ytDlp from 'yt-dlp-exec';
import path from 'path';

/**
 * Baixa um vídeo a partir de uma URL (YouTube, Vimeo, X, TikTok, etc —
 * qualquer site suportado pelo yt-dlp) e salva como .mp4 no destino.
 *
 * Isso poupa o usuário de precisar baixar o vídeo manualmente e
 * fazer upload — ele só cola o link.
 */
export async function downloadFromUrl(url, outputDir) {
  const outputPath = path.join(outputDir, 'original.mp4');

  await ytDlp(url, {
    output: outputPath,
    format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    mergeOutputFormat: 'mp4',
    noPlaylist: true,
    maxFilesize: '2G',
  });

  return outputPath;
}

/**
 * Valida rapidamente se a string parece ser uma URL de vídeo suportada,
 * pra decidir no backend se tratamos como link ou como upload de arquivo.
 */
export function isVideoUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}
