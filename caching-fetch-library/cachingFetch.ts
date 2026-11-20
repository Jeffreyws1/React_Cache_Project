import { useEffect, useSyncExternalStore } from 'react';

type UseCachingFetch = (url: string) => {
  isLoading: boolean;
  data: unknown;
  error: Error | null;
};

type CacheEntry = ReturnType<UseCachingFetch>;

const loading: CacheEntry = { isLoading: true, data: null, error: null };
const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();

function notify(url: string): void {
  listeners.get(url)?.forEach((listener) => listener());
}

function subscribe(url: string, listener: () => void): () => void {
  let subscribers = listeners.get(url);
  if (!subscribers) {
    subscribers = new Set();
    listeners.set(url, subscribers);
  }
  subscribers.add(listener);
  return () => {
    subscribers!.delete(listener);
    if (subscribers!.size === 0) listeners.delete(url);
  };
}

function getSnapshot(url: string): CacheEntry {
  return cache.get(url) ?? loading;
}

function fetchOnce(url: string): Promise<void> {
  const existing = pending.get(url);
  if (existing) return existing;
  const cached = cache.get(url);
  if (cached && !cached.isLoading) return Promise.resolve();

  const request = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const data: unknown = await response.json();
      cache.set(url, { isLoading: false, data, error: null });
    } catch (reason) {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      cache.set(url, { isLoading: false, data: null, error });
    } finally {
      pending.delete(url);
      notify(url);
    }
  })();
  pending.set(url, request);
  return request;
}

export const useCachingFetch: UseCachingFetch = (url) => {
  const snapshot = useSyncExternalStore(
    (listener) => subscribe(url, listener),
    () => getSnapshot(url),
    () => getSnapshot(url),
  );

  useEffect(() => {
    void fetchOnce(url);
  }, [url]);

  return snapshot;
};

export const preloadCachingFetch = async (url: string): Promise<void> => {
  await fetchOnce(url);
  const result = getSnapshot(url);
  if (result.error) throw result.error;
};

export const serializeCache = (): string => {
  const entries = [...cache.entries()]
    .filter(([, value]) => !value.isLoading && value.error === null)
    .map(([url, value]) => [url, value.data]);
  // URI encoding keeps the JSON safe inside the framework's quoted script.
  return encodeURIComponent(JSON.stringify(entries)).replace(/'/g, '%27');
};

export const initializeCache = (serializedCache: string): void => {
  const entries = JSON.parse(decodeURIComponent(serializedCache)) as [string, unknown][];
  cache.clear();
  pending.clear();
  for (const [url, data] of entries) {
    cache.set(url, { isLoading: false, data, error: null });
    notify(url);
  }
};

export const wipeCache = (): void => {
  cache.clear();
  pending.clear();
  listeners.forEach((subscribers) => subscribers.forEach((listener) => listener()));
};
