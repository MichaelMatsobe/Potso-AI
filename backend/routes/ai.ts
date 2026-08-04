import { Router } from 'express';
import { getMultiAgentResponse, getProvider, type AIMessage } from '../services/aiService';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { content, history } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    let aiHistory: AIMessage[] = [];
    if (Array.isArray(history)) {
      aiHistory = history.slice(-10).map((msg: any) => {
        if (msg.parts) {
          return { role: msg.role === 'user' ? 'user' : 'model', parts: msg.parts } as AIMessage;
        }
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(msg.content || '') }],
        } as AIMessage;
      });
    }

    const result = await getMultiAgentResponse(content.trim(), aiHistory);

    res.json({
      answer: result.answer,
      content: result.answer,
      reasoning: result.reasoning || [],
      tags: result.tags || [],
      primaryAgent: result.primaryAgent || 'tshepo',
      activeAgentId: result.primaryAgent || 'tshepo',
      artifacts: result.artifacts || [],
      consensusReached: result.consensusReached || false,
      imageUrl: result.imageUrl,
      meta: result._meta || null,
      provider: getProvider(),
    });
  } catch (error) {
    console.error('[AI] /chat error:', error);
    res.status(500).json({
      error: 'AI request failed',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get('/status', async (_req, res) => {
  const provider = getProvider();
  res.json({ provider, timestamp: new Date().toISOString() });
});

export default router;
