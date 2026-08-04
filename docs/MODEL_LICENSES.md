# Model license obligations

Potso AI does **not** redistribute model weights. Operators who run `ollama pull <model>` (or host Whisper/Piper voices) must comply with **each model’s license**.

**Not legal advice.** Verify current license text upstream before commercial use.

## Runtime vs weights

| Component | Typical license | Obligation highlight |
|-----------|-----------------|----------------------|
| Ollama runtime | MIT | Preserve copyright notices |
| whisper.cpp | MIT | Preserve notices |
| Piper / voices | Check each voice pack | Some voices have use restrictions |
| Potso AI code | Apache-2.0 | See LICENSE + NOTICE |

## Common open-weight families (indicative)

| Family (examples) | License themes to review |
|-------------------|---------------------------|
| **Llama** (Meta) | Llama Community License — acceptable use, attribution, distribution rules |
| **Gemma** (Google) | Gemma Terms of Use — prohibited uses, distribution |
| **Mistral** | Apache-2.0 for many releases — confirm per model card |
| **Qwen** | Tongyi Qianwen / Apache variants — check model card |
| **Phi** (Microsoft) | MIT for many — confirm per release |
| **DeepSeek** | Model-specific — review commercial terms |

Always open the **model card / license file** on the model registry (Ollama library, Hugging Face, vendor site) for the exact revision you deploy.

## Operator checklist

- [ ] Record model IDs and versions in use — `[MODEL_INVENTORY]`
- [ ] Store copies of license texts — `[LICENSE_ARCHIVE]`
- [ ] Attribution in UI or docs if required — `[ATTRIBUTION_TEXT]`
- [ ] Confirm commercial use is allowed — `[COMMERCIAL_OK]`
- [ ] Confirm redistribution of outputs / fine-tunes rules — `[OUTPUT_RULES]`
- [ ] Acceptable use (no prohibited high-risk uses) — `[AUP_ALIGNED]`
- [ ] If serving EU users, align with AI Act risk category assessment — `[AI_ACT_NOTE]`

## Outputs

Model licenses and law may still restrict certain uses of **outputs** (e.g. generating prohibited content). Potso TERMS.md acceptable-use clauses should stay enabled on public deployments.

## Suggested inventory table

| Model ID | Source | License URL | Commercial? | Notes |
|----------|--------|-------------|-------------|-------|
| `llama3.2` | `[SOURCE]` | `[URL]` | `[Y/N]` | `[NOTES]` |
| `[MODEL]` | | | | |
