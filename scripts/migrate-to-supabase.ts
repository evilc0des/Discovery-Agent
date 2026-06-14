import { createClient } from '@supabase/supabase-js';
import { readSessionsFromDisk, migrateSessions, type MigrationResult } from '@/lib/session/migrate';

export interface RunOptions {
  sessionsDir: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export async function run(options: RunOptions): Promise<MigrationResult & { exitCode: number }> {
  if (!options.supabaseUrl || !options.supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set');
    return { total: 0, inserted: 0, skipped: 0, failed: 0, exitCode: 1 };
  }

  const sessions = await readSessionsFromDisk(options.sessionsDir);
  if (sessions.length === 0) {
    console.log('No session files found to migrate.');
    return { total: 0, inserted: 0, skipped: 0, failed: 0, exitCode: 0 };
  }

  console.log(`Found ${sessions.length} session(s) to migrate.`);

  const client = createClient(options.supabaseUrl, options.supabaseKey);
  const result = await migrateSessions(client, sessions);

  console.log(`\nMigration complete:`);
  console.log(`  Total:    ${result.total}`);
  console.log(`  Inserted: ${result.inserted}`);
  console.log(`  Skipped:  ${result.skipped}`);
  console.log(`  Failed:   ${result.failed}`);

  const exitCode = result.failed > 0 ? 1 : 0;
  return { ...result, exitCode };
}

function loadEnvFile(filePath: string) {
  try {
    const { readFileSync } = require('fs');
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch { /* ok */ }
}

const isMainModule = process.argv[1]?.includes('migrate-to-supabase');

if (isMainModule) {
  const { resolve } = require('path');
  loadEnvFile(resolve(process.cwd(), '.env.local'));

  const sessionsDir = process.env.SESSIONS_DIR || 'sessions';

  run({
    sessionsDir,
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  }).then((result) => {
    process.exit(result.exitCode);
  }).catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
