export type AgentId = 'modisa' | 'tshepo' | 'kgakgamatso' | 'tlhaloganyo';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  icon: string; // Lucide icon name or SVG path
}

export interface ReasoningStep {
  agentId: AgentId;
  thought: string;
  delegatedTo?: AgentId;
  action?: string;
}

export interface Artifact {
  id: string;
  title: string;
  content: string;
  type: 'code' | 'data' | 'text' | 'image';
  createdBy: AgentId;
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: ReasoningStep[];
  tags?: string[];
  activeAgentId?: AgentId;
  isFormulating?: boolean;
  imageUrl?: string;
  artifacts?: Artifact[];
  consensusReached?: boolean;
  attachments?: Attachment[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export const AGENTS: Agent[] = [
  { id: 'modisa', name: 'Modisa', role: 'Researcher', icon: 'Search' },
  { id: 'tshepo', name: 'Tshepo', role: 'Synthesizer', icon: 'BookOpen' },
  { id: 'kgakgamatso', name: 'Kgakgamatso', role: 'Auditor', icon: 'Code' },
  { id: 'tlhaloganyo', name: 'Tlhaloganyo', role: 'Narrator', icon: 'PenTool' },
];
