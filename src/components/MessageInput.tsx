import { useRef, KeyboardEvent } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';
  }

  function send() {
    const val = ref.current?.value.trim();
    if (!val) return;
    onSend(val);
    if (ref.current) {
      ref.current.value = '';
      ref.current.style.height = 'auto';
      ref.current.style.overflowY = 'hidden';
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="message-input">
      <textarea
        ref={ref}
        placeholder="Ask a question..."
        disabled={disabled}
        onKeyDown={onKey}
        onInput={resize}
        rows={1}
      />
      <button onClick={send} disabled={disabled}>↑</button>
    </div>
  );
}