import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

/**
 * Extrai só o áudio do vídeo, comprimido e em mono — isso reduz MUITO
 * o tamanho do arquivo (um vídeo de 200MB pode virar um áudio de 5MB).
 * É esse áudio menor que mandamos pra transcrição, evitando o erro
 * "413 Request Entity Too Large" da API gratuita.
 */
export function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .audioBitrate('64k')
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}
