import { SessionStore } from '@/lib/session/store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = new SessionStore();

  try {
    const session = store.getSession(id);
    return new Response(
      JSON.stringify({
        sessionId: session.sessionId,
        projectId: session.projectId,
        status: session.status,
        chatHistory: session.chatHistory,
        coverage: session.coverage,
        structuredBrief: session.structuredBrief,
        metadata: session.metadata,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
