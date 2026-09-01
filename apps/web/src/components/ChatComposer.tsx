import { useEffect, useRef, useState } from "react";
import { shouldFinalizeDictation } from "../chat/dictation";
import { useAutoHideScrollbar } from "../chat/useAutoHideScrollbar";
import { IconForm, IconMic, IconSend, IconStop, IconUpload } from "./icons";

interface Props {
  onSend: (text: string) => void;
  busy: boolean;
  disabled: boolean;
  /** Build Plan V2.2.7 — present only while a turn is actually streaming/in flight. */
  onStop?: () => void;
  /** Surfaces a dictation failure (mic permission denied, no speech, etc.) the same way every other error in this app already does. */
  onError?: (message: string) => void;
  /** Opens the structured-input form (Medications / Conditions / Allergies) — an alternative to typing a sentence. */
  onOpenForm?: () => void;
  /**
   * Uploads a digital prescription (PDF) for parsing — an alternative to
   * typing a sentence, same as `onOpenForm`. The file itself never leaves
   * this callback's caller; the composer only picks it and hands it off.
   */
  onUploadPrescription?: (file: File) => void;
  /** True while a just-selected prescription file is being parsed on the server. */
  uploadingPrescription?: boolean;
  /** V2.5 — the centered landing-state composer is visually larger; same component, same behavior. */
  variant?: "hero" | "anchored";
  placeholder?: string;
}

const EXAMPLE_QUERY = "aspirin and warfarin together";

const DICTATION_POLL_MS = 250;
const VOICE_WAVE_BAR_COUNT = 40;

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Waveform + elapsed timer shown above the type bar while dictating (kokonutui's "AI Voice" concept, ported to this app's plain-CSS/SVG-icon conventions and wired to the real Web Speech `listening` state instead of a demo loop). */
function VoiceListeningBar({ listening }: { listening: boolean }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!listening) {
      setElapsedSeconds(0);
      return;
    }
    const intervalId = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(intervalId);
  }, [listening]);

  if (!listening) return null;

  return (
    <div className="chat-voice-indicator" role="status" aria-label="Listening for your question">
      <div className="chat-voice-wave">
        {Array.from({ length: VOICE_WAVE_BAR_COUNT }, (_, i) => (
          <span
            key={i}
            className="chat-voice-wave-bar"
            style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </div>
      <div className="chat-voice-meta">
        <span className="chat-voice-timer">{formatElapsed(elapsedSeconds)}</span>
        <span className="chat-voice-label">Listening…</span>
      </div>
    </div>
  );
}

// The Web Speech API isn't part of TypeScript's DOM lib (not a W3C standard
// yet) — this is the minimal shape this component actually uses, kept local
// rather than pulling in a third-party @types package for a handful of fields.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function dictationErrorMessage(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") return "Microphone access was denied.";
  if (error === "no-speech") return "No speech was detected.";
  if (error === "audio-capture") return "No microphone was found.";
  return "Dictation failed — please try again or type your question.";
}

export function ChatComposer({ onSend, busy, disabled, onStop, onError, onOpenForm, onUploadPrescription, uploadingPrescription, variant = "anchored", placeholder }: Props) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSpeechAtRef = useRef(0);
  const transcriptRef = useRef("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useAutoHideScrollbar<HTMLTextAreaElement>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const micSupported = typeof window !== "undefined" && Boolean(getSpeechRecognitionCtor());

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || busy || disabled) return;
    onSend(trimmed);
    setText("");
  }

  function stopPolling() {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function stopDictation() {
    stopPolling();
    recognitionRef.current?.stop();
  }

  useEffect(() => () => stopDictation(), []);

  function startDictation() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || busy || disabled) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      transcriptRef.current = transcript;
      setText(transcript);
      lastSpeechAtRef.current = Date.now();
    };

    recognition.onerror = (event) => {
      stopPolling();
      setListening(false);
      onError?.(dictationErrorMessage(event.error));
    };

    recognition.onend = () => {
      stopPolling();
      setListening(false);
    };

    recognitionRef.current = recognition;
    transcriptRef.current = "";
    setText("");
    setListening(true);
    lastSpeechAtRef.current = Date.now();
    recognition.start();

    pollRef.current = setInterval(() => {
      if (shouldFinalizeDictation(lastSpeechAtRef.current, Date.now())) {
        stopPolling();
        recognitionRef.current?.stop();
        submit(transcriptRef.current);
      }
    }, DICTATION_POLL_MS);
  }

  function handleMicClick() {
    if (listening) {
      stopDictation();
    } else {
      startDictation();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(text);
  }

  function handlePrescriptionFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;
    if (file.type !== "application/pdf") {
      onError?.("Only PDF prescriptions are supported.");
      return;
    }
    onUploadPrescription?.(file);
  }

  const defaultPlaceholder = variant === "hero" ? `Ask about your medications, e.g. "${EXAMPLE_QUERY}"` : "Ask a follow-up question…";

  return (
    <>
      <VoiceListeningBar listening={listening} />
      <form className={`chat-composer${variant === "hero" ? " chat-composer-hero" : ""}`} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="chat-composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={listening ? "Listening…" : (placeholder ?? defaultPlaceholder)}
          disabled={disabled}
          rows={1}
        />
        {onOpenForm && (
          <button
            type="button"
            className="chat-composer-icon-btn"
            aria-label="Check by form"
            data-tooltip="Fill in a form"
            data-tooltip-pos="top"
            onClick={onOpenForm}
            disabled={disabled || busy}
          >
            <IconForm size={variant === "hero" ? 19 : 17} />
          </button>
        )}
        {onUploadPrescription && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="chat-composer-file-input"
              onChange={handlePrescriptionFileChange}
              disabled={disabled || busy || uploadingPrescription}
            />
            <button
              type="button"
              className="chat-composer-icon-btn"
              aria-label="Upload prescription (PDF)"
              data-tooltip="Upload a prescription (PDF)"
              data-tooltip-pos="top"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || busy || uploadingPrescription}
            >
              {uploadingPrescription ? <span className="spinner" /> : <IconUpload size={variant === "hero" ? 19 : 17} />}
            </button>
          </>
        )}
        {micSupported && (
          <button
            type="button"
            className={`chat-composer-icon-btn chat-composer-mic${listening ? " listening" : ""}`}
            aria-label={listening ? "Stop dictating" : "Dictate query"}
            aria-pressed={listening}
            onClick={handleMicClick}
            disabled={disabled || (busy && !listening)}
          >
            <IconMic size={variant === "hero" ? 19 : 17} />
          </button>
        )}
        {busy && onStop ? (
          <button type="button" className="chat-composer-icon-btn" onClick={onStop} aria-label="Stop generating">
            <IconStop size={15} />
          </button>
        ) : (
          <button type="submit" className="chat-composer-icon-btn chat-composer-send" disabled={busy || disabled || !text.trim()} aria-label="Send">
            {busy ? <span className="spinner" /> : <IconSend size={17} />}
          </button>
        )}
      </form>
    </>
  );
}
