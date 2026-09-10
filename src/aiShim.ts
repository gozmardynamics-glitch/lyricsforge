import { executeUniversalLLMCall } from "./agents/llmRegistry";

// --- UNIVERSAL MODEL-AGNOSTIC AI SERVICE ---
export const callUniversalAI = async (options: any) => {
  // Unwrap Gemini-style contents ({ parts: [{ text }] }) into a plain prompt
  const unwrapContents = (c: any): string => {
    if (!c) return "";
    if (typeof c === "string") return c;
    if (Array.isArray(c)) return c.map(unwrapContents).join("\n");
    if (Array.isArray(c.parts)) return c.parts.map((p: any) => (typeof p === "string" ? p : p?.text || "")).join("\n");
    if (typeof c.text === "string") return c.text;
    return "";
  };
  const userPrompt = unwrapContents(options.contents) || options.prompt || "";
  const systemPrompt = options.systemInstruction || options.systemPrompt || options.config?.systemInstruction || "";
  const isJson = options.responseMimeType === "application/json" || options.config?.responseMimeType === "application/json";
  const jsonSchema = options.responseSchema || options.config?.responseSchema;
  const temp = options.temperature ?? options.config?.temperature ?? 0.75;
  const maxTokens = options.maxTokens ?? options.config?.maxOutputTokens ?? 3000;

  const raw = await executeUniversalLLMCall({
    userPrompt,
    systemPrompt,
    responseFormat: isJson ? "json" : "text",
    jsonSchema,
    temperature: temp,
    maxTokens
  });

  return {
    text: raw,
    candidates: [{ content: { parts: [{ text: raw }] } }]
  };
};

export const ai = {
  models: {
    generateContent: (args: any) => callUniversalAI(args)
  }
};
