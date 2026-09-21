/**
 * Shared abort supervisor for LyricsForge agent/generation jobs.
 * Registers in-flight AbortControllers so a global kill-switch can halt
 * pipelines, virality loops, writer's room, and bulk lyric generation.
 */

export type JobKind =
  | "pipeline"
  | "virality"
  | "writers-room"
  | "bulk-lyrics"
  | "single-lyrics"
  | "other";

export interface SupervisedJob {
  id: string;
  kind: JobKind;
  label: string;
  controller: AbortController;
  startedAt: number;
}

type Listener = (jobs: SupervisedJob[]) => void;

const jobs = new Map<string, SupervisedJob>();
const listeners = new Set<Listener>();
let seq = 0;

function emit() {
  const snapshot = getActiveJobs();
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      /* listener error must not break supervisor */
    }
  });
}

export function getActiveJobs(): SupervisedJob[] {
  return [...jobs.values()].filter((j) => !j.controller.signal.aborted);
}

export function subscribeAbortSupervisor(listener: Listener): () => void {
  listeners.add(listener);
  listener(getActiveJobs());
  return () => listeners.delete(listener);
}

export function registerAbortJob(
  kind: JobKind,
  label: string,
  controller?: AbortController
): SupervisedJob {
  const id = `job-${++seq}-${Date.now().toString(36)}`;
  const job: SupervisedJob = {
    id,
    kind,
    label,
    controller: controller || new AbortController(),
    startedAt: Date.now(),
  };
  jobs.set(id, job);
  const cleanup = () => {
    jobs.delete(id);
    emit();
  };
  job.controller.signal.addEventListener("abort", cleanup, { once: true });
  emit();
  return job;
}

export function completeAbortJob(id: string): void {
  if (jobs.delete(id)) emit();
}

export function abortJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;
  job.controller.abort();
  jobs.delete(id);
  emit();
  return true;
}

/** Global kill-switch: abort every supervised in-flight job. */
export function killAllJobs(): number {
  const active = [...jobs.values()];
  for (const job of active) {
    try {
      job.controller.abort();
    } catch {
      /* ignore */
    }
    jobs.delete(job.id);
  }
  emit();
  return active.length;
}

/** Map provider → whether a non-empty API key is configured (or local Ollama). */
export function providerHasKey(provider: string | undefined): boolean | "local" {
  if (!provider) return false;
  if (provider === "ollama_local") return "local";
  // Lazy import avoided — callers should use llmRegistry helper; this is a simple runtime check
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const env = (typeof process !== "undefined" && process.env) || {};
    const map: Record<string, string[]> = {
      google_gemini: ["GEMINI_API_KEY", "API_KEY"],
      openai: ["OPENAI_API_KEY"],
      anthropic: ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"],
      deepseek: ["DEEPSEEK_API_KEY"],
      groq: ["GROQ_API_KEY"],
      openrouter: ["OPENROUTER_API_KEY"],
      openai_compatible: ["CUSTOM_LLM_API_KEY"],
      anthropic_compatible: ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"],
      nous_hermes: ["OPENROUTER_API_KEY"],
    };
    const keys = map[provider] || [];
    return keys.some((k) => Boolean((env as any)[k]));
  } catch {
    return false;
  }
}

export function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 3,
  signal?: AbortSignal
): Promise<{ results: (R | null)[]; aborted: boolean; completed: number }> {
  const results: (R | null)[] = items.map(() => null);
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  let next = 0;
  let completed = 0;
  let aborted = false;

  const runOne = async (): Promise<void> => {
    while (next < items.length) {
      if (signal?.aborted) {
        aborted = true;
        return;
      }
      const idx = next++;
      try {
        results[idx] = await worker(items[idx], idx);
        completed += 1;
      } catch (err) {
        console.error(`Concurrent worker failed at index ${idx}:`, err);
        results[idx] = null;
      }
      if (signal?.aborted) {
        aborted = true;
        return;
      }
    }
  };

  return Promise.all(Array.from({ length: limit }, () => runOne())).then(() => ({
    results,
    aborted: aborted || Boolean(signal?.aborted),
    completed,
  }));
}
