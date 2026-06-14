import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sessionSchema, type Session } from './schema';
import { sessionToRow } from './supabase-backend';

export interface MigrationResult {
  total: number;
  inserted: number;
  skipped: number;
  failed: number;
}

export async function readSessionsFromDisk(dir: string): Promise<Session[]> {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const sessions: Session[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const raw = JSON.parse(content);

      const withDefaults = {
        briefMarkdown: '',
        fetchedWebsites: [],
        ...raw,
      };

      const session = sessionSchema.parse(withDefaults);
      sessions.push(session);
    } catch {
      // Skip files that can't be parsed
    }
  }

  return sessions;
}

export async function migrateSessions(
  client: SupabaseClient,
  sessions: Session[],
): Promise<MigrationResult> {
  if (sessions.length === 0) {
    return { total: 0, inserted: 0, skipped: 0, failed: 0 };
  }

  const rows = sessions.map(sessionToRow);

  try {
    const { error } = await client
      .from('sessions')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      return { total: sessions.length, inserted: 0, skipped: 0, failed: sessions.length };
    }

    return { total: sessions.length, inserted: sessions.length, skipped: 0, failed: 0 };
  } catch {
    return { total: sessions.length, inserted: 0, skipped: 0, failed: sessions.length };
  }
}
