# People Directory

A people directory built with React, TypeScript, Fastify, esbuild, and Mock Service Worker (MSW). It demonstrates shared client-side request caching, server-side data preloading, and cache hydration.

## Getting Started

### Prerequisites

- Node.js and npm
- A modern web browser

### Install and Run

```bash
npm install
npm start
```

The app runs at [http://localhost:3000](http://localhost:3000).

| Route | Description |
|---|---|
| `/` | Welcome page |
| `/appWithoutSSRData` | Client-side data fetching |
| `/appWithSSRData` | Server-side preloaded data |

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Builds and starts the server |
| `npm run typecheck` | Runs strict TypeScript checks without emitting files |
| `npm run build` | Builds the server and browser bundles with esbuild |
| `npm run check` | Runs `typecheck`, then `build` (use before commits) |

## Configuration Decisions

The existing esbuild setup was retained because it provides a lightweight build process for both the server and browser without introducing unnecessary tooling.

TypeScript was added as a development dependency to enable consistent type-checking. The existing strict TypeScript configuration was preserved to catch potential type errors early.

Two npm scripts were added:

- `typecheck` runs the TypeScript compiler without emitting files, separating type validation from bundling.
- `check` combines type-checking and building into one command, providing a repeatable validation step before commits or deployment.

I prioritized completing the caching library and establishing a reliable validation workflow over introducing additional tooling that could increase complexity within the assessment's time constraints.

## Project Structure

```text
application/            React components and data validation
caching-fetch-library/  Shared caching and fetch implementation
framework/client/       Browser runtime and hydration
framework/server/       Fastify server and server-side rendering
framework/mock-server/  MSW API mocks
dist/                   Build output (generated)
```

## How It Works

### Caching Fetch Library

The library lives in `caching-fetch-library/cachingFetch.ts` and exposes:

| Function | Purpose |
|---|---|
| `useCachingFetch(url)` | React hook returning `isLoading`, `data`, and `error` |
| `preloadCachingFetch(url)` | Fetches and caches data before server rendering |
| `serializeCache()` | Serializes the cache for transfer to the browser |
| `initializeCache(serializedCache)` | Restores the serialized cache in the browser |
| `wipeCache()` | Clears all cached state |

### Client-Side Caching

Responses are cached by URL. Components that request the same URL share one cached result, and a request already in flight is reused instead of firing a duplicate.

### Server-Side Rendering

The server preloads the directory data before rendering, so the HTML already contains the people list. The page works with JavaScript disabled.

### Cache Hydration

The server serializes its cache into the HTML response. The browser restores it before React hydrates, so components reuse the server's data and make no extra calls to the people API.

## Verified Behavior

Checked manually:

- Client-side route renders the directory with a single people API request
- SSR route renders the directory in the initial HTML
- SSR route renders correctly with JavaScript disabled
- No browser people API requests after SSR hydration
- `npm run typecheck` and `npm run build` pass
- `npm run check` completes successfully

## Known Limitations

- **Automated tests.** Five tests cover required exports, cache reuse, concurrent request deduplication, serialization and hydration, and cache clearing. All pass. Additional coverage for fetch failures and React hook behavior is recommended.
- **Open audit findings.** Dependency installation reported 2 moderate and 2 high vulnerabilities. These need case-by-case fixes; `npm audit fix --force` was skipped to avoid potentially breaking upgrades.
- **Simple cache lifecycle.** The cache currently has no expiration, invalidation policy, or memory limit. Server-side cache isolation should also be improved to prevent data sharing between concurrent requests. These are important considerations before production deployment.
- **Bundle size.** The server bundle is approximately 1.1 MB and the browser bundle approximately 452 KB. Code splitting and bundle analysis could help reduce both.
- **No CI.** A workflow running installation, type-checking, builds, and automated tests is a recommended next step once tests are implemented.
