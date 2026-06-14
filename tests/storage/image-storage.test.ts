import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const { mockUpload } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  }),
}));

import { FileImageStorage, SupabaseImageStorage, createImageStorage, type ImageMetadata } from '@/lib/storage/image-storage';

const TEST_UPLOADS_DIR = path.join(process.cwd(), 'test-uploads-image-storage');

function createMinimalPng(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde,
    0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
    0x00, 0x03, 0x00, 0x01, 0x0e, 0x45, 0xab, 0x52,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    0xae, 0x42, 0x60, 0x82,
  ]);
}

describe('FileImageStorage', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_UPLOADS_DIR)) fs.rmSync(TEST_UPLOADS_DIR, { recursive: true });
    process.env.UPLOADS_DIR = TEST_UPLOADS_DIR;
  });

  afterEach(() => {
    if (fs.existsSync(TEST_UPLOADS_DIR)) fs.rmSync(TEST_UPLOADS_DIR, { recursive: true });
    delete process.env.UPLOADS_DIR;
  });

  it('stores image on disk and returns metadata with correct shape', async () => {
    const storage = new FileImageStorage();
    const buffer = createMinimalPng();
    const sessionId = 'test-session-1';
    const filename = 'reference.png';
    const mimeType = 'image/png';

    const metadata = await storage.storeImage(buffer, sessionId, filename, mimeType);

    expect(metadata).toHaveProperty('id');
    expect(metadata).toHaveProperty('originalName');
    expect(metadata).toHaveProperty('storedPath');
    expect(metadata).toHaveProperty('mimeType');
    expect(metadata).toHaveProperty('uploadedAt');

    expect(metadata.id).toMatch(/^img-/);
    expect(metadata.originalName).toBe(filename);
    expect(metadata.mimeType).toBe(mimeType);
    expect(metadata.storedPath).toBe(`uploads/${sessionId}/${filename}`);
    expect(new Date(metadata.uploadedAt).toISOString()).toBe(metadata.uploadedAt);

    const filePath = path.join(TEST_UPLOADS_DIR, sessionId, filename);
    expect(fs.existsSync(filePath)).toBe(true);
    const writtenBuffer = fs.readFileSync(filePath);
    expect(Buffer.compare(writtenBuffer, buffer)).toBe(0);
  });

  it('handles multiple images for the same session', async () => {
    const storage = new FileImageStorage();
    const sessionId = 'test-session-2';

    const meta1 = await storage.storeImage(createMinimalPng(), sessionId, 'img1.png', 'image/png');
    const meta2 = await storage.storeImage(createMinimalPng(), sessionId, 'img2.png', 'image/png');

    expect(meta1.storedPath).not.toBe(meta2.storedPath);
    expect(meta1.id).not.toBe(meta2.id);

    expect(fs.existsSync(path.join(TEST_UPLOADS_DIR, sessionId, 'img1.png'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_UPLOADS_DIR, sessionId, 'img2.png'))).toBe(true);
  });
});

describe('createImageStorage', () => {
  beforeEach(() => {
    delete process.env.STORAGE_BACKEND;
  });

  afterEach(() => {
    delete process.env.STORAGE_BACKEND;
  });

  it('returns FileImageStorage when STORAGE_BACKEND is file', () => {
    process.env.STORAGE_BACKEND = 'file';
    const storage = createImageStorage();
    expect(storage).toBeInstanceOf(FileImageStorage);
  });

  it('returns FileImageStorage when STORAGE_BACKEND is not set', () => {
    const storage = createImageStorage();
    expect(storage).toBeInstanceOf(FileImageStorage);
  });
});

describe('SupabaseImageStorage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uploads image to client-uploads bucket and returns correct metadata', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'test-session-1/reference.png' }, error: null });

    const storage = new SupabaseImageStorage();
    const buffer = createMinimalPng();
    const sessionId = 'test-session-1';
    const filename = 'reference.png';
    const mimeType = 'image/png';

    const metadata = await storage.storeImage(buffer, sessionId, filename, mimeType);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledWith(
      `${sessionId}/${filename}`,
      buffer,
      { contentType: mimeType, upsert: false }
    );

    expect(metadata.id).toMatch(/^img-/);
    expect(metadata.originalName).toBe(filename);
    expect(metadata.mimeType).toBe(mimeType);
    expect(metadata.storedPath).toBe(`${sessionId}/${filename}`);
    expect(new Date(metadata.uploadedAt).toISOString()).toBe(metadata.uploadedAt);
  });

  it('returns correct storedPath with different filenames', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'abc-123/design.png' }, error: null });

    const storage = new SupabaseImageStorage();
    const metadata = await storage.storeImage(createMinimalPng(), 'abc-123', 'design.png', 'image/png');

    expect(metadata.storedPath).toBe('abc-123/design.png');
  });
});
