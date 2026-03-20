import { GoogleGenAI, Type } from "@google/genai";
import { Message, ReasoningStep, AgentId } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reasoning: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agentId: { type: Type.STRING, description: "One of: modisa, tshepo, kgakgamatso, tlhaloganyo" },
          thought: { type: Type.STRING },
          delegatedTo: { type: Type.STRING, description: "Optional: The agent this task is delegated to" },
          action: { type: Type.STRING, description: "Optional: The specific action being delegated" }
        },
        required: ["agentId", "thought"]
      }
    },
    artifacts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          type: { type: Type.STRING, description: "One of: code, data, text, image" },
          createdBy: { type: Type.STRING }
        },
        required: ["id", "title", "content", "type", "createdBy"]
      }
    },
    answer: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    primaryAgent: { type: Type.STRING, description: "The agent delivering the final answer" },
    imagePrompt: { type: Type.STRING, description: "Optional: A detailed prompt for generating an image if the user requested one or if it would enhance the answer." },
    consensusReached: { type: Type.BOOLEAN, description: "True if all agents have synchronized on this decision" }
  },
  required: ["reasoning", "answer", "tags", "primaryAgent", "consensusReached"]
};

export async function getMultiAgentResponse(prompt: string, history: Message[] = []): Promise<Partial<Message>> {
  try {
    // Implement sliding window: take last 10 messages to keep context focused and within limits
    const slidingWindow = history.slice(-10);
    
    const contents = slidingWindow.map(msg => {
      const parts: any[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
          parts.push({
            inlineData: {
              data: att.data,
              mimeType: att.mimeType
            }
          });
        });
      }
      if (parts.length === 0) {
        parts.push({ text: " " });
      }
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts
      };
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents as any,
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
        2. Task Delegation: Agents MUST delegate specific sub-tasks to each other when appropriate. For example, Modisa might find a technical requirement and delegate the "Code Audit" to Kgakgamatso.
        3. Consensus: Indicate if the agents have reached a synchronized decision.
        
        Provide a "reasoning" array with 3-4 steps. 
        - If an agent is passing a task, use "delegatedTo" with the target agent's ID and "action" with a brief description of the task.
        - Provide an "artifacts" array if agents create shared assets.
        Then provide a final "answer" delivered by a "primaryAgent".
        Include 2-3 relevant "tags".
        Set "consensusReached" to true if the agents agree on the final synthesis.
        
        If the user asks to "generate", "show", "draw", or "create" an image, or if a visual would significantly help, 
        provide a detailed "imagePrompt" for an image generation model.`,
        responseMimeType: "application/json",
        responseSchema: SCHEMA
      }
    });

    let text = response.text || "{}";
    // Clean markdown code blocks if present
    text = text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      data = {};
    }
    
    // Sanitize data to prevent rendering errors
    if (data.reasoning && !Array.isArray(data.reasoning)) {
      data.reasoning = [];
    }
    
    if (data.reasoning) {
      data.reasoning = data.reasoning.map((step: any) => ({
        agentId: typeof step.agentId === 'string' ? step.agentId : 'unknown',
        thought: typeof step.thought === 'string' ? step.thought : JSON.stringify(step.thought || ''),
        delegatedTo: typeof step.delegatedTo === 'string' ? step.delegatedTo : undefined,
        action: typeof step.action === 'string' ? step.action : undefined
      }));
    }

    if (data.artifacts && !Array.isArray(data.artifacts)) {
      data.artifacts = [];
    }
    
    if (data.artifacts) {
      data.artifacts = data.artifacts.map((art: any) => ({
        id: typeof art.id === 'string' ? art.id : Math.random().toString(),
        title: typeof art.title === 'string' ? art.title : 'Untitled',
        content: typeof art.content === 'string' ? art.content : JSON.stringify(art.content || ''),
        type: typeof art.type === 'string' ? art.type : 'text',
        createdBy: typeof art.createdBy === 'string' ? art.createdBy : 'unknown'
      }));
    }

    // Ensure answer is a string
    if (typeof data.answer !== 'string') {
      data.answer = data.answer ? JSON.stringify(data.answer) : "";
    }

    // Ensure tags is an array of strings
    if (data.tags && !Array.isArray(data.tags)) {
      data.tags = [];
    }
    if (data.tags) {
      data.tags = data.tags.map((t: any) => typeof t === 'string' ? t : String(t));
    }

    // Ensure primaryAgent is a string
    if (data.primaryAgent && typeof data.primaryAgent !== 'string') {
      data.primaryAgent = String(data.primaryAgent);
    }

    let imageUrl: string | undefined;

    if (data.imagePrompt) {
      try {
        const imageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [{ text: data.imagePrompt }],
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        });

        for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch (imgError) {
        console.error("Image Generation Error:", imgError);
      }
    }
    
    return {
      content: data.answer,
      reasoning: data.reasoning,
      tags: data.tags,
      activeAgentId: data.primaryAgent as AgentId,
      imageUrl,
      artifacts: data.artifacts,
      consensusReached: data.consensusReached
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      content: "I encountered an error while processing your request.",
      activeAgentId: "tshepo"
    };
  }
}
