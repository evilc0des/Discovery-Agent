let polyfillsReady = false;

export async function ensurePolyfills(): Promise<void> {
  if (polyfillsReady) return;

  try {
    const canvas = await import('@napi-rs/canvas');
    if (typeof globalThis.DOMMatrix === 'undefined') {
      (globalThis as Record<string, unknown>).DOMMatrix = canvas.DOMMatrix;
    }
    if (typeof globalThis.DOMPoint === 'undefined') {
      (globalThis as Record<string, unknown>).DOMPoint = canvas.DOMPoint;
    }
    if (typeof globalThis.DOMRect === 'undefined') {
      (globalThis as Record<string, unknown>).DOMRect = canvas.DOMRect;
    }
    if (typeof globalThis.Path2D === 'undefined') {
      (globalThis as Record<string, unknown>).Path2D = canvas.Path2D;
    }
    if (typeof globalThis.ImageData === 'undefined') {
      (globalThis as Record<string, unknown>).ImageData = canvas.ImageData;
    }
    polyfillsReady = true;
  } catch {
    throw new Error(
      'PDF processing requires @napi-rs/canvas native module. ' +
      'Ensure it is installed and system dependencies (cairo, pango) are available.'
    );
  }
}
