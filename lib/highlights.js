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
function condenseSegments(segments, bucketSeconds = 20) {
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

function bucketsToText(buckets) {
  return buckets.map((s) => `[${Math.round(s.start)}s-${Math.round(s.end)}s] ${s.texts.join(' ')}`).join('\n');
}

// O plano gratuito da Groq tem um teto de tokens por minuto bem
// apertado pro gpt-oss-120b (8000 TPM) — vídeos de 20-30+ minutos
// facilmente passam disso e a chamada é recusada com erro 413. Em vez
// de simplesmente cortar o fim da transcrição (perdendo destaques do
// resto do vídeo), pega uma amostra distribuída pelo vídeo inteiro até
// caber no orçamento de caracteres.
const MAX_TRANSCRIPT_CHARS = 16000;

function fitTranscriptBudget(buckets, maxChars = MAX_TRANSCRIPT_CHARS) {
  let sampled = buckets;
  let text = bucketsToText(sampled);
  let step = 2;

  while (text.length > maxChars && step <= buckets.length) {
    sampled = buckets.filter((_, i) => i % step === 0);
    text = bucketsToText(sampled);
    step++;
  }

  return text;
}

// Rede de segurança: a IA às vezes ignora a duração pedida e corta no
// primeiro silêncio que encontra. Se um corte sair curto demais,
// estica o "end" até a próxima frase que chegue perto da duração
// pedida (em vez de aceitar um corte de 15s quando 90s foi pedido).
function enforceMinDuration(clips, segments, targetDuration) {
  if (segments.length === 0) return clips;
  const videoEnd = segments[segments.length - 1].end;
  const tolerance = Math.min(10, targetDuration * 0.2);

  return clips.map((clip) => {
    const duration = clip.end - clip.start;
    if (duration >= targetDuration - tolerance) return clip;

    const desiredEnd = clip.start + targetDuration;

    // Tenta esticar até o fim de uma frase perto da duração pedida,
    // em vez de cortar num ponto arbitrário no meio de uma palavra.
    const candidates = segments.filter((s) => s.end > clip.end && s.end <= desiredEnd + tolerance);
    const stretchedEnd = candidates.length > 0 ? candidates[candidates.length - 1].end : desiredEnd;

    const newEnd = Math.min(stretchedEnd, videoEnd);
    return newEnd > clip.end ? { ...clip, end: newEnd } : clip;
  });
}

export async function findHighlights(segments, { minClips = 3, maxClips = 8, targetDuration = 60 } = {}) {
  const condensed = condenseSegments(segments);
  const transcriptWithTimestamps = fitTranscriptBudget(condensed);

  const minDuration = Math.max(10, targetDuration - 10);
  const maxDuration = targetDuration + 10;

  const prompt = `Você é um editor de vídeo especialista em cortes virais para Reels, TikTok e Shorts.

Transcrição de um vídeo, com timestamps em segundos:

${transcriptWithTimestamps}

Identifique entre ${minClips} e ${maxClips} trechos com o maior potencial de viralizar como cortes curtos e independentes.

REQUISITO OBRIGATÓRIO DE DURAÇÃO: cada corte (end - start) precisa ficar entre ${minDuration} e ${maxDuration} segundos — o alvo é ${targetDuration}s. Isso não é opcional: um corte de 15s quando o pedido foi ${targetDuration}s está ERRADO, mesmo que o ponto de corte pareça "limpo". Se a ideia escolhida for curta demais, ESTENDA o "end" incluindo a frase seguinte da transcrição até chegar perto de ${targetDuration}s — nunca pare cedo só porque achou uma pausa.

O GANCHO INICIAL é a parte mais importante do corte — os primeiros 2-3 segundos decidem se a pessoa continua assistindo ou passa pro próximo vídeo. Ajuste o "start" pra começar EXATAMENTE numa frase de impacto, nunca no meio de uma ideia. Exemplos de gancho forte:
- Pergunta direta: "Você sabia que...", "Já parou pra pensar..."
- Afirmação contraintuitiva: algo que contraria o senso comum
- Revelação ou confissão: o momento exato em que algo inesperado é dito
- Dado ou número chocante logo de cara

NUNCA comece o corte com conectivos fracos como "então", "e", "tipo assim", "só que", "mas" — procure o ponto exato onde uma ideia nova e forte começa, mesmo que seja alguns segundos depois do início do trecho.

Corte limpo no final: dentro da janela de duração obrigatória acima, prefira terminar no fim de uma frase completa em vez de no meio de uma palavra. Mas respeitar a duração pedida vem PRIMEIRO — prefira um corte de ${targetDuration}s que termine 1-2s depois do fim ideal da frase a um corte de metade da duração.

Além do gancho falado, crie um GANCHO VISUAL — um texto curto (até 6 palavras) pra aparecer em destaque na tela nos primeiros segundos do corte, como uma manchete. Não precisa ser a transcrição literal: é a versão mais curta e impactante possível da ideia central do corte, tipo capa de vídeo viral. Exemplos: "ELE NÃO ESPERAVA ESSA RESPOSTA", "O ERRO QUE TODO MUNDO COMETE", "ISSO MUDOU TUDO".

Priorize também:
- Histórias completas, opiniões fortes, piadas ou dados surpreendentes
- Trechos que fazem sentido sozinhos, sem contexto anterior
- Use os timestamps do texto acima como referência — não invente números

Responda APENAS com JSON válido, sem texto antes ou depois:
{"clips":[{"start":<número>,"end":<número>,"title":"<título curto>","hook":"<a frase exata que abre o corte>","hookText":"<gancho visual curto, até 6 palavras>","reason":"<motivo em 1 frase>","score":<0-100>}]}`;

  const response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    // Reduzido de 1800 — o plano gratuito da Groq soma isso ao orçamento
    // de tokens por minuto (TPM), e 1400 já é bem mais que suficiente
    // pros campos que pedimos (título, gancho, motivo, nota) de até 8 clipes.
    max_tokens: 1400,
    reasoning_effort: 'low',
    messages: [{ role: 'user', content: prompt }],
  });

  const rawContent = response.choices[0].message.content || '';
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  const raw = (jsonMatch ? jsonMatch[0] : rawContent).replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(raw);
    const corrected = enforceMinDuration(parsed.clips, segments, targetDuration);
    return corrected.sort((a, b) => b.score - a.score);
  } catch (err) {
    throw new Error('Falha ao interpretar resposta da IA: ' + raw.slice(0, 300));
  }
}
