export enum Sender {
  USER = 'user',
  AI = 'model',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: Sender;
  content: string;
  timestamp: number;
  isError?: boolean;
  toolCalls?: ToolCallInfo[];
  groundingSources?: GroundingSource[];
  image?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface ToolCallInfo {
  toolName: string;
  args: Record<string, any>;
  result?: any;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface MemoryItem {
  key: string;
  value: string;
  updatedAt: number;
}

export interface ToolStatus {
  isCalculating: boolean;
  isSearching: boolean;
  isAccessingMemory: boolean;
  isGeneratingImage: boolean;
}