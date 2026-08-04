/**
 * Potso-AI — open-source / free providers only
 * Primary: Ollama (self-hosted, no quotas)
 * Optional: Freebuff OpenAI-compatible proxy
 * No Gemini, no paid APIs.
 */

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

export const OPEN_SOURCE_LOCAL_MODELS = [
  { id: "llama3.2", label: "Llama 3.2", notes: "Good general default", ollamaPull: "llama3.2" },
  { id: "llama3.1", label: "Llama 3.1", notes: "Stronger Llama", ollamaPull: "llama3.1" },
  { id: "qwen2.5", label: "Qwen 2.5", notes: "Strong multilingual", ollamaPull: "qwen2.5" },
  { id: "qwen2.5-coder", label: "Qwen 2.5 Coder", notes: "Code-focused", ollamaPull: "qwen2.5-coder" },
  { id: "mistral", label: "Mistral", notes: "Efficient", ollamaPull: "mistral" },
  { id: "phi3", label: "Phi-3", notes: "Low RAM", ollamaPull: "phi3" },
  { id: "gemma2", label: "Gemma 2", notes: "Open weights", ollamaPull: "gemma2" },
  { id: "deepseek-r1", label: "DeepSeek R1", notes: "Reasoning (larger)", ollamaPull: "deepseek-r1" },
];

export const FREEBUFF_MODELS = [
  { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro (Freebuff)", notes: "May have regional limits" },
  { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash (Freebuff)", notes: "Faster" },
  { id: "minimax/minimax-m2.7", label: "MiniMax (Freebuff)", notes: "Hosted free" },
];

export function getProvider(): "ollama" | "freebuff" {
  const explicit = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  if (explicit === "freebuff" || explicit === "openai") return "freebuff";
  if (explicit === "ollama" || explicit === "local") return "ollama";
  if (process.env.FREEBUFF_BASE_URL || process.env.FREEBUFF_MODEL) return "freebuff";
  return "ollama";
}

const SYSTEM_PROMPT = `You are Potso, a South African multi-agent system (creator: Michael Aaron Matsobe).
You run on open-source models only (Ollama / Freebuff). No paid APIs.
Simulate exactly 4 agents: Modisa (search), Tshepo (synthesis), Kgakgamatso (tech), Tlhaloganyo (narrative).
Respond with ONLY valid JSON (no markdown fences):
{"reasoning":[{"agentId":"modisa|tshepo|kgakgamatso|tlhaloganyo","thought":"...","delegatedTo":"optional","action":"optional"}],"artifacts":[{"id":"string","title":"string","content":"string","type":"code|data|text","createdBy":"agentId"}],"answer":"complete helpful answer","tags":["t1","t2"],"primaryAgent":"tshepo","consensusReached":true}
Use 3-4 reasoning steps. answer must always be useful. For voice replies, keep answer concise and speakable.`;

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
    try {
      const slice = cleaned.slice(first, last + 1).replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(slice);
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
      if (part.inlineData) texts.push(`[Attachment omitted: ${part.inlineData.mimeType}]`);
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
  jsonMode?: boolean;
}): Promise<string> {
  const url = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);

  try {
    const body: Record<string, unknown> = {
      model: opts.model,
      messages: opts.messages,
      temperature: 0.3,
    };
    if (opts.jsonMode !== false) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify(body),
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

export async function probeOllama(): Promise<{ ok: boolean; detail?: string }> {
  const base = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1").replace(/\/$/, "");
  const native = base.replace(/\/v1$/, "");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${native}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return { ok: true };
    return { ok: false, detail: `status ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

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
  const candidates = [...new Set([primary, ...extras])];
  const messages = buildMessages(prompt, history);
  const errors: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    try {
      let content = await openAICompatibleChat({
        baseUrl,
        apiKey: process.env.OLLAMA_API_KEY || "ollama",
        model,
        messages,
        jsonMode: true,
      });

      let parsed = extractJSON(content);

      if (!parsed && content.trim()) {
        content = await openAICompatibleChat({
          baseUrl,
          apiKey: process.env.OLLAMA_API_KEY || "ollama",
          model,
          messages: [
            ...messages,
            {
              role: "user",
              content: "Reply again with ONLY the JSON object, no markdown.",
            },
          ],
          jsonMode: false,
        });
        parsed = extractJSON(content);
      }

      if (parsed) {
        return normalizeResult(parsed, {
          provider: "ollama",
          model,
          fallbackUsed: asFallback || i > 0,
          openSource: true,
          noQuota: true,
        });
      }

      if (content.trim()) {
        return normalizeResult(
          {
            answer: content.trim(),
            reasoning: [{ agentId: "tshepo", thought: `Model ${model} returned prose.` }],
            tags: ["Ollama", "OpenSource"],
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
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(
    `All local models failed. Run: ollama pull ${primary} && ollama serve. ${errors.join(" | ")}`
  );
}

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
  const candidates = [...new Set([primary, ...extras])];
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
      if (content.trim()) {
        return normalizeResult(
          {
            answer: content.trim(),
            reasoning: [{ agentId: "tshepo", thought: "Freebuff returned prose." }],
            tags: ["Freebuff"],
            primaryAgent: "tshepo",
            consensusReached: false,
            artifacts: [],
          },
          { provider: "freebuff", model, fallbackUsed: i > 0, openSource: false, noQuota: false }
        );
      }
      errors.push(`${model}: empty`);
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  try {
    return await ollamaMultiAgentResponse(prompt, history, true);
  } catch (e) {
    errors.push(`ollama: ${e instanceof Error ? e.message : String(e)}`);
  }

  throw new Error(`Freebuff failed. ${errors.join(" | ")}`);
}

export async function getMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = []
): Promise<MultiAgentResult> {
  const provider = getProvider();

  try {
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
        "I could not reach the AI backend. Install Ollama (https://ollama.com), run `ollama pull llama3.2` and `ollama serve`, then restart the API. Or configure Freebuff as AI_PROVIDER=freebuff.",
      tags: ["Error", provider],
      primaryAgent: "tshepo",
      artifacts: [],
      consensusReached: false,
      _meta: {
        provider,
        model: "none",
        openSource: provider === "ollama",
        noQuota: provider === "ollama",
      },
    };
  }
}

export function listOpenSourceModels() {
  return OPEN_SOURCE_LOCAL_MODELS;
}

export function listFreebuffModels() {
  return FREEBUFF_MODELS;
}

export function listFreeModels() {
  return OPEN_SOURCE_LOCAL_MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    notes: m.notes,
  }));
}
