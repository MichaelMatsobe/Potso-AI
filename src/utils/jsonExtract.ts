/** Pure JSON extraction helpers — shared by AI pipeline and unit tests */

export function extractJSON(text: string): any {
  if (!text || typeof text !== 'string') return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* continue */
  }
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      /* continue */
    }
    try {
      const slice = cleaned.slice(first, last + 1).replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(slice);
    } catch {
      /* continue */
    }
  }
  return null;
}

export function normalizeAgentPayload(raw: any): {
  answer: string;
  reasoning: any[];
  tags: string[];
  primaryAgent: string;
  artifacts: any[];
  consensusReached: boolean;
} {
  if (!raw || typeof raw !== 'object') {
    return {
      answer: typeof raw === 'string' ? raw : 'No structured response.',
      reasoning: [],
      tags: ['Info'],
      primaryAgent: 'tshepo',
      artifacts: [],
      consensusReached: false,
    };
  }
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((t: any) => (typeof t === 'string' ? t : String(t))).filter(Boolean)
    : [];
  return {
    answer: typeof raw.answer === 'string' ? raw.answer : 'No answer field.',
    reasoning: Array.isArray(raw.reasoning) ? raw.reasoning : [],
    tags: tags.length ? tags : ['Info'],
    primaryAgent: typeof raw.primaryAgent === 'string' ? raw.primaryAgent : 'tshepo',
    artifacts: Array.isArray(raw.artifacts) ? raw.artifacts : [],
    consensusReached: Boolean(raw.consensusReached),
  };
}

export function resolveProvider(env: Record<string, string | undefined>): 'ollama' | 'freebuff' {
  const explicit = (env.AI_PROVIDER || '').toLowerCase().trim();
  if (explicit === 'freebuff' || explicit === 'openai') return 'freebuff';
  if (explicit === 'ollama' || explicit === 'local') return 'ollama';
  if (env.FREEBUFF_BASE_URL || env.FREEBUFF_MODEL) return 'freebuff';
  return 'ollama';
}
