import { NextRequest } from 'next/server';
import { SessionStore } from '@/lib/session/store';
import { generateChatResponse, generateFallbackResponse } from '@/lib/llm/chat';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { message } = await request.json();

  const store = new SessionStore();
  const session = store.getSession(id);

  const now = new Date().toISOString();
  const turnNumber = session.chatHistory.length + 1;

  // Add user message
  const userMessage = {
    turnNumber,
    role: 'user' as const,
    content: message,
    contentType: 'text' as const,
    timestamp: now,
  };

  const llmMessages = session.chatHistory.map((h) => ({
    role: h.role,
    content: h.content,
  }));
  llmMessages.push({ role: 'user', content: message });

  let llmResult;
  let fallback = false;

  try {
    // First attempt
    llmResult = await generateChatResponse({
      sessionId: id,
      messages: llmMessages,
      currentBrief: session.structuredBrief,
      currentCoverage: session.coverage,
    });
  } catch (firstError) {
    // Retry once
    try {
      llmResult = await generateChatResponse({
        sessionId: id,
        messages: llmMessages,
        currentBrief: session.structuredBrief,
        currentCoverage: session.coverage,
      });
    } catch (secondError) {
      // Fallback to text-only response
      const fallbackMessage = await generateFallbackResponse({
        messages: llmMessages,
      });
      fallback = true;
      llmResult = {
        message: fallbackMessage,
        stateUpdate: {
          coverage: {
            product_context: session.coverage.productContext,
            functional: session.coverage.functional,
            aesthetics: session.coverage.aesthetics,
          },
          extracted: {},
          contradictions: [],
          open_questions: [],
          assumptions: [],
          out_of_scope_topics: [],
        },
        reasoning: 'Fallback due to structured output failure',
        isRecap: false,
        isFinal: false,
      };
    }
  }

  const assistantMessage = {
    turnNumber: turnNumber + 1,
    role: 'assistant' as const,
    content: llmResult.message,
    contentType: 'text' as const,
    timestamp: new Date().toISOString(),
  };

  const updatedSession = {
    ...session,
    chatHistory: [...session.chatHistory, userMessage, assistantMessage],
    coverage: {
      productContext: llmResult.stateUpdate.coverage.product_context,
      functional: llmResult.stateUpdate.coverage.functional,
      aesthetics: llmResult.stateUpdate.coverage.aesthetics,
    },
    updatedAt: new Date().toISOString(),
  };

  store.updateSession(updatedSession);

  return new Response(
    JSON.stringify({
      message: llmResult.message,
      coverage: updatedSession.coverage,
      turnNumber: assistantMessage.turnNumber,
      fallback,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
