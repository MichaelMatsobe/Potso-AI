# VS Code & Antigravity — private full run

Potso is not hosted inside the IDE. Both VS Code and Google Antigravity only edit/run the same local stack.

## Prerequisites

- Node.js 20+
- [Ollama](https://ollama.com) with a model, e.g. `ollama pull llama3.2`
- Git checkout of `dev/freebuff-provider`

## VS Code

1. Open the repo folder.
2. Terminal:

```bash
ollama serve          # if not already a service
cp .env.example .env.local
npm install
npm run dev
```

3. Browser: http://localhost:3000  · API: http://localhost:8080/api/health

Optional `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Potso: dev",
      "type": "shell",
      "command": "npm run dev",
      "isBackground": true,
      "problemMatcher": []
    }
  ]
}
```

## Antigravity

1. Open the same repo in Antigravity IDE / dual-wield with terminal.
2. Run the **same** commands (`ollama`, `npm run dev`).
3. Do **not** expect Antigravity’s cloud Gemini agents to power Potso chat — default AI is **local Ollama** on this branch.
4. Use Antigravity agents for code edits; use Potso in the browser for product testing.

## Full functionality checklist

- [ ] `ollama serve` + model pulled
- [ ] `npm run dev` without errors
- [ ] Health shows `aiOnline: true`
- [ ] Chat returns an answer
- [ ] Go Live works in Chrome/Edge (mic permission)
- [ ] `/dsar.html` submits a request
- [ ] Optional: Firebase, Whisper/Piper, `API_ACCESS_KEY`
