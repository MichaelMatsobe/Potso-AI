/**
 * Unit tests for JSON extraction & agent payload normalization.
 * Run: node tests/unit/jsonExtract.test.mjs
 */
import { extractJSON, normalizeAgentPayload, resolveProvider } from '../../src/utils/jsonExtract.ts';

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

console.log('\n=== Unit: resolveProvider ===');
assert(resolveProvider({}) === 'ollama', 'default ollama');
assert(resolveProvider({ AI_PROVIDER: 'freebuff' }) === 'freebuff', 'explicit freebuff');
assert(resolveProvider({ AI_PROVIDER: 'ollama' }) === 'ollama', 'explicit ollama');
assert(resolveProvider({ FREEBUFF_BASE_URL: 'http://x' }) === 'freebuff', 'auto freebuff');
assert(resolveProvider({ AI_PROVIDER: 'gemini' }) === 'ollama', 'gemini rejected → ollama');

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
