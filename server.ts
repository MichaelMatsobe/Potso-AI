import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

function getAIClient(): GoogleGenAI {
  let key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  key = key.trim().replace(/^["']|["']$/g, '');
  return new GoogleGenAI({ apiKey: key });
}

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API routes FIRST
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history = [] } = req.body;
      
      const slidingWindow = Array.isArray(history) ? history.slice(-10) : [];
      
      const rawContents = [
        ...slidingWindow.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content || "(No content)" }]
        })),
        { role: 'user', parts: [{ text: prompt || "(No content)" }] }
      ];

      // Gemini requires alternating roles. Collapse consecutive messages of the same role.
      const contents: any[] = [];
      for (const msg of rawContents) {
        if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
          contents[contents.length - 1] = {
            role: msg.role,
            parts: [{ text: contents[contents.length - 1].parts[0].text + "\n\n" + msg.parts[0].text }]
          };
        } else {
          contents.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
        }
      }

      // Ensure the first message is from a user
      if (contents.length > 0 && contents[0].role !== 'user') {
        contents.shift();
      }

      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: prompt || "(No content)" }] });
      }

      console.log("Sending request to Gemini with contents length:", contents.length);

      const ai = getAIClient();
      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: contents as any,
          config: {
            systemInstruction: `You are Potso, a South African multi-agent cognition system. 
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
      } catch (genError: any) {
        console.error("Gemini Generation Error:", genError);
        
        // Handle specific API key errors gracefully
        if (genError.message && genError.message.includes("API key not valid")) {
          return res.status(401).json({ 
            error: "Your Gemini API key is invalid or has expired. Please check your API key in the AI Studio Secrets settings." 
          });
        }
        
        return res.status(500).json({ error: `Gemini API Error: ${genError.message || 'Unknown generation error'}` });
      }

      let text = "{}";
      try {
        if (response.text) {
          text = response.text;
        } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = response.candidates[0].content.parts[0].text;
        }
      } catch (e) {
        console.warn("Could not get response.text directly", e);
        if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = response.candidates[0].content.parts[0].text;
        }
      }
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        text = jsonMatch[1];
      } else {
        text = text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("JSON Parse Error:", e);
        data = {};
      }

      let imageUrl: string | undefined;

      if (data.imagePrompt) {
        try {
          const ai = getAIClient();
          const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: data.imagePrompt }] },
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

      res.json({ data, imageUrl });
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
