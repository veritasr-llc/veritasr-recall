import { useEffect, useRef, useState, useCallback } from "react";
import { pipeline, TextStreamer, InterruptableStoppingCriteria, type TextGenerationPipeline } from "@huggingface/transformers";
import type { ChatMessage, ChunkEntry, WorkerStatus, EmbedderOutMessage, Manifest } from "./types";
import { search } from "./lib/search";
import { formatContext } from "./lib/prompt";
import { config } from "./config";
import StatusBar from "./components/StatusBar";
import ChatWindow from "./components/ChatWindow";
import MessageInput from "./components/MessageInput";

let msgCounter = 0;

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [index, setIndex] = useState<ChunkEntry[] | null>(null);
  const [datasetName, setDatasetName] = useState<string>("");
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [embedderStatus, setEmbedderStatus] = useState<WorkerStatus>("idle");
  const [llmStatus, setLlmStatus] = useState<WorkerStatus>("idle");
  const [, setEmbedderStatusMsg] = useState("idle");
  const [llmStatusMsg, setLlmStatusMsg] = useState("idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [llmProgress, setLlmProgress] = useState<number | null>(null);
  const [embedderProgress, setEmbedderProgress] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(config.defaultModel);
  const [tps, setTps] = useState<number | null>(null);

  const embedderRef = useRef<Worker | null>(null);
  const generatorRef = useRef<Promise<TextGenerationPipeline> | null>(null);
  const stoppingCriteria = useRef(new InterruptableStoppingCriteria());
  const embedResolveRef = useRef<((v: number[]) => void) | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const manifest: Manifest = await fetch(config.manifestPath).then((r) => r.json());
        const param = new URLSearchParams(window.location.search).get(config.datasetParam);
        const match = manifest.datasets.find((d) => d.id === param);
        const dataset = match ?? manifest.datasets.find((d) => d.id === manifest.default);

        if (!dataset) {
          setDatasetError("No dataset available.");
          return;
        }

        const data: ChunkEntry[] = await fetch(dataset.path).then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        });

        setIndex(data);
        setDatasetName(dataset.name);
      } catch {
        setDatasetError("No dataset available.");
      }
    })();
  }, []);

  useEffect(() => {
    const embedder = new Worker(new URL("./workers/embedder.worker.ts", import.meta.url), { type: "module" });

    embedder.onmessage = (e: MessageEvent<EmbedderOutMessage>) => {
      const msg = e.data;
      if (msg.type === "status") {
        setEmbedderStatus(msg.status);
        setEmbedderStatusMsg(msg.message ?? msg.status);
        if (msg.status === "ready") setEmbedderProgress(null);
      } else if (msg.type === "embed_progress") {
        setEmbedderProgress(msg.progress);
      } else if (msg.type === "embed_result") {
        embedResolveRef.current?.(msg.embedding);
        embedResolveRef.current = null;
      } else if (msg.type === "error") {
        setEmbedderStatus("error");
        setEmbedderStatusMsg(msg.message);
      }
    };

    embedderRef.current = embedder;
    embedder.postMessage({ type: "load" });

    return () => embedder.terminate();
  }, []);

  useEffect(() => {
    const model = config.llmOptions.find((m) => m.id === selectedModel) ?? config.llmOptions[0];

    const progressCallback = (info: any) => {
      if (info.status !== "progress_total") return;
      const loaded = Number(info.loaded ?? 0);
      const total = Number(info.total ?? 0);
      const pct = Math.round(Number(info.progress ?? 0));
      setLlmProgress(pct);
      const toMB = (b: number) => (b / 1e6).toFixed(0);
      setLlmStatusMsg(total > 0 ? `Downloading... ${toMB(loaded)}MB / ${toMB(total)}MB (${pct}%)` : "Downloading model...");
    };

    generatorRef.current = (async () => {
      setLlmStatus("loading");
      setLlmStatusMsg("Downloading model...");

      try {
        let gen: TextGenerationPipeline;

        try {
          gen = (await pipeline("text-generation", model.modelId, {
            dtype: config.dtype,
            device: "webgpu",
            progress_callback: progressCallback,
          })) as TextGenerationPipeline;
          setLlmStatusMsg("Ready (WebGPU)");
        } catch (gpuErr) {
          console.warn("WebGPU unavailable, falling back to WASM:", gpuErr);
          setLlmStatusMsg("WebGPU failed, switching to CPU...");
          gen = (await pipeline("text-generation", model.modelId, {
            dtype: "q8",
            device: "wasm",
            progress_callback: progressCallback,
          })) as TextGenerationPipeline;
          setLlmStatusMsg("Ready (CPU/WASM)");
        }

        setLlmStatus("ready");
        setLlmProgress(null);
        return gen;
      } catch (err) {
        setLlmStatus("error");
        setLlmStatusMsg(String(err));
        generatorRef.current = null;
        throw err;
      }
    })();

    return () => {
      stoppingCriteria.current.interrupt();
    };
  }, [selectedModel]);

  const handleModelChange = useCallback(
    (modelId: string) => {
      if (modelId === selectedModel || isGenerating) return;
      stoppingCriteria.current.interrupt();
      generatorRef.current = null;
      stoppingCriteria.current = new InterruptableStoppingCriteria();
      setSelectedModel(modelId);
      setTps(null);
    },
    [selectedModel, isGenerating],
  );

  const runGeneration = useCallback(async (msgs: { role: "system" | "user"; content: string }[], prefix: string) => {
    const generator = await generatorRef.current!;
    stoppingCriteria.current.reset();

    setMessages((prev) => [...prev, { id: ++msgCounter, role: "assistant", content: prefix }]);

    let tokenCount = 0;
    const startTime = performance.now();

    const streamer = new TextStreamer((generator as any).tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token: string) => {
        if (!token) return;
        tokenCount++;
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0) setTps(Math.round(tokenCount / elapsed));
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + token };
          }
          return updated;
        });
      },
    });

    await generator(msgs, {
      max_new_tokens: config.models.maxTokens,
      do_sample: config.models.sampling.doSample,
      temperature: config.models.sampling.temperature,
      streamer,
      stopping_criteria: stoppingCriteria.current,
    });
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!index || embedderStatus !== "ready" || llmStatus !== "ready" || isGenerating) return;

      const userMsg: ChatMessage = { id: ++msgCounter, role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setIsGenerating(true);
      setTps(null);

      try {
        if (config.debug) {
          await runGeneration(
            [
              { role: "system" as const, content: config.systemPrompt },
              { role: "user" as const, content: text },
            ],
            "[Raw]\n",
          );
        }

        const embedding = await new Promise<number[]>((resolve) => {
          embedResolveRef.current = resolve;
          embedderRef.current!.postMessage({ type: "embed", text, id: userMsg.id });
        });

        const results = search(embedding, index, config.rag.topK).filter((r) => r.score >= config.rag.minScore);

        console.log(
          "[RAG]",
          results.map((r) => ({
            score: r.score.toFixed(3),
            header: r.chunk.metadata.header,
            preview: r.chunk.text,
          })),
        );

        const context = formatContext(results);

        await runGeneration(
          [
            { role: "system" as const, content: config.systemPrompt },
           // { role: "user" as const, content: `Use the following context to answer questions:\n${context}\n\n${text}` },
            { role: "user" as const, content: `Use the following context to answer the question.\n\n${context}\n\nQuestion: ${text}\n\n${config.systemPrompt}` },

          ],
          config.debug ? "[RAG]\n" : "",
        );
      } catch (err) {
        console.error("Generation error:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [index, embedderStatus, llmStatus, isGenerating, runGeneration],
  );

  if (datasetError) {
    return (
      <div className="app">
        <div className="app-header">
          <h1>RAG Q&amp;A</h1>
        </div>
        <div style={{ textAlign: "center", marginTop: "2rem", color: "var(--text-muted)" }}>{datasetError}</div>
      </div>
    );
  }

  const inputDisabled = !index || embedderStatus !== "ready" || llmStatus !== "ready" || isGenerating;

  return (
    <div className="app">
      <div className="app-header">
        <h1>RAG Q&amp;A</h1>
      </div>
      <StatusBar
        embedderStatus={embedderStatus}
        llmStatus={llmStatus}
        llmStatusMsg={llmStatusMsg}
        llmProgress={llmProgress}
embedderProgress={embedderProgress}
        models={config.llmOptions}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        disabled={isGenerating || llmStatus === "loading"}
        tps={tps}
      />
      <ChatWindow messages={messages} isGenerating={isGenerating} datasetName={datasetName} />
      <MessageInput onSend={handleSend} disabled={inputDisabled} />
    </div>
  );
}
