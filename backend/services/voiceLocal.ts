/**
 * Optional local STT/TTS clients (whisper.cpp server + Piper HTTP).
 * Disabled unless VOICE_STT_URL / VOICE_TTS_URL are set.
 */

export function isLocalVoiceConfigured(): boolean {
  return Boolean(process.env.VOICE_STT_URL || process.env.VOICE_TTS_URL);
}

export async function probeLocalVoice(): Promise<{
  stt: boolean;
  tts: boolean;
  detail: string;
}> {
  const sttUrl = process.env.VOICE_STT_URL;
  const ttsUrl = process.env.VOICE_TTS_URL;
  let stt = false;
  let tts = false;
  const parts: string[] = [];

  if (sttUrl) {
    try {
      const base = sttUrl.replace(/\/inference\/?$/, '');
      const res = await fetch(base, { signal: AbortSignal.timeout(2000) });
      stt = res.ok || res.status === 404; // server up even if GET /
      parts.push(`stt:${stt ? 'up' : 'down'}`);
    } catch (e) {
      parts.push(`stt:error`);
    }
  } else {
    parts.push('stt:unconfigured');
  }

  if (ttsUrl) {
    try {
      const base = ttsUrl.replace(/\/tts\/?$/, '');
      const res = await fetch(base, { signal: AbortSignal.timeout(2000) });
      tts = res.ok || res.status === 404;
      parts.push(`tts:${tts ? 'up' : 'down'}`);
    } catch {
      parts.push('tts:error');
    }
  } else {
    parts.push('tts:unconfigured');
  }

  return { stt, tts, detail: parts.join(',') };
}

/** Transcribe audio via whisper.cpp-style /inference multipart endpoint */
export async function localStt(audio: Buffer, filename = 'audio.wav'): Promise<string> {
  const url = process.env.VOICE_STT_URL;
  if (!url) throw new Error('VOICE_STT_URL not set');

  const form = new FormData();
  form.append('file', new Blob([audio]), filename);
  form.append('response_format', 'json');

  const res = await fetch(url, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`STT ${res.status}`);
  const data = await res.json();
  return data.text || data.transcription || data.result || JSON.stringify(data);
}

/** Synthesize speech via Piper-style HTTP TTS; returns audio bytes */
export async function localTts(text: string): Promise<ArrayBuffer> {
  const url = process.env.VOICE_TTS_URL;
  if (!url) throw new Error('VOICE_TTS_URL not set');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  return await res.arrayBuffer();
}
