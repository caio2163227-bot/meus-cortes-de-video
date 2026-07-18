import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './jobIndex';

const USAGE_PATH = path.join(DATA_DIR, 'usage.json');
export const DAILY_LIMIT = 15;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getAllUsage() {
  if (!fs.existsSync(USAGE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(USAGE_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAllUsage(entries) {
  ensureDataDir();
  fs.writeFileSync(USAGE_PATH, JSON.stringify(entries, null, 2));
}

// Data no formato AAAA-MM-DD — o limite reseta à meia-noite (UTC do
// servidor), não é uma janela deslizante de 24h.
function today() {
  return new Date().toISOString().slice(0, 10);
}

// Descarta contadores de dias antigos — não precisamos guardar pra
// sempre quantos vídeos alguém processou há 3 meses.
function cleanupOldUsage(entries, maxAgeDays = 7) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return entries.filter((e) => new Date(e.date).getTime() >= cutoff);
}

export function getUsageToday(userId) {
  const entries = getAllUsage();
  const entry = entries.find((e) => e.userId === userId && e.date === today());
  return entry?.count || 0;
}

export function hasReachedDailyLimit(userId) {
  return getUsageToday(userId) >= DAILY_LIMIT;
}

// Soma 1 corte gerado hoje pra essa conta. Chame só depois que o
// processamento terminar com sucesso — não deve penalizar quem teve
// erro no meio do caminho.
export function incrementUsage(userId) {
  let entries = getAllUsage();
  entries = cleanupOldUsage(entries);

  const entry = entries.find((e) => e.userId === userId && e.date === today());
  if (entry) {
    entry.count += 1;
  } else {
    entries.push({ userId, date: today(), count: 1 });
  }

  saveAllUsage(entries);
}
