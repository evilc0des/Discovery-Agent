import { SessionStore } from '@/lib/session/store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = new SessionStore();

  try {
    const session = await store.getSession(id);

    if (!session.briefMarkdown) {
      return new Response(
        JSON.stringify({ error: 'Brief is not yet available for this session.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(session.briefMarkdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="brief-${id.slice(0, 8)}.md"`,
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
