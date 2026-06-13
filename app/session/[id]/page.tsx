'use client';

import { useState, useEffect, useRef } from 'react';

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
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

      const data = await response.json();

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error || 'Failed to upload file.' },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      setCoverage(data.coverage);
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

      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="flex-1 flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-blue-600">{String.fromCodePoint(0x1F4CE)}</span>
            <span className="text-gray-700 truncate">{selectedFile.name}</span>
            <span className="text-gray-400 text-xs">
              ({Math.round(selectedFile.size / 1024)} KB)
            </span>
          </div>
          <button
            onClick={removeFile}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Remove file"
          >
            {String.fromCodePoint(0x00D7)}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.gif"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Attach file"
          title="Attach a file (drag & drop also supported)"
        >
          {String.fromCodePoint(0x1F4CE)}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={selectedFile ? `Add a message about ${selectedFile.name}...` : 'Type your message...'}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || (!input.trim() && !selectedFile)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
