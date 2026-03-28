import type { ChunkEntry, SearchResult } from '../types';

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function search(
  query_embedding: number[],
  chunks: ChunkEntry[],
  top_k: number = 5
): SearchResult[] {
  return chunks
    .map(chunk => ({ chunk, score: cosine(query_embedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top_k);
}
