import fs from 'fs';
import path from 'path';

// Carrega o TensorFlow/face-api sob demanda (import dinâmico, dentro de
// try/catch) — se por qualquer motivo essa dependência pesada falhar
// em algum ambiente, o resto do site continua funcionando normalmente,
// só cai pro corte centralizado de sempre em vez de seguir o rosto.
let tf;
let faceapi;
let modelLoaded = false;
let loadingPromise = null;

async function ensureModelLoaded() {
  if (modelLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      tf = await import('@tensorflow/tfjs-node');
      faceapi = await import('@vladmandic/face-api');
      const modelPath = path.join(process.cwd(), 'node_modules/@vladmandic/face-api/model');
      await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
      modelLoaded = true;
      return true;
    } catch (err) {
      console.error('Não consegui carregar detecção de rosto — usando corte centralizado:', err.message);
      modelLoaded = false;
      return false;
    }
  })();

  return loadingPromise;
}

/**
 * Detecta o rosto principal num frame e devolve a posição horizontal
 * dele como uma fração de 0 a 1 (0 = borda esquerda, 1 = borda
 * direita). Devolve null se não achar rosto nenhum ou se algo falhar —
 * nesse caso quem chama deve usar o corte centralizado de sempre.
 */
export async function detectFaceCenterX(framePath) {
  try {
    const ok = await ensureModelLoaded();
    if (!ok) return null;
    if (!fs.existsSync(framePath)) return null;

    const buffer = fs.readFileSync(framePath);
    const tensor = tf.node.decodeJpeg(buffer, 3);
    const width = tensor.shape[1];

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
    const detection = await faceapi.detectSingleFace(tensor, options);
    tensor.dispose();

    if (!detection) return null;

    const faceCenterX = detection.box.x + detection.box.width / 2;
    return Math.min(1, Math.max(0, faceCenterX / width));
  } catch (err) {
    console.error('Falha ao detectar rosto — usando corte centralizado:', err.message);
    return null;
  }
}
