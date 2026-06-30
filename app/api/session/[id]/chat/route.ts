import { NextRequest } from 'next/server';
import { SessionStore } from '@/lib/session/store';
import { generateChatResponse, generateFallbackResponse, type DiscoveryOutput } from '@/lib/llm/chat';
import { extractText, isSupportedFile, isImageFile } from '@/lib/files';
import { createImageStorage } from '@/lib/storage/image-storage';
import { extractUrls, fetchWebsiteContent } from '@/lib/website';
import { generateBriefMarkdown } from '@/lib/brief-export';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const store = new SessionStore();
  const session = await store.getSession(id);

  const now = new Date().toISOString();
  const turnNumber = session.chatHistory.length + 1;

  const contentType = request.headers.get('content-type') || '';
  let message = '';
  let extractedFileText: string | null = null;
  let uploadedFileName: string | null = null;
  let uploadedImageMeta: {
    id: string;
    originalName: string;
    storedPath: string;
    mimeType: string;
    uploadedAt: string;
  } | null = null;
  let imageBase64: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const rawMessage = formData.get('message');
    message = typeof rawMessage === 'string' ? rawMessage : '';
    const file = formData.get('file') as File | null;

    if (file && file.size > 0) {
      uploadedFileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());

      if (!isSupportedFile(file.type)) {
        return new Response(
          JSON.stringify({ error: `Unsupported file type: ${uploadedFileName}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (isImageFile(file.type)) {
        imageBase64 = buffer.toString('base64');
        const imageStorage = createImageStorage();
        uploadedImageMeta = await imageStorage.storeImage(buffer, id, file.name, file.type);
      } else {
        extractedFileText = await extractText(buffer, file.name, file.type);
      }
    }
  } else {
    const body = await request.json();
    message = typeof body.message === 'string' ? body.message : '';
  }

  const fetchedWebsitesData: Array<{
    url: string;
    title: string;
    metaDescription: string;
    extractedText: string;
    turnNumber: number;
    fetchedAt: string;
  }> = [];
  let websiteContext = '';

  if (message) {
    const urls = extractUrls(message);
    for (const url of urls) {
      const content = await fetchWebsiteContent(url);
      if (content) {
        fetchedWebsitesData.push({
          url,
          title: content.title,
          metaDescription: content.metaDescription,
          extractedText: content.visibleText,
          turnNumber,
          fetchedAt: new Date().toISOString(),
        });
        websiteContext += `\n\n[Website: ${url}]\nTitle: ${content.title}\nDescription: ${content.metaDescription}\nContent: ${content.visibleText}\n[End of ${url}]`;
      }
    }
  }

  if (websiteContext) {
    websiteContext = `\n\nThe client shared the following website links. Their content has been fetched and is provided below for context:${websiteContext}`;
  }

  const userMessage = {
    turnNumber,
    role: 'user' as const,
    content: uploadedFileName
      ? uploadedImageMeta
        ? `[Image uploaded: ${uploadedFileName}]` + (message ? `\n\nUser message: ${message}` : '')
        : `[File uploaded: ${uploadedFileName}]\n\n${extractedFileText}` + (message ? `\n\nUser message: ${message}` : '')
      : message,
    contentType: uploadedFileName
      ? uploadedImageMeta ? 'image_upload' as const : 'file_upload' as const
      : 'text' as const,
    timestamp: now,
  };

  const llmMessages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image?: string; mimeType?: string }> }> = session.chatHistory.map((h) => ({
    role: h.role,
    content: h.content as string,
  }));

  if (uploadedImageMeta && imageBase64) {
    const parts: Array<{ type: string; text?: string; image?: string; mimeType?: string }> = [];
    if (message) {
      parts.push({ type: 'text', text: `The client uploaded an image called "${uploadedFileName}" and said: ${message}${websiteContext}` });
    } else {
      parts.push({ type: 'text', text: `The client uploaded an image called "${uploadedFileName}". Please describe what you see and ask relevant discovery questions about it.${websiteContext}` });
    }
    parts.push({ type: 'image', image: imageBase64, mimeType: uploadedImageMeta.mimeType });
    llmMessages.push({ role: 'user', content: parts });
  } else {
    const llmUserContent = uploadedFileName
      ? `The client uploaded a file called "${uploadedFileName}". Here is the content:\n\n---\n${extractedFileText}\n---` + (message ? `\n\nThe client also said: ${message}` : '')
      : message;
    llmMessages.push({ role: 'user', content: llmUserContent + websiteContext });
  }

  const turnsSinceLastRecap = turnNumber - session.lastRecapTurn;

  let partialObjectStream: AsyncIterable<unknown>;
  let object: Promise<DiscoveryOutput>;
  let fallback = false;

  try {
    const result = await generateChatResponse({
      sessionId: id,
      messages: llmMessages,
      currentBrief: session.structuredBrief,
      currentCoverage: session.coverage,
      turnsSinceLastRecap,
    });
    partialObjectStream = result.partialObjectStream;
    object = result.object;
  } catch {
    const fallbackMessage = await generateFallbackResponse({
      messages: llmMessages.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content.find(p => p.type === 'text')?.text || '[image]',
      })),
    });
    fallback = true;

    const assistantMessage = {
      turnNumber: turnNumber + 1,
      role: 'assistant' as const,
      content: fallbackMessage,
      contentType: 'text' as const,
      timestamp: new Date().toISOString(),
    };

    const updatedSession = {
      ...session,
      chatHistory: [...session.chatHistory, userMessage, assistantMessage],
      coverage: {
        productContext: session.coverage.productContext,
        functional: session.coverage.functional,
        aesthetics: session.coverage.aesthetics,
      },
      uploadedImages: uploadedImageMeta
        ? [...session.uploadedImages, uploadedImageMeta]
        : session.uploadedImages,
      fetchedWebsites: [...session.fetchedWebsites, ...fetchedWebsitesData],
      updatedAt: new Date().toISOString(),
    };

    await store.updateSession(updatedSession);

    return new Response(
      JSON.stringify({
        message: fallbackMessage,
        coverage: updatedSession.coverage,
        turnNumber: assistantMessage.turnNumber,
        fallback,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const partials: unknown[] = [];
  for await (const partial of partialObjectStream) {
    partials.push(partial);
  }

  const finalObject = await object;

  const assistantMessage = {
    turnNumber: turnNumber + 1,
    role: 'assistant' as const,
    content: finalObject.message,
    contentType: 'text' as const,
    timestamp: new Date().toISOString(),
  };

  const updatedSession = {
    ...session,
    chatHistory: [...session.chatHistory, userMessage, assistantMessage],
    status: finalObject.is_final ? 'brief_ready' as const : session.status,
    coverage: {
      productContext: finalObject.state_update.coverage.product_context,
      functional: finalObject.state_update.coverage.functional,
      aesthetics: finalObject.state_update.coverage.aesthetics,
    },
    contradictions: [
      ...session.contradictions,
      ...finalObject.state_update.contradictions.filter(
        (c: string) => !session.contradictions.includes(c)
      ),
    ],
    assumptions: [
      ...session.assumptions,
      ...finalObject.state_update.assumptions.filter(
        (a: string) => !session.assumptions.includes(a)
      ),
    ],
    openQuestions: [
      ...session.openQuestions,
      ...finalObject.state_update.open_questions.filter(
        (q: string) => !session.openQuestions.includes(q)
      ),
    ],
    outOfScopeTopics: [
      ...session.outOfScopeTopics,
      ...finalObject.state_update.out_of_scope_topics,
    ],
    lastRecapTurn: finalObject.is_recap ? assistantMessage.turnNumber : session.lastRecapTurn,
    recapHistory: finalObject.is_recap
      ? [...session.recapHistory, { turnNumber: assistantMessage.turnNumber, content: finalObject.message }]
      : session.recapHistory,
    briefMarkdown: finalObject.is_final
      ? generateBriefMarkdown(session.structuredBrief, {
          earlyStop: session.coverage.productContext < 0.5 ||
            session.coverage.functional < 0.5 ||
            session.coverage.aesthetics < 0.5,
        })
      : session.briefMarkdown,
    uploadedImages: uploadedImageMeta
      ? [...session.uploadedImages, uploadedImageMeta]
      : session.uploadedImages,
    fetchedWebsites: [...session.fetchedWebsites, ...fetchedWebsitesData],
    updatedAt: new Date().toISOString(),
  };

  await store.updateSession(updatedSession);

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const partial of partials) {
        controller.enqueue(encoder.encode(JSON.stringify(partial) + '\n'));
      }
      controller.enqueue(encoder.encode(JSON.stringify(finalObject) + '\n'));
      controller.close();
    },
  });

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}
