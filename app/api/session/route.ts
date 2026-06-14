import { SessionStore } from '@/lib/session/store';

export async function GET(request: Request) {
  const store = new SessionStore();
  const session = await store.createSession();

  return new Response(
    JSON.stringify({
      sessionId: session.sessionId,
      projectId: session.projectId,
      shareableUrl: session.shareableUrl,
      status: session.status,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
