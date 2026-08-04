/**
 * Mobile API client for Potso AI backend.
 * Uses EXPO_PUBLIC_* env vars from mobile/.env or app config.
 */

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

async function getIdToken(): Promise<string | null> {
  try {
    const { getAuth } = await import("firebase/auth");
    const user = getAuth().currentUser;
    if (!user) return null;
    return user.getIdToken();
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function sendMessage(
  content: string,
  history: Array<{ role: string; content: string }> = [],
  chatId?: string
) {
  const headers = await authHeaders();

  if (chatId) {
    const res = await fetch(`${API_URL}/chat/chats/${chatId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to send message");
    }
    const data = await res.json();
    return data.aiMessage || data;
  }

  // Simple path (works without auth)
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to send message");
  }
  return res.json();
}

export async function listChats() {
  const res = await fetch(`${API_URL}/chat/chats`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to list chats");
  return res.json();
}

export async function createChat(title = "New Chat") {
  const res = await fetch(`${API_URL}/chat/chats`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to create chat");
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${API_URL}/health`);
  return res.json();
}
