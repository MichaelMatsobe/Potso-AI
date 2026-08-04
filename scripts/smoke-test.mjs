#!/usr/bin/env node
/**
 * Smoke test: health + public AI chat.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 * Default baseUrl: http://localhost:8080
 */
const base = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');

async function main() {
  console.log('Smoke test against', base);
  let failed = 0;

  // Health
  try {
    const res = await fetch(`${base}/api/health`);
    const data = await res.json();
    console.log('✓ GET /api/health', res.status, JSON.stringify({
      status: data.status,
      aiProvider: data.aiProvider,
      aiOnline: data.aiOnline,
      liveVoiceAvailable: data.liveVoiceAvailable,
    }));
    if (!res.ok) failed++;
  } catch (e) {
    console.error('✗ GET /api/health', e.message);
    failed++;
  }

  // Public AI chat
  try {
    const res = await fetch(`${base}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Reply with a one-sentence greeting.' }),
    });
    const data = await res.json();
    const answer = data.answer || data.content || '';
    console.log('✓ POST /api/ai/chat', res.status, answer.slice(0, 120));
    if (!res.ok || !answer) failed++;
  } catch (e) {
    console.error('✗ POST /api/ai/chat', e.message);
    failed++;
  }

  if (failed) {
    console.error(`\nFAILED (${failed} checks)`);
    process.exit(1);
  }
  console.log('\nAll smoke checks passed.');
}

main();
