# Recorte — cortes automáticos de vídeo por IA

Projeto base tipo "Opus Clip": você envia um vídeo longo, a IA transcreve,
escolhe os melhores momentos, corta em formato vertical (9:16) e já entrega
com legenda queimada no vídeo.

## Como funciona (pipeline)

0. **Entrada do vídeo** — usuário cola um link (YouTube, TikTok, etc — qualquer
   site suportado pelo `yt-dlp`) ou envia um arquivo direto. Se for link,
   `lib/downloadVideo.js` baixa o vídeo no servidor antes de seguir o pipeline.
1. **Upload** — usuário envia o vídeo original pela interface (ou ele já
   chega baixado, se veio de um link).
2. **Transcrição** (`lib/transcribe.js`) — usa a API Whisper da OpenAI pra
   transformar o áudio em texto com timestamps.
3. **Seleção de destaques** (`lib/highlights.js`) — envia a transcrição pra
   Claude (Anthropic), que escolhe os trechos com mais potencial viral.
4. **Corte + reenquadramento + legenda** (`lib/cutVideo.js`) — usa ffmpeg pra
   cortar cada trecho, transformar em vertical 1080x1920 e queimar a legenda.

## Passo a passo pra rodar local

### 1. Instalar dependências
```bash
npm install
```

### 2. Criar sua chave de API
Crie um arquivo `.env.local` na raiz do projeto com:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
NEXTAUTH_SECRET=uma-string-aleatoria-bem-longa
```
- Pegue a chave da OpenAI em https://platform.openai.com/api-keys
- Pegue a chave da Anthropic em https://console.anthropic.com/settings/keys
- Gere o `NEXTAUTH_SECRET` (usado pra assinar a sessão de login) rodando
  `openssl rand -base64 32` — sem ele o login não funciona

O acesso à área de admin (`/admin/suporte`, onde ficam os chamados de
suporte) é liberado pra um email fixo direto no código, em
`lib/admin.js` — não precisa de variável de ambiente pra isso. Pra
trocar quem é admin, edita esse arquivo e faz um novo deploy.

### 2.0 Voz do dashboard (texto → vídeo)
A função de criar vídeo a partir de texto (`/dashboard`) narra o texto com a
API oficial do Google Cloud Text-to-Speech. Precisa de:
```
GOOGLE_TTS_API_KEY=...
```
- Crie um projeto em https://console.cloud.google.com, ative a "Cloud
  Text-to-Speech API" e gere uma chave de API em "APIs e serviços" →
  "Credenciais". Precisa de uma conta com cartão cadastrado (a Google exige
  isso pra ativar a API), mas o uso dentro da cota gratuita mensal não é
  cobrado.
- Sem essa variável configurada, o dashboard mostra um erro pedindo pra
  avisar o suporte, mas o resto do site funciona normalmente.

### 2.1 Sobre o download por link
A biblioteca `yt-dlp-exec` baixa automaticamente o binário do `yt-dlp` na
primeira execução. Em alguns hosts (ex: containers minimalistas) pode ser
necessário instalar o Python e o `yt-dlp` manualmente — se der erro nesse
passo específico, me chama que ajusto.

### 3. Rodar em desenvolvimento
```bash
npm run dev
```
Abra http://localhost:3000

## Onde hospedar de verdade (produção)

**Importante:** processar vídeo é pesado (ffmpeg + transcrição). A Vercel
sozinha tem limite de tempo de execução que pode não bastar. Recomendo:

- **Railway** ou **Render** (mais simples, plano free/baixo custo, suporta
  processos longos)
- Uma **VPS** (Hetzner, DigitalOcean) se quiser controle total

Em qualquer uma dessas, o processo é:
1. Suba o código (via GitHub)
2. Configure as variáveis de ambiente (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
   `NEXTAUTH_SECRET`, e `NEXTAUTH_URL` com a URL pública do site, ex:
   `https://seusite.com`)
3. Comando de build: `npm run build` — comando de start: `npm run start`

## Próximos passos sugeridos (na ordem que eu recomendo construir)

1. **Fila de processamento** — hoje o processamento é síncrono (o usuário
   espera na tela). Pra vídeos longos, o ideal é usar uma fila (ex: com
   Redis + BullMQ) e notificar quando terminar.
2. **Armazenamento em nuvem** — hoje os clipes ficam salvos localmente em
   `/tmp`. Pra produção, subir pro Cloudflare R2 ou AWS S3 e servir por URL.
3. **Limite de uso por conta** — já existe login (email/senha, contas
   individuais com histórico separado). O próximo passo natural é limitar
   quantos vídeos cada conta pode processar por mês.
4. **Reenquadramento inteligente** — hoje o corte vertical centraliza o
   frame. Dá pra melhorar com detecção de rosto (ex: usando um modelo de
   detecção facial) pra seguir quem está falando.
5. **Edição manual dos cortes** — deixar o usuário ajustar o início/fim do
   corte antes de baixar, com um timeline arrastável.

Me chama quando quiser evoluir qualquer um desses pontos — posso construir
peça por peça com você.
