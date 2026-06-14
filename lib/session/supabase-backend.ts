import type { StorageBackend } from './backend';
import type { Session } from './schema';
import { getSupabaseClient, type SessionRow } from '../supabase/client';

export function sessionToRow(session: Session): SessionRow {
  return {
    id: session.sessionId,
    project_id: session.projectId,
    status: session.status,
    metadata: session.metadata as unknown as Record<string, unknown>,
    structured_brief: session.structuredBrief as unknown as Record<string, unknown>,
    coverage: session.coverage as unknown as Record<string, unknown>,
    chat_history: session.chatHistory,
    contradictions: session.contradictions,
    assumptions: session.assumptions,
    open_questions: session.openQuestions,
    recap_history: session.recapHistory,
    out_of_scope_topics: session.outOfScopeTopics,
    brief_markdown: session.briefMarkdown,
    llm_reasoning: session.llmReasoning,
    uploaded_images: session.uploadedImages,
    fetched_websites: session.fetchedWebsites,
    last_recap_turn: session.lastRecapTurn,
    shareable_url: session.shareableUrl,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

function rowToSession(row: SessionRow): Session {
  return {
    sessionId: row.id,
    projectId: row.project_id,
    status: row.status as Session['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shareableUrl: row.shareable_url,
    metadata: row.metadata as Session['metadata'],
    chatHistory: row.chat_history as Session['chatHistory'],
    structuredBrief: row.structured_brief as Session['structuredBrief'],
    coverage: row.coverage as Session['coverage'],
    contradictions: row.contradictions as Session['contradictions'],
    assumptions: row.assumptions as Session['assumptions'],
    openQuestions: row.open_questions as Session['openQuestions'],
    recapHistory: row.recap_history as Session['recapHistory'],
    lastRecapTurn: row.last_recap_turn,
    outOfScopeTopics: row.out_of_scope_topics as Session['outOfScopeTopics'],
    llmReasoning: row.llm_reasoning,
    briefMarkdown: row.brief_markdown,
    uploadedImages: row.uploaded_images as Session['uploadedImages'],
    fetchedWebsites: row.fetched_websites as Session['fetchedWebsites'],
  };
}

export class SupabaseSessionBackend implements StorageBackend {
  async createSession(session: Session): Promise<void> {
    const client = getSupabaseClient();
    const row = sessionToRow(session);
    // @ts-ignore
    const { error } = await client.from('sessions').insert(row);
    if (error) throw new Error(`Failed to create session: ${error.message}`);
  }

  async getSession(sessionId: string): Promise<Session> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (error || !data) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return rowToSession(data as SessionRow);
  }

  async updateSession(session: Session): Promise<void> {
    const client = getSupabaseClient();
    const row = sessionToRow(session);
    // @ts-ignore
    const query = client.from('sessions').update(row).eq('id', session.sessionId);
    const { error } = await query;
    if (error) throw new Error(`Failed to update session: ${error.message}`);
  }
}
