// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
}));

Element.prototype.scrollIntoView = vi.fn();

describe('Session review UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows approve and revise buttons when session status is brief_ready', async () => {
    const { useParams } = await import('next/navigation');
    vi.mocked(useParams).mockReturnValue({ id: 'test-session-id' });

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionId: 'test-session-id',
          chatHistory: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'I believe we have enough to produce a structured brief.' },
          ],
          coverage: { productContext: 0.8, functional: 0.7, aesthetics: 0.9 },
          status: 'brief_ready',
          briefMarkdown: '# Structured Discovery Brief\n\n## Product Context\n\nTest content\n',
        }),
      } as unknown as Response);

    const { default: SessionChatPage } = await import('@/app/session/[id]/page');
    render(React.createElement(SessionChatPage, {
      params: Promise.resolve({ id: 'test-session-id' }),
    }));

    await waitFor(() => {
      expect(screen.getByText('Review Your Discovery Brief')).toBeTruthy();
    });

    expect(screen.getByText('Approve')).toBeTruthy();
    expect(screen.getByText('Revise')).toBeTruthy();
  });

  it('hides review UI when session status is in_discovery', async () => {
    const { useParams } = await import('next/navigation');
    vi.mocked(useParams).mockReturnValue({ id: 'test-session-id' });

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionId: 'test-session-id',
          chatHistory: [],
          coverage: { productContext: 0, functional: 0, aesthetics: 0 },
          status: 'in_discovery',
          briefMarkdown: '',
        }),
      } as unknown as Response);

    const { default: SessionChatPage } = await import('@/app/session/[id]/page');
    render(React.createElement(SessionChatPage, {
      params: Promise.resolve({ id: 'test-session-id' }),
    }));

    await waitFor(() => {
      expect(screen.queryByText('Review Your Discovery Brief')).toBeNull();
    });
  });

  it('calls PATCH approve on approve button click', async () => {
    const { useParams } = await import('next/navigation');
    vi.mocked(useParams).mockReturnValue({ id: 'test-session-id' });

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionId: 'test-session-id',
          chatHistory: [],
          coverage: { productContext: 0.8, functional: 0.7, aesthetics: 0.9 },
          status: 'brief_ready',
          briefMarkdown: '# Brief',
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'approved' }),
      } as unknown as Response);

    const { default: SessionChatPage } = await import('@/app/session/[id]/page');
    render(React.createElement(SessionChatPage, {
      params: Promise.resolve({ id: 'test-session-id' }),
    }));

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeTruthy();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/session/test-session-id',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    expect(screen.getByText('Brief Approved')).toBeTruthy();
  });

  it('shows readonly approved state after approval', async () => {
    const { useParams } = await import('next/navigation');
    vi.mocked(useParams).mockReturnValue({ id: 'test-session-id' });

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionId: 'test-session-id',
          chatHistory: [],
          coverage: { productContext: 0.8, functional: 0.7, aesthetics: 0.9 },
          status: 'approved',
          briefMarkdown: '# Approved Brief',
        }),
      } as unknown as Response);

    const { default: SessionChatPage } = await import('@/app/session/[id]/page');
    render(React.createElement(SessionChatPage, {
      params: Promise.resolve({ id: 'test-session-id' }),
    }));

    await waitFor(() => {
      expect(screen.getByText('Brief Approved')).toBeTruthy();
    });

    expect(screen.queryByText('Approve')).toBeNull();
    expect(screen.queryByText('Revise')).toBeNull();
    expect(screen.getByText('Download Brief')).toBeTruthy();
  });
});
