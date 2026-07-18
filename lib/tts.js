import { writeFile } from 'fs/promises';
import path from 'path';

// API oficial do Google Cloud Text-to-Speech. Trocamos aqui depois que
// o canal não-oficial da Microsoft (edge-tts) se mostrou bloqueado pra
// IPs de servidor/nuvem como o do Railway — isso não era um bug de
// código, é um bloqueio de IP do lado da Microsoft, então precisava de
// uma API de verdade, com chave própria.
export const VOICES = [
  { id: 'pt-BR-Wavenet-A', label: 'Voz feminina' },
  { id: 'pt-BR-Wavenet-B', label: 'Voz masculina' },
];

export const DEFAULT_VOICE = VOICES[0].id;

const SYNTHESIZE_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Quebra o texto em palavras e intercala uma marca <mark> antes de
// cada uma — é assim que a API do Google devolve o timestamp de cada
// palavra (via "timepoints"), já que ela não faz isso automaticamente
// como o serviço da Microsoft fazia. Uma marca extra no final captura
// o fim da última palavra.
function buildSSML(text) {
  const rawWords = text.trim().split(/\s+/).filter(Boolean);
  const marked = rawWords.map((w, i) => `<mark name="w${i}"/>${escapeXml(w)}`).join(' ');
  const ssml = `<speak>${marked} <mark name="wEnd"/></speak>`;
  return { ssml, wordTexts: rawWords };
}

/**
 * Transforma um texto em áudio falado, junto com o timestamp de cada
 * palavra (pra queimar a legenda em sincronia com a fala).
 */
export async function synthesizeSpeech(text, voiceId, outputDir) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    throw new Error('Serviço de voz não configurado (falta a chave da API). Avisa o suporte.');
  }

  const voice = VOICES.some((v) => v.id === voiceId) ? voiceId : DEFAULT_VOICE;
  const { ssml, wordTexts } = buildSSML(text);

  let data;
  try {
    const res = await fetch(`${SYNTHESIZE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { ssml },
        voice: { languageCode: 'pt-BR', name: voice },
        audioConfig: { audioEncoding: 'MP3' },
        enableTimePointing: ['SSML_MARK'],
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      console.error('Falha na síntese de voz (Google TTS):', res.status, errBody?.error?.message);
      throw new Error('Não consegui gerar a narração agora — o serviço de voz pode estar indisponível. Tenta de novo em instantes.');
    }

    data = await res.json();
  } catch (err) {
    if (err.message?.includes('Não consegui gerar')) throw err;
    console.error('Falha na síntese de voz (Google TTS):', err.message);
    throw new Error('Não consegui gerar a narração agora — o serviço de voz pode estar indisponível. Tenta de novo em instantes.');
  }

  if (!data.audioContent) {
    throw new Error('Não recebi áudio da síntese de voz. Tenta de novo em instantes.');
  }

  const audioPath = path.join(outputDir, 'speech.mp3');
  await writeFile(audioPath, Buffer.from(data.audioContent, 'base64'));

  const timesByMark = new Map((data.timepoints || []).map((t) => [t.markName, t.timeSeconds]));
  const words = wordTexts
    .map((word, i) => {
      const start = timesByMark.get(`w${i}`);
      const end = timesByMark.get(i + 1 < wordTexts.length ? `w${i + 1}` : 'wEnd');
      return start != null && end != null ? { word, start, end } : null;
    })
    .filter(Boolean);

  return { audioPath, words };
}
