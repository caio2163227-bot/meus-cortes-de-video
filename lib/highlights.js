import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Recebe os segmentos transcritos (com timestamps) e pede pra IA
 * escolher os trechos com mais potencial de viralizar como corte curto.
 *
 * Retorna uma lista de clipes: { start, end, title, hook, reason, score }
 */
export async function findHighlights(segments, { minClips = 3, maxClips = 8, clipMinSeconds = 20, clipMaxSeconds = 90 } = {}) {
  const transcriptWithTimestamps = segments
    .map((s) => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.text}`)
    .join('\n');

  const prompt = `Você é um editor de vídeo especialista em cortes virais para Reels, TikTok e Shorts.

Abaixo está a transcrição completa de um vídeo, com timestamps em segundos.

Sua tarefa: identificar entre ${minClips} e ${maxClips} trechos com o maior potencial de viralizar como cortes curtos e independentes. Priorize:
- Momentos com um gancho forte nos primeiros segundos (hook)
- Histórias, opiniões fortes, piadas, revelações ou dados surpreendentes
- Trechos que fazem sentido sozinhos, sem precisar de contexto anterior
- Duração entre ${clipMinSeconds} e ${clipMaxSeconds} segundos

Transcrição:
${transcriptWithTimestamps}

Responda APENAS com um JSON válido, sem nenhum texto antes ou depois, no formato:
{
  "clips": [
    {
      "start": <segundos, número>,
      "end": <segundos, número>,
      "title": "<título curto e chamativo para o corte>",
      "hook": "<a frase de abertura que vai prender atenção>",
      "reason": "<por que esse trecho tem potencial, em 1 frase>",
      "score": <de 0 a 100, potencial viral>
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('')
    .replace(/```json|```/g, '')
    .trim();

  try {
    const parsed = JSON.parse(raw);
    return parsed.clips.sort((a, b) => b.score - a.score);
  } catch (err) {
    throw new Error('Falha ao interpretar resposta da IA: ' + raw.slice(0, 300));
  }
}
