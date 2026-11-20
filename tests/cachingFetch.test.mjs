
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const sourcePath = new URL(
  '../caching-fetch-library/cachingFetch.ts',
  import.meta.url
);

const source = readFileSync(sourcePath, 'utf8');

// Load the TypeScript library without changing the project.
const { outputFiles } = await build({
  entryPoints: [sourcePath.pathname],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});

const moduleUrl =
  'data:text/javascript;base64,' +
  Buffer.from(outputFiles[0].text).toString('base64');

const {
  preloadCachingFetch,
  serializeCache,
  initializeCache,
  wipeCache,
} = await import(moduleUrl);

const originalFetch = globalThis.fetch;

function mockFetch() {
  let calls = 0;

  globalThis.fetch = async () => {
    calls++;

    return {
      ok: true,
      json: async () => [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    };
  };

  return () => calls;
}

test('caching library exports the required functions', () => {
  for (const name of [
    'useCachingFetch',
    'preloadCachingFetch',
    'serializeCache',
    'initializeCache',
    'wipeCache',
  ]) {
    assert.match(source, new RegExp(`export const ${name}\\b`));
  }
});

test('repeated requests use cached data', async () => {
  wipeCache();
  const getCalls = mockFetch();

  try {
    await preloadCachingFetch('/api/people');
    await preloadCachingFetch('/api/people');

    assert.equal(getCalls(), 1);
  } finally {
    globalThis.fetch = originalFetch;
    wipeCache();
  }
});

test('concurrent requests share one API call', async () => {
  wipeCache();
  const getCalls = mockFetch();

  try {
    await Promise.all([
      preloadCachingFetch('/api/people'),
      preloadCachingFetch('/api/people'),
      preloadCachingFetch('/api/people'),
    ]);

    assert.equal(getCalls(), 1);
  } finally {
    globalThis.fetch = originalFetch;
    wipeCache();
  }
});

test('serialized cache can be restored', async () => {
  wipeCache();
  const getCalls = mockFetch();

  try {
    await preloadCachingFetch('/api/people');

    const serialized = serializeCache();

    wipeCache();
    initializeCache(serialized);

    await preloadCachingFetch('/api/people');

    assert.equal(getCalls(), 1);
  } finally {
    globalThis.fetch = originalFetch;
    wipeCache();
  }
});

test('clearing cache allows another API request', async () => {
  wipeCache();
  const getCalls = mockFetch();

  try {
    await preloadCachingFetch('/api/people');

    wipeCache();

    await preloadCachingFetch('/api/people');

    assert.equal(getCalls(), 2);
  } finally {
    globalThis.fetch = originalFetch;
    wipeCache();
  }
});
