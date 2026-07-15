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

// Diagnóstico: mostra o tamanho de cada pasta de job, sem apagar nada.
export async function GET() {
  try {
    const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
    const folders = [];
    let totalBytes = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const jobDir = path.join(DATA_DIR, entry.name);
      const size = folderSize(jobDir);
      totalBytes += size;
      folders.push({ folder: entry.name, mb: (size / 1024 / 1024).toFixed(1) });
    }

    folders.sort((a, b) => b.mb - a.mb);

    return NextResponse.json({
      totalFolders: folders.length,
      totalMB: (totalBytes / 1024 / 1024).toFixed(1),
      folders,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
