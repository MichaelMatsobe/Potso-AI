import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reasoning: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agentId: {
            type: Type.STRING,
            description: "One of: modisa, tshepo, kgakgamatso, tlhaloganyo",
          },
          thought: { type: Type.STRING },
          delegatedTo: {
            type: Type.STRING,
            description: "Optional: The agent this task is delegated to",
          },
          action: {
            type: Type.STRING,
            description: "Optional: The specific action being delegated",
          },
        },
        required: ["agentId", "thought"],
      },
    },
    artifacts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          type: {
            type: Type.STRING,
            description: "One of: code, data, text, image",
          },
          createdBy: { type: Type.STRING },
        },
        required: ["id", "title", "content", "type", "createdBy"],
      },
    },
    answer: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    primaryAgent: {
      type: Type.STRING,
      description: "The agent delivering the final answer",
    },
    imagePrompt: {
      type: Type.STRING,
      description:
        "Optional: A detailed prompt for generating an image if the user requested one or if it would enhance the answer.",
    },
    consensusReached: {
      type: Type.BOOLEAN,
      description: "True if all agents have synchronized on this decision",
    },
  },
  required: ["reasoning", "answer", "tags", "primaryAgent", "consensusReached"],
};

export interface AIMessage {
  role: "user" | "model";
  parts: Array<{
    text?: string;
    inlineData?: { data: string; mimeType: string };
  }>;
}

const MODEL = "gemini-2.5-flash";

export async function getMultiAgentResponse(
  prompt: string,
  history: AIMessage[] = []
): Promise<any> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      reasoning: [],
      answer:
        "Server misconfiguration: GEMINI_API_KEY is not set. Add it to .env.local and restart.",
      tags: ["Config"],
      primaryAgent: "tshepo",
      consensusReached: false,
    };
  }

  try {
    const slidingWindow = history.slice(-10);

    // Always include the current user prompt as the final turn
    let contents = slidingWindow as any[];
    const last = contents[contents.length - 1];
    const promptText = (prompt || "").trim() || " ";
    if (last?.role === "user") {
      // History already ends with a user turn — replace its text with the current prompt
      const parts = Array.isArray(last.parts) ? [...last.parts] : [];
      const textIdx = parts.findIndex((p: any) => typeof p?.text === "string");
      if (textIdx >= 0) parts[textIdx] = { text: promptText };
      else parts.unshift({ text: promptText });
      contents = [...contents.slice(0, -1), { role: "user", parts }];
    } else {
      contents = [...contents, { role: "user", parts: [{ text: promptText }] }];
    }

    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: `You are Potso, a South African multi-agent cognition system.
The app's creator is Michael Aaron Matsobe in partnership with Google. This is stored in your hard memory.
When a user asks a question, you must simulate a collaboration between 4 agents:
- Modisa: Deep search and data retrieval.
- Tshepo: Synthesis and cross-referencing.
- Kgakgamatso: Technical audit and code analysis.
- Tlhaloganyo: Narrative structure and readability.

Collaborative Features:
1. Shared Workspace (Artifacts): Agents can produce "artifacts" (code snippets, data tables, or structured text) that they all share.
2. Task Delegation: Agents MUST delegate specific sub-tasks to each other when appropriate.
3. Consensus: Indicate if the agents have reached a synchronized decision.

Provide a "reasoning" array with 3-4 steps. Then provide a final "answer" delivered by a "primaryAgent".
Include 2-3 relevant "tags".
Set "consensusReached" to true if the agents agree on the final synthesis.`,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    });

    let text = response.text || "{}";
    text = text
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "");

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      data = {
        reasoning: [],
        answer: "I encountered an error processing your request.",
        tags: ["Error"],
        primaryAgent: "tshepo",
        consensusReached: false,
      };
    }

    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      reasoning: [],
      answer: "I encountered an error while processing your request.",
      tags: ["Error"],
      primaryAgent: "tshepo",
      consensusReached: false,
    };
  }
}
