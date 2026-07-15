import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '@/lib/jobIndex';

// Ferramenta de emergência: varre a pasta de dados direto no disco
// (sem depender do índice, que pode estar corrompido) e apaga os
// arquivos pesados (vídeo original + áudio) de cada pasta de job.
export async function GET() {
  try {
    const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
    let freedBytes = 0;
    let freedFiles = 0;
    const report = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const jobDir = path.join(DATA_DIR, entry.name);
      for (const filename of ['original.mp4', 'audio.mp3']) {
        const filePath = path.join(jobDir, filename);
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          freedBytes += stat.size;
          freedFiles += 1;
          fs.unlinkSync(filePath);
          report.push(`${entry.name}/${filename} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
        }
      }
    }

    // Se o índice estiver corrompido, reseta pra uma lista vazia válida
    const indexPath = path.join(DATA_DIR, 'index.json');
    try {
      if (fs.existsSync(indexPath)) {
        JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      }
    } catch {
      fs.writeFileSync(indexPath, '[]');
    }

    return NextResponse.json({
      freedFiles,
      freedMB: (freedBytes / 1024 / 1024).toFixed(1),
      report,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
