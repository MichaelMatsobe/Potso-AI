/**
 * Performance benchmarks.
 * Run: node tests/perf/latency.bench.mjs [apiBase]
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
  return {
    answer: typeof raw.answer === 'string' ? raw.answer : 'No answer field.',
    reasoning: Array.isArray(raw.reasoning) ? raw.reasoning : [],
    tags: Array.isArray(raw.tags) && raw.tags.length ? raw.tags : ['Info'],
    primaryAgent: typeof raw.primaryAgent === 'string' ? raw.primaryAgent : 'tshepo',
    artifacts: Array.isArray(raw.artifacts) ? raw.artifacts : [],
    consensusReached: Boolean(raw.consensusReached),
  };
}

const apiBase = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');

function bench(name, fn, iterations = 5000) {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn(i);
  const ms = performance.now() - t0;
  const per = ms / iterations;
  console.log(`  ${name}: ${ms.toFixed(1)}ms total · ${per.toFixed(4)}ms/op · ${iterations} iters`);
  return { ms, per };
}

console.log('\n=== Perf: JSON pipeline (usability-critical path) ===');
const sample =
  '```json\n{"reasoning":[{"agentId":"tshepo","thought":"x"}],"answer":"Hello world from Potso","tags":["Info"],"primaryAgent":"tshepo","consensusReached":true,"artifacts":[]}\n```';

const r1 = bench('extractJSON', () => extractJSON(sample));
const r2 = bench('normalizeAgentPayload', () => {
  normalizeAgentPayload(extractJSON(sample));
});

const large = JSON.stringify({
  reasoning: Array.from({ length: 20 }, () => ({
    agentId: 'tshepo',
    thought: 'x'.repeat(200),
  })),
  answer: 'y'.repeat(5000),
  tags: ['a', 'b', 'c'],
  primaryAgent: 'tshepo',
  consensusReached: true,
  artifacts: Array.from({ length: 10 }, (_, i) => ({
    id: String(i),
    title: 't',
    content: 'c'.repeat(500),
    type: 'text',
    createdBy: 'tshepo',
  })),
});
bench('extractJSON large payload', () => extractJSON(large), 2000);

// Usability: JSON path must be negligible vs network/model
if (r1.per < 1 && r2.per < 1) {
  console.log('  ✓ JSON pipeline << 1ms/op (not a UX bottleneck)');
} else {
  console.warn('  ⚠ JSON pipeline slower than expected');
}

console.log('\n=== Perf: live API (optional) ===');
try {
  const t0 = performance.now();
  const res = await fetch(`${apiBase}/api/health`, { signal: AbortSignal.timeout(3000) });
  const healthMs = performance.now() - t0;
  const data = await res.json();
  console.log(
    `  GET /api/health: ${healthMs.toFixed(0)}ms · status=${data.status} · aiOnline=${data.aiOnline}`
  );
  if (healthMs > 500) console.warn('  ⚠ health > 500ms');
  else console.log('  ✓ health within usability budget (<500ms)');

  const t1 = performance.now();
  const chat = await fetch(`${apiBase}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Reply with exactly: OK' }),
    signal: AbortSignal.timeout(120000),
  });
  const chatMs = performance.now() - t1;
  const body = await chat.json();
  const answer = body.answer || body.content || '';
  console.log(`  POST /api/ai/chat: ${chatMs.toFixed(0)}ms · answerLen=${answer.length}`);
  if (chatMs < 8000) console.log('  ✓ chat within soft budget (<8s for local model)');
  else console.warn('  ⚠ chat slow — model size / CPU');
} catch (e) {
  console.log('  (skipped live API — server not running)', e.message);
}

console.log('\n=== Usability heuristics ===');
console.log('  Text chat budget: < 8s (local CPU model)');
console.log('  Health badge poll: 15s');
console.log('  Browser voice: ~1–3s after end-of-speech');
console.log('  Local Whisper+Piper (planned): ~1–4s RTT');
console.log('  WebRTC: not required for 1:1 local AI (see docs/WEBRTC.md)');
console.log('\nPerf suite complete.');
