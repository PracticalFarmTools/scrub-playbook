import { describe, expect, it, vi } from 'vitest';
import { canUseCamera, createQrReader } from './qrReader';

function fakeCanvas() {
  const context = {
    drawImage: vi.fn(),
    getImageData: vi.fn((x, y, width, height) => ({ data: new Uint8ClampedArray(width * height * 4), width, height })),
  };
  return { canvas: { width: 0, height: 0, getContext: () => context }, context };
}

describe('createQrReader', () => {
  it('uses the browser detector when it reads QR codes', async () => {
    class BarcodeDetector {
      static getSupportedFormats = async () => ['qr_code', 'ean_13'];
      async detect() { return [{ rawValue: 'card text' }]; }
    }
    const loadDecoder = vi.fn();
    const read = await createQrReader({ win: { BarcodeDetector }, loadDecoder });
    expect(await read({})).toBe('card text');
    expect(loadDecoder).not.toHaveBeenCalled();
  });

  it('falls back to jsQR when there is no detector, as on iPhone', async () => {
    const { canvas, context } = fakeCanvas();
    const decode = vi.fn(() => ({ data: 'scrubplaybook card' }));
    const read = await createQrReader({ win: {}, makeCanvas: () => canvas, loadDecoder: async () => decode });
    expect(await read({ videoWidth: 1920, videoHeight: 1080 })).toBe('scrubplaybook card');
    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(576);
    expect(context.drawImage).toHaveBeenCalled();
    expect(decode).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 1024, 576, { inversionAttempts: 'dontInvert' });
  });

  it('falls back when the detector cannot read QR codes', async () => {
    class BarcodeDetector {
      static getSupportedFormats = async () => ['ean_13'];
    }
    const { canvas } = fakeCanvas();
    const decode = vi.fn(() => null);
    const read = await createQrReader({ win: { BarcodeDetector }, makeCanvas: () => canvas, loadDecoder: async () => decode });
    expect(await read({ videoWidth: 640, videoHeight: 480 })).toBe('');
    expect(decode).toHaveBeenCalled();
  });

  it('waits for the first video frame', async () => {
    const { canvas } = fakeCanvas();
    const decode = vi.fn();
    const read = await createQrReader({ win: {}, makeCanvas: () => canvas, loadDecoder: async () => decode });
    expect(await read({ videoWidth: 0, videoHeight: 0 })).toBe('');
    expect(decode).not.toHaveBeenCalled();
  });
});

describe('canUseCamera', () => {
  it('needs getUserMedia', () => {
    expect(canUseCamera({ mediaDevices: { getUserMedia: () => {} } })).toBe(true);
    expect(canUseCamera({})).toBe(false);
  });
});
