import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { SessionStore } from '@/lib/session/store';
import { createDefaultStructuredBrief } from '@/lib/session/schema';
import { parseIntakeText } from '@/lib/llm/parse';
import { mergeParsedIntake } from '@/lib/session/merge-intake';
import { extractText } from '@/lib/files';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const clientName = formData.get('client_name') as string | null;
  const projectName = formData.get('project_name') as string | null;
  const initialText = formData.get('initial_text') as string | null;
  const requirementDoc = formData.get('requirement_doc') as File | null;

  let structuredBrief = createDefaultStructuredBrief();
  let parseError = false;

  let intakeText: string | null = null;

  if (requirementDoc && requirementDoc.size > 0) {
    const buffer = Buffer.from(await requirementDoc.arrayBuffer());
    intakeText = await extractText(buffer, requirementDoc.name, requirementDoc.type);
  } else if (initialText && initialText.trim().length > 0) {
    intakeText = initialText;
  }

  if (intakeText) {
    try {
      const parsed = await parseIntakeText(intakeText);
      structuredBrief = mergeParsedIntake(parsed, structuredBrief);
    } catch {
      parseError = true;
    }
  }

  const sessionId = randomUUID();
  const shareableUrl = `/session/${sessionId}`;

  const store = new SessionStore();
  const session = await store.createSeededSession({
    clientName: clientName || undefined,
    projectName: projectName || undefined,
    structuredBrief,
    sessionId,
    shareableUrl,
  });

  return NextResponse.json({
    projectId: session.projectId,
    sessionId: session.sessionId,
    shareableUrl,
    initialState: session,
    ...(parseError && { parseError: true }),
  }, { status: 200 });
}
