import { pipeline, env } from "@huggingface/transformers";
import type { EmbedderInMessage } from "../types";
import { config } from "../config";

env.useBrowserCache = true;

let extractor: any = null;

async function load() {
  post({ type: "status", status: "loading", message: "Loading embedding model..." });

  try {
    extractor = await pipeline("feature-extraction", config.embedding.model, {
      dtype: config.embedding.dtype,
      device: "webgpu",
      progress_callback: (info: any) => {
        if (info.status !== "progress_total") return;
        self.postMessage({ type: "embed_progress", progress: Math.round(Number(info.progress ?? 0)) });
      },
    });
    post({ type: "status", status: "ready", message: "Embedder ready (WebGPU)" });
  } catch (gpuErr) {
    console.warn("Embedder WebGPU unavailable, falling back to WASM:", gpuErr);
    post({ type: "status", status: "loading", message: "Switching to CPU..." });
    extractor = await pipeline("feature-extraction", config.embedding.model, {
      dtype: "fp32",
      device: "wasm",
    });
    post({ type: "status", status: "ready", message: "Embedder ready (CPU/WASM)" });
  }
}

async function embed(text: string, id: number) {
  if (!extractor) throw new Error("Embedder not loaded");
  const output = await extractor(config.embedding.queryPrefix + text, {
    pooling: config.embedding.pooling,
    normalize: config.embedding.normalize,
  });
  post({ type: "embed_result", id, embedding: Array.from(output.data as Float32Array) });
}

function post(msg: any) {
  self.postMessage(msg);
}

self.onmessage = async (e: MessageEvent<EmbedderInMessage>) => {
  try {
    if (e.data.type === "load") await load();
    if (e.data.type === "embed") await embed(e.data.text, e.data.id);
  } catch (err) {
    post({ type: "error", message: String(err) });
  }
};
