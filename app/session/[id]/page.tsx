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
  const [coverage, setCoverage] = useState<Coverage>({
    productContext: 0,
    functional: 0,
    aesthetics: 0,
  });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  async function sendMessage() {
    if (!input.trim() || !id || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`/api/session/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
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
    <div className="max-w-2xl mx-auto p-4 flex flex-col h-screen">
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
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
