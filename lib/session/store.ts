import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { sessionSchema, createDefaultStructuredBrief, type Session } from './schema';

export class SessionStore {
  constructor(private dir: string = process.env.SESSIONS_DIR || 'sessions') {}

  private ensureDirectory(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.dir, `${sessionId}.json`);
  }

  createSession(): Session {
    this.ensureDirectory();

    const sessionId = randomUUID();
    const projectId = randomUUID();
    const now = new Date().toISOString();

    const session = sessionSchema.parse({
      sessionId,
      projectId,
      status: 'in_discovery',
      createdAt: now,
      updatedAt: now,
      shareableUrl: '',
      metadata: {
        clientName: '',
        projectName: '',
      },
      chatHistory: [],
      structuredBrief: createDefaultStructuredBrief(),
      coverage: {
        productContext: 0.0,
        functional: 0.0,
        aesthetics: 0.0,
      },
      contradictions: [],
      assumptions: [],
      openQuestions: [],
      recapHistory: [],
      lastRecapTurn: 0,
      outOfScopeTopics: [],
      llmReasoning: '',
      uploadedImages: [],
    });

    const filePath = this.getSessionPath(sessionId);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));

    return session;
  }

  getSession(sessionId: string): Session {
    const filePath = this.getSessionPath(sessionId);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return sessionSchema.parse(JSON.parse(content));
  }

  updateSession(session: Session): void {
    const filePath = this.getSessionPath(session.sessionId);
    const validated = sessionSchema.parse(session);
    fs.writeFileSync(filePath, JSON.stringify(validated, null, 2));
  }
}
