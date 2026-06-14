import { randomUUID } from 'crypto';
import { storeImage } from '../files';
import { getSupabaseClient } from '../supabase/client';

export interface ImageMetadata {
  id: string;
  originalName: string;
  storedPath: string;
  mimeType: string;
  uploadedAt: string;
}

export interface ImageStorage {
  storeImage(
    buffer: Buffer,
    sessionId: string,
    filename: string,
    mimeType: string,
  ): Promise<ImageMetadata>;
}

export function createImageStorage(): ImageStorage {
  const backend = process.env.STORAGE_BACKEND || 'file';
  switch (backend) {
    case 'file':
      return new FileImageStorage();
    case 'supabase':
      return new SupabaseImageStorage();
    default:
      throw new Error(`Unknown STORAGE_BACKEND: ${backend}`);
  }
}

export class FileImageStorage implements ImageStorage {
  async storeImage(
    buffer: Buffer,
    sessionId: string,
    filename: string,
    mimeType: string,
  ): Promise<ImageMetadata> {
    return storeImage(buffer, sessionId, filename, mimeType);
  }
}

const SUPABASE_BUCKET = 'client-uploads';

export class SupabaseImageStorage implements ImageStorage {
  async storeImage(
    buffer: Buffer,
    sessionId: string,
    filename: string,
    mimeType: string,
  ): Promise<ImageMetadata> {
    const client = getSupabaseClient();
    const storagePath = `${sessionId}/${filename}`;
    const id = `img-${randomUUID().slice(0, 8)}`;

    const { error } = await client.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return {
      id,
      originalName: filename,
      storedPath: storagePath,
      mimeType,
      uploadedAt: new Date().toISOString(),
    };
  }
}
