import { EdgeTTS } from '@andresaya/edge-tts';
import path from 'path';

// Vozes neurais do próprio Microsoft Edge (acessadas sem precisar do
// Edge, do Windows nem de chave de API — mesmo serviço que roda o
// "Ler em voz alta" do navegador). Gratuito e sem cadastro, igual ao
// Groq usado no resto do site.
export const VOICES = [
  { id: 'pt-BR-FranciscaNeural', label: 'Francisca (feminina)' },
  { id: 'pt-BR-AntonioNeural', label: 'Antônio (masculino)' },
];

export const DEFAULT_VOICE = VOICES[0].id;

// O protocolo da Azure/Edge devolve offset e duração em "ticks" de
// 100 nanosegundos — é assim que a própria Microsoft mede tempo nesse
// serviço, nada a ver com o resto do projeto.
const TICKS_PER_SECOND = 10_000_000;

/**
 * Transforma um texto em áudio falado. Diferente da transcrição normal
 * (que roda o Whisper DEPOIS de já ter um áudio), aqui o timestamp de
 * cada palavra já vem pronto na própria síntese — não precisa
 * retranscrever nada pra saber onde cada palavra cai no tempo.
 */
export async function synthesizeSpeech(text, voiceId, outputDir) {
  const voice = VOICES.some((v) => v.id === voiceId) ? voiceId : DEFAULT_VOICE;

  const tts = new EdgeTTS();
  await tts.synthesize(text, voice, { outputFormat: 'audio-24khz-48kbitrate-mono-mp3' });

  const audioPath = await tts.toFile(path.join(outputDir, 'speech'));

  const words = tts.getWordBoundaries().map((b) => ({
    word: b.text,
    start: b.offset / TICKS_PER_SECOND,
    end: (b.offset + b.duration) / TICKS_PER_SECOND,
  }));

  return { audioPath, words };
}
