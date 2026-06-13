'use client';

import { useRef, useEffect } from 'react';
import { useSpeechRecognition } from '@/lib/hooks/use-speech-recognition';
import { MicrophoneIcon, PaperAirplaneIcon, PaperClipIcon } from "@heroicons/react/16/solid";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  onFileSelect?: (file: File) => void;
  selectedFile?: File | null;
  onRemoveFile?: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  onFileSelect,
  selectedFile = null,
  onRemoveFile,
  fileInputRef: externalFileInputRef,
}: ChatInputProps) {
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef || internalFileInputRef;
  const { isSupported, isListening, transcript, startListening, stopListening } =
    useSpeechRecognition();
  const wasListeningRef = useRef(false);

  useEffect(() => {
    if (wasListeningRef.current && !isListening && transcript) {
      onChange(value + transcript);
    }
    wasListeningRef.current = isListening;
  }, [isListening, transcript, value, onChange]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSend();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect?.(files[0]);
    }
  }

  return (
    <div>
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
            onClick={onRemoveFile}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Remove file"
          >
            {String.fromCodePoint(0x00D7)}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {onFileSelect && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.gif"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Attach file"
              title="Attach a file (drag & drop also supported)"
            >
              <PaperClipIcon className="h-6 w-6 text-gray-500" />
            </button>
          </>
        )}

        <button
          onClick={() => (isListening ? stopListening() : startListening())}
          disabled={disabled || !isSupported}
          className={`rounded-lg border px-3 py-2 transition-colors ${!isSupported ? 'invisible' : ''
            } ${isListening
              ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          title={isListening ? 'Stop listening' : 'Start voice input'}
        >
          <MicrophoneIcon className={`h-6 w-6 ${isListening ? 'text-red-600' : 'text-gray-500'}`} />
        </button>

        <input
          type="text"
          value={isListening ? value + transcript : value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedFile ? `Add a message about ${selectedFile.name}...` : 'Type your message...'}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
          readOnly={isListening}
        />

        <button
          onClick={onSend}
          disabled={disabled || (!value.trim() && !selectedFile)}
          className="rounded-lg text-blue-600 px-4 py-2 font-medium hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PaperAirplaneIcon className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
