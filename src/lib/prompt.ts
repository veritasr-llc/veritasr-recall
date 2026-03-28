import type { SearchResult } from '../types';
import { config } from '../config';

export function formatContext(results: SearchResult[]): string {
  const raw = results
    .map(r => {
      const text = r.chunk.text
        .replace(config.formatting.stripRelatedQuestions, '')
        .slice(0, config.rag.maxChunkChars);
      return `[${r.chunk.metadata.header}]\n${text}`;
    })
    .join('\n\n---\n\n');

  return raw
    .replace(config.formatting.stripHeaders, '')
    .slice(0, config.rag.maxContextChars);
}