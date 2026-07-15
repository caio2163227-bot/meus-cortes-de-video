import OpenAI from 'openai';

// Mesmo endpoint da Groq, agora usando o gpt-oss-120b — modelo de
// raciocínio mais novo e mais forte que a Groq recomendou depois de
// descontinuar o llama-3.3-70b-versatile. Continua gratuito, sem cartão.
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export async function findHighlights(segments, { minClips = 3, maxClips = 8, targetDuration = 60 } = {}) {
  const transcriptWithTimestamps = segments
    .map((s) => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.text}`)
    .join('\n');

  const prompt = `Você é um editor de vídeo especialista em cortes virais para Reels, TikTok e Shorts, com anos de experiência analisando o que realmente prende atenção nas redes sociais.

Abaixo está a transcrição completa de um vídeo, com timestamps em segundos.

Antes de responder, pense com cuidado sobre cada trecho candidato: o que faz ele funcionar como corte independente? Um bom gancho normalmente é uma pergunta provocativa, uma afirmação polêmica, uma revelação inesperada, ou o início de uma história com tensão. Evite escolher trechos genéricos ou que dependam de contexto anterior pra fazer sentido.

Sua tarefa: identificar entre ${minClips} e ${maxClips} trechos com o maior potencial de viralizar como cortes curtos e independentes. Priorize:
- Momentos com um gancho forte nos primeiros 3 segundos
- Histórias completas, opiniões fortes, piadas, revelações ou dados surpreendentes
- Trechos que fazem sentido sozinhos, sem precisar de contexto anterior
- Use os timestamps EXATOS fornecidos na transcrição como referência pro início e fim — não invente números
- Duração de aproximadamente ${targetDuration} segundos cada (pode variar um pouco pra respeitar o começo e o fim de frases completas, mas fique próximo desse alvo)

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

  const response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    max_tokens: 4000,
    reasoning_effort: 'low',
    messages: [{ role: 'user', content: prompt }],
  });

  const rawContent = response.choices[0].message.content || '';
  // Extrai só o bloco { ... } — assim, mesmo se o modelo de raciocínio
  // deixar algum texto de "pensamento" antes ou depois, ainda pegamos
  // o JSON certinho.
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  const raw = (jsonMatch ? jsonMatch[0] : rawContent).replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(raw);
    return parsed.clips.sort((a, b) => b.score - a.score);
  } catch (err) {
    throw new Error('Falha ao interpretar resposta da IA: ' + raw.slice(0, 300));
  }
}
