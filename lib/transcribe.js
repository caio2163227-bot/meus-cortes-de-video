import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Transcreve um arquivo de áudio/vídeo e retorna segmentos com timestamps.
 * Usamos 'verbose_json' pra ter o início/fim de cada trecho de fala —
 * isso é o que permite cortar exatamente no lugar certo depois.
 */
export async function transcribeVideo(filePath) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment', 'word'],
  });

  return {
    fullText: transcription.text,
    segments: transcription.segments.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    })),
    words: transcription.words || [],
  };
}
