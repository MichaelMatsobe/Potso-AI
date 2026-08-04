# Privacy Notice — Potso AI

**Effective date:** 2026-08-04

This notice describes how the **Potso AI software** handles data when used as designed.  
It is a **template for self-hosted and local use**. It is **not legal advice** and may not satisfy every jurisdiction (e.g. full GDPR/POPIA controller documentation).

Operators who offer Potso AI to the public must publish their own privacy policy naming the legal entity, contact details, lawful bases, retention, and user rights.

## 1. Local / guest mode (default)

When running without Firebase and without external AI APIs:

| Data | Where it goes |
|------|----------------|
| Chat text | Browser `localStorage` and/or your self-hosted API process memory |
| AI prompts/responses | Your configured backend (typically **Ollama on your machine/network**) |
| Voice (browser mode) | Browser SpeechRecognition / speechSynthesis (OS/browser vendor may process audio) |
| Voice (local Whisper/Piper) | Your STT/TTS services only, if configured |

**No Gemini or paid AI APIs are used by the default configuration on `dev/freebuff-provider`.**

## 2. Optional Firebase

If the operator enables Firebase:

- Account identifiers, profile fields, and synced chat history may be stored in Google Firebase / Firestore under the operator's project.
- Processing is subject to Google's terms and the operator's configuration.

## 3. Optional Freebuff or other proxies

If `AI_PROVIDER=freebuff` (or similar):

- Prompts and responses are sent to the configured base URL.
- That service's privacy policy applies.

## 4. Logs

The Express server may log errors and operational metadata (timestamps, status codes). Operators should avoid logging full prompts in shared environments.

## 5. Cookies and tracking

The default app does not implement third-party advertising trackers. Session data may use browser storage.

## 6. Children

The software is not directed at children under 13 (or the applicable age in your jurisdiction). Operators should not knowingly collect children's data without appropriate legal basis and parental controls.

## 7. Your rights (when an operator processes personal data)

Depending on law (e.g. GDPR, UK GDPR, POPIA), individuals may have rights to access, correction, deletion, restriction, portability, and objection. Contact the **operator of the instance you use**, not only the repository author.

## 8. International transfers

Self-hosted local processing keeps data on the operator's infrastructure. Using cloud Firebase or hosted model proxies may transfer data across borders under those providers' rules.

## 9. Contact

- Software author: Michael Aaron Matsobe (GitHub repository owner).
- For a deployed service: contact the service operator identified in that deployment's privacy policy.
