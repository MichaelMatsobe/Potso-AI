# Privacy Notice — Potso AI

**Effective date:** 2026-08-04  
**Software:** Potso AI (open source, Apache-2.0)  
**Operator / author:** Michael Aaron Matsobe  
**Contact (software / privacy enquiries):** via the GitHub profile for repository `MichaelMatsobe/Potso-AI`

> If you deploy a **public** instance under a company name, replace the operator block with your legal entity and publish that version to users. This notice describes the default self-hosted / author-operated design.

## 1. Who is responsible

| Role | Value |
|------|--------|
| Software author | Michael Aaron Matsobe |
| Self-hosted instance operator | The person or organisation running the server (often the same as the author for private deployments) |
| Privacy contact | GitHub: `MichaelMatsobe` / repository Security or Issues (private security reports preferred for vulnerabilities) |

## 2. What data is processed

| Data | Purpose | Storage |
|------|---------|---------|
| Chat prompts/responses (guest) | Provide AI replies | Browser `localStorage`; may be sent to the operator’s API and Ollama |
| Chat/account (if Firebase enabled) | Sync history, accounts | Google Firebase / Firestore under operator project |
| DSAR requests | Fulfil data rights | `data/dsar/` on the server |
| Audit events | Security / compliance | `data/audit/audit.jsonl` |
| Voice (browser) | Speech features | Device OS/browser speech services may process audio |
| Voice (local Whisper/Piper) | Speech features | Operator’s local STT/TTS only |

**Default AI path does not use Google Gemini or paid AI APIs.**

## 3. Lawful bases (when GDPR/UK GDPR/POPIA apply)

| Processing | Basis |
|------------|--------|
| Providing the service the user requests (chat) | Contract / legitimate interests (self-hosted utility) |
| Account features (Firebase) | Contract |
| Voice | Consent (microphone permission) |
| Security logs / rate limits | Legitimate interests |
| DSAR handling | Legal obligation |

## 4. Retention

| Data | Default |
|------|---------|
| Server-synced chats/messages | 180 days (`expireAt` + Firestore TTL when enabled) |
| DSAR export files | 30 days |
| DSAR ticket records | 24 months |
| Guest browser data | Until the user clears site data |

## 5. Sharing

Data is not sold. It may be processed by:

- The operator’s infrastructure (Ollama, optional Whisper/Piper)
- Google Firebase **only if** the operator enables it
- Optional Freebuff **only if** configured

## 6. International transfers

Self-hosted local processing keeps data on the operator’s machines. Firebase or hosted proxies may process data in other regions under those providers’ terms.

## 7. Your rights

Where applicable (e.g. GDPR, POPIA): access, correction, erasure, restriction, portability, objection.  
Use **`/dsar.html`** on the instance or `POST /api/dsar/request`.

## 8. Children

Not directed at children under 13 (or higher age where required).

## 9. Changes

Updates appear in this repository and on `/privacy.html` for deployed builds.
