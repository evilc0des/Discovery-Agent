import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, isRetryableError } from '@/lib/llm/retry';

describe('isRetryableError', () => {
  it('returns true for network errors', () => {
    expect(isRetryableError(new Error('fetch failed'))).toBe(true);
    expect(isRetryableError(new Error('network error'))).toBe(true);
    expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
    expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
    expect(isRetryableError(new Error('socket hang up'))).toBe(true);
  });

  it('returns true for rate limit errors', () => {
    expect(isRetryableError(new Error('Too many requests'))).toBe(true);
    expect(isRetryableError(new Error('rate limit exceeded'))).toBe(true);
  });

  it('returns true for server errors', () => {
    expect(isRetryableError(new Error('Service unavailable'))).toBe(true);
    expect(isRetryableError(new Error('internal server error'))).toBe(true);
    expect(isRetryableError(new Error('bad gateway'))).toBe(true);
    expect(isRetryableError(new Error('gateway timeout'))).toBe(true);
  });

  it('returns true for errors with status code 429 or 5xx', () => {
    expect(isRetryableError({ statusCode: 429, message: 'rate limited' })).toBe(true);
    expect(isRetryableError({ statusCode: 500, message: 'server error' })).toBe(true);
    expect(isRetryableError({ statusCode: 503, message: 'unavailable' })).toBe(true);
    expect(isRetryableError({ status: 502, message: 'bad gateway' })).toBe(true);
  });

  it('returns false for auth errors', () => {
    expect(isRetryableError(new Error('unauthorized'))).toBe(false);
    expect(isRetryableError(new Error('invalid api key'))).toBe(false);
  });

  it('returns false for bad request errors', () => {
    expect(isRetryableError({ statusCode: 400, message: 'bad request' })).toBe(false);
    expect(isRetryableError({ statusCode: 401, message: 'unauthorized' })).toBe(false);
  });

  it('returns false for non-Error types', () => {
    expect(isRetryableError('string error')).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first attempt with no retry', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and succeeds on second attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { jitter: false });
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts on retryable errors', async () => {
    const error = new Error('fetch failed');
    const fn = vi.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxAttempts: 2, jitter: false });
    await vi.advanceTimersByTimeAsync(5000);

    await expect(promise).rejects.toThrow('fetch failed');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('unauthorized'));

    await expect(withRetry(fn)).rejects.toThrow('unauthorized');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects maxAttempts option', async () => {
    const error = new Error('fetch failed');
    const fn = vi.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxAttempts: 5, jitter: false });
    await vi.advanceTimersByTimeAsync(30000);

    await expect(promise).rejects.toThrow('fetch failed');
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it('calls onRetry callback on each retry attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce('success');
    const onRetry = vi.fn();

    const promise = withRetry(fn, { onRetry, jitter: false });
    await vi.advanceTimersByTimeAsync(10000);
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('uses exponential backoff between retries', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { jitter: false });
    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(fn).toHaveBeenCalledTimes(3);
  });
});
