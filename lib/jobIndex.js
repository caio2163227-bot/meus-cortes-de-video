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

// Lê o histórico. Se passar userId, devolve só os vídeos daquele usuário.
export function getAllJobs(userId) {
  let jobs = [];
  if (fs.existsSync(INDEX_PATH)) {
    try {
      jobs = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
    } catch {
      jobs = [];
    }
  }
  return userId ? jobs.filter((j) => j.userId === userId) : jobs;
}

export function getJobById(jobId) {
  return getAllJobs().find((j) => j.jobId === jobId) || null;
}

// Apaga o vídeo original e o áudio extraído de jobs antigos (mantém os
// cortes finais, que são bem menores, guardados pra sempre no histórico).
// Isso evita que o armazenamento fique cheio com o uso do site.
export function cleanupOldOriginals(maxAgeHours = 0) {
  const jobs = getAllJobs();
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  let freedCount = 0;

  for (const job of jobs) {
    const jobTime = new Date(job.createdAt).getTime();
    if (jobTime < cutoff) {
      const jobDir = path.join(DATA_DIR, job.jobId);
      for (const filename of ['original.mp4', 'audio.mp3']) {
        const filePath = path.join(jobDir, filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            freedCount++;
          } catch (err) {
            console.error('Falha ao limpar', filePath, err);
          }
        }
      }
    }
  }

  return freedCount;
}

// Remove um vídeo específico do histórico — apaga a entrada do índice
// e a pasta inteira dele no disco (cortes, originais, tudo).
export function removeJobFromIndex(jobId) {
  const jobs = getAllJobs();
  const filtered = jobs.filter((j) => j.jobId !== jobId);
  fs.writeFileSync(INDEX_PATH, JSON.stringify(filtered, null, 2));

  const jobDir = path.join(DATA_DIR, jobId);
  if (fs.existsSync(jobDir)) {
    fs.rmSync(jobDir, { recursive: true, force: true });
  }
}

// Apaga TUDO de um vídeo (cortes inclusos) 1 minuto depois de gerado —
// pra não pesar o armazenamento do servidor. O usuário precisa baixar
// os cortes na hora; depois disso não tem mais como recuperar.
export function cleanupExpiredClips(maxAgeMs = 60_000) {
  const jobs = getAllJobs();
  const now = Date.now();
  let removedCount = 0;

  for (const job of jobs) {
    const ageMs = now - new Date(job.createdAt).getTime();
    if (ageMs > maxAgeMs) {
      removeJobFromIndex(job.jobId);
      removedCount++;
    }
  }

  return removedCount;
}

// Roda a limpeza de cortes expirados de tempos em tempos, sem depender
// de alguém acessar o site — assim mesmo se ninguém visitar por um
// tempo, o servidor não acumula vídeo velho. `.unref()` evita que esse
// timer, sozinho, impeça o processo de encerrar quando precisar.
let cleanupSchedulerStarted = false;
export function ensureCleanupScheduler() {
  if (cleanupSchedulerStarted) return;
  cleanupSchedulerStarted = true;

  const interval = setInterval(() => {
    try {
      cleanupExpiredClips();
    } catch (err) {
      console.error('Falha na limpeza automática de cortes expirados:', err);
    }
  }, 15_000);
  interval.unref?.();
}
