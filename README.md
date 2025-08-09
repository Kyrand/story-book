# Story Book

A modern SvelteKit application with authentication and testing

Built with SvelteKit 2.0+, Svelte 5, TailwindCSS v4, and Better-Auth.

## Prerequisites

- Node.js 24.5
- pnpm package manager

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
make dev
```

3. View development logs:
```bash
make tail-log
```

4. Open your browser at [http://localhost:5173](http://localhost:5173)

## Available Scripts

- `make dev` - Start development environment using shoreman.sh
- `make tail-log` - View development logs
- `pnpm test` - Run all tests
- `pnpm test:unit` - Run unit tests
- `pnpm test:e2e` - Run E2E tests
- `pnpm format` - Format code with Prettier
- `pnpm lint` - Lint code
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

## Tech Stack

- **Framework**: SvelteKit 2.0+ with Svelte 5 (runes)
- **Styling**: TailwindCSS v4
- **Database**: Better-SQLite3
- **Authentication**: Better-Auth
- **Testing**: Vitest + Playwright
- **Build Tool**: Vite 7.x

## Project Structure

```
story-book/
├── src/
│   ├── routes/        # SvelteKit pages and API endpoints
│   ├── lib/           # Shared components and utilities
│   │   ├── auth/      # Authentication configuration
│   │   ├── db/        # Database schema
│   │   ├── components/# Reusable Svelte components
│   │   └── utils/     # Utility functions
│   └── app.html       # Main HTML template
├── data/              # SQLite database location
├── e2e/               # Playwright E2E tests
├── static/            # Static assets
└── scripts/           # Build and development scripts
```

## Development Notes

- Always use `make dev` to start the development server
- Check `make tail-log` for debugging (includes client-side logs)
- This project uses Svelte 5 with runes syntax
- Consult `CLAUDE.md` for detailed development guidelines

## Author

Kyran <kyran@kyrandale.com>
