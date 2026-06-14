import fs from 'fs';
import path from 'path';
import { sessionSchema, type Session } from './schema';

export interface StorageBackend {
  createSession(session: Session): Promise<void>;
  getSession(sessionId: string): Promise<Session>;
  updateSession(session: Session): Promise<void>;
}

export class FileSessionBackend implements StorageBackend {
  constructor(private dir: string) {}

  private ensureDirectory(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.dir, `${sessionId}.json`);
  }

  async createSession(session: Session): Promise<void> {
    this.ensureDirectory();
    fs.writeFileSync(
      this.getSessionPath(session.sessionId),
      JSON.stringify(session, null, 2),
    );
  }

  async getSession(sessionId: string): Promise<Session> {
    const filePath = this.getSessionPath(sessionId);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return sessionSchema.parse(JSON.parse(content));
  }

  async updateSession(session: Session): Promise<void> {
    const filePath = this.getSessionPath(session.sessionId);
    const validated = sessionSchema.parse(session);
    fs.writeFileSync(filePath, JSON.stringify(validated, null, 2));
  }
}
