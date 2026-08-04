import { Message, AgentId } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const API_KEY = import.meta.env.VITE_API_ACCESS_KEY || '';

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

export async function getMultiAgentResponse(
  prompt: string,
  history: Message[] = []
): Promise<Partial<Message>> {
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
    return {
      content:
        error instanceof Error
          ? `Could not reach the AI backend (${error.message}).`
          : 'I encountered an error while processing your request.',
      activeAgentId: 'tshepo' as AgentId,
      tags: ['Error'],
      reasoning: [],
      artifacts: [],
      consensusReached: false,
    };
  }
}
