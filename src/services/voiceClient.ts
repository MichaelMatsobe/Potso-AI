const API_URL = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_ACCESS_KEY || '';

function authHeaders(json = true): HeadersInit {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  if (API_KEY) h['X-API-Key'] = API_KEY;
  return h;
}

export interface VoiceStatus {
  configured: boolean;
  mode: string;
  stt: { configured: boolean; online: boolean };
  tts: { configured: boolean; online: boolean };
  free: boolean;
  openSource: boolean;
}

export async function fetchVoiceStatus(): Promise<VoiceStatus | null> {
  try {
    const res = await fetch(`${API_URL}/voice/status`, {
      headers: authHeaders(false),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as VoiceStatus;
  } catch {
    return null;
  }
}

export async function localSttFromBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const audioBase64 = btoa(binary);

  const res = await fetch(`${API_URL}/voice/stt`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm',
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `STT ${res.status}`);
  }

  const data = await res.json();
  return String(data.text || '').trim();
}

export async function localTtsToAudioUrl(text: string): Promise<string> {
  const res = await fetch(`${API_URL}/voice/tts`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `TTS ${res.status}`);
  }

  const buf = await res.arrayBuffer();
  const blob = new Blob([buf], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function browserSpeak(text: string, lang = 'en-US', rate = 1): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}
