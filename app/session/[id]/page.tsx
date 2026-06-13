'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatInput } from '@/components/chat-input';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Coverage {
  productContext: number;
  functional: number;
  aesthetics: number;
}

interface SessionData {
  sessionId: string;
  chatHistory: Array<{
    role: string;
    content: string;
  }>;
  coverage: Coverage;
}

function ProgressBar({ coverage }: { coverage: Coverage }) {
  const segments = [
    { label: 'Product Context', value: coverage.productContext, color: 'bg-blue-500' },
    { label: 'Functional', value: coverage.functional, color: 'bg-green-500' },
    { label: 'Aesthetics', value: coverage.aesthetics, color: 'bg-purple-500' },
  ];

  return (
    <div className="mb-6">
      <div className="flex h-4 rounded-full overflow-hidden bg-gray-200">
        {segments.map((segment, i) => (
          <div
            key={segment.label}
            className={`${segment.color} transition-all duration-500`}
            style={{ width: `${segment.value * 100}%` }}
            title={`${segment.label}: ${Math.round(segment.value * 100)}%`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-sm text-gray-600">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${segment.color}`} />
            <span>
              {segment.label}: {Math.round(segment.value * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const [loading, setLoading] = useState(false);
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

  async function sendMessage() {
    if ((!input.trim() && !selectedFile) || !id || loading) return;

    const userMessage = input.trim();
    const file = selectedFile;

    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
            } catch {
              // skip unparseable lines
            }
          }
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: lastMessage }]);
        setCoverage(lastCoverage);
      } else {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
        setCoverage(data.coverage);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`max-w-2xl mx-auto p-4 flex flex-col h-screen ${isDragging ? 'bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h1 className="text-xl font-semibold mb-4">Discovery Session</h1>

      <ProgressBar coverage={coverage} />

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center py-8">
            Type your first message to start the discovery session.
          </p>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 text-gray-500">
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
  );
}
