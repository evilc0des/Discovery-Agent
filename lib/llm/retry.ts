export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 15000,
  backoffMultiplier: 2,
  jitter: true,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(attempt: number, options: Required<Omit<RetryOptions, 'onRetry'>>): number {
  const exponential = options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  const capped = Math.min(exponential, options.maxDelayMs);

  if (!options.jitter) return capped;

  const jitterAmount = capped * 0.25;
  const minJitter = capped - jitterAmount;
  const maxJitter = capped + jitterAmount;
  return minJitter + Math.random() * (maxJitter - minJitter);
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    const retryablePatterns = [
      'fetch failed',
      'network error',
      'econnrefused',
      'econnreset',
      'etimedout',
      'econnaborted',
      'socket hang up',
      'request timed out',
      'too many requests',
      'rate limit',
      'service unavailable',
      'server error',
      'internal server error',
      'bad gateway',
      'gateway timeout',
      'overloaded',
    ];

    if (retryablePatterns.some((p) => message.includes(p))) return true;

    const statusPatterns = [/429/, /5\d\d/, /503/];
    if (statusPatterns.some((p) => p.test(message))) return true;
  }

  if (error !== null && typeof error === 'object') {
    if ('statusCode' in error && typeof (error as { statusCode: unknown }).statusCode === 'number') {
      const code = (error as { statusCode: number }).statusCode;
      if (code === 429 || code >= 500) return true;
    }
    if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
      const status = (error as { status: number }).status;
      if (status === 429 || status >= 500) return true;
    }
  }

  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options, onRetry: options.onRetry };

  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= opts.maxAttempts) break;
      if (!isRetryableError(error)) throw error;

      opts.onRetry?.(error, attempt);

      const waitMs = computeDelay(attempt, opts);
      await delay(waitMs);
    }
  }

  throw lastError;
}
