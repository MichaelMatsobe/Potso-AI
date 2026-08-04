/**
 * Unified AI service for Potso-AI
 * Supports:
 *   - AI_PROVIDER=gemini   (default if GEMINI_API_KEY is set and AI_PROVIDER unset)
 *   - AI_PROVIDER=freebuff (OpenAI-compatible proxy in front of Freebuff)
 *
 * Freebuff setup (local):
 *   1. Install a Freebuff OpenAI-compatible proxy (e.g. freebuff2api / Freebuff2API)
 *   2. Point FREEBUFF_BASE_URL at it (default http://127.0.0.1:8000/v1)
 *   3. Set FREEBUFF_API_KEY if the proxy requires one (often optional/local)
 *   4. Set FREEBUFF_MODEL (e.g. deepseek/deepseek-v4-pro or deepseek/deepseek-v4-flash)
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
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getProvider(): "gemini" | "freebuff" {
  const explicit = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  if (explicit === "freebuff" || explicit === "openai") return "freebuff";
  if (explicit === "gemini") return "gemini";
  // Auto: prefer freebuff if configured, else gemini if key present
  if (process.env.FREEBUFF_BASE_URL || process.env.FREEBUFF_MODEL) return "freebuff";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "freebuff"; // default for this branch
}

const SYSTEM_PROMPT = `You are Potso, a South African multi-agent cognition system.
The app's creator is Michael Aaron Matsobe in partnership with Google. This is stored in your hard memory.
When a user asks a question, you must simulate a collaboration between 4 agents:
- Modisa: Deep search and data retrieval.
- Tshepo: Synthesis and cross-referencing.
- Kgakgamatso: Technical audit and code analysis.
- Tlhaloganyo: Narrative structure and readability.

Collaborative Features:
1. Shared Workspace (Artifacts): Agents can produce "artifacts" (code snippets, data tables, or structured text) that they all share.
2. Task Delegation: Agents MUST delegate specific sub-tasks to each other when appropriate.
3. Consensus: Indicate if the agents have reached a synchronized decision.

You MUST respond with ONLY a valid JSON object (no markdown fences, no commentary) matching this shape:
{
  "reasoning": [
    { "agentId": "modisa|tshepo|kgakgamatso|tlhaloganyo", "thought": "...", "delegatedTo": "optional", "action": "optional" }
  ],
  "artifacts": [
    { "id": "string", "title": "string", "content": "string", "type": "code|data|text|image", "createdBy": "agentId" }
  ],
  "answer": "final answer text",
  "tags": ["tag1", "tag2"],
  "primaryAgent": "modisa|tshepo|kgakgamatso|tlhaloganyo",
  "imagePrompt": "optional detailed image prompt if visual would help",
  "consensusReached": true
}

Rules:
- reasoning: 3-4 steps
- tags: 2-3 relevant tags
- primaryAgent: the agent delivering the final answer
- consensusReached: true if agents agree
- Do not wrap the JSON in markdown code blocks.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractJSON(text: string): any {
  if (!text || typeof text !== "string") return null;

  let cleaned = text.trim();

  // Strip markdown code fences if present
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through
  }

  // Extract outermost { ... }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      // fall through
    }
  }

  return null;
}

function normalizeResult(raw: any): MultiAgentResult {
  const fallback: MultiAgentResult = {
    reasoning: [],
    answer: typeof raw?.answer === "string" ? raw.answer : (typeof raw === "string" ? raw : "I could not produce a structured response."),
    tags: ["Info"],
    primaryAgent: "tshepo",
    artifacts: [],
    consensusReached: false,
  };

  if (!raw || typeof raw !== "object") {
    return fallback;
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
    answer: typeof raw.answer === "string" ? raw.answer : fallback.answer,
    tags: tags.length ? tags : fallback.tags,
    primaryAgent: typeof raw.primaryAgent === "string" ? raw.primaryAgent : "tshepo",
    artifacts,
    consensusReached: Boolean(raw.consensusReached),
    imagePrompt: typeof raw.imagePrompt === "string" ? raw.imagePrompt : undefined,
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
        texts.push(`[Attachment: ${part.inlineData.mimeType} — content omitted for Freebuff provider]`);
      }
    }

    const content = texts.join("\n").trim() || " ";
    messages.push({ role, content });
  }

  return messages;
}

// ---------------------------------------------------------------------------
// Freebuff (OpenAI-compatible) path
// ---------------------------------------------------------------------------

async function freebuffMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = []
): Promise<MultiAgentResult> {
  const baseUrl = (process.env.FREEBUFF_BASE_URL || "http://127.0.0.1:8000/v1").replace(/\/$/, "");
  const apiKey = process.env.FREEBUFF_API_KEY || process.env.OPENAI_API_KEY || "freebuff";
  const model =
    process.env.FREEBUFF_MODEL ||
    process.env.OPENAI_MODEL ||
    "deepseek/deepseek-v4-pro";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...historyToOpenAIMessages(history),
  ];

  // Ensure the latest user prompt is present (history may already include it)
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || last.content !== prompt) {
    messages.push({ role: "user", content: prompt });
  }

  const url = `${baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.4,
    // Many proxies ignore this; we still request JSON when supported
    response_format: { type: "json_object" },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Freebuff API error:", res.status, errText);
    throw new Error(`Freebuff API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const content =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    data?.content ||
    "";

  const parsed = extractJSON(typeof content === "string" ? content : JSON.stringify(content));
  if (!parsed) {
    // Soft fallback: treat raw text as the answer so the UI still works
    return normalizeResult({
      answer: typeof content === "string" && content.trim() ? content.trim() : "Empty response from Freebuff.",
      reasoning: [
        {
          agentId: "tshepo",
          thought: "Model returned non-JSON; delivering raw text as the answer.",
        },
      ],
      tags: ["Freebuff", "Fallback"],
      primaryAgent: "tshepo",
      consensusReached: false,
      artifacts: [],
    });
  }

  return normalizeResult(parsed);
}

// ---------------------------------------------------------------------------
// Gemini path (preserved)
// ---------------------------------------------------------------------------

const GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reasoning: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agentId: { type: Type.STRING, description: "One of: modisa, tshepo, kgakgamatso, tlhaloganyo" },
          thought: { type: Type.STRING },
          delegatedTo: { type: Type.STRING, description: "Optional: The agent this task is delegated to" },
          action: { type: Type.STRING, description: "Optional: The specific action being delegated" },
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
          type: { type: Type.STRING, description: "One of: code, data, text, image" },
          createdBy: { type: Type.STRING },
        },
        required: ["id", "title", "content", "type", "createdBy"],
      },
    },
    answer: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    primaryAgent: { type: Type.STRING, description: "The agent delivering the final answer" },
    imagePrompt: {
      type: Type.STRING,
      description: "Optional: A detailed prompt for generating an image if the user requested one or if it would enhance the answer.",
    },
    consensusReached: {
      type: Type.BOOLEAN,
      description: "True if all agents have synchronized on this decision",
    },
  },
  required: ["reasoning", "answer", "tags", "primaryAgent", "consensusReached"],
};

async function geminiMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = []
): Promise<MultiAgentResult> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

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
  const result = normalizeResult(parsed || {});

  // Optional image generation (Gemini only)
  if (result.imagePrompt) {
    try {
      const imageResponse = await ai.models.generateContent({
        model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
        contents: [{ text: result.imagePrompt }],
        config: {
          imageConfig: { aspectRatio: "1:1" },
        },
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
// Public API (backward compatible with previous geminiService)
// ---------------------------------------------------------------------------

export async function getMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = []
): Promise<MultiAgentResult> {
  const provider = getProvider();

  try {
    if (provider === "gemini") {
      return await geminiMultiAgentResponse(prompt, history);
    }
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
      answer: "I encountered an error while processing your request. Please check the AI provider configuration and try again.",
      tags: ["Error", provider],
      primaryAgent: "tshepo",
      artifacts: [],
      consensusReached: false,
    };
  }
}

// Re-export for convenience
export { getProvider };
