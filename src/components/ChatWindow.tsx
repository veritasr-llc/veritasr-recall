import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  isGenerating: boolean;
  datasetName: string;
}

export default function ChatWindow({ messages, isGenerating, datasetName }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-window">
      {messages.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
          {datasetName ? `Ask a question about "${datasetName}".` : 'Ask a question about the loaded documents.'}
        </p>
      )}
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;
        return (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.content}
            {isLast && msg.role === 'assistant' && isGenerating && (
              <span className="cursor" />
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}