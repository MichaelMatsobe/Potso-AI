/**
 * Frontend AI client — talks to backend public /api/ai/chat (Ollama by default).
 */
import { Message, AgentId } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export interface HealthStatus {
  status: string;
  aiProvider: string;
  aiOnline: boolean;
  openSource: boolean;
  noQuota: boolean;
  liveVoiceAvailable: boolean;
  ollamaModel?: string;
  firebaseReady?: boolean;
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
      headers: { 'Content-Type': 'application/json' },
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
          ? `Could not reach the AI backend (${error.message}). Ensure the API is on :8080 and Ollama is running (ollama serve).`
          : 'I encountered an error while processing your request.',
      activeAgentId: 'tshepo' as AgentId,
      tags: ['Error'],
      reasoning: [],
      artifacts: [],
      consensusReached: false,
    };
  }
}
