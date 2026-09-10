import React, { useState } from "react";
// --- PRODUCTION REST API & DEVELOPER ENDPOINTS MODAL ---
interface ProductionApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModelId: string;
}

const ProductionApiModal: React.FC<ProductionApiModalProps> = ({ isOpen, onClose, activeModelId }) => {
  const [activeLang, setActiveLang] = useState<'curl' | 'python' | 'typescript'>('curl');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getCode = () => {
    const payload = {
      theme: "Driving through a midnight thunderstorm in Tokyo",
      genre: "Synthwave Pop",
      mood: "Nostalgic & High Energy",
      occasion: "Late Night Drive",
      rhymeScheme: "ABAB / AABB",
      language: "English",
      modelId: activeModelId
    };

    if (activeLang === 'curl') {
      return `curl -X POST "http://localhost:3005/api/generate-lyrics" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
    }
    if (activeLang === 'python') {
      return `import requests

res = requests.post(
    "http://localhost:3005/api/generate-lyrics",
    json=${JSON.stringify(payload, null, 4)}
)
data = res.json()
print("Song Title:", data.get("title"))
print("\nLyrics:\n", data.get("lyricsText"))`;
    }
    return `// Production API Integration (TypeScript / Node)
async function generateLyrics() {
  const res = await fetch("http://localhost:3005/api/generate-lyrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(${JSON.stringify(payload, null, 4)})
  });
  const data = await res.json();
  console.log("Generated Song:", data.title);
  return data;
}

generateLyrics();`;
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-gray-950 border border-teal-500/40 rounded-3xl w-full max-w-4xl p-6 sm:p-8 space-y-6 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-500/40 flex items-center justify-center text-teal-300 text-xl font-bold">
              ðŸŒ
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Production REST API Endpoints</h2>
              <p className="text-xs text-gray-400">Integrate AI Lyrics Generation, Multi-Agent Orchestration & Chord Analysis into any service.</p>
            </div>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer">
            âœ• Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
            <div className="font-bold text-teal-300">POST /api/generate-lyrics</div>
            <div className="text-gray-400 mt-1">Generates complete radio-ready song lyrics across genres & themes.</div>
          </div>
          <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
            <div className="font-bold text-teal-300">POST /api/agents/execute-pipeline</div>
            <div className="text-gray-400 mt-1">Executes multi-stage sequential agent songwriting pipelines.</div>
          </div>
          <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
            <div className="font-bold text-teal-300">POST /api/agents/writers-room</div>
            <div className="text-gray-400 mt-1">Multi-turn agent co-writing conversation turn dispatcher.</div>
          </div>
          <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
            <div className="font-bold text-teal-300">POST /api/agents/tools/execute</div>
            <div className="text-gray-400 mt-1">Executes specific tools: rhyme analyzer, chord architect, melody motif.</div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-3 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(['curl', 'python', 'typescript'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setActiveLang(l)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                    activeLang === l ? "bg-teal-500 text-black" : "bg-gray-900 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(getCode());
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-teal-300 rounded-lg text-xs font-bold transition-all cursor-pointer border border-gray-700"
            >
              {copied ? "âœ“ Copied!" : "ðŸ“‹ Copy Code"}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-gray-200 overflow-x-auto leading-relaxed bg-gray-950">
            {getCode()}
          </pre>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs">
          <a
            href="http://localhost:3005/api/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="text-teal-400 hover:underline font-bold"
          >
            ðŸ“„ Open Complete OpenAPI 3.0 JSON Specification
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
export default ProductionApiModal;
