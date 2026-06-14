import fs from 'fs';
import path from 'path';
import { sessionSchema, type Session } from './schema';

export interface StorageBackend {
  createSession(session: Session): void;
  getSession(sessionId: string): Session;
  updateSession(session: Session): void;
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

  createSession(session: Session): void {
    this.ensureDirectory();
    fs.writeFileSync(
      this.getSessionPath(session.sessionId),
      JSON.stringify(session, null, 2),
    );
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
