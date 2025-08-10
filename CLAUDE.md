# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server (REQUIRED method - never use any other way)
make dev

# View development logs (ANSI stripped, last 100 lines)
make tail-log

# Run all tests (unit + e2e)
pnpm test

# Run unit tests only (Vitest with browser environment)
pnpm test:unit

# Run E2E tests only (Playwright)
pnpm test:e2e

# Format code with Prettier
pnpm format

# Lint and check formatting
pnpm lint

# Type checking
pnpm check

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Critical Development Rules

- **ALWAYS** start the development server with `make dev` - NEVER use `pnpm dev` directly or kill/stop the server
- **ALWAYS** check `make tail-log` when debugging issues - all client and server logs appear in `dev.log`
- The project uses **pnpm** as the package manager - do not use npm or yarn
- Node version: **24.5** (standardized requirement)
- **IMPORTANT** - this project uses SVELTE 5!! - MAKE SURE YOU ARE UP TO DATE WITH SVELTE RUNES (e.g $state, $derive $derive.by $effect).

## Architecture Overview

### Technology Stack

- **Framework**: SvelteKit 2.0+ with Svelte 5 (using runes syntax)
- **Styling**: TailwindCSS v4 with Vite plugin
- **Database**: Better-SQLite3 with Better-Auth for authentication
- **Testing**: Vitest (browser tests) + Playwright (E2E)
- **Build Tool**: Vite 7.x

### Key Directories

- `src/routes/` - SvelteKit pages and API endpoints
- `src/lib/` - Shared components, utilities, and business logic
  - `lib/auth/` - Authentication configuration (Better-Auth)
  - `lib/db/` - Database schema and initialization
  - `lib/components/` - Reusable Svelte components
  - `lib/utils/` - Utility functions including consoleWrapper for debugging
- `data/` - SQLite database location (`storybook.db`)
- `e2e/` - Playwright end-to-end tests

### Svelte 5 Specifics

This project uses **Svelte 5 with runes**. Key differences from Svelte 4:

- State management uses `$state()` rune instead of let declarations
- Effects use `$effect()` instead of reactive statements
- Props use `$props()` instead of export declarations
- Consult `svelte-complete-distilled.txt` for detailed Svelte 5 patterns

### Testing Strategy

- **Unit tests**: `*.svelte.{test,spec}.{js,ts}` files run in browser environment via Vitest
- **Server tests**: `*.{test,spec}.{js,ts}` files run in Node environment
- **E2E tests**: Located in `e2e/` directory, run with Playwright
- Test configuration defined in `vite.config.js` with separate projects for client/server

### Authentication System

Uses Better-Auth with SQLite database:

- Database tables: `user`, `session`, `account`, `verification`
- Configuration in `src/lib/auth/config.js`
- Email/password authentication enabled
- Session expiry: 7 days

### Development Environment

- Uses `shoreman.sh` (Procfile runner) to manage processes
- All console logs (including client-side) are forwarded to server and appear in `dev.log`
- Client logs sent to `/api/debug/client-logs` endpoint via consoleWrapper utility
- **IMPORTANT** use `make tail-log` to access these logs

### API Structure

- `/api/auth/` - Authentication endpoints (Better-Auth)
- `/api/config/` - Configuration management
- `/api/debug/client-logs/` - Client-side log collection
- `/api/geo-searches/` - Geo-related API endpoints
- `/api/projects/` - Project management endpoints
- `/api/test-db/` - Database testing utilities
