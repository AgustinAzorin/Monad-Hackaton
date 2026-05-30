# CLAUDE.md — Monad Hackaton Project

## Project Overview
Real-time live connection platform between providers and clients, built on Monad blockchain.

## Architecture
Monorepo with two independent deployable services:
- **`/frontend`** — Next.js 15 (App Router, TypeScript, Tailwind CSS)
- **`/backend`** — NestJS (TypeScript, Socket.io for real-time)

## Tech Stack
- **Frontend:** Next.js, TypeScript, Tailwind CSS, wagmi, viem, @supabase/ssr
- **Backend:** NestJS, Socket.io (@nestjs/websockets), @supabase/supabase-js, viem
- **Database & Auth:** Supabase (Postgres + Row Level Security + Auth)
- **Blockchain:** Monad (EVM-compatible, chain ID 10143 testnet / 143 mainnet)

## Development Commands
```bash
# From root — run both services
npm run dev

# Individual services
npm run dev:frontend    # Next.js on :3000
npm run dev:backend     # NestJS on :3001

# Build
npm run build:frontend
npm run build:backend

# Lint
npm run lint
```

## Key Conventions
- Use `src/` directory in both frontend and backend
- Frontend uses App Router (`src/app/`) — no Pages Router
- Backend modules follow NestJS convention: `module.ts`, `service.ts`, `controller.ts`, `gateway.ts`
- Environment variables go in `.env` (never committed). See `.env.example` for required vars
- WebSocket events use kebab-case: `join-room`, `leave-room`, `message`

## Blockchain — IMPORTANT
**Before ANY blockchain-related work, ALWAYS read `/MONAD.md` first.**
It contains critical configuration (EVM version, RPC URLs, chain IDs, deployment workflow, verification API, wallet persistence rules).

Key rules from MONAD.md:
- Always use testnet (chain ID 10143) unless explicitly told mainnet
- Frontend: import `monadTestnet` from `viem/chains` — never define custom chain
- Backend: use `viem` for blockchain interactions
- Smart contracts: use Foundry, NOT Hardhat. Set `evm_version = "prague"`, Solidity 0.8.27+

## Deployment (Render)
Each service deploys independently on Render pointing to this single repo:

### Frontend (Static Site or Web Service)
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_WS_URL`

### Backend (Web Service)
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `node dist/main`
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKEND_PORT`, `CORS_ORIGIN`, `MONAD_RPC_URL`, `PRIVATE_KEY`

## File Structure
```
/
├── CLAUDE.md              # This file
├── MONAD.md               # Blockchain reference (READ BEFORE ANY WEB3 WORK)
├── package.json           # Root workspaces config
├── tsconfig.base.json     # Shared TS config
├── .env.example           # All env vars reference
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # React components
│   │   │   ├── providers/ # Context providers (wagmi, react-query)
│   │   │   ├── ui/        # Reusable UI components
│   │   │   ├── providers/ # Provider-side components
│   │   │   └── clients/   # Client-side components
│   │   ├── hooks/         # Custom React hooks (useSocket, etc.)
│   │   ├── lib/           # Utilities (supabase clients, wagmi config)
│   │   └── types/         # Shared TypeScript types
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── gateway/       # WebSocket gateway (Socket.io)
│   │   ├── config/        # Supabase, env config
│   │   ├── providers/     # Provider-related modules
│   │   ├── clients/       # Client-related modules
│   │   ├── blockchain/    # Monad blockchain integration
│   │   └── common/        # Guards, decorators, interfaces
│   └── package.json
```

## Supabase
- Browser client: `src/lib/supabase-browser.ts`
- Server client: `src/lib/supabase-server.ts`
- Backend uses service role key for admin operations
