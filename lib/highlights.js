import OpenAI from 'openai';

// Mesmo endpoint da Groq, agora usando o gpt-oss-120b — modelo de
// raciocínio mais novo e mais forte que a Groq recomendou depois de
// descontinuar o llama-3.3-70b-versatile. Continua gratuito, sem cartão.
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Agrupa os segmentos (que costumam vir bem picados do Whisper) em
// blocos maiores — isso reduz bastante o tamanho do texto mandado pra
// IA, evitando estourar o limite de tokens por minuto em vídeos longos.
function condenseSegments(segments, bucketSeconds = 15) {
  if (segments.length === 0) return [];
  const buckets = [];
  let current = { start: segments[0].start, end: segments[0].end, texts: [segments[0].text] };

  for (let i = 1; i < segments.length; i++) {
    const s = segments[i];
    if (s.start - current.start <= bucketSeconds) {
      current.end = s.end;
      current.texts.push(s.text);
    } else {
      buckets.push(current);
      current = { start: s.start, end: s.end, texts: [s.text] };
    }
  }
  buckets.push(current);

  return buckets;
}

export async function findHighlights(segments, { minClips = 3, maxClips = 8, targetDuration = 60 } = {}) {
  const condensed = condenseSegments(segments);
  const transcriptWithTimestamps = condensed
    .map((s) => `[${Math.round(s.start)}s-${Math.round(s.end)}s] ${s.texts.join(' ')}`)
    .join('\n');

  const prompt = `Você é um editor de vídeo especialista em cortes virais para Reels, TikTok e Shorts.

Transcrição de um vídeo, com timestamps em segundos:

${transcriptWithTimestamps}

Identifique entre ${minClips} e ${maxClips} trechos com o maior potencial de viralizar como cortes curtos e independentes.

O GANCHO INICIAL é a parte mais importante do corte — os primeiros 2-3 segundos decidem se a pessoa continua assistindo ou passa pro próximo vídeo. Ajuste o "start" pra começar EXATAMENTE numa frase de impacto, nunca no meio de uma ideia. Exemplos de gancho forte:
- Pergunta direta: "Você sabia que...", "Já parou pra pensar..."
- Afirmação contraintuitiva: algo que contraria o senso comum
- Revelação ou confissão: o momento exato em que algo inesperado é dito
- Dado ou número chocante logo de cara

NUNCA comece o corte com conectivos fracos como "então", "e", "tipo assim", "só que", "mas" — procure o ponto exato onde uma ideia nova e forte começa, mesmo que seja alguns segundos depois do início do trecho.

Corte LIMPO no final também importa: escolha o "end" no fim de uma frase ou ideia completa — nunca no meio de uma palavra, de uma frase ou logo antes de uma respiração/pausa longa. Prefira cortar um pouco antes de um silêncio a cortar no meio de uma ideia.

Além do gancho falado, crie um GANCHO VISUAL — um texto curto (até 6 palavras) pra aparecer em destaque na tela nos primeiros segundos do corte, como uma manchete. Não precisa ser a transcrição literal: é a versão mais curta e impactante possível da ideia central do corte, tipo capa de vídeo viral. Exemplos: "ELE NÃO ESPERAVA ESSA RESPOSTA", "O ERRO QUE TODO MUNDO COMETE", "ISSO MUDOU TUDO".

Priorize também:
- Histórias completas, opiniões fortes, piadas ou dados surpreendentes
- Trechos que fazem sentido sozinhos, sem contexto anterior
- Use os timestamps do texto acima como referência — não invente números
- Duração de aproximadamente ${targetDuration} segundos cada

Responda APENAS com JSON válido, sem texto antes ou depois:
{"clips":[{"start":<número>,"end":<número>,"title":"<título curto>","hook":"<a frase exata que abre o corte>","hookText":"<gancho visual curto, até 6 palavras>","reason":"<motivo em 1 frase>","score":<0-100>}]}`;

  const response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    max_tokens: 1800,
    reasoning_effort: 'low',
    messages: [{ role: 'user', content: prompt }],
  });

  const rawContent = response.choices[0].message.content || '';
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  const raw = (jsonMatch ? jsonMatch[0] : rawContent).replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(raw);
    return parsed.clips.sort((a, b) => b.score - a.score);
  } catch (err) {
    throw new Error('Falha ao interpretar resposta da IA: ' + raw.slice(0, 300));
  }
}
