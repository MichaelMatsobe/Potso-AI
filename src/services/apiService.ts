import { Message } from '../types';
import { getMultiAgentResponse as viaPublicAi } from './aiClient';

export async function getMultiAgentResponse(
  prompt: string,
  history: Message[] = []
): Promise<Partial<Message>> {
  return viaPublicAi(prompt, history);
}
