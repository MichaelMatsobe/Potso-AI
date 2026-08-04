/**
 * Unit tests for local voice config helpers (no live STT/TTS required).
 */
import assert from 'node:assert/strict';

function isLocalVoiceConfigured(env) {
  return Boolean(env.VOICE_STT_URL || env.VOICE_TTS_URL);
}

console.log('\n=== Unit: voiceLocal config ===');
assert.equal(isLocalVoiceConfigured({}), false);
assert.equal(isLocalVoiceConfigured({ VOICE_STT_URL: 'http://127.0.0.1:8178/inference' }), true);
assert.equal(isLocalVoiceConfigured({ VOICE_TTS_URL: 'http://127.0.0.1:5001/tts' }), true);
console.log('  ✓ config detection');
console.log('\nResults: voiceLocal config OK');
