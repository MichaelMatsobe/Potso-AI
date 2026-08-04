/**
 * Free voice mode — local Whisper/Piper when available, else Web Speech API.
 * AI always via /api/ai/chat (Ollama / Freebuff). No paid services.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, X, Loader2, Volume2 } from 'lucide-react';
import {
  fetchVoiceStatus,
  localSttFromBlob,
  localTtsToAudioUrl,
  browserSpeak,
  type VoiceStatus,
} from '../services/voiceClient';

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
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [recording, setRecording] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);
  const stoppedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const langCode = LANG_MAP[language] || 'en-US';
  const rate = SPEED_MAP[speakingSpeed] ?? 1;

  const useLocalStt = Boolean(voiceStatus?.stt?.online);
  const useLocalTts = Boolean(voiceStatus?.tts?.online);

  const speakAnswer = useCallback(
    async (text: string) => {
      setSpeaking(true);
      try {
        if (useLocalTts) {
          const url = await localTtsToAudioUrl(text);
          await new Promise<void>((resolve) => {
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.play().catch(() => resolve());
          });
        } else {
          await browserSpeak(text, langCode, rate);
        }
      } catch {
        await browserSpeak(text, langCode, rate);
      } finally {
        setSpeaking(false);
      }
    },
    [useLocalTts, langCode, rate]
  );

  const askAi = useCallback(
    async (prompt: string) => {
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
        await speakAnswer(answer);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setAiText(`Error: ${msg}`);
      } finally {
        setProcessing(false);
      }
    },
    [speakAnswer]
  );

  const startBrowserListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition not supported. Use Chrome/Edge or configure local Whisper.');
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
          try {
            recognition.start();
          } catch {
            /* ignore */
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
    } catch {
      setError('Could not start microphone.');
    }
  }, [langCode, askAi, processing, speaking]);

  const stopLocalRecording = useCallback(async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      rec.stop();
    });
    setRecording(false);
    setListening(false);

    const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
    chunksRef.current = [];
    if (blob.size < 1000) return;

    setProcessing(true);
    try {
      const text = await localSttFromBlob(blob);
      if (!text) {
        setError('No speech detected');
        return;
      }
      setUserText(text);
      await askAi(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessing(false);
    }
  }, [askAi]);

  const startLocalRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
      setListening(true);
      setError(null);

      // Auto-stop after 8s utterance window (push-to-talk style)
      window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopLocalRecording();
        }
      }, 8000);
    } catch {
      setError('Microphone permission denied');
    }
  }, [stopLocalRecording]);

  const stopAll = useCallback(() => {
    stoppedRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setListening(false);
    setRecording(false);
    setSpeaking(false);
    setProcessing(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopAll();
      return;
    }
    historyRef.current = [];
    setUserText('');
    setAiText('');
    setError(null);
    stoppedRef.current = false;

    (async () => {
      const status = await fetchVoiceStatus();
      setVoiceStatus(status);
      if (status?.stt?.online) {
        // Local STT: wait for user to tap mic (push-to-talk)
      } else {
        startBrowserListening();
      }
    })();

    return () => stopAll();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const modeLabel = useLocalStt || useLocalTts
    ? `Local ${useLocalStt ? 'Whisper' : ''}${useLocalStt && useLocalTts ? '+' : ''}${useLocalTts ? 'Piper' : ''} · free`
    : 'Browser Web Speech · free';

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
          <p className="text-xs text-gray-400">{modeLabel}</p>
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
            <p className="text-amber-400 text-sm animate-pulse">Thinking...</p>
          ) : speaking ? (
            <p className="text-emerald-400 text-sm">Speaking...</p>
          ) : listening ? (
            <p className="text-gray-300 text-sm">
              {useLocalStt ? 'Recording (auto-stop 8s)...' : 'Listening — speak now'}
            </p>
          ) : (
            <p className="text-gray-500 text-sm">
              {useLocalStt ? 'Tap mic to record' : 'Ready'}
            </p>
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
          {useLocalStt ? (
            <button
              onClick={() => {
                if (recording) stopLocalRecording();
                else startLocalRecording();
              }}
              disabled={processing || speaking}
              className="px-5 py-2 rounded-full bg-primary/20 text-primary border border-primary/40 text-sm font-medium disabled:opacity-50"
            >
              {recording ? 'Stop & send' : 'Record'}
            </button>
          ) : (
            <button
              onClick={() => {
                if (listening) {
                  try {
                    recognitionRef.current?.stop();
                  } catch {
                    /* ignore */
                  }
                } else {
                  startBrowserListening();
                }
              }}
              className="px-5 py-2 rounded-full bg-primary/20 text-primary border border-primary/40 text-sm font-medium"
            >
              {listening ? 'Pause mic' : 'Resume mic'}
            </button>
          )}
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
