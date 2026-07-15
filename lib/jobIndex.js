import fs from 'fs';
import path from 'path';

// Em produção, aponta pro Volume permanente do Railway (variável DATA_DIR).
// Localmente (sem essa variável), usa a pasta tmp de sempre, só pra
// não quebrar o "npm run dev" no seu computador.
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'tmp');

const INDEX_PATH = path.join(DATA_DIR, 'index.json');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Adiciona um vídeo processado ao histórico permanente.
export function addJobToIndex(job) {
  ensureDataDir();
  let jobs = [];
  if (fs.existsSync(INDEX_PATH)) {
    try {
      jobs = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
    } catch {
      jobs = [];
    }
  }
  jobs.unshift(job); // mais recente primeiro
  fs.writeFileSync(INDEX_PATH, JSON.stringify(jobs, null, 2));
}

// Lê o histórico completo.
export function getAllJobs() {
  if (!fs.existsSync(INDEX_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
  } catch {
    return [];
  }
}
