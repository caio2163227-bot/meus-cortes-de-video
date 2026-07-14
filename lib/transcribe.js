import OpenAI from 'openai';
import fs from 'fs';

// A API da Groq é compatível com a da OpenAI — só trocamos o endereço (baseURL)
// e a chave. Isso nos dá transcrição via Whisper de graça, sem cartão de crédito.
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * Transcreve um arquivo de áudio/vídeo e retorna segmentos com timestamps.
 */
export async function transcribeVideo(filePath) {
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-large-v3',
    response_format: 'verbose_json',
  });

  return {
    fullText: transcription.text,
    segments: transcription.segments.map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    })),
  };
}
