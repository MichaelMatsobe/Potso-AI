/**
 * Unit tests for JSON extraction, payload normalization, hybrid provider mode.
 */

function extractJSON(text) {
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

function normalizeAgentPayload(raw) {
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
    ? raw.tags.map((t) => (typeof t === 'string' ? t : String(t))).filter(Boolean)
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

/** Mirrors getProviderMode() + getProvider() hybrid behavior */
function resolveProviderMode(env) {
  const explicit = (env.AI_PROVIDER || 'auto').toLowerCase().trim();
  if (explicit === 'freebuff' || explicit === 'openai') return 'freebuff';
  if (explicit === 'ollama' || explicit === 'local') return 'ollama';
  if (explicit === 'hybrid' || explicit === 'auto' || explicit === 'both' || !env.AI_PROVIDER) {
    return 'auto';
  }
  if (explicit === 'gemini') return 'auto';
  return 'auto';
}

function resolveProvider(env) {
  const mode = resolveProviderMode(env);
  if (mode === 'freebuff') return 'freebuff';
  if (mode === 'ollama') return 'ollama';
  return 'auto';
}

let passed = 0;
let failed = 0;

function assert(cond, name) {
  if (cond) {
    passed++;
    console.log('  ✓', name);
  } else {
    failed++;
    console.error('  ✗', name);
  }
}

console.log('\n=== Unit: extractJSON ===');
assert(extractJSON('{"a":1}').a === 1, 'plain JSON');
assert(extractJSON('```json\n{"a":2}\n```').a === 2, 'markdown fenced JSON');
assert(extractJSON('Here is data: {"answer":"hi"} done').answer === 'hi', 'embedded JSON');
assert(extractJSON('{"a":1,}').a === 1, 'trailing comma repair');
assert(extractJSON('') === null, 'empty → null');
assert(extractJSON('not json') === null, 'prose → null');
assert(extractJSON(null) === null, 'null input');

console.log('\n=== Unit: normalizeAgentPayload ===');
const n1 = normalizeAgentPayload({
  answer: 'Hello',
  reasoning: [{ agentId: 'tshepo', thought: 'ok' }],
  tags: ['A'],
  primaryAgent: 'modisa',
  artifacts: [],
  consensusReached: true,
});
assert(n1.answer === 'Hello', 'answer preserved');
assert(n1.primaryAgent === 'modisa', 'primaryAgent');
assert(n1.consensusReached === true, 'consensus');
assert(normalizeAgentPayload('raw text').answer === 'raw text', 'string fallback');
assert(normalizeAgentPayload(null).primaryAgent === 'tshepo', 'null defaults');

console.log('\n=== Unit: resolveProvider (hybrid) ===');
assert(resolveProvider({}) === 'auto', 'default auto hybrid');
assert(resolveProviderMode({}) === 'auto', 'default mode auto');
assert(resolveProvider({ AI_PROVIDER: 'freebuff' }) === 'freebuff', 'explicit freebuff');
assert(resolveProvider({ AI_PROVIDER: 'ollama' }) === 'ollama', 'explicit ollama');
assert(resolveProvider({ AI_PROVIDER: 'hybrid' }) === 'auto', 'hybrid → auto');
assert(resolveProvider({ FREEBUFF_BASE_URL: 'http://x' }) === 'auto', 'FREEBUFF env keeps hybrid auto');
assert(resolveProvider({ AI_PROVIDER: 'gemini' }) === 'auto', 'gemini rejected → auto');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
