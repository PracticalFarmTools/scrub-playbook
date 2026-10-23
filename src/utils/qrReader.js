const MAX_SIDE = 1024;

export function canUseCamera(nav = globalThis.navigator) {
  return typeof nav?.mediaDevices?.getUserMedia === 'function';
}

async function nativeReader(win) {
  if (typeof win?.BarcodeDetector !== 'function') return null;
  try {
    const formats = await win.BarcodeDetector.getSupportedFormats?.();
    if (Array.isArray(formats) && !formats.includes('qr_code')) return null;
    const detector = new win.BarcodeDetector({ formats: ['qr_code'] });
    return async (video) => (await detector.detect(video))[0]?.rawValue || '';
  } catch {
    return null;
  }
}

/**
 * Returns `read(video)`, which gives the text of a QR code in the current frame or ''.
 * Uses the browser's detector when it reads QR codes, and jsQR on a canvas otherwise,
 * which is how Safari on iPhone scans.
 */
export async function createQrReader({
  win = globalThis.window,
  makeCanvas = () => globalThis.document.createElement('canvas'),
  loadDecoder = () => import('jsqr').then(module => module.default),
} = {}) {
  const native = await nativeReader(win);
  if (native) return native;
  const decode = await loadDecoder();
  const canvas = makeCanvas();
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('no-canvas');
  return async (video) => {
    const width = video?.videoWidth || 0;
    const height = video?.videoHeight || 0;
    if (!width || !height) return '';
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return decode(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data || '';
  };
}
