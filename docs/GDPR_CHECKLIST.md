# GDPR / privacy compliance checklist

**Not legal advice.** Complete with your counsel before processing personal data of EU/EEA (and UK) residents.

## Operator identity (fill in)

| Field | Placeholder |
|-------|-------------|
| Legal entity name | `[OPERATOR_LEGAL_NAME]` |
| Registered address | `[OPERATOR_ADDRESS]` |
| Contact email | `[OPERATOR_PRIVACY_EMAIL]` |
| Data Protection Officer (if required) | `[OPERATOR_DPO_EMAIL]` |
| Supervisory authority | `[SUPERVISORY_AUTHORITY]` |
| Lead authority (cross-border) | `[LEAD_SA]` |

## Lawful basis map (Art. 6)

| Processing | Typical basis | Your choice |
|------------|---------------|-------------|
| Guest chat on self-hosted instance | Legitimate interest / consent | `[BASIS_CHAT]` |
| Account / Firebase auth | Contract / consent | `[BASIS_ACCOUNT]` |
| Voice audio (browser or Whisper) | Consent | `[BASIS_VOICE]` |
| Logs / security | Legitimate interest | `[BASIS_LOGS]` |
| Analytics (if any) | Consent | `[BASIS_ANALYTICS]` |

## Checklist

### Governance
- [ ] Document processing activities (RoPA) — `[ROPA_LINK]`
- [ ] Appoint DPO if required — `[DPO_STATUS]`
- [ ] DPIA for AI profiling / large-scale sensitive data — `[DPIA_STATUS]`
- [ ] Processor agreements with Firebase / hosts / Freebuff — `[DPA_STATUS]`

### Transparency
- [ ] Privacy policy published (adapt `PRIVACY.md`) — URL: `[PRIVACY_URL]`
- [ ] Terms published — URL: `[TERMS_URL]`
- [ ] Disclose AI use and that outputs may be inaccurate
- [ ] Disclose model providers and locations (local vs third country)

### Data minimisation & security (Art. 5, 32)
- [ ] `API_ACCESS_KEY` set in production
- [ ] Rate limits enabled
- [ ] HTTPS only
- [ ] `ALLOWED_ORIGINS` restricted
- [ ] Ollama / Whisper not public without auth
- [ ] Retention schedule: chat `[RETENTION_CHAT]`, logs `[RETENTION_LOGS]`

### Data subject rights (Art. 12–22)
- [ ] Access process — `[DSAR_PROCESS]`
- [ ] Erasure process — `[ERASURE_PROCESS]`
- [ ] Portability format — `[PORTABILITY_FORMAT]`
- [ ] Response SLA (≤30 days) — tracked in `[DSAR_TRACKER]`

### International transfers (Ch. V)
- [ ] List transfer tools (SCCs, adequacy) — `[TRANSFER_TOOL]`
- [ ] Sub-processors list — `[SUBPROCESSORS_URL]`

### Breach
- [ ] Incident response plan — `[IR_PLAN_LINK]`
- [ ] 72-hour notification procedure — `[BREACH_NOTIFY]`

## Potso-specific notes

- Default **guest + Ollama** can keep prompts on infrastructure you control.
- **Browser speech** may send audio to the OS/browser vendor — disclose this.
- **Freebuff / cloud Firebase** are separate controllers/processors — complete DPAs.
