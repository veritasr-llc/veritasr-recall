export interface ChunkEntry {
  id: number;
  text: string;
  metadata: {
    header: string;
    chapter: string | null;
    type?: string;
  };
  embedding: number[];
}

export interface SearchResult {
  chunk: ChunkEntry;
  score: number;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

export type WorkerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface Dataset {
  id: string;
  name: string;
  path: string;
}

export interface Manifest {
  datasets: Dataset[];
  default: string;
}

// Embedder worker messages
export type EmbedderInMessage =
  | { type: 'load' }
  | { type: 'embed'; text: string; id: number };
  

export type EmbedderOutMessage =
  | { type: 'status'; status: WorkerStatus; message?: string }
  | { type: 'embed_result'; id: number; embedding: number[] }
  | { type: 'error'; message: string }
  | { type: 'embed_progress'; progress: number };