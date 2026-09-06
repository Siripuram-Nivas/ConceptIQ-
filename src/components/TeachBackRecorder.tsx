import { useState, useRef, useCallback } from 'react';
import { Mic, Square } from 'lucide-react';

type Mode = 'idle' | 'recording' | 'paused' | 'text';

// Minimal type for Web Speech API — not universally in TypeScript's DOM types
type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<{ [key: number]: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  demoText?: string;
  initialValue?: string;
  onChange?: (text: string) => void;
}

export function TeachBackRecorder({ onSubmit, disabled, placeholder, demoText, initialValue = '', onChange }: Props) {
  const [mode, setMode] = useState<Mode>(initialValue ? 'text' : 'idle');
  const [transcript, setTranscript] = useState(initialValue);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);

  const startRecording = useCallback(async () => {
    setMicError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicError('Voice recognition is not supported in this browser.');
      setMode('text');
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new SpeechRecognitionCtor() as SpeechRec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        const text = Array.from(e.results as ArrayLike<{ [key: number]: { transcript: string } }>)
          .map((r) => r[0].transcript)
          .join(' ');
        setTranscript(text);
        onChange?.(text);
      };
      rec.onerror = () => {
        setMicError('Microphone access was denied. Use text instead.');
        setMode('text');
      };
      recognitionRef.current = rec;
      rec.start();
      setMode('recording');
    } catch {
      setMicError('Microphone access was denied. Use text instead.');
      setMode('text');
    }
  }, [onChange]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setMode('idle');
  }, []);

  const useDemoText = useCallback(() => {
    if (demoText) {
      setTranscript(demoText);
      onChange?.(demoText);
      setMode('text');
    }
  }, [demoText, onChange]);

  const handleSubmit = () => {
    const text = transcript.trim();
    if (text.length < 10) return;
    stopRecording();
    onSubmit(text);
  };

  return (
    <div className="space-y-6">
      {micError && (
        <div className="px-6 py-4 border-2 border-warning bg-warning-light text-warning font-bold text-sm" role="alert">
          {micError}
        </div>
      )}

      {mode === 'recording' && (
        <div className="flex items-center gap-3 px-6 py-4 border-2 border-accent-purple bg-surface text-accent-purple font-bold">
          <div className="w-4 h-4 rounded-full bg-accent-purple animate-pulse" />
          <span>LISTENING...</span>
        </div>
      )}

      <div className="relative">
        <textarea
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            onChange?.(e.target.value);
          }}
          placeholder={placeholder ?? 'Explain the concept here...'}
          disabled={disabled}
          rows={6}
          className="w-full px-6 py-6 glass-panel text-fg text-xl font-medium leading-relaxed resize-none focus:outline-none focus:ring-4 focus:ring-accent-yellow transition-all placeholder:text-muted"
          aria-label="Your explanation"
        />

        <div className="absolute bottom-4 right-4 flex gap-2">
          {mode !== 'recording' ? (
            <button
              onClick={startRecording}
              disabled={disabled}
              className="w-12 h-12 bg-fg text-bg rounded-full flex items-center justify-center hover:bg-accent-blue transition-colors disabled:opacity-50"
              aria-label="Start voice recording"
              title="Use voice"
            >
              <Mic size={20} />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-12 h-12 bg-warning text-bg rounded-full flex items-center justify-center hover:bg-warning-dark transition-colors animate-pulse"
              aria-label="Stop recording"
            >
              <Square size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleSubmit}
          disabled={disabled || transcript.trim().length < 10}
          className="editorial-btn-primary w-full sm:w-auto text-xl"
        >
          Finish Explanation
        </button>

        {demoText && !transcript && (
          <button
            onClick={useDemoText}
            className="editorial-btn-outline w-full sm:w-auto"
          >
            Insert Demo Text
          </button>
        )}
      </div>
    </div>
  );
}
