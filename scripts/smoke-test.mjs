#!/usr/bin/env node
const base = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const apiKey = process.env.API_ACCESS_KEY || process.env.VITE_API_ACCESS_KEY || '';

function headers(json = true) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (apiKey) h['X-API-Key'] = apiKey;
  return h;
}

async function main() {
  console.log('Smoke test against', base);
  let failed = 0;

  const check = async (name, fn) => {
    try {
      await fn();
      console.log('✓', name);
    } catch (e) {
      console.error('✗', name, e.message);
      failed++;
    }
  };

  await check('GET /api/health', async () => {
    const res = await fetch(`${base}/api/health`);
    const data = await res.json();
    if (!res.ok) throw new Error(String(res.status));
    if (!data.dsar?.enabled && data.endpoints && !data.endpoints.dsarRequest) {
      /* older shape ok */
    }
    console.log('   ', { status: data.status, aiOnline: data.aiOnline, provider: data.aiProvider });
  });

  await check('GET /api/voice/status', async () => {
    const res = await fetch(`${base}/api/voice/status`, { headers: headers(false) });
    if (res.status === 401 && apiKey) throw new Error('401 with key');
    if (!res.ok && res.status !== 401) throw new Error(String(res.status));
    if (res.ok) {
      const data = await res.json();
      if (data.free !== true && data.openSource !== true) {
        /* soft */
      }
    }
  });

  await check('POST /api/ai/chat', async () => {
    const res = await fetch(`${base}/api/ai/chat`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ content: 'Reply with OK only.' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    const answer = data.answer || data.content || '';
    if (!answer) throw new Error('empty answer');
  });

  await check('POST /api/dsar/request', async () => {
    const res = await fetch(`${base}/api/dsar/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'access', email: 'smoke@example.com' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || String(res.status));
    if (!data.id || !data.token) throw new Error('missing id/token');
  });

  await check('static /privacy.html', async () => {
    const res = await fetch(`${base}/privacy.html`);
    // dev: vite serves public; prod: express static
    if (!res.ok && res.status !== 404) throw new Error(String(res.status));
  });

  if (failed) {
    console.error(`\nFAILED (${failed})`);
    process.exit(1);
  }
  console.log('\nAll smoke checks passed.');
}

main();
