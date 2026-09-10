# MusicForge — production container for Coolify (or any Docker host)
# Build: pnpm install + build UI (vite) + build API server (esbuild)
# Run:   node dist-server/index.cjs (serves dist/ UI + /api on $PORT, default 3005)

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app

# --- Dependencies (cached layer) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Provider keys are NOT baked in — they are injected at runtime via env
RUN pnpm build && pnpm build:server

# --- Runtime ---
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3005
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/package.json ./package.json
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3005)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist-server/index.cjs"]
