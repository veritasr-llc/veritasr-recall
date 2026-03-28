# Veritasr Recall

Offline, browser-native document intelligence. No cloud. No egress. Runs on anything.

## What it is

A fully client-side RAG system. Documents are indexed offline, embeddings run in-browser via WebGPU or WASM fallback, and a small ONNX language model answers questions locally. Nothing leaves the device.

Built for environments where cloud access is unavailable, restricted, or unacceptable.

## How it works

1. Ingest and chunk your documents offline using any pipeline that produces the index format (see Wiki)
2. The browser app loads that index and handles all retrieval and inference locally
3. BGE embeddings via Transformers.js handle semantic search
4. A small ONNX language model handles generation

## Stack

- Transformers.js + ONNX Runtime (WebGPU / WASM fallback)
- BGE-base-en-v1.5 embeddings
- Supports any compatible ONNX text-generation model
- React + Vite + TypeScript
- Zero external API calls

## Models tested

| Model | Size | Notes |
|-------|------|-------|
| LFM2 350M | 350M | Fast, low memory |
| LFM2 700M | 700M | Default, good balance |
| LFM2 1.2B RAG | 1.2B | Best accuracy |
| SmolLM2 360M | 360M | Good fallback |
| Granite 4.0 1B | 1B | Solid on WASM |
| Gemma 3 1B | 1B | Experimental |

## Running it

```bash
npm install
npm run dev
```

Bring your own index. See the [Wiki](../../wiki) for the index schema.

## Status

Early demo. FEMA Are You Ready? dataset included. More datasets and models in progress.

---

[veritasr.com](https://veritasr.com) - Built by Veritasr LLC