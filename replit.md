# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Artifacts

### Bingo Game Generator (`artifacts/bingo`)
Frontend-only React app for creating custom bingo cards and playing bingo games.
- **Card Builder**: Enter words/numbers, configure grid size (Y columns 3-8, X rows 2-5), generate Z randomized cards
- **Game Player**: Pull random words one at a time, track call history, counter stats
- No backend — all state in React
- Uses framer-motion for animations, shadcn/ui components, Tailwind CSS

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/bingo run dev` — run Bingo app locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
