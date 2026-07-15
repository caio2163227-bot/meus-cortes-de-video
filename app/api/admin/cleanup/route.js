import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '@/lib/jobIndex';

function folderSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? folderSize(full) : fs.statSync(full).size;
  }
  return total;
}

// Diagnóstico: mostra o tamanho de cada pasta de job. Se ?apply=true
// for passado na URL, apaga as pastas maiores que 20MB (tamanho normal
// de só os cortes finais é bem menor que isso).
export async function GET(req) {
  try {
    const apply = new URL(req.url).searchParams.get('apply') === 'true';
    const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
    const folders = [];
    let totalBytes = 0;
    let deletedMB = 0;
    const deleted = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'lost+found') continue;
      const jobDir = path.join(DATA_DIR, entry.name);
      const size = folderSize(jobDir);
      const mb = size / 1024 / 1024;

      if (apply && mb > 20) {
        fs.rmSync(jobDir, { recursive: true, force: true });
        deletedMB += mb;
        deleted.push({ folder: entry.name, mb: mb.toFixed(1) });
        continue;
      }

      totalBytes += size;
      folders.push({ folder: entry.name, mb: mb.toFixed(1) });
    }

    folders.sort((a, b) => b.mb - a.mb);

    return NextResponse.json({
      applied: apply,
      deleted,
      deletedMB: deletedMB.toFixed(1),
      remainingFolders: folders.length,
      remainingMB: (totalBytes / 1024 / 1024).toFixed(1),
      folders,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
