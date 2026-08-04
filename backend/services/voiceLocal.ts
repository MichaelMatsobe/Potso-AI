/**
 * Optional local STT/TTS clients — open source only.
 * STT: whisper.cpp server
 * TTS: Piper HTTP wrapper
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
      const res = await fetch(base || sttUrl, { signal: AbortSignal.timeout(2000) });
      // Any HTTP response means process is listening
      stt = true;
      parts.push(`stt:up(${res.status})`);
    } catch {
      parts.push('stt:down');
    }
  } else {
    parts.push('stt:unconfigured');
  }

  if (ttsUrl) {
    try {
      const base = ttsUrl.replace(/\/tts\/?$/, '');
      const res = await fetch(base || ttsUrl, { signal: AbortSignal.timeout(2000) });
      tts = true;
      parts.push(`tts:up(${res.status})`);
    } catch {
      parts.push('tts:down');
    }
  } else {
    parts.push('tts:unconfigured');
  }

  return { stt, tts, detail: parts.join(',') };
}

export async function localStt(audio: Buffer, filename = 'audio.wav'): Promise<string> {
  const url = process.env.VOICE_STT_URL;
  if (!url) throw new Error('VOICE_STT_URL not set');

  const form = new FormData();
  const bytes = new Uint8Array(audio);
  form.append('file', new Blob([bytes]), filename);
  form.append('response_format', 'json');

  const res = await fetch(url, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`STT ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return (
    data.text ||
    data.transcription ||
    data.result ||
    (Array.isArray(data.segments)
      ? data.segments.map((s: any) => s.text).join(' ')
      : '') ||
    ''
  );
}

export async function localTts(text: string): Promise<ArrayBuffer> {
  const url = process.env.VOICE_TTS_URL;
  if (!url) throw new Error('VOICE_TTS_URL not set');

  // Try JSON POST first (common Piper wrappers)
  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/wav, application/octet-stream' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(90_000),
  });

  // Fallback: GET ?text=
  if (!res.ok) {
    const q = new URL(url);
    q.searchParams.set('text', text);
    res = await fetch(q.toString(), {
      method: 'GET',
      headers: { Accept: 'audio/wav, application/octet-stream' },
      signal: AbortSignal.timeout(90_000),
    });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`TTS ${res.status} ${errText.slice(0, 200)}`);
  }

  return await res.arrayBuffer();
}
