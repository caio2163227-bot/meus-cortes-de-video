import WebSocket from 'ws';
import { randomUUID, createHash } from 'crypto';
import { writeFile } from 'fs/promises';
import path from 'path';

// Vozes neurais do próprio Microsoft Edge (acessadas sem precisar do
// Edge, do Windows nem de chave de API — mesmo serviço que roda o
// "Ler em voz alta" do navegador). Gratuito e sem cadastro, igual ao
// Groq usado no resto do site.
//
// IMPORTANTE: essa conexão fala diretamente com o serviço interno da
// Microsoft (o mesmo canal que a extensão "Read Aloud" do Edge usa) —
// não é uma API pública documentada. Implementado aqui na mão (em vez
// de depender de uma lib de terceiros) porque a lib testada antes
// (@andresaya/edge-tts) mandava cabeçalhos incompletos na conexão: o
// WebSocket abria normalmente, mas o servidor nunca respondia com
// áudio, e a chamada ficava travada até estourar o timeout.
export const VOICES = [
  { id: 'pt-BR-FranciscaNeural', label: 'Francisca (feminina)' },
  { id: 'pt-BR-AntonioNeural', label: 'Antônio (masculino)' },
];

export const DEFAULT_VOICE = VOICES[0].id;

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

// O protocolo da Azure/Edge devolve offset e duração em "ticks" de
// 100 nanosegundos — é assim que a própria Microsoft mede tempo nesse
// serviço, nada a ver com o resto do projeto.
const TICKS_PER_SECOND = 10_000_000;

// Token de sessão exigido pelo serviço, derivado da hora atual — é o
// mesmo cálculo que o próprio Edge faz (janela de 5 minutos, época do
// Windows). Sem isso a Microsoft recusa a conexão.
function secMsGec() {
  const ticks = Math.floor(Date.now() / 1000) + 11644473600;
  const roundedTicks = ticks - (ticks % 300);
  const windowsTicks = roundedTicks * 10_000_000;
  return createHash('sha256')
    .update(`${windowsTicks}${TRUSTED_CLIENT_TOKEN}`)
    .digest('hex')
    .toUpperCase();
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSSML(text, voice) {
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="pt-BR">` +
    `<voice name="${voice}"><prosody pitch="+0Hz" rate="+0%" volume="+0%">` +
    `${escapeXml(text)}</prosody></voice></speak>`
  );
}

function nowHeaderDate() {
  return new Date().toUTCString().replace('GMT', 'GMT+0000 (Coordinated Universal Time)');
}

/**
 * Transforma um texto em áudio falado. Diferente da transcrição normal
 * (que roda o Whisper DEPOIS de já ter um áudio), aqui o timestamp de
 * cada palavra já vem pronto na própria síntese — não precisa
 * retranscrever nada pra saber onde cada palavra cai no tempo.
 */
export async function synthesizeSpeech(text, voiceId, outputDir) {
  const voice = VOICES.some((v) => v.id === voiceId) ? voiceId : DEFAULT_VOICE;
  const reqId = randomUUID().replace(/-/g, '');

  const url =
    `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
    `&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}` +
    `&ConnectionId=${reqId}`;

  const audioChunks = [];
  const words = [];

  try {
    await synthesizeOverWebSocket({ url, reqId, text, voice, audioChunks, words });
  } catch (err) {
    if (err.friendly) throw err;
    console.error('Falha na síntese de voz:', err.message);
    throw new Error('Não consegui gerar a narração agora — o serviço de voz pode estar indisponível. Tenta de novo em instantes.');
  }

  if (audioChunks.length === 0) {
    throw new Error('Não recebi áudio da síntese de voz. Tenta de novo em instantes.');
  }

  const audioPath = path.join(outputDir, 'speech.mp3');
  await writeFile(audioPath, Buffer.concat(audioChunks));

  return { audioPath, words };
}

function friendlyError(message) {
  const err = new Error(message);
  err.friendly = true;
  return err;
}

function synthesizeOverWebSocket({ url, reqId, text, voice, audioChunks, words }) {
  return new Promise((resolve, reject) => {
    // Sem esses cabeçalhos exatos (sobretudo o Origin de extensão e o
    // subprotocolo "synthesize"), o servidor aceita a conexão mas
    // nunca manda os dados de volta — daí o timeout de inatividade.
    const ws = new WebSocket(url, ['synthesize'], {
      headers: {
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent':
          `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ` +
          `Chrome/${CHROMIUM_FULL_VERSION} Safari/537.36 Edg/${CHROMIUM_FULL_VERSION}`,
      },
    });

    let timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        ws.terminate();
        reject(friendlyError('A síntese de voz demorou demais e foi cancelada. Tenta de novo em instantes.'));
      }, 20_000);
    };
    resetTimeout();

    ws.on('open', () => {
      resetTimeout();
      const timestamp = nowHeaderDate();

      ws.send(
        `X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: true },
                  outputFormat: OUTPUT_FORMAT,
                },
              },
            },
          })
      );

      ws.send(
        `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}\r\nPath:ssml\r\n\r\n` +
          buildSSML(text, voice)
      );
    });

    ws.on('message', (data) => {
      resetTimeout();
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      const audioMarker = Buffer.from('Path:audio\r\n');
      const audioStart = buffer.indexOf(audioMarker);
      if (audioStart !== -1) {
        audioChunks.push(buffer.subarray(audioStart + audioMarker.length));
        return;
      }

      const asText = buffer.toString('utf8');
      if (asText.includes('Path:audio.metadata')) {
        const metaStart = buffer.indexOf('\r\n\r\n') + 4;
        try {
          const meta = JSON.parse(asText.slice(metaStart));
          for (const m of meta.Metadata || []) {
            if (m.Type === 'WordBoundary') {
              words.push({
                word: m.Data.text?.Text || '',
                start: m.Data.Offset / TICKS_PER_SECOND,
                end: (m.Data.Offset + m.Data.Duration) / TICKS_PER_SECOND,
              });
            }
          }
        } catch {
          // metadado mal formado — ignora, não é crítico pro áudio em si
        }
        return;
      }

      if (asText.includes('Path:turn.end')) {
        ws.close();
      }
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      resolve();
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
