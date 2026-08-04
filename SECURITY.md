# Security Policy

## Supported versions

| Branch / version | Support |
|------------------|---------|
| `dev/freebuff-provider` | Active development |
| Older Gemini-based configs | Unsupported on this branch |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

1. Contact the repository owner (Michael Matsobe) via GitHub Security Advisories for this repository if enabled, or a private channel listed on the owner's GitHub profile.
2. Include: description, impact, steps to reproduce, and any suggested fix.
3. Allow reasonable time for a fix before public disclosure.

## Deployment security expectations

Operators should:

- Terminate TLS (HTTPS) at the edge
- Restrict `ALLOWED_ORIGINS`
- Rate-limit `/api/ai/*` and `/api/voice/*`
- Not expose Ollama or Whisper/Piper ports to the public internet without authentication
- Keep dependencies updated (`npm audit`)
- Treat model prompts as sensitive data in multi-user setups

## Scope

This project is provided under Apache-2.0 with no warranty. Security hardening for high-threat multi-tenant production is the operator's responsibility.
