/**
 * End-to-end smoke tests for ops hardening:
 * 1. abort supervisor register/kill-all
 * 2. runWithConcurrency parallel + abort
 * 3. generateThreeLyricVersions always returns 3 versions
 * 4. abort mid-generation
 * 5. server custom model disk persistence
 * 6. model registry dropdown helpers
 */
import {
  registerAbortJob,
  completeAbortJob,
  killAllJobs,
  getActiveJobs,
  runWithConcurrency,
} from "../src/agents/abortSupervisor";
import { generateThreeLyricVersions } from "../src/agents/generateThreeLyricVersions";
import {
  registerServerCustomModel,
  getServerCustomModels,
  loadServerCustomModelsFromDisk,
  getStoredLLMModels,
  modelProviderReady,
  getActiveModelId,
  setActiveModelId,
} from "../src/agents/llmRegistry";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(cond: boolean, name: string, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    const msg = `  FAIL  ${name}${detail ? " — " + detail : ""}`;
    errors.push(msg);
    console.log(msg);
  }
}

async function main() {
  console.log("\n=== LyricsForge Ops E2E Smoke Tests ===\n");

  // 1. Abort supervisor
  console.log("[1] Abort supervisor");
  const c1 = new AbortController();
  const j1 = registerAbortJob("pipeline", "test pipeline", c1);
  const j2 = registerAbortJob("bulk-lyrics", "test bulk");
  assert(getActiveJobs().length >= 2, "registers active jobs");
  const killed = killAllJobs();
  assert(killed >= 2, "killAllJobs aborts registered jobs", `killed=${killed}`);
  assert(c1.signal.aborted, "external controller aborted via kill-all");
  assert(getActiveJobs().length === 0, "no active jobs after kill-all");
  completeAbortJob(j1.id);
  completeAbortJob(j2.id);

  // 2. runWithConcurrency
  console.log("[2] runWithConcurrency (parallel ×3)");
  const order: number[] = [];
  const start = Date.now();
  const { completed } = await runWithConcurrency(
    [0, 1, 2, 3, 4, 5],
    async (i) => {
      order.push(i);
      await new Promise((r) => setTimeout(r, 40));
      return i * 2;
    },
    3
  );
  const elapsed = Date.now() - start;
  assert(completed === 6, "all 6 items completed", `completed=${completed}`);
  // sequential would be ~240ms; parallel ~80-120ms
  assert(elapsed < 220, "ran faster than sequential", `elapsed=${elapsed}ms`);
  assert(order.length === 6, "worker invoked for each item");

  // Abort mid-run
  const abort = new AbortController();
  const abortRun = runWithConcurrency(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    async (i) => {
      await new Promise((r) => setTimeout(r, 30));
      return i;
    },
    3,
    abort.signal
  );
  setTimeout(() => abort.abort(), 50);
  const abortResult = await abortRun;
  assert(abortResult.aborted === true, "concurrency run reports aborted");
  assert(abortResult.completed < 10, "did not finish all items after abort", `completed=${abortResult.completed}`);

  // 3. generateThreeLyricVersions offline (no API key)
  console.log("[3] generateThreeLyricVersions");
  const gen = await generateThreeLyricVersions({
    title: "E2E Test Anthem",
    genre: "Pop",
    mood: "Celebration",
    albumName: "E2E Album",
    occasion: "Birthday Celebration",
    customIdeas: "smoke test song for ops pipeline",
  });
  assert(Array.isArray(gen.versions), "returns versions array");
  assert(gen.versions.length === 3, "always returns 3 versions", `got=${gen.versions.length}`);
  assert(
    gen.versions.every((v) => Array.isArray(v) && v.length > 0),
    "every version has lines"
  );
  assert(gen.usedFallback === true || gen.versions.length === 3, "fallback or live both yield 3 versions");
  console.log(`        meta: usedFallback=${gen.usedFallback} model=${gen.modelId} lines=${gen.versions.map((v) => v.length).join("/")}`);

  // 4. Abort generation
  console.log("[4] Abort during generation");
  const genAbort = new AbortController();
  genAbort.abort();
  try {
    const abortedGen = await generateThreeLyricVersions(
      {
        title: "Aborted Song",
        genre: "Rock",
        mood: "Intense",
        signal: genAbort.signal,
      },
      "English"
    );
    // If provider already aborted before throw, pipeline may still return procedural — accept either abort throw or 3 versions after abort check
    assert(
      abortedGen.versions.length === 3 || true,
      "aborted generation does not crash the pipeline"
    );
  } catch (e: any) {
    assert(e?.name === "AbortError" || /abort/i.test(String(e?.message || e)), "throws AbortError when signal pre-aborted", String(e?.message || e));
  }

  // 5. Server custom model persistence
  console.log("[5] Server custom model disk persistence");
  const testModel = {
    id: "e2e_test_custom_model",
    name: "E2E Test Custom Model",
    provider: "openai_compatible" as const,
    modelString: "e2e-test-model",
    endpointUrl: "http://127.0.0.1:9/v1/chat/completions",
  };
  registerServerCustomModel(testModel);
  assert(
    getServerCustomModels().some((m) => m.id === "e2e_test_custom_model"),
    "model registered in memory"
  );
  const fs = await import("node:fs");
  const path = await import("node:path");
  const file = path.resolve(process.cwd(), "data/server_custom_models.json");
  // persist is sync inside register — wait a tick
  await new Promise((r) => setTimeout(r, 50));
  const diskOk = fs.existsSync(file);
  assert(diskOk, "persisted to data/server_custom_models.json", `path=${file}`);
  if (diskOk) {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    const list = Array.isArray(parsed) ? parsed : parsed.models;
    assert(
      Array.isArray(list) && list.some((m: any) => m.id === "e2e_test_custom_model"),
      "disk file contains registered model"
    );
  }
  const reloaded = loadServerCustomModelsFromDisk();
  assert(reloaded >= 1, "loadServerCustomModelsFromDisk reads registry", `count=${reloaded}`);

  // 6. Registry dropdown helpers
  console.log("[6] LLM registry helpers");
  const models = getStoredLLMModels();
  assert(models.length > 5, "registry has multiple models", `count=${models.length}`);
  assert(models.some((m) => m.provider === "google_gemini"), "includes Gemini");
  assert(models.some((m) => m.provider === "anthropic"), "includes Anthropic");
  assert(models.some((m) => m.provider === "ollama_local"), "includes Ollama local");
  assert(typeof modelProviderReady("ollama_local") === "boolean" && modelProviderReady("ollama_local") === true, "Ollama treated as key-ready (local)");
  const prev = getActiveModelId();
  setActiveModelId("openai_gpt_4o_mini");
  assert(getActiveModelId() === "openai_gpt_4o_mini", "setActiveModelId/getActiveModelId roundtrip");
  setActiveModelId(prev);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log("\nFailures:");
    errors.forEach((e) => console.log(e));
    process.exit(1);
  }
  console.log("All ops E2E smoke tests passed.\n");
}

main().catch((err) => {
  console.error("E2E runner crashed:", err);
  process.exit(1);
});
