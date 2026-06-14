import { randomUUID } from 'crypto';
import { sessionSchema, createDefaultStructuredBrief, type Session } from './schema';
import { computeCoverage } from '../coverage';
import { type StorageBackend, FileSessionBackend } from './backend';

function createBackend(dir: string): StorageBackend {
  const backend = process.env.STORAGE_BACKEND || 'file';
  switch (backend) {
    case 'file':
      return new FileSessionBackend(dir);
    default:
      throw new Error(`Unknown STORAGE_BACKEND: ${backend}`);
  }
}

export class SessionStore {
  private backend: StorageBackend;

  constructor(private dir: string = process.env.SESSIONS_DIR || 'sessions') {
    this.backend = createBackend(this.dir);
  }

  createSession(): Session {
    return this.createSeededSession();
  }

  createSeededSession(opts?: {
    clientName?: string;
    projectName?: string;
    structuredBrief?: ReturnType<typeof createDefaultStructuredBrief>;
    sessionId?: string;
    shareableUrl?: string;
  }): Session {
    const sessionId = opts?.sessionId || randomUUID();
    const projectId = randomUUID();
    const now = new Date().toISOString();
    const brief = opts?.structuredBrief || createDefaultStructuredBrief();

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
      chatHistory: [],
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

    this.backend.createSession(session);
    return session;
  }

  getSession(sessionId: string): Session {
    return this.backend.getSession(sessionId);
  }

  updateSession(session: Session): void {
    this.backend.updateSession(session);
  }
}
