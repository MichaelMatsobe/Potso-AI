import { Message } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Prefer backend multi-agent endpoint when authenticated.
 * Falls back gracefully so the web UI keeps working in local/dev mode.
 */
export async function getMultiAgentResponse(
  prompt: string,
  history: Message[] = [],
  chatId?: string
): Promise<Partial<Message>> {
  try {
    const token = localStorage.getItem("authToken");

    // Authenticated path: use persisted chat routes
    if (token && chatId) {
      const response = await fetch(
        `${API_URL}/chat/chats/${chatId}/messages`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            content: prompt,
            attachments: history[history.length - 1]?.attachments,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "API request failed");
      }

      const result = await response.json();
      const ai = result.aiMessage || result;
      return {
        content: ai.content || ai.answer || "",
        reasoning: ai.reasoning || [],
        tags: ai.tags || [],
        activeAgentId: ai.activeAgentId || ai.primaryAgent || "tshepo",
        artifacts: ai.artifacts || [],
        consensusReached: ai.consensusReached || false,
        imageUrl: ai.imageUrl,
      };
    }

    // Simple / unauthenticated path (dev & localStorage-only chats)
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        content: prompt,
        history: history.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "API request failed");
    }

    const result = await response.json();
    return {
      content: result.answer || result.data?.answer || "",
      reasoning: result.reasoning || result.data?.reasoning || [],
      tags: result.tags || result.data?.tags || [],
      activeAgentId:
        result.primaryAgent || result.data?.primaryAgent || "tshepo",
      artifacts: result.artifacts || result.data?.artifacts || [],
      consensusReached:
        result.consensusReached || result.data?.consensusReached || false,
      imageUrl: result.imageUrl,
    };
  } catch (error) {
    console.error("API Service Error:", error);
    return {
      content: "I encountered an error while processing your request.",
      activeAgentId: "tshepo",
      tags: ["Error"],
    };
  }
}

export async function listChats() {
  const res = await fetch(`${API_URL}/chat/chats`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to list chats");
  return res.json();
}

export async function createChat(title?: string) {
  const res = await fetch(`${API_URL}/chat/chats`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title: title || "New Chat" }),
  });
  if (!res.ok) throw new Error("Failed to create chat");
  return res.json();
}

export async function deleteChat(chatId: string) {
  const res = await fetch(`${API_URL}/chat/chats/${chatId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete chat");
  return res.json();
}
