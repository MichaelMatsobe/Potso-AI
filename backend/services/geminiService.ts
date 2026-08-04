/**
 * Backward-compatible re-export.
 * Prefer importing from ./aiService going forward.
 */
export {
  getMultiAgentResponse,
  getProvider,
  type AIMessage,
  type MultiAgentResult,
} from "./aiService";
