import { Message } from '../types';
import { getMultiAgentResponse as viaPublicAi } from './geminiService';

/**
 * Prefer public /api/ai/chat (works without Firebase).
 * Authenticated chat persistence still available via /api/chat/* when Firebase is configured.
 */
export async function getMultiAgentResponse(
  prompt: string,
  history: Message[] = []
): Promise<Partial<Message>> {
  return viaPublicAi(prompt, history);
}
