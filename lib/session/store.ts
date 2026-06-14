import { randomUUID } from 'crypto';
import { sessionSchema, createDefaultStructuredBrief, type Session } from './schema';
import { computeCoverage } from '../coverage';
import { type StorageBackend, FileSessionBackend } from './backend';
import { SupabaseSessionBackend } from './supabase-backend';

function createBackend(dir: string): StorageBackend {
  const backend = process.env.STORAGE_BACKEND || 'file';
  switch (backend) {
    case 'file':
      return new FileSessionBackend(dir);
    case 'supabase':
      return new SupabaseSessionBackend();
    default:
      throw new Error(`Unknown STORAGE_BACKEND: ${backend}`);
  }
}

export class SessionStore {
  private backend: StorageBackend;

  constructor(private dir: string = process.env.SESSIONS_DIR || 'sessions') {
    this.backend = createBackend(this.dir);
  }

  async createSession(): Promise<Session> {
    return this.createSeededSession();
  }

  async createSeededSession(opts?: {
    clientName?: string;
    projectName?: string;
    structuredBrief?: ReturnType<typeof createDefaultStructuredBrief>;
    sessionId?: string;
    shareableUrl?: string;
    initialChatHistory?: Array<{ role: string; content: string; turnNumber?: number; contentType?: string; timestamp?: string }>;
  }): Promise<Session> {
    const sessionId = opts?.sessionId || randomUUID();
    const projectId = randomUUID();
    const now = new Date().toISOString();
    const brief = opts?.structuredBrief || createDefaultStructuredBrief();

    const initialHistory = (opts?.initialChatHistory || []).map((msg, i) => ({
      turnNumber: msg.turnNumber ?? i + 1,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      contentType: msg.contentType || 'text',
      timestamp: msg.timestamp || now,
    }));

    const session = sessionSchema.parse({
      sessionId,
      projectId,
      status: 'in_discovery',
      createdAt: now,
      updatedAt: now,
      shareableUrl: opts?.shareableUrl || '',
      metadata: {
        clientName: opts?.clientName || '',
        projectName: opts?.projectName || '',
      },
      chatHistory: initialHistory,
      structuredBrief: brief,
      coverage: computeCoverage(brief),
      contradictions: [],
      assumptions: [],
      openQuestions: [],
      recapHistory: [],
      lastRecapTurn: 0,
      outOfScopeTopics: [],
      llmReasoning: '',
      briefMarkdown: '',
      uploadedImages: [],
      fetchedWebsites: [],
    });

    await this.backend.createSession(session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.backend.getSession(sessionId);
  }

  async updateSession(session: Session): Promise<void> {
    await this.backend.updateSession(session);
  }
}
