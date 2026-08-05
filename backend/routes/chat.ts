import { Router } from 'express';
import { getFirestore } from '../config/firebase.js';
import { getMultiAgentResponse } from '../services/aiService.js';
import { verifyAuthToken, AuthRequest } from '../middleware/auth.js';
import { withTtl, computeExpireAt } from '../services/retention.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/chats', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const db = getFirestore();

    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('chats')
      .orderBy('createdAt', 'desc')
      .get();

    const chats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

router.post('/chats', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { title } = req.body;
    const db = getFirestore();

    const chatId = uuidv4();
    const chat = withTtl(
      {
        id: chatId,
        title: title || 'New Chat',
        createdAt: new Date().toISOString(),
        messages: [],
      },
      'chat'
    );

    await db.collection('users').doc(userId).collection('chats').doc(chatId).set(chat);

    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

router.get('/chats/:chatId/messages', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { chatId } = req.params;
    const db = getFirestore();

    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/chats/:chatId/messages', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { chatId } = req.params;
    const { content, attachments } = req.body;
    const db = getFirestore();

    const userMessageId = uuidv4();
    const userMessage = withTtl(
      {
        id: userMessageId,
        role: 'user',
        content,
        attachments,
        timestamp: new Date().toISOString(),
      },
      'message'
    );

    const messagesCol = db
      .collection('users')
      .doc(userId)
      .collection('chats')
      .doc(chatId)
      .collection('messages');

    await messagesCol.doc(userMessageId).set(userMessage);

    await db
      .collection('users')
      .doc(userId)
      .collection('chats')
      .doc(chatId)
      .set({ expireAt: computeExpireAt('chat'), lastActivityAt: new Date().toISOString() }, { merge: true });

    const messagesSnapshot = await messagesCol.orderBy('timestamp', 'asc').get();

    // Prior turns only — current user content is passed as `prompt` so buildMessages
    // does not double-append the same user message.
    const priorDocs = messagesSnapshot.docs.filter((doc) => doc.id !== userMessageId);
    const history = priorDocs.map((doc) => {
      const msg = doc.data();
      const parts: any[] = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach((att: any) => {
          parts.push({
            inlineData: { data: att.data, mimeType: att.mimeType },
          });
        });
      }
      if (parts.length === 0) parts.push({ text: ' ' });
      const role: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model';
      return { role, parts };
    }) as any;

    const aiResponse = await getMultiAgentResponse(content, history);

    const aiMessageId = uuidv4();
    const aiMessage = withTtl(
      {
        id: aiMessageId,
        role: 'assistant',
        content: aiResponse.answer || '',
        reasoning: aiResponse.reasoning || [],
        tags: aiResponse.tags || [],
        activeAgentId: aiResponse.primaryAgent || 'tshepo',
        artifacts: aiResponse.artifacts || [],
        consensusReached: aiResponse.consensusReached || false,
        imageUrl: aiResponse.imageUrl || undefined,
        timestamp: new Date().toISOString(),
      },
      'message'
    );

    await messagesCol.doc(aiMessageId).set(aiMessage);

    res.status(201).json({
      userMessage,
      aiMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.delete('/chats/:chatId', verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { chatId } = req.params;
    const db = getFirestore();

    const messagesSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .get();

    const batch = db.batch();
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    batch.delete(db.collection('users').doc(userId).collection('chats').doc(chatId));

    await batch.commit();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

export default router;
