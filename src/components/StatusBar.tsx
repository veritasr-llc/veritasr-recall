import type { LLMOption } from "../config";
import type { WorkerStatus } from "../types";

interface Props {
  embedderStatus: WorkerStatus;
  llmStatus: WorkerStatus;
  llmStatusMsg: string;
  llmProgress: number | null;
  embedderProgress: number | null;
  models: readonly LLMOption[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled: boolean;
  tps: number | null;
}

const R = 8;
const CIRC = 2 * Math.PI * R;

function StatusCircle({ status, progress, label }: { status: WorkerStatus; progress: number | null; label: string }) {
  const color = status === "ready" ? "var(--color-success, #4caf50)" : status === "error" ? "var(--color-error, #f44336)" : status === "loading" ? "var(--color-warning, #ff9800)" : "var(--text-muted)";

  const pct = status === "ready" ? 1 : status === "loading" && progress !== null ? progress / 100 : 0;
  const offset = CIRC * (1 - pct);

  return (
    <span title={label} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", color }}>
      <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="10" cy="10" r={R} fill="none" stroke="var(--text-muted)" strokeWidth="2" opacity="0.25" />
        <circle cx="10" cy="10" r={R} fill="none" stroke={color} strokeWidth="3" strokeDasharray={CIRC} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.3s ease" }} />
      </svg>
      {label.split(" ")[0]}
    </span>
  );
}

export default function StatusBar({ embedderStatus, llmStatus, llmStatusMsg, llmProgress, embedderProgress, models, selectedModel, onModelChange, disabled, tps }: Props) {
  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <StatusCircle status={embedderStatus} progress={embedderProgress} label="Embedder" />
        <StatusCircle status={llmStatus} progress={llmProgress} label={llmStatus === "loading" ? llmStatusMsg : "LLM"} />
        {tps !== null && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{tps} tok/s</span>}
      </div>
      <div className="status-bar-right">
        <select className="model-select" value={selectedModel} onChange={(e) => onModelChange(e.target.value)} disabled={disabled}>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
