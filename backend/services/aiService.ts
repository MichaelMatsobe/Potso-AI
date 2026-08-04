/**
 * Potso-AI unified AI service — Freebuff-first
 *
 * Freebuff CLI (via OpenAI-compatible proxy) is the agent in charge.
 * Gemini is optional only (AI_PROVIDER=gemini).
 *
 * Free model catalog (proxied through Freebuff2API / similar):
 *   deepseek/deepseek-v4-pro | deepseek/deepseek-v4-flash
 *   minimax/* | moonshotai/kimi-* | glm | mimo
 *
 * Optional local fallback: OLLAMA_BASE_URL (true $0 offline)
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
  };
}

// ---------------------------------------------------------------------------
// Free model catalog (Freebuff / OpenAI-compatible proxies)
// Order = preferred failover sequence when FREEBUFF_MODEL not set
// ---------------------------------------------------------------------------

export const FREE_MODEL_CATALOG: Array<{ id: string; label: string; notes: string }> = [
  {
    id: "deepseek/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    notes: "Strongest Freebuff coding / reasoning default",
  },
  {
    id: "deepseek/deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    notes: "Faster / limited-mode friendly",
  },
  {
    id: "minimax/minimax-m2.7",
    label: "MiniMax M2.7",
    notes: "Speed-oriented Freebuff option",
  },
  {
    id: "moonshotai/kimi-k2.6",
    label: "Kimi K2.6",
    notes: "Long-context / agentic",
  },
  {
    id: "google/gemini-3.1-flash-lite-preview",
    label: "Gemini 3.1 Flash Lite (via Freebuff)",
    notes: "Freebuff routes some Gemini-lite agents internally — still no Google API key",
  },
];

function getModelCandidates(): string[] {
  const primary =
    process.env.FREEBUFF_MODEL ||
    process.env.OPENAI_MODEL ||
    FREE_MODEL_CATALOG[0].id;

  const extras = (process.env.FREEBUFF_FALLBACK_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const catalogIds = FREE_MODEL_CATALOG.map((m) => m.id);
  const ordered = [primary, ...extras, ...catalogIds];

  // de-dupe while preserving order
  return [...new Set(ordered)];
}

// ---------------------------------------------------------------------------
// Provider selection — Freebuff is default / in charge
// ---------------------------------------------------------------------------

export function getProvider(): "freebuff" | "gemini" | "ollama" {
  const explicit = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  if (explicit === "gemini") return "gemini";
  if (explicit === "ollama") return "ollama";
  if (explicit === "freebuff" || explicit === "openai") return "freebuff";
  // Default: Freebuff is the agent in charge
  return "freebuff";
}

const SYSTEM_PROMPT = `You are Potso, a South African multi-agent cognition system.
Creator: Michael Aaron Matsobe. Freebuff powers your reasoning (no Gemini API key required).

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
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 90_000);

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

// ---------------------------------------------------------------------------
// Freebuff path with multi-model failover
// ---------------------------------------------------------------------------

async function freebuffMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = []
): Promise<MultiAgentResult> {
  const baseUrl = (process.env.FREEBUFF_BASE_URL || "http://127.0.0.1:8000/v1").replace(/\/$/, "");
  const apiKey = process.env.FREEBUFF_API_KEY || process.env.OPENAI_API_KEY || "freebuff";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...historyToOpenAIMessages(history),
  ];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || last.content !== prompt) {
    messages.push({ role: "user", content: prompt });
  }

  const candidates = getModelCandidates();
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

      const parsed = extractJSON(typeof content === "string" ? content : JSON.stringify(content));
      if (parsed) {
        return normalizeResult(parsed, {
          provider: "freebuff",
          model,
          fallbackUsed: i > 0,
        });
      }

      // Non-JSON but non-empty → usable soft answer
      if (typeof content === "string" && content.trim()) {
        return normalizeResult(
          {
            answer: content.trim(),
            reasoning: [
              {
                agentId: "tshepo",
                thought: `Model ${model} returned non-JSON; delivering raw text.`,
              },
            ],
            tags: ["Freebuff", "SoftFallback"],
            primaryAgent: "tshepo",
            consensusReached: false,
            artifacts: [],
          },
          { provider: "freebuff", model, fallbackUsed: i > 0 }
        );
      }

      errors.push(`${model}: empty body`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${model}: ${msg}`);
      console.warn(`[Freebuff] model failed: ${model} → ${msg}`);
    }
  }

  // Optional Ollama local fallback
  if (process.env.OLLAMA_BASE_URL) {
    try {
      return await ollamaMultiAgentResponse(prompt, history, true);
    } catch (e) {
      errors.push(`ollama: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(`All Freebuff models failed. Attempts: ${errors.join(" | ")}`);
}

// ---------------------------------------------------------------------------
// Ollama local free fallback
// ---------------------------------------------------------------------------

async function ollamaMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = [],
  asFallback = false
): Promise<MultiAgentResult> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "llama3.2";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...historyToOpenAIMessages(history),
  ];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || last.content !== prompt) {
    messages.push({ role: "user", content: prompt });
  }

  const content = await openAICompatibleChat({
    baseUrl,
    apiKey: "ollama",
    model,
    messages,
  });

  const parsed = extractJSON(content);
  if (parsed) {
    return normalizeResult(parsed, {
      provider: "ollama",
      model,
      fallbackUsed: asFallback,
    });
  }

  return normalizeResult(
    {
      answer: content?.trim() || "Empty Ollama response",
      reasoning: [{ agentId: "tshepo", thought: "Ollama returned non-JSON." }],
      tags: ["Ollama", "Local"],
      primaryAgent: "tshepo",
      consensusReached: false,
      artifacts: [],
    },
    { provider: "ollama", model, fallbackUsed: asFallback }
  );
}

// ---------------------------------------------------------------------------
// Optional Gemini path (explicit only)
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
  const result = normalizeResult(parsed || {}, {
    provider: "gemini",
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
  });

  if (result.imagePrompt) {
    try {
      const imageResponse = await ai.models.generateContent({
        model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
        contents: [{ text: result.imagePrompt }],
        config: { imageConfig: { aspectRatio: "1:1" } },
      });
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          result.imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (imgError) {
      console.error("Image Generation Error:", imgError);
    }
  }

  return result;
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
    if (provider === "ollama") return await ollamaMultiAgentResponse(prompt, history, false);
    return await freebuffMultiAgentResponse(prompt, history);
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
        "I encountered an error while processing your request. Ensure your Freebuff OpenAI-compatible proxy is running (see FREEBUFF_SETUP.md), or set OLLAMA_BASE_URL for local fallback.",
      tags: ["Error", provider],
      primaryAgent: "tshepo",
      artifacts: [],
      consensusReached: false,
      _meta: { provider, model: "none" },
    };
  }
}

export function listFreeModels() {
  return FREE_MODEL_CATALOG;
}
