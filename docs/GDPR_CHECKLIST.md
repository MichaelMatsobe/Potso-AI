# GDPR / privacy compliance checklist

**Operator:** Michael Aaron Matsobe (default)  
**Not legal advice.** Complete before processing EU/UK personal data at scale.

## Operator identity

| Field | Value |
|-------|--------|
| Legal name | Michael Aaron Matsobe |
| Address | *Add if public controller* |
| Privacy email / contact | GitHub `MichaelMatsobe` |
| DPO | Not appointed by default |
| Supervisory authority | *EU SA / ICO / Information Regulator SA as applicable* |

## Lawful basis map

| Processing | Basis |
|------------|--------|
| Chat | Contract / legitimate interests |
| Account (Firebase) | Contract |
| Voice | Consent |
| Logs | Legitimate interests |
| DSAR | Legal obligation |

## Checklist

### Governance
- [x] Processing described in PRIVACY.md
- [x] DSAR automation (`/dsar.html`, `/api/dsar/*`)
- [x] Retention defaults documented and automated where possible
- [ ] Formal RoPA document if required for organisation size
- [ ] DPO / representatives appointed when legally required
- [ ] DPAs with Google Firebase / hosts if used

### Transparency
- [x] Privacy + Terms in repo and `/privacy.html`, `/terms.html`
- [x] AI inaccuracy disclosed in Terms
- [x] Local vs optional cloud processing disclosed

### Security
- [x] API key support, rate limits, security headers
- [x] Production env template (`.env.production.example`)
- [ ] HTTPS at edge (operator)
- [ ] Restrict `ALLOWED_ORIGINS` (operator)
- [ ] Firestore TTL enabled in GCP when using Firebase (run `scripts/enable-firestore-ttl.sh`)

### Rights
- [x] Access / portability / erasure / restriction / rectification via DSAR
- [x] Guest local clear on `/dsar.html`
- [ ] Human escalation path staffed for disputes

### Breach
- [ ] Incident contacts and 72h notification playbook customised for operator

## Potso-specific

- Prefer **Ollama on operator infrastructure** to minimise transfers.
- Browser speech may leave the device — disclosed in Privacy.
