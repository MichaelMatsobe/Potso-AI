import { Router } from "express";
import { getFirestore } from "../config/firebase";
import { getMultiAgentResponse } from "../services/geminiService";
import { verifyAuthToken, optionalAuth, AuthRequest } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();

/**
 * Simple non-persisted chat endpoint (works without auth for local/dev).
 * POST /api/chat  { content, history? }
 */
router.post("/", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { content, history = [] } = req.body || {};
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "content (string) is required" });
    }

    const aiHistory = (Array.isArray(history) ? history : []).map((msg: any) => {
      const parts: any[] = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.attachments?.length) {
        msg.attachments.forEach((att: any) => {
          if (att?.data && att?.mimeType) {
            parts.push({
              inlineData: { data: att.data, mimeType: att.mimeType },
            });
          }
        });
      }
      if (parts.length === 0) parts.push({ text: " " });
      return {
        role: msg.role === "user" ? "user" : "model",
        parts,
      };
    });

    const aiResponse = await getMultiAgentResponse(content, aiHistory);
    res.json(aiResponse);
  } catch (error) {
    console.error("Error in simple chat:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// Get all chats for authenticated user
router.get("/chats", verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const db = getFirestore();

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("chats")
      .orderBy("createdAt", "desc")
      .get();

    const chats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

// Create a new chat
router.post("/chats", verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { title } = req.body || {};
    const db = getFirestore();

    const chatId = uuidv4();
    const chat = {
      id: chatId,
      title: title || "New Chat",
      createdAt: new Date().toISOString(),
      messages: [],
    };

    await db
      .collection("users")
      .doc(userId)
      .collection("chats")
      .doc(chatId)
      .set(chat);

    res.status(201).json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Failed to create chat" });
  }
});

// Get messages from a specific chat
router.get(
  "/chats/:chatId/messages",
  verifyAuthToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const { chatId } = req.params;
      const db = getFirestore();

      const snapshot = await db
        .collection("users")
        .doc(userId)
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("timestamp", "asc")
        .get();

      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }
);

// Send message and get AI response (persisted)
router.post(
  "/chats/:chatId/messages",
  verifyAuthToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.userId!;
      const { chatId } = req.params;
      const { content, attachments } = req.body || {};

      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "content (string) is required" });
      }

      const db = getFirestore();

      const userMessageId = uuidv4();
      const userMessage = {
        id: userMessageId,
        role: "user",
        content,
        attachments: attachments || [],
        timestamp: new Date().toISOString(),
      };

      await db
        .collection("users")
        .doc(userId)
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(userMessageId)
        .set(userMessage);

      const messagesSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("timestamp", "asc")
        .get();

      const history = messagesSnapshot.docs.map((doc) => {
        const msg = doc.data();
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.attachments?.length) {
          msg.attachments.forEach((att: any) => {
            if (att?.data && att?.mimeType) {
              parts.push({
                inlineData: { data: att.data, mimeType: att.mimeType },
              });
            }
          });
        }
        if (parts.length === 0) parts.push({ text: " " });
        return {
          role: msg.role === "user" ? "user" : "model",
          parts,
        };
      }) as any;

      const aiResponse = await getMultiAgentResponse(content, history);

      const aiMessageId = uuidv4();
      const aiMessage = {
        id: aiMessageId,
        role: "assistant",
        content: aiResponse.answer || "",
        reasoning: aiResponse.reasoning || [],
        tags: aiResponse.tags || [],
        activeAgentId: aiResponse.primaryAgent || "tshepo",
        artifacts: aiResponse.artifacts || [],
        consensusReached: aiResponse.consensusReached || false,
        timestamp: new Date().toISOString(),
      };

      await db
        .collection("users")
        .doc(userId)
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(aiMessageId)
        .set(aiMessage);

      res.status(201).json({
        userMessage,
        aiMessage,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  }
);

// Delete a chat
router.delete("/chats/:chatId", verifyAuthToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { chatId } = req.params;
    const db = getFirestore();

    const messagesSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .get();

    const batch = db.batch();
    messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(
      db.collection("users").doc(userId).collection("chats").doc(chatId)
    );
    await batch.commit();

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

export default router;
