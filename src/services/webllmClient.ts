/**
 * WebLLM — in-browser local AI via WebGPU (MLC).
 * Used as a client-side fallback when the Express API / Ollama is unreachable.
 *
 * Package: @mlc-ai/web-llm (lazy-imported so SSR/dev without WebGPU still boots).
 */
import type { AgentId, Message } from '../types';

/** Default small instruct model — balance quality vs download size */
export const DEFAULT_WEBLLM_MODEL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_WEBLLM_MODEL) ||
  'Llama-3.2-3B-Instruct-q4f16_1-MLC';

const SYSTEM_PROMPT = `You are Potso, a South African multi-agent system (creator: Michael Aaron Matsobe).
You are running locally in the user's browser via WebLLM (WebGPU).
Simulate 4 agents when helpful: Modisa (research), Tshepo (synthesis), Kgakgamatso (tech), Tlhaloganyo (narrative).
Prefer a clear, useful answer. If you can, respond with ONLY valid JSON:
{"reasoning":[{"agentId":"modisa|tshepo|kgakgamatso|tlhaloganyo","thought":"..."}],"answer":"...","tags":["t1"],"primaryAgent":"tshepo","consensusReached":true,"artifacts":[]}
Otherwise answer in plain helpful prose.`;

export type WebLLMProgress = { progress: number; text: string };

type EngineLike = {
  chat: {
    completions: {
      create: (opts: {
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
      }) => Promise<{
        choices?: Array<{ message?: { content?: string } }>;
      }>;
    };
  };
};

let enginePromise: Promise<EngineLike | null> | null = null;
let lastModelId = '';
let lastError: string | null = null;
let progressListeners = new Set<(p: WebLLMProgress) => void>();

export function onWebLLMProgress(cb: (p: WebLLMProgress) => void): () => void {
  progressListeners.add(cb);
  return () => progressListeners.delete(cb);
}

function emitProgress(p: WebLLMProgress) {
  progressListeners.forEach((cb) => {
    try {
      cb(p);
    } catch {
      /* ignore */
    }
  });
}

/** Feature flag — default on unless VITE_WEBLLM_ENABLED=false */
export function isWebLLMEnabled(): boolean {
  const v =
    typeof import.meta !== 'undefined'
      ? String((import.meta as any).env?.VITE_WEBLLM_ENABLED ?? 'true').toLowerCase()
      : 'true';
  return v !== 'false' && v !== '0';
}

export function isWebGPUAvailable(): boolean {
  try {
    return typeof navigator !== 'undefined' && !!(navigator as any).gpu;
  } catch {
    return false;
  }
}

export function getWebLLMStatus(): {
  enabled: boolean;
  webgpu: boolean;
  loading: boolean;
  ready: boolean;
  model: string;
  lastError: string | null;
} {
  return {
    enabled: isWebLLMEnabled(),
    webgpu: isWebGPUAvailable(),
    loading: Boolean(enginePromise),
    ready: Boolean(enginePromise && lastModelId),
    model: lastModelId || DEFAULT_WEBLLM_MODEL,
    lastError,
  };
}

function extractJSON(text: string): any {
  if (!text || typeof text !== 'string') return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* continue */
  }
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      return null;
    }
  }
  return null;
}

async function loadEngine(modelId = DEFAULT_WEBLLM_MODEL): Promise<EngineLike | null> {
  if (!isWebLLMEnabled()) {
    lastError = 'WebLLM disabled (VITE_WEBLLM_ENABLED=false)';
    return null;
  }
  if (!isWebGPUAvailable()) {
    lastError = 'WebGPU not available in this browser';
    return null;
  }

  if (enginePromise && lastModelId === modelId) return enginePromise;

  lastModelId = modelId;
  enginePromise = (async () => {
    try {
      emitProgress({ progress: 0, text: 'Loading WebLLM…' });
      const webllm = await import('@mlc-ai/web-llm');
      const CreateMLCEngine =
        (webllm as any).CreateMLCEngine || (webllm as any).default?.CreateMLCEngine;
      if (!CreateMLCEngine) {
        throw new Error('@mlc-ai/web-llm CreateMLCEngine not found');
      }

      const engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report: { progress?: number; text?: string }) => {
          emitProgress({
            progress: typeof report.progress === 'number' ? report.progress : 0,
            text: report.text || 'Downloading model…',
          });
        },
      });

      lastError = null;
      emitProgress({ progress: 1, text: 'WebLLM ready' });
      return engine as EngineLike;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      enginePromise = null;
      lastModelId = '';
      console.warn('[WebLLM] init failed:', lastError);
      return null;
    }
  })();

  return enginePromise;
}

/** Warm the engine in the background (optional). */
export function preloadWebLLM(modelId?: string): Promise<EngineLike | null> {
  return loadEngine(modelId || DEFAULT_WEBLLM_MODEL);
}

export async function webllmChat(
  prompt: string,
  history: Message[] = []
): Promise<Partial<Message> | null> {
  const engine = await loadEngine();
  if (!engine) return null;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  for (const msg of history.slice(-8)) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content || ' ',
    });
  }
  messages.push({ role: 'user', content: prompt });

  try {
    const reply = await engine.chat.completions.create({
      messages,
      temperature: 0.4,
      max_tokens: 1024,
    });

    const raw =
      reply?.choices?.[0]?.message?.content?.trim() ||
      '';

    if (!raw) return null;

    const parsed = extractJSON(raw);
    if (parsed && typeof parsed.answer === 'string') {
      return {
        content: parsed.answer,
        reasoning: Array.isArray(parsed.reasoning)
          ? parsed.reasoning.map((s: any) => ({
              agentId: (s.agentId || 'tshepo') as AgentId,
              thought: String(s.thought || ''),
              delegatedTo: s.delegatedTo,
              action: s.action,
            }))
          : [
              {
                agentId: 'tshepo' as AgentId,
                thought: 'Answered via WebLLM (browser WebGPU).',
              },
            ],
        tags: Array.isArray(parsed.tags)
          ? [...parsed.tags.map(String), 'WebLLM']
          : ['WebLLM', 'Browser'],
        activeAgentId: (parsed.primaryAgent || 'tshepo') as AgentId,
        artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
        consensusReached: Boolean(parsed.consensusReached),
        offline: true,
      };
    }

    return {
      content: raw,
      reasoning: [
        {
          agentId: 'tshepo' as AgentId,
          thought: 'WebLLM returned prose (browser-local inference).',
        },
      ],
      tags: ['WebLLM', 'Browser'],
      activeAgentId: 'tshepo' as AgentId,
      artifacts: [],
      consensusReached: false,
      offline: true,
    };
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    console.warn('[WebLLM] chat failed:', lastError);
    return null;
  }
}
