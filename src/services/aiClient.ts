import { Message, AgentId } from '../types';
import { isWebLLMEnabled, isWebGPUAvailable, webllmChat } from './webllmClient';

// Relative /api: works in dev via the Vite proxy, and same-origin in production.
// Override with VITE_API_URL when the backend is hosted separately.
const API_URL = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_ACCESS_KEY || '';

// ==================== OFFLINE MODE (template) ====================
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function buildOfflineResponse(
  prompt: string,
  _history: Message[] = []
): Partial<Message> {
  const topic = prompt.trim().slice(0, 120) || 'your question';
  const reasoning = [
    {
      agentId: 'modisa' as AgentId,
      thought: `Scanning the local knowledge cache for context on: ${topic}`,
      action: 'Search offline cache',
    },
    {
      agentId: 'kgakgamatso' as AgentId,
      thought: 'Checking what can be answered without a live model...',
      delegatedTo: 'tshepo' as AgentId,
    },
    {
      agentId: 'tshepo' as AgentId,
      thought: 'Synthesizing a useful answer from local context...',
    },
    {
      agentId: 'tlhaloganyo' as AgentId,
      thought: 'Structuring the reply so it clearly shows you are offline.',
    },
  ];
  const content = `You're offline, so Potso answered from its local knowledge base — no AI server was reachable.

**Your question:** "${topic}"

I can't run a live model right now, but you can keep going:
- Your conversation is saved locally and will sync when you reconnect.
- Enable WebLLM (browser WebGPU) for real on-device answers when the API is down.
- Reconnect to Ollama (or Freebuff) for full multi-agent server responses.`;
  return {
    content,
    reasoning,
    tags: ['Offline'],
    activeAgentId: 'tlhaloganyo' as AgentId,
    artifacts: [],
    consensusReached: false,
    offline: true,
  };
}

function authHeaders(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) h['X-API-Key'] = API_KEY;
  return h;
}

export interface HealthStatus {
  status: string;
  aiProvider: string;
  aiOnline: boolean;
  openSource?: boolean;
  noQuota?: boolean;
  liveVoiceAvailable?: boolean;
  accessControl?: { apiKeyRequired?: boolean; rateLimitEnabled?: boolean };
}

export async function fetchHealth(): Promise<HealthStatus | null> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return (await res.json()) as HealthStatus;
  } catch {
    return null;
  }
}

/**
 * Fallback chain:
 * 1. Server /api/ai/chat (Ollama → Freebuff hybrid)
 * 2. WebLLM in-browser (WebGPU) when offline or API fails
 * 3. Template offline message
 */
export async function getMultiAgentResponse(
  prompt: string,
  history: Message[] = []
): Promise<Partial<Message>> {
  const tryWebLLM = async (): Promise<Partial<Message> | null> => {
    if (!isWebLLMEnabled() || !isWebGPUAvailable()) return null;
    try {
      return await webllmChat(prompt, history);
    } catch (e) {
      console.warn('[aiClient] WebLLM fallback error:', e);
      return null;
    }
  };

  // Browser reports offline — skip server, try WebLLM then template
  if (isOffline()) {
    const local = await tryWebLLM();
    if (local) return local;
    return buildOfflineResponse(prompt, history);
  }

  try {
    const historyPayload = history.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content || '',
    }));

    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ content: prompt, history: historyPayload }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const err = await response.json();
        detail = err.detail || err.error || '';
      } catch {
        /* ignore */
      }
      throw new Error(detail || `API ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.content || data.answer || '',
      reasoning: Array.isArray(data.reasoning) ? data.reasoning : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      activeAgentId: (data.activeAgentId || data.primaryAgent || 'tshepo') as AgentId,
      artifacts: Array.isArray(data.artifacts) ? data.artifacts : [],
      consensusReached: Boolean(data.consensusReached),
      imageUrl: data.imageUrl,
    };
  } catch (error) {
    console.error('AI Service Error:', error);
    const local = await tryWebLLM();
    if (local) return local;
    return buildOfflineResponse(prompt, history);
  }
}
