# Deployment — Potso AI (free / open source)

## Legal before you go live

1. Comply with [LICENSE](./LICENSE) (Apache-2.0) and [NOTICE](./NOTICE).
2. Review [TERMS.md](./TERMS.md) and [PRIVACY.md](./PRIVACY.md); **adapt** them if you offer a public service under your own legal entity.
3. Comply with **model weight licenses** for any Ollama models you distribute or serve.
4. If processing personal data in the EU/UK/SA/etc., complete your own DPIA / operator obligations — templates in-repo are starting points only.
5. Read [SECURITY.md](./SECURITY.md).

Static pages for users: `/privacy.html`, `/terms.html` (from `public/`).

## Readiness

| Area | Status |
|------|--------|
| Guest web chat + Ollama | Ready |
| Browser Live Voice | Ready |
| Local Whisper/Piper | Optional |
| Docker Compose + Ollama | Ready |
| Firebase accounts | Optional |
| Public multi-tenant hardening | Operator responsibility |

## Self-host

```bash
git checkout dev/freebuff-provider
docker compose up -d --build
docker compose exec ollama ollama pull llama3.2
curl -s http://localhost:8080/api/health
```

Production container serves the built UI and API on **port 8080**.

## Environment

See [`.env.example`](./.env.example). Do **not** configure Gemini — unsupported on this branch.

## Production checklist

- [ ] HTTPS
- [ ] Restrict `ALLOWED_ORIGINS`
- [ ] Rate limits on AI/voice routes
- [ ] Ollama not public without auth
- [ ] Adapted Privacy/Terms with operator identity
- [ ] Monitoring on `/api/health`
- [ ] Model license compliance
