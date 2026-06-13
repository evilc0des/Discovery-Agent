// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ChatInput } from '@/components/chat-input';

vi.mock('@/lib/hooks/use-speech-recognition', () => ({
  useSpeechRecognition: vi.fn(),
}));

import { useSpeechRecognition } from '@/lib/hooks/use-speech-recognition';

function mockSpeechHook(overrides: Partial<ReturnType<typeof useSpeechRecognition>> = {}) {
  const defaults = {
    isSupported: false,
    isListening: false,
    transcript: '',
    startListening: vi.fn(),
    stopListening: vi.fn(),
  };
  vi.mocked(useSpeechRecognition).mockReturnValue({ ...defaults, ...overrides });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ChatInput - mic button', () => {
  it('renders mic button when speech is supported', () => {
    mockSpeechHook({ isSupported: true });

    render(<ChatInput value="" onChange={() => {}} onSend={() => {}} />);

    expect(screen.getByLabelText('Start voice input')).toBeInTheDocument();
  });

  it('hides mic button when speech is not supported', () => {
    mockSpeechHook({ isSupported: false });

    render(<ChatInput value="" onChange={() => {}} onSend={() => {}} />);

    const button = screen.getByLabelText('Start voice input');
    expect(button).toBeInTheDocument();
    expect(button.classList.contains('invisible')).toBe(true);
    expect(button).toBeDisabled();
  });

  it('calls startListening when mic button is clicked', async () => {
    const startListening = vi.fn();
    mockSpeechHook({ isSupported: true, startListening });
    const user = userEvent.setup();

    render(<ChatInput value="" onChange={() => {}} onSend={() => {}} />);

    await user.click(screen.getByLabelText('Start voice input'));

    expect(startListening).toHaveBeenCalledOnce();
  });

  it('renders active mic button when listening', () => {
    mockSpeechHook({ isSupported: true, isListening: true });

    render(<ChatInput value="" onChange={() => {}} onSend={() => {}} />);

    expect(screen.getByLabelText('Stop voice input')).toBeInTheDocument();
  });

  it('calls stopListening when active mic button is clicked', async () => {
    const stopListening = vi.fn();
    mockSpeechHook({ isSupported: true, isListening: true, stopListening });
    const user = userEvent.setup();

    render(<ChatInput value="" onChange={() => {}} onSend={() => {}} />);

    await user.click(screen.getByLabelText('Stop voice input'));

    expect(stopListening).toHaveBeenCalledOnce();
  });
});

describe('ChatInput - transcript display', () => {
  it('shows transcript in text input while listening', () => {
    mockSpeechHook({ isSupported: true, isListening: true, transcript: 'hello' });

    render(<ChatInput value="" onChange={() => {}} onSend={() => {}} />);

    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toHaveValue('hello');
  });

  it('appends transcript to existing value while listening', () => {
    mockSpeechHook({ isSupported: true, isListening: true, transcript: ' world' });

    render(<ChatInput value="hello" onChange={() => {}} onSend={() => {}} />);

    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toHaveValue('hello world');
  });

  it('shows only typed value when not listening', () => {
    mockSpeechHook({ isSupported: true, isListening: false, transcript: 'ignored' });

    render(<ChatInput value="my message" onChange={() => {}} onSend={() => {}} />);

    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toHaveValue('my message');
  });

  it('calls onChange with committed transcript when listening stops', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ChatInput value="" onChange={onChange} onSend={() => {}} />
    );

    mockSpeechHook({ isSupported: true, isListening: true, transcript: 'spoken text' });
    rerender(<ChatInput value="" onChange={onChange} onSend={() => {}} />);

    mockSpeechHook({ isSupported: true, isListening: false, transcript: 'spoken text' });
    rerender(<ChatInput value="" onChange={onChange} onSend={() => {}} />);

    expect(onChange).toHaveBeenCalledWith('spoken text');
  });
});
