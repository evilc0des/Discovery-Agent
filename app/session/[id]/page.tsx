'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatInput } from '@/components/chat-input';
import { SessionSidebar } from '@/components/session-sidebar';
import { MarkdownMessage } from '@/components/markdown-message';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Coverage {
  productContext: number;
  functional: number;
  aesthetics: number;
}

interface SessionMetadata {
  clientName: string;
  projectName: string;
}

interface SessionData {
  sessionId: string;
  status: string;
  chatHistory: Array<{
    role: string;
    content: string;
  }>;
  coverage: Coverage;
  briefMarkdown: string;
  metadata: SessionMetadata;
}

export default function SessionChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [coverage, setCoverage] = useState<Coverage>({
    productContext: 0,
    functional: 0,
    aesthetics: 0,
  });
  const [sessionStatus, setSessionStatus] = useState<string>('in_discovery');
  const [briefMarkdown, setBriefMarkdown] = useState<string>('');
  const [metadata, setMetadata] = useState<SessionMetadata>({
    clientName: '',
    projectName: '',
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [failedMessage, setFailedMessage] = useState<{
    content: string;
    file?: File;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    params.then(({ id: sessionId }) => {
      setId(sessionId);
      fetch(`/api/session/${sessionId}`)
        .then((res) => res.json())
        .then((data: SessionData) => {
          setMessages(
            data.chatHistory.map((h) => ({
              role: h.role as 'user' | 'assistant',
              content: h.content,
            }))
          );
          setCoverage(data.coverage);
          setSessionStatus(data.status);
          setBriefMarkdown(data.briefMarkdown || '');
          setMetadata(data.metadata || { clientName: '', projectName: '' });
        })
        .catch(() => {
          // Session not found, will start fresh
        });
    });
  }, [params]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  }

  function removeFile() {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function sendMessage(retryContent?: string, retryFile?: File) {
    const userMessage = retryContent ?? input.trim();
    const file = retryFile ?? selectedFile;

    if ((!userMessage && !file) || !id || loading) return;

    if (!retryContent) {
      setInput('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFailedMessage(null);
    }

    const previewContent = file
      ? `[${file.name}]`
      : userMessage;
    setMessages((prev) => [...prev, { role: 'user', content: previewContent }]);
    setLoading(true);

    try {
      const formData = new FormData();
      if (userMessage) formData.append('message', userMessage);
      if (file) formData.append('file', file);

      const response = await fetch(`/api/session/${id}/chat`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error || 'Failed to upload file.' },
        ]);
        return;
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/x-ndjson')) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let lastMessage = '';
        let lastCoverage = coverage;
        let lastIsFinal = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.message) {
                lastMessage = parsed.message;
              }
              if (parsed.state_update?.coverage) {
                lastCoverage = {
                  productContext: parsed.state_update.coverage.product_context,
                  functional: parsed.state_update.coverage.functional,
                  aesthetics: parsed.state_update.coverage.aesthetics,
                };
              }
              if (parsed.is_final) {
                lastIsFinal = true;
              }
            } catch {
            }
          }
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: lastMessage }]);
        setCoverage(lastCoverage);

        if (lastIsFinal) {
          await refreshSessionState();
        }
      } else {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
        setCoverage(data.coverage);
      }

      setFailedMessage(null);
    } catch {
      if (retryContent || retryFile) {
        setFailedMessage({ content: retryContent || '', file: retryFile });
      } else {
        setFailedMessage({ content: userMessage, file: file || undefined });
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshSessionState() {
    try {
      const res = await fetch(`/api/session/${id}`);
      const data: SessionData = await res.json();
      setSessionStatus(data.status);
      setBriefMarkdown(data.briefMarkdown || '');
    } catch {
      // ignore refresh errors
    }
  }

  async function handleApprove() {
    if (!id || actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/session/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (res.ok) {
        setSessionStatus('approved');
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevise() {
    if (!id || actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/session/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revise' }),
      });

      if (res.ok) {
        setSessionStatus('in_discovery');
        setBriefMarkdown('');
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  }

  const isBriefReady = sessionStatus === 'brief_ready';
  const isApproved = sessionStatus === 'approved';

  const sidebarContent = (
    <SessionSidebar
      projectName={metadata.projectName}
      clientName={metadata.clientName}
      coverage={coverage}
      status={sessionStatus}
    />
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-80 lg:flex-shrink-0 lg:border-r lg:border-gray-200 lg:bg-white lg:overflow-y-auto">
        {sidebarContent}
      </div>

      {/* Mobile header */}
      <div className="lg:hidden flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gray-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">D</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-semibold text-gray-900 truncate">
                {metadata.projectName || 'New Project'}
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 flex-shrink-0"
              aria-label="Toggle session details"
            >
              <svg
                className={`w-5 h-5 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {!sidebarOpen && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.max(coverage.productContext * 100, 2)}%` }}
                />
                <div
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${Math.max(coverage.functional * 100, 2)}%` }}
                />
                <div
                  className="bg-purple-500 transition-all duration-500"
                  style={{ width: `${Math.max(coverage.aesthetics * 100, 2)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
                {Math.round(((coverage.productContext + coverage.functional + coverage.aesthetics) / 3) * 100)}%
              </span>
            </div>
          )}
        </div>
        {sidebarOpen && (
          <div className="border-t border-gray-100 bg-white max-h-96 overflow-y-auto">
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Chat area */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isDragging ? 'bg-blue-50' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-4">
          {messages.length === 0 && !isBriefReady && !isApproved && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                Type your first message to start the discovery session.
              </p>
              <p className="text-gray-300 text-sm mt-2">
                I&apos;ll ask about your product context, functional needs, and aesthetic preferences.
              </p>
            </div>
          )}

          {(isBriefReady || isApproved) && (
            <div className="max-w-2xl mx-auto border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
              {isApproved ? (
                <>
                  <h2 className="text-lg font-semibold text-green-700 mb-2">Brief Approved</h2>
                  <p className="text-gray-600 mb-4 text-sm">
                    This brief has been approved and is read-only. The project is now closed.
                  </p>
                  <a
                    href={`/api/session/${id}/brief`}
                    download
                    className="inline-block rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700"
                  >
                    Download Brief
                  </a>
                  <div className="mt-6 border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                      {briefMarkdown}
                    </pre>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">
                    Review Your Discovery Brief
                  </h2>
                  <p className="text-gray-600 mb-4 text-sm">
                    Below is the structured brief generated from our conversation. Please review it carefully before approving.
                  </p>
                  <div className="mb-4 border border-gray-100 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                      {briefMarkdown}
                    </pre>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="rounded-lg bg-green-600 px-6 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={handleRevise}
                      disabled={actionLoading}
                      className="rounded-lg bg-gray-200 px-6 py-2 text-gray-700 font-medium hover:bg-gray-300 disabled:opacity-50"
                    >
                      Revise
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] lg:max-w-[70%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <MarkdownMessage content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {failedMessage && !loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-orange-200 rounded-lg px-4 py-2 max-w-[80%] lg:max-w-[70%]">
                <p className="text-sm text-gray-600 mb-2">
                  The message could not be sent. You can retry without re-typing.
                </p>
                <button
                  onClick={() => {
                    sendMessage(failedMessage.content, failedMessage.file);
                  }}
                  className="rounded-md bg-orange-50 border border-orange-300 px-3 py-1 text-sm text-orange-700 font-medium hover:bg-orange-100 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-500">
                Thinking...
              </div>
            </div>
          )}
          {isDragging && (
            <div className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center text-blue-500">
              Drop your file here to upload
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {!isApproved && (
          <div className="flex-shrink-0 px-4 lg:px-6 py-3 border-t border-gray-200 bg-white">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={sendMessage}
              disabled={loading}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              onRemoveFile={removeFile}
              fileInputRef={fileInputRef}
            />
          </div>
        )}
      </div>
    </div>
  );
}
