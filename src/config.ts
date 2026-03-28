export const config = {
  
  // Debug: when false, skips Raw generation and only runs RAG pass
  debug: false,
  
  
  // Dataset loading
  manifestPath: "/manifest.json",
  datasetParam: "dataset",

  // Generation settings
  models: {
    maxTokens: 256,
    sampling: {
      doSample: true,
      temperature: 0.3,
    },
  },

  // RAG settings
  embedding: {
    model: "Xenova/bge-base-en-v1.5",
    dtype: "fp32" as const,
    queryPrefix: "query: ",
    pooling: "cls" as const,
    normalize: true,
  },

  rag: {
    topK: 5,
    minScore: 0.3,
    maxChunkChars: 3000, // per-chunk truncation before context assembly
    maxContextChars: 5500, // total context string fed to LLM
  },

  // Context formatting
  formatting: {
    stripHeaders: /##\s*/g,
    stripRelatedQuestions: /\nRelated questions:[\s\S]*$/m,
  },


  defaultModel: "lfm2-700m",

  llmOptions: [
    {
      id: "lfm2-350m",
      name: "LFM2 350M",
      modelId: "onnx-community/LFM2-350M-ONNX",
    },
    {
      id: "lfm2-700m",
      name: "LFM2 700M",
      modelId: "onnx-community/LFM2-700M-ONNX",
    },
    {
      id: "lfm2-1.2b-rag",
      name: "LFM2 1.2B RAG",
      modelId: "onnx-community/LFM2-1.2B-RAG-ONNX",
    },
    {
      id: "smollm2-360m",
      name: "SmolLM2 360M",
      modelId: "HuggingFaceTB/SmolLM2-360M-Instruct",
    },
    {
      id: "granite-4-1b",
      name: "Granite 4.0 1B",
      modelId: "onnx-community/granite-4.0-1b-ONNX",
    },
    {
      id: "gemma-3-1b",
      name: "Gemma 3 1B (experimental)",
      modelId: "onnx-community/gemma-3-1b-it-ONNX-GQA",
    },
  ],

  dtype: "q4" as const,


  systemPrompt: `You are a question-answering assistant. Answer using only the provided context. Write a single sentence that directly answers this question as if you were an expert. Be specific and factual. No preamble. No lists. No markdown. No caveats. No disclaimers. If the answer is not in the context, say only: "Not found in documents."`,
} as const;

export type LLMOption = (typeof config.llmOptions)[number];
