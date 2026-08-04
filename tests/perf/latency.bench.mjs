/**
 * Performance benchmarks (CPU-local, no external AI required for core benches).
 * Optional live AI bench if API is up.
 * Run: node tests/perf/latency.bench.mjs [apiBase]
 */

import { extractJSON, normalizeAgentPayload } from '../../src/utils/jsonExtract.ts';

const apiBase = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');

function bench(name, fn, iterations = 5000) {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn(i);
  const ms = performance.now() - t0;
  const per = ms / iterations;
  console.log(`  ${name}: ${ms.toFixed(1)}ms total · ${per.toFixed(4)}ms/op · ${iterations} iters`);
  return { name, ms, per, iterations };
}

console.log('\n=== Perf: JSON pipeline (usability-critical path) ===');
const sample = '```json\n{"reasoning":[{"agentId":"tshepo","thought":"x"}],"answer":"Hello world from Potso","tags":["Info"],"primaryAgent":"tshepo","consensusReached":true,"artifacts":[]}\n```';

bench('extractJSON', () => extractJSON(sample));
bench('normalizeAgentPayload', () => {
  const j = extractJSON(sample);
  normalizeAgentPayload(j);
});

const large = JSON.stringify({
  reasoning: Array.from({ length: 20 }, (_, i) => ({
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

console.log('\n=== Perf: live API (optional) ===');
try {
  const t0 = performance.now();
  const res = await fetch(`${apiBase}/api/health`, { signal: AbortSignal.timeout(3000) });
  const healthMs = performance.now() - t0;
  const data = await res.json();
  console.log(`  GET /api/health: ${healthMs.toFixed(0)}ms · status=${data.status} · aiOnline=${data.aiOnline}`);

  if (healthMs > 500) {
    console.warn('  ⚠ health > 500ms — check network / Ollama probe');
  } else {
    console.log('  ✓ health within usability budget (<500ms)');
  }

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
console.log('  Text chat first token budget: < 8s (local CPU)');
console.log('  Health indicator refresh: 15s poll (UI)');
console.log('  Browser voice: depends on OS STT; expect 1–3s after end-of-speech');
console.log('  Local Whisper+Piper (docs): expect 1–4s full round trip');
console.log('\nPerf suite complete.');
