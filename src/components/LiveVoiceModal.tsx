/**
 * Free voice mode — Web Speech API only (no Gemini, no paid APIs).
 * Flow: SpeechRecognition → POST /api/ai/chat (Ollama/Freebuff) → speechSynthesis
 * Limits: browser quality, no true barge-in, Chrome/Edge best support.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, X, Loader2, Volume2 } from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
  accent?: string;
  speakingSpeed?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const LANG_MAP: Record<string, string> = {
  English: 'en-US',
  Spanish: 'es-ES',
  French: 'fr-FR',
  German: 'de-DE',
};

const SPEED_MAP: Record<string, number> = {
  'Very Slow': 0.7,
  Slow: 0.85,
  Normal: 1,
  Fast: 1.2,
  'Very Fast': 1.4,
};

export function LiveVoiceModal({
  isOpen,
  onClose,
  language = 'English',
  speakingSpeed = 'Normal',
}: LiveVoiceModalProps) {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userText, setUserText] = useState('');
  const [aiText, setAiText] = useState('');
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);
  const stoppedRef = useRef(false);

  const langCode = LANG_MAP[language] || 'en-US';
  const rate = SPEED_MAP[speakingSpeed] ?? 1;

  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!('speechSynthesis' in window)) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = langCode;
        u.rate = rate;
        u.onstart = () => setSpeaking(true);
        u.onend = () => {
          setSpeaking(false);
          resolve();
        };
        u.onerror = () => {
          setSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(u);
      }),
    [langCode, rate]
  );

  const askAi = useCallback(async (prompt: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: prompt,
          history: historyRef.current.slice(-8),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const answer = data.answer || data.content || 'I had no response.';
      historyRef.current.push({ role: 'user', content: prompt });
      historyRef.current.push({ role: 'assistant', content: answer });
      setAiText(answer);
      await speak(answer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setAiText(`Error: ${msg}`);
    } finally {
      setProcessing(false);
    }
  }, [speak]);

  const startListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    stoppedRef.current = false;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = langCode;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
    };

    recognition.onresult = async (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setUserText(interim);
      if (final.trim()) {
        setUserText(final.trim());
        setListening(false);
        await askAi(final.trim());
        if (!stoppedRef.current) {
          // Resume listening after answer
          try {
            recognition.start();
          } catch {
            /* already started */
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(event.error || 'Recognition error');
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (!stoppedRef.current && !processing && !speaking) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setError('Could not start microphone.');
    }
  }, [langCode, askAi, processing, speaking]);

  const stopAll = useCallback(() => {
    stoppedRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setListening(false);
    setSpeaking(false);
    setProcessing(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      historyRef.current = [];
      setUserText('');
      setAiText('');
      setError(null);
      startListening();
    } else {
      stopAll();
    }
    return () => stopAll();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md glass-panel rounded-3xl overflow-hidden flex flex-col p-8 items-center relative border border-primary/30"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-white mb-1">Potso Live</h2>
          <p className="text-xs text-gray-400">
            Free browser voice · Ollama / Freebuff · no paid APIs
          </p>
        </div>

        <div className="relative w-40 h-40 flex items-center justify-center mb-6">
          <motion.div
            animate={{
              scale: speaking ? [1, 1.15, 1] : listening ? [1, 1.05, 1] : 1,
              opacity: processing ? 0.6 : 1,
            }}
            transition={{ repeat: Infinity, duration: speaking ? 0.4 : 1.5 }}
            className={`w-28 h-28 rounded-full border-2 flex items-center justify-center ${
              speaking
                ? 'border-emerald-400 bg-emerald-500/20'
                : listening
                  ? 'border-primary bg-primary/20'
                  : 'border-white/20 bg-white/5'
            }`}
          >
            {processing ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : speaking ? (
              <Volume2 className="w-10 h-10 text-emerald-400" />
            ) : listening ? (
              <Mic className="w-10 h-10 text-primary" />
            ) : (
              <MicOff className="w-10 h-10 text-gray-500" />
            )}
          </motion.div>
        </div>

        <div className="text-center h-10 mb-4">
          {error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : processing ? (
            <p className="text-amber-400 text-sm animate-pulse">Thinking (local AI)...</p>
          ) : speaking ? (
            <p className="text-emerald-400 text-sm">Speaking...</p>
          ) : listening ? (
            <p className="text-gray-300 text-sm">Listening — speak now</p>
          ) : (
            <p className="text-gray-500 text-sm">{supported ? 'Ready' : 'Unsupported browser'}</p>
          )}
        </div>

        <div className="w-full bg-black/40 rounded-xl p-4 max-h-48 overflow-y-auto border border-white/10 space-y-3 text-sm">
          {userText && (
            <div className="text-gray-300">
              <span className="text-primary font-bold mr-2">You:</span>
              {userText}
            </div>
          )}
          {aiText && (
            <div className="text-gray-300">
              <span className="text-emerald-400 font-bold mr-2">Potso:</span>
              {aiText}
            </div>
          )}
          {!userText && !aiText && (
            <p className="text-gray-600 text-xs text-center">Transcripts appear here</p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              if (listening) {
                try {
                  recognitionRef.current?.stop();
                } catch {
                  /* ignore */
                }
              } else {
                startListening();
              }
            }}
            className="px-5 py-2 rounded-full bg-primary/20 text-primary border border-primary/40 text-sm font-medium"
          >
            {listening ? 'Pause mic' : 'Resume mic'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium"
          >
            End
          </button>
        </div>
      </motion.div>
    </div>
  );
}
