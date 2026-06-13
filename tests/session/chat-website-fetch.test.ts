import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractUrls, fetchWebsiteContent } from '@/lib/website';

describe('fetchWebsiteContent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches a page that has no title or meta description', async () => {
    const html = '<html><body><p>Just content.</p></body></html>';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(html),
    } as Response);

    const result = await fetchWebsiteContent('https://example.com');
    expect(result).toEqual({
      title: '',
      metaDescription: '',
      visibleText: 'Just content.',
    });
  });

  it('returns null on HTTP 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const result = await fetchWebsiteContent('https://example.com');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await fetchWebsiteContent('https://example.com');
    expect(result).toBeNull();
  });

  it('fetches a page and extracts title, meta description, and visible text', async () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <meta name="description" content="A test page description">
</head>
<body>
  <h1>Hello World</h1>
  <p>This is visible text.</p>
</body>
</html>`;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(html),
    } as Response);

    const result = await fetchWebsiteContent('https://example.com');

    expect(result).toEqual({
      title: 'Test Page',
      metaDescription: 'A test page description',
      visibleText: 'Hello World This is visible text.',
    });
    expect(fetch).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
      headers: expect.objectContaining({
        'User-Agent': expect.any(String),
      }),
    }));
  });
});

describe('extractUrls', () => {
  it('detects a single https URL in text', () => {
    const result = extractUrls('Check out https://example.com for more info');
    expect(result).toEqual(['https://example.com']);
  });

  it('detects multiple URLs in text', () => {
    const result = extractUrls('See https://example.com and http://test.org/path');
    expect(result).toEqual(['https://example.com', 'http://test.org/path']);
  });

  it('returns empty array when no URLs are present', () => {
    const result = extractUrls('Just some plain text with no links');
    expect(result).toEqual([]);
  });

  it('deduplicates repeated URLs', () => {
    const result = extractUrls('See https://example.com and https://example.com again');
    expect(result).toEqual(['https://example.com']);
  });

  it('handles URLs with query params and fragments', () => {
    const result = extractUrls('Check https://example.com/path?q=1#section');
    expect(result).toEqual(['https://example.com/path?q=1#section']);
  });
});
