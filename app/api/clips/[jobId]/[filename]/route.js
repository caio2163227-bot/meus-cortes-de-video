import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

// Essa rota serve os vídeos cortados que ficam salvos no servidor,
// pra que o navegador consiga carregar e tocar eles na tela.
export async function GET(req, { params }) {
  const { jobId, filename } = params;

  if (filename.includes('..') || jobId.includes('..')) {
    return NextResponse.json({ error: 'Caminho inválido.' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'tmp', jobId, filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
  }

  const fileBuffer = await readFile(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'no-store',
    },
  });
}
