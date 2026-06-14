import { createClient } from '@supabase/supabase-js';

export interface SessionRow {
  id: string;
  project_id: string;
  status: string;
  metadata: Record<string, unknown>;
  structured_brief: Record<string, unknown>;
  coverage: Record<string, unknown>;
  chat_history: unknown[];
  contradictions: unknown[];
  assumptions: unknown[];
  open_questions: unknown[];
  recap_history: unknown[];
  out_of_scope_topics: unknown[];
  brief_markdown: string;
  llm_reasoning: string;
  uploaded_images: unknown[];
  fetched_websites: unknown[];
  last_recap_turn: number;
  shareable_url: string;
  created_at: string;
  updated_at: string;
}

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set when STORAGE_BACKEND=supabase',
      );
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}
