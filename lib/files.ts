import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ensurePolyfills } from './polyfills';

const SUPPORTED_DOC_MIMES = [
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/pdf',
];

const SUPPORTED_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/gif',
];

export function isSupportedFile(mimeType: string): boolean {
  return SUPPORTED_DOC_MIMES.includes(mimeType) || SUPPORTED_IMAGE_MIMES.includes(mimeType);
}

export function isImageFile(mimeType: string): boolean {
  return SUPPORTED_IMAGE_MIMES.includes(mimeType);
}

export async function extractText(buffer: Buffer, _filename: string, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    await ensurePolyfills();
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  }

  return buffer.toString('utf-8');
}

export async function storeImage(
  buffer: Buffer,
  sessionId: string,
  filename: string,
  mimeType: string
): Promise<{
  id: string;
  originalName: string;
  storedPath: string;
  mimeType: string;
  uploadedAt: string;
}> {
  const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
  const sessionDir = path.join(uploadsDir, sessionId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const id = `img-${randomUUID().slice(0, 8)}`;
  const storedPath = path.join(sessionDir, filename);
  fs.writeFileSync(storedPath, buffer);

  return {
    id,
    originalName: filename,
    storedPath: `uploads/${sessionId}/${filename}`,
    mimeType,
    uploadedAt: new Date().toISOString(),
  };
}
