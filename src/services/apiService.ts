import { Message } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export async function getMultiAgentResponse(prompt: string, history: Message[] = []): Promise<Partial<Message>> {
  try {
    // Prepare message history for API
    const history_cleaned = history.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content,
      attachments: msg.attachments
    }));

    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('authToken') || ''}`
      },
      body: JSON.stringify({
        content: prompt,
        attachments: history_cleaned
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("API Error:", error);
      throw new Error(error.error || "API request failed");
    }

    const result = await response.json();

    // Format response to match Message type
    return {
      content: result.answer || result.data?.answer || "",
      reasoning: result.reasoning || result.data?.reasoning || [],
      tags: result.tags || result.data?.tags || [],
      activeAgentId: result.primaryAgent || result.data?.primaryAgent || "tshepo",
      artifacts: result.artifacts || result.data?.artifacts || [],
      consensusReached: result.consensusReached || result.data?.consensusReached || false,
      imageUrl: result.imageUrl
    };
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return {
      content: "I encountered an error while processing your request.",
      activeAgentId: "tshepo"
    };
  }
}
