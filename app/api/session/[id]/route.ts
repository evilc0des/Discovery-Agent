import { NextRequest } from 'next/server';
import { SessionStore } from '@/lib/session/store';
import { sessionSchema } from '@/lib/session/schema';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = new SessionStore();

  try {
    const session = await store.getSession(id);
    return new Response(
      JSON.stringify({
        sessionId: session.sessionId,
        projectId: session.projectId,
        status: session.status,
        chatHistory: session.chatHistory,
        coverage: session.coverage,
        structuredBrief: session.structuredBrief,
        briefMarkdown: session.briefMarkdown,
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = new SessionStore();

  try {
    const session = await store.getSession(id);
    const body = await request.json();
    const action = body.action as string;

    if (action !== 'approve' && action !== 'revise') {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "approve" or "revise".' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (session.status !== 'brief_ready') {
      return new Response(
        JSON.stringify({ error: 'Session must be in brief_ready state to approve or revise.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'approve') {
      const updatedSession = sessionSchema.parse({
        ...session,
        status: 'approved',
        structuredBrief: {
          ...session.structuredBrief,
          approval_status: 'approved',
        },
        updatedAt: new Date().toISOString(),
      });
      await store.updateSession(updatedSession);

      return new Response(
        JSON.stringify({ status: 'approved' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updatedSession = sessionSchema.parse({
      ...session,
      status: 'in_discovery',
      updatedAt: new Date().toISOString(),
    });
    store.updateSession(updatedSession);

    return new Response(
      JSON.stringify({ status: 'in_discovery' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
