# Base44 Dev Environment

## Stack
- Frontend-only React 19 + TypeScript + Vite 8 app using @react-three/frei/fiber and three.js for a 3D project visualization.
- No backend, no database, no external services — no secrets required.

## Running
- `docker compose -f docker-compose.base44.yml up -d` starts a `node:22` container that runs `npm install` then `npm run dev -- --host 0.0.0.0`.
- Source is bind-mounted at `/app`; Vite HMR reflects edits live (CHOKIDAR_USEPOLLING=true for bind-mount watch reliability).
- Dev server listens on container port 5173, mapped to host port 3000 (the preview entry point).

## Vite config
- `vite.config.ts` sets `server.host: true` and `allowedHosts: true` so the preview's external hostname is accepted.

## Verification
- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` returns the Vite-served HTML with `/src/main.tsx` (live source, not a prebuilt bundle).
