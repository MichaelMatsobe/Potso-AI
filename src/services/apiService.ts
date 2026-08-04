import { Message } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

/**
 * Preferred path: backend selects provider (Freebuff or Gemini) via AI_PROVIDER.
 * POST /api/chat/chats/:chatId/messages is the production flow.
 * This helper supports a simpler direct call if the UI still uses it.
 */
export async function getMultiAgentResponse(
  prompt: string,
  history: Message[] = []
): Promise<Partial<Message>> {
  try {
    const history_cleaned = history.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
      attachments: msg.attachments,
    }));

    // Prefer the authenticated chat endpoint when a chat id is available in localStorage
    const chatId = localStorage.getItem("activeChatId");
    const token = localStorage.getItem("authToken") || "";

    let response: Response;

    if (chatId && token) {
      response = await fetch(`${API_URL}/chat/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: prompt,
          attachments: history_cleaned.flatMap((m) => m.attachments || []),
        }),
      });
    } else {
      // Fallback: legacy shape used by older clients
      response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: prompt,
          attachments: history_cleaned,
        }),
      });
    }

    if (!response.ok) {
      let errorBody: any = {};
      try {
        errorBody = await response.json();
      } catch {
        /* ignore */
      }
      console.error("API Error:", errorBody);
      throw new Error(errorBody.error || `API request failed (${response.status})`);
    }

    const result = await response.json();

    // Support both { aiMessage } and flat multi-agent shapes
    const ai = result.aiMessage || result.data || result;

    return {
      content: ai.content || ai.answer || "",
      reasoning: ai.reasoning || [],
      tags: ai.tags || [],
      activeAgentId: ai.activeAgentId || ai.primaryAgent || "tshepo",
      artifacts: ai.artifacts || [],
      consensusReached: ai.consensusReached ?? false,
      imageUrl: ai.imageUrl,
    };
  } catch (error) {
    console.error("API Service Error:", error);
    return {
      content: "I encountered an error while processing your request.",
      activeAgentId: "tshepo",
    };
  }
}
