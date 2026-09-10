import path from "path";
import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleApiRequest } from "./src/server/apiRouter";

function apiServerPlugin(): Plugin {
  return {
    name: "api-server-middleware",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/api")) {
          handleApiRequest(req, res, next);
        } else {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/api")) {
          handleApiRequest(req, res, next);
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // SECURITY: provider API keys are intentionally NOT injected into the client
  // bundle. They live only in the Node environment (dev middleware reads
  // process.env / .env.local) and are used server-side via /api/llm/complete.
  // Only the public app id (used for analytics-free branding) is exposed.
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3005,
      host: "0.0.0.0"
    },
    preview: {
      port: 3005,
      host: "0.0.0.0"
    },
    plugins: [tailwindcss(), react(), apiServerPlugin()],
    build: {
      rollupOptions: {
        output: {
          // Split heavy vendor libs out of the monolithic app chunk
          manualChunks: {
            react: ["react", "react-dom"],
            d3: ["d3"],
            jspdf: ["jspdf"],
            genai: ["@google/genai"]
          }
        }
      }
    },
    define: {
      // Public, non-secret value only. Do not add provider keys here.
      "process.env.APP_NAME": JSON.stringify("AI Lyrics Generator & Multi-Agent Studio")
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, ".")
      }
    }
  };
});
