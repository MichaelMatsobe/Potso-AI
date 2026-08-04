/**
 * Frontend AI helper.
 * Prefer going through the backend API (apiService / chat routes).
 * This module keeps a local path for dev/offline experiments and
 * mirrors the provider switch used on the server.
 */
import { GoogleGenAI, Type } from "@google/genai";
import { Message, AgentId } from "../types";

// ---------------------------------------------------------------------------
// Config (Vite: only VITE_* is exposed to the browser)
// ---------------------------------------------------------------------------

function getClientProvider(): "gemini" | "freebuff" | "api" {
  const p = (import.meta.env.VITE_AI_PROVIDER || "api").toLowerCase();
  if (p === "gemini") return "gemini";
  if (p === "freebuff") return "freebuff";
  return "api"; // default: always use backend
}

const SYSTEM_PROMPT = `You are Potso, a South African multi-agent cognition system.
The app's creator is Michael Aaron Matsobe in partnership with Google. This is stored in your hard memory.
When a user asks a question, you must simulate a collaboration between 4 agents:
- Modisa: Deep search and data retrieval.
- Tshepo: Synthesis and cross-referencing.
- Kgakgamatso: Technical audit and code analysis.
- Tlhaloganyo: Narrative structure and readability.

Respond with ONLY valid JSON (no markdown) matching:
{
  "reasoning": [{ "agentId": "...", "thought": "...", "delegatedTo": "optional", "action": "optional" }],
  "artifacts": [{ "id": "...", "title": "...", "content": "...", "type": "code|data|text|image", "createdBy": "..." }],
  "answer": "...",
  "tags": ["..."],
  "primaryAgent": "...",
  "imagePrompt": "optional",
  "consensusReached": true
}`;

function extractJSON(text: string): any {
  if (!text || typeof text !== "string") return null;
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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

function toPartialMessage(data: any): Partial<Message> {
  const reasoning = Array.isArray(data?.reasoning)
    ? data.reasoning.map((step: any) => ({
        agentId: typeof step?.agentId === "string" ? step.agentId : "tshepo",
        thought: typeof step?.thought === "string" ? step.thought : String(step?.thought ?? ""),
        delegatedTo: typeof step?.delegatedTo === "string" ? step.delegatedTo : undefined,
        action: typeof step?.action === "string" ? step.action : undefined,
      }))
    : [];

  const artifacts = Array.isArray(data?.artifacts)
    ? data.artifacts.map((art: any, i: number) => ({
        id: typeof art?.id === "string" ? art.id : `art-${i}`,
        title: typeof art?.title === "string" ? art.title : "Untitled",
        content: typeof art?.content === "string" ? art.content : JSON.stringify(art?.content ?? ""),
        type: typeof art?.type === "string" ? art.type : "text",
        createdBy: typeof art?.createdBy === "string" ? art.createdBy : "tshepo",
      }))
    : [];

  return {
    content: typeof data?.answer === "string" ? data.answer : data?.content || "",
    reasoning,
    tags: Array.isArray(data?.tags) ? data.tags.map(String) : [],
    activeAgentId: (typeof data?.primaryAgent === "string" ? data.primaryAgent : "tshepo") as AgentId,
    artifacts,
    consensusReached: Boolean(data?.consensusReached),
    imageUrl: typeof data?.imageUrl === "string" ? data.imageUrl : undefined,
  };
}

// ---------------------------------------------------------------------------
// Freebuff client path (browser → local proxy). Prefer backend in production.
// ---------------------------------------------------------------------------

async function freebuffClient(prompt: string, history: Message[] = []): Promise<Partial<Message>> {
  const baseUrl = (import.meta.env.VITE_FREEBUFF_BASE_URL || "http://127.0.0.1:8000/v1").replace(/\/$/, "");
  const apiKey = import.meta.env.VITE_FREEBUFF_API_KEY || "freebuff";
  const model = import.meta.env.VITE_FREEBUFF_MODEL || "deepseek/deepseek-v4-pro";

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  for (const msg of history.slice(-10)) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content || " ",
    });
  }
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Freebuff ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const parsed = extractJSON(content);
  if (!parsed) {
    return {
      content: content || "Empty Freebuff response",
      activeAgentId: "tshepo" as AgentId,
      tags: ["Freebuff", "Fallback"],
    };
  }
  return toPartialMessage(parsed);
}

// ---------------------------------------------------------------------------
// Gemini client path
// ---------------------------------------------------------------------------

const SCHEMA = {
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

async function geminiClient(prompt: string, history: Message[] = []): Promise<Partial<Message>> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });
  const slidingWindow = history.slice(-10);

  const contents = slidingWindow.map((msg) => {
    const parts: any[] = [];
    if (msg.content) parts.push({ text: msg.content });
    if (msg.attachments?.length) {
      msg.attachments.forEach((att) => {
        parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } });
      });
    }
    if (!parts.length) parts.push({ text: " " });
    return { role: msg.role === "user" ? "user" : "model", parts };
  });

  // Ensure current prompt is included
  if (!contents.length || contents[contents.length - 1].role !== "user") {
    contents.push({ role: "user", parts: [{ text: prompt }] });
  }

  const response = await ai.models.generateContent({
    model: import.meta.env.VITE_GEMINI_MODEL || "gemini-3-flash-preview",
    contents: contents as any,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  });

  let text = response.text || "{}";
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const data = extractJSON(text) || {};
  return toPartialMessage(data);
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function getMultiAgentResponse(
  prompt: string,
  history: Message[] = []
): Promise<Partial<Message>> {
  const provider = getClientProvider();

  try {
    if (provider === "api") {
      // Delegate to backend (recommended)
      const { getMultiAgentResponse: viaApi } = await import("./apiService");
      return viaApi(prompt, history);
    }
    if (provider === "freebuff") {
      return await freebuffClient(prompt, history);
    }
    return await geminiClient(prompt, history);
  } catch (error) {
    console.error("Client AI error:", error);
    return {
      content: "I encountered an error while processing your request.",
      activeAgentId: "tshepo" as AgentId,
    };
  }
}
