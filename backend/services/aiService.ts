/**
 * Potso-AI unified AI service
 *
 * Priority for "open source + no quotas":
 *   1. Ollama / local OpenAI-compatible (default) — self-hosted open weights, unlimited
 *   2. Freebuff proxy — optional; free but regional limits exist
 *   3. Gemini — optional; requires API key
 *
 * Recommended open-weight models via Ollama:
 *   llama3.2, llama3.1, qwen2.5, qwen2.5-coder, deepseek-r1, mistral, phi3, gemma2
 */

import { GoogleGenAI, Type } from "@google/genai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIMessage {
  role: "user" | "model" | "assistant";
  parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }>;
}

export interface MultiAgentResult {
  reasoning: Array<{
    agentId: string;
    thought: string;
    delegatedTo?: string;
    action?: string;
  }>;
  answer: string;
  tags: string[];
  primaryAgent: string;
  artifacts: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    createdBy: string;
  }>;
  consensusReached: boolean;
  imagePrompt?: string;
  imageUrl?: string;
  _meta?: {
    provider: string;
    model: string;
    fallbackUsed?: boolean;
    openSource?: boolean;
    noQuota?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Open-source local model catalog (no quotas when self-hosted)
// ---------------------------------------------------------------------------

export const OPEN_SOURCE_LOCAL_MODELS: Array<{
  id: string;
  label: string;
  notes: string;
  ollamaPull?: string;
}> = [
  {
    id: "llama3.2",
    label: "Llama 3.2",
    notes: "Meta open weights — good general default",
    ollamaPull: "llama3.2",
  },
  {
    id: "llama3.1",
    label: "Llama 3.1",
    notes: "Stronger Llama variant",
    ollamaPull: "llama3.1",
  },
  {
    id: "qwen2.5",
    label: "Qwen 2.5",
    notes: "Alibaba open weights — strong multilingual",
    ollamaPull: "qwen2.5",
  },
  {
    id: "qwen2.5-coder",
    label: "Qwen 2.5 Coder",
    notes: "Code-specialized open weights",
    ollamaPull: "qwen2.5-coder",
  },
  {
    id: "deepseek-r1",
    label: "DeepSeek R1",
    notes: "Reasoning-focused open weights (if available in Ollama)",
    ollamaPull: "deepseek-r1",
  },
  {
    id: "mistral",
    label: "Mistral",
    notes: "Mistral open weights — efficient",
    ollamaPull: "mistral",
  },
  {
    id: "phi3",
    label: "Phi-3",
    notes: "Microsoft small open model — low RAM",
    ollamaPull: "phi3",
  },
  {
    id: "gemma2",
    label: "Gemma 2",
    notes: "Google open weights",
    ollamaPull: "gemma2",
  },
];

/** Freebuff models — free but NOT quota-free / not fully open infrastructure */
export const FREEBUFF_MODELS: Array<{ id: string; label: string; notes: string }> = [
  { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro (Freebuff)", notes: "Freebuff-hosted; regional limits may apply" },
  { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash (Freebuff)", notes: "Faster Freebuff option" },
  { id: "minimax/minimax-m2.7", label: "MiniMax (Freebuff)", notes: "Freebuff-hosted" },
];

// ---------------------------------------------------------------------------
// Provider selection — Ollama (open source, no quotas) is default
// ---------------------------------------------------------------------------

export function getProvider(): "ollama" | "freebuff" | "gemini" {
  const explicit = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  if (explicit === "gemini") return "gemini";
  if (explicit === "freebuff" || explicit === "openai") return "freebuff";
  if (explicit === "ollama" || explicit === "local") return "ollama";

  // Auto-detect: prefer local open-source when Ollama is configured
  if (process.env.OLLAMA_BASE_URL) return "ollama";
  if (process.env.FREEBUFF_BASE_URL || process.env.FREEBUFF_MODEL) return "freebuff";

  // Default: open-source local path (user installs Ollama)
  return "ollama";
}

const SYSTEM_PROMPT = `You are Potso, a South African multi-agent cognition system.
Creator: Michael Aaron Matsobe.
You run on open-source models (self-hosted when possible) with no usage quotas.

Simulate collaboration between exactly these 4 agents:
- Modisa — deep search and data retrieval
- Tshepo — synthesis and cross-referencing
- Kgakgamatso — technical audit and code analysis
- Tlhaloganyo — narrative structure and readability

Rules:
1. Agents may produce shared artifacts (code, data, text).
2. Agents MUST delegate sub-tasks when appropriate (use delegatedTo + action).
3. Mark consensusReached true when agents agree.

Respond with ONLY a valid JSON object. No markdown fences. No prose outside JSON.
{
  "reasoning": [
    { "agentId": "modisa|tshepo|kgakgamatso|tlhaloganyo", "thought": "...", "delegatedTo": "optional", "action": "optional" }
  ],
  "artifacts": [
    { "id": "string", "title": "string", "content": "string", "type": "code|data|text|image", "createdBy": "agentId" }
  ],
  "answer": "final answer for the user",
  "tags": ["tag1", "tag2"],
  "primaryAgent": "modisa|tshepo|kgakgamatso|tlhaloganyo",
  "imagePrompt": "optional",
  "consensusReached": true
}

- reasoning: 3-4 steps
- tags: 2-3 tags
- answer must be complete and helpful`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractJSON(text: string): any {
  if (!text || typeof text !== "string") return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* continue */
  }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      /* continue */
    }
  }
  return null;
}

function normalizeResult(raw: any, meta?: MultiAgentResult["_meta"]): MultiAgentResult {
  const fallbackAnswer =
    typeof raw?.answer === "string"
      ? raw.answer
      : typeof raw === "string"
        ? raw
        : "I could not produce a structured response.";

  if (!raw || typeof raw !== "object") {
    return {
      reasoning: [],
      answer: fallbackAnswer,
      tags: ["Info"],
      primaryAgent: "tshepo",
      artifacts: [],
      consensusReached: false,
      _meta: meta,
    };
  }

  const reasoning = Array.isArray(raw.reasoning)
    ? raw.reasoning.map((step: any) => ({
        agentId: typeof step?.agentId === "string" ? step.agentId : "tshepo",
        thought: typeof step?.thought === "string" ? step.thought : String(step?.thought ?? ""),
        delegatedTo: typeof step?.delegatedTo === "string" ? step.delegatedTo : undefined,
        action: typeof step?.action === "string" ? step.action : undefined,
      }))
    : [];

  const artifacts = Array.isArray(raw.artifacts)
    ? raw.artifacts.map((art: any, i: number) => ({
        id: typeof art?.id === "string" ? art.id : `art-${i}-${Date.now()}`,
        title: typeof art?.title === "string" ? art.title : "Untitled",
        content: typeof art?.content === "string" ? art.content : JSON.stringify(art?.content ?? ""),
        type: typeof art?.type === "string" ? art.type : "text",
        createdBy: typeof art?.createdBy === "string" ? art.createdBy : "tshepo",
      }))
    : [];

  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((t: any) => (typeof t === "string" ? t : String(t))).filter(Boolean)
    : [];

  return {
    reasoning,
    answer: typeof raw.answer === "string" ? raw.answer : fallbackAnswer,
    tags: tags.length ? tags : ["Info"],
    primaryAgent: typeof raw.primaryAgent === "string" ? raw.primaryAgent : "tshepo",
    artifacts,
    consensusReached: Boolean(raw.consensusReached),
    imagePrompt: typeof raw.imagePrompt === "string" ? raw.imagePrompt : undefined,
    _meta: meta,
  };
}

function historyToOpenAIMessages(history: AIMessage[]): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [];
  for (const msg of history.slice(-10)) {
    const role = msg.role === "user" ? "user" : "assistant";
    const texts: string[] = [];
    for (const part of msg.parts || []) {
      if (part.text) texts.push(part.text);
      if (part.inlineData) {
        texts.push(`[Attachment omitted: ${part.inlineData.mimeType}]`);
      }
    }
    messages.push({ role, content: texts.join("\n").trim() || " " });
  }
  return messages;
}

async function openAICompatibleChat(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  timeoutMs?: number;
}): Promise<string> {
  const url = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: 0.35,
        // Ollama often ignores response_format; we still request it when supported
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`${res.status} ${errText.slice(0, 240)}`);
    }

    const data = await res.json();
    return (
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      data?.content ||
      ""
    );
  } finally {
    clearTimeout(timer);
  }
}

function buildMessages(prompt: string, history: AIMessage[]) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...historyToOpenAIMessages(history),
  ];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || last.content !== prompt) {
    messages.push({ role: "user", content: prompt });
  }
  return messages;
}

// ---------------------------------------------------------------------------
// Ollama / local open-source path (DEFAULT — no quotas)
// ---------------------------------------------------------------------------

async function ollamaMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = [],
  asFallback = false
): Promise<MultiAgentResult> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1").replace(/\/$/, "");
  const primary = process.env.OLLAMA_MODEL || "llama3.2";
  const extras = (process.env.OLLAMA_FALLBACK_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const candidates = [...new Set([primary, ...extras, ...OPEN_SOURCE_LOCAL_MODELS.map((m) => m.id)])];

  const messages = buildMessages(prompt, history);
  const errors: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    try {
      const content = await openAICompatibleChat({
        baseUrl,
        apiKey: process.env.OLLAMA_API_KEY || "ollama",
        model,
        messages,
      });

      const parsed = extractJSON(content);
      if (parsed) {
        return normalizeResult(parsed, {
          provider: "ollama",
          model,
          fallbackUsed: asFallback || i > 0,
          openSource: true,
          noQuota: true,
        });
      }

      if (typeof content === "string" && content.trim()) {
        return normalizeResult(
          {
            answer: content.trim(),
            reasoning: [
              {
                agentId: "tshepo",
                thought: `Local model ${model} returned non-JSON; delivering raw text.`,
              },
            ],
            tags: ["Ollama", "OpenSource", "SoftFallback"],
            primaryAgent: "tshepo",
            consensusReached: false,
            artifacts: [],
          },
          {
            provider: "ollama",
            model,
            fallbackUsed: asFallback || i > 0,
            openSource: true,
            noQuota: true,
          }
        );
      }

      errors.push(`${model}: empty`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${model}: ${msg}`);
      console.warn(`[Ollama] model failed: ${model} → ${msg}`);
    }
  }

  throw new Error(
    `All local models failed. Is Ollama running? (ollama serve). Attempts: ${errors.join(" | ")}`
  );
}

// ---------------------------------------------------------------------------
// Freebuff path (optional — free but may have regional limits)
// ---------------------------------------------------------------------------

async function freebuffMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = []
): Promise<MultiAgentResult> {
  const baseUrl = (process.env.FREEBUFF_BASE_URL || "http://127.0.0.1:8000/v1").replace(/\/$/, "");
  const apiKey = process.env.FREEBUFF_API_KEY || process.env.OPENAI_API_KEY || "freebuff";
  const primary = process.env.FREEBUFF_MODEL || FREEBUFF_MODELS[0].id;
  const extras = (process.env.FREEBUFF_FALLBACK_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const candidates = [...new Set([primary, ...extras, ...FREEBUFF_MODELS.map((m) => m.id)])];

  const messages = buildMessages(prompt, history);
  const errors: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    try {
      const content = await openAICompatibleChat({
        baseUrl,
        apiKey,
        model,
        messages,
      });

      const parsed = extractJSON(content);
      if (parsed) {
        return normalizeResult(parsed, {
          provider: "freebuff",
          model,
          fallbackUsed: i > 0,
          openSource: false,
          noQuota: false,
        });
      }

      if (typeof content === "string" && content.trim()) {
        return normalizeResult(
          {
            answer: content.trim(),
            reasoning: [{ agentId: "tshepo", thought: `Freebuff ${model} returned non-JSON.` }],
            tags: ["Freebuff", "SoftFallback"],
            primaryAgent: "tshepo",
            consensusReached: false,
            artifacts: [],
          },
          { provider: "freebuff", model, fallbackUsed: i > 0, openSource: false, noQuota: false }
        );
      }

      errors.push(`${model}: empty`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${model}: ${msg}`);
      console.warn(`[Freebuff] model failed: ${model} → ${msg}`);
    }
  }

  // Fall back to local Ollama if available
  try {
    return await ollamaMultiAgentResponse(prompt, history, true);
  } catch (e) {
    errors.push(`ollama-fallback: ${e instanceof Error ? e.message : String(e)}`);
  }

  throw new Error(`Freebuff failed and local fallback unavailable. ${errors.join(" | ")}`);
}

// ---------------------------------------------------------------------------
// Optional Gemini
// ---------------------------------------------------------------------------

const GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reasoning: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agentId: { type: Type.STRING },
          thought: { type: Type.STRING },
          delegatedTo: { type: Type.STRING },
          action: { type: Type.STRING },
        },
        required: ["agentId", "thought"],
      },
    },
    artifacts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          type: { type: Type.STRING },
          createdBy: { type: Type.STRING },
        },
        required: ["id", "title", "content", "type", "createdBy"],
      },
    },
    answer: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    primaryAgent: { type: Type.STRING },
    imagePrompt: { type: Type.STRING },
    consensusReached: { type: Type.BOOLEAN },
  },
  required: ["reasoning", "answer", "tags", "primaryAgent", "consensusReached"],
};

async function geminiMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = []
): Promise<MultiAgentResult> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });
  const slidingWindow = history.slice(-10);

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    contents: slidingWindow as any,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: GEMINI_SCHEMA,
    },
  });

  let text = response.text || "{}";
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const parsed = extractJSON(text);
  return normalizeResult(parsed || {}, {
    provider: "gemini",
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    openSource: false,
    noQuota: false,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = []
): Promise<MultiAgentResult> {
  const provider = getProvider();

  try {
    if (provider === "gemini") return await geminiMultiAgentResponse(prompt, history);
    if (provider === "freebuff") return await freebuffMultiAgentResponse(prompt, history);
    return await ollamaMultiAgentResponse(prompt, history, false);
  } catch (error) {
    console.error(`AI provider (${provider}) error:`, error);
    return {
      reasoning: [
        {
          agentId: "tshepo",
          thought: `Provider error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      answer:
        "I encountered an error. For open-source unlimited use: install Ollama (https://ollama.com), run `ollama pull llama3.2` and `ollama serve`, then set OLLAMA_BASE_URL=http://127.0.0.1:11434/v1 in .env.local.",
      tags: ["Error", provider, "OpenSource"],
      primaryAgent: "tshepo",
      artifacts: [],
      consensusReached: false,
      _meta: { provider, model: "none", openSource: provider === "ollama", noQuota: provider === "ollama" },
    };
  }
}

export function listOpenSourceModels() {
  return OPEN_SOURCE_LOCAL_MODELS;
}

export function listFreebuffModels() {
  return FREEBUFF_MODELS;
}

/** @deprecated use listOpenSourceModels */
export function listFreeModels() {
  return OPEN_SOURCE_LOCAL_MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    notes: m.notes,
  }));
}
