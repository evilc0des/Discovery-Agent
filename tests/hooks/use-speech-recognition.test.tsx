// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useSpeechRecognition } from '@/lib/hooks/use-speech-recognition';

function createMockSpeechRecognition() {
  const mockInstance = {
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    continuous: false,
    interimResults: false,
    lang: '',
    onresult: null as ((event: unknown) => void) | null,
    onerror: null as ((event: unknown) => void) | null,
    onend: null as (() => void) | null,
  };

  function MockClass(this: typeof mockInstance) {
    return mockInstance;
  }
  MockClass.prototype = mockInstance;

  return { MockClass, mockInstance };
}

beforeEach(() => {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
});

describe('useSpeechRecognition - browser support', () => {
  it('reports isSupported as false when no SpeechRecognition API exists', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isSupported).toBe(false);
  });

  it('reports isSupported as true when SpeechRecognition API exists', () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = class {};

    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isSupported).toBe(true);
  });

  it('reports isSupported as true when webkitSpeechRecognition API exists', () => {
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = class {};

    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isSupported).toBe(true);
  });
});

describe('useSpeechRecognition - start/stop listening', () => {
  it('sets isListening to true when startListening is called', () => {
    const { MockClass } = createMockSpeechRecognition();
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockClass;

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.isListening).toBe(true);
  });

  it('sets isListening to false when stopListening is called', () => {
    const { MockClass } = createMockSpeechRecognition();
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockClass;

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });
    act(() => {
      result.current.stopListening();
    });

    expect(result.current.isListening).toBe(false);
  });

  it('calls recognition.start() when startListening is called', () => {
    const { MockClass, mockInstance } = createMockSpeechRecognition();
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockClass;

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    expect(mockInstance.start).toHaveBeenCalled();
  });

  it('calls recognition.stop() when stopListening is called', () => {
    const { MockClass, mockInstance } = createMockSpeechRecognition();
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockClass;

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });
    act(() => {
      result.current.stopListening();
    });

    expect(mockInstance.stop).toHaveBeenCalled();
  });
});

function createMockResultEvent(transcripts: string[], isFinal = false) {
  return {
    results: transcripts.map((transcript) => ({
      isFinal,
      length: 1,
      [0]: { transcript, confidence: 0.9 },
    })),
    resultIndex: 0,
  };
}

describe('useSpeechRecognition - transcript capture', () => {
  it('updates transcript when recognition produces a result', () => {
    const { MockClass, mockInstance } = createMockSpeechRecognition();
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockClass;

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      mockInstance.onresult?.(createMockResultEvent(['hello world']) as unknown as Event);
    });

    expect(result.current.transcript).toBe('hello world');
  });

  it('concatenates multiple result transcripts', () => {
    const { MockClass, mockInstance } = createMockSpeechRecognition();
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockClass;

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      mockInstance.onresult?.(createMockResultEvent(['hello', ' world']) as unknown as Event);
    });

    expect(result.current.transcript).toBe('hello world');
  });

  it('sets isListening to false when recognition ends', () => {
    const { MockClass, mockInstance } = createMockSpeechRecognition();
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockClass;

    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      mockInstance.onend?.();
    });

    expect(result.current.isListening).toBe(false);
  });

  it('does not start if SpeechRecognition is not supported', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.isListening).toBe(false);
  });
});
