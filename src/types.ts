// ==================== AGENT ====================
export type AgentId = 'modisa' | 'tshepo' | 'kgakgamatso' | 'tlhaloganyo';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  icon: string;
  description?: string;
}

export interface ReasoningStep {
  agentId: AgentId;
  thought: string;
  delegatedTo?: AgentId;
  action?: string;
}

export const AGENTS: Agent[] = [
  { id: 'modisa', name: 'Modisa', role: 'Researcher', icon: 'Search', description: 'Deep search and data retrieval' },
  { id: 'tshepo', name: 'Tshepo', role: 'Synthesizer', icon: 'BookOpen', description: 'Synthesis and cross-referencing' },
  { id: 'kgakgamatso', name: 'Kgakgamatso', role: 'Auditor', icon: 'Code', description: 'Technical audit and analysis' },
  { id: 'tlhaloganyo', name: 'Tlhaloganyo', role: 'Narrator', icon: 'PenTool', description: 'Narrative structure and readability' },
];

// ==================== MESSAGE & CHAT ====================
export interface Artifact {
  id: string;
  title: string;
  content: string;
  type: 'code' | 'data' | 'text' | 'image';
  createdBy: AgentId;
  createdAt?: string;
  language?: string; // for code artifacts
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string;
  size?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
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
  updatedAt?: number;
  lastMessage?: string;
  lastMessageTime?: number;
  isStarred?: boolean;
  tags?: string[];
  isArchived?: boolean;
}

// ==================== USER & AUTHENTICATION ====================
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  isVerified: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
  messageGrouping: boolean;
  codeHighlighting: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  defaultChatFormat: 'compact' | 'comfortable' | 'spacious';
  showTimestamps: boolean;
  compactMode: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'dark',
  language: 'en',
  notificationsEnabled: true,
  emailNotifications: false,
  soundEnabled: true,
  vibrationEnabled: true,
  fontSize: 'medium',
  messageGrouping: true,
  codeHighlighting: true,
  autoSave: true,
  autoSaveInterval: 30,
  defaultChatFormat: 'comfortable',
  showTimestamps: true,
  compactMode: false,
};

// ==================== API RESPONSES ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
  statusCode: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== VALIDATION ====================
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ==================== NOTIFICATIONS ====================
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: string;
}
