// FPL API Client with caching and zod validation
// All FPL requests happen server-side

import { z } from 'zod';
import { CONFIG, type Config } from './config';
import {
  BootstrapStaticSchema,
  FixtureSchema,
  EntrySchema,
  PicksResponseSchema,
  TransferSchema,
  type BootstrapStatic,
  type Fixture,
  type Entry,
  type PicksResponse,
  type Transfer,
} from './schemas';

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string, ttl: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new Cache();

async function fetchWithValidation<T>(
  url: string,
  schema: z.ZodSchema<T>,
  cacheKey: string,
  ttl: number,
  bypassCache = false
): Promise<T> {
  // Check cache first
  if (!bypassCache) {
    const cached = cache.get<T>(cacheKey, ttl);
    if (cached) return cached;
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': CONFIG.API.USER_AGENT,
    },
    // Next.js cache control - we handle caching ourselves
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`FPL API error: ${response.status} ${response.statusText} for ${url}`);
  }

  const json = await response.json();
  
  // Validate with zod
  const result = schema.safeParse(json);
  if (!result.success) {
    const missingFields = result.error.errors.map(e => e.path.join('.')).join(', ');
    console.error(`FPL API validation failed for ${url}:`, result.error.errors);
    throw new Error(`FPL API response validation failed for ${url}. Missing/changed fields: ${missingFields}`);
  }

  // Cache the validated data
  cache.set(cacheKey, result.data);
  return result.data;
}

export async function getBootstrapStatic(bypassCache = false): Promise<BootstrapStatic> {
  return fetchWithValidation<BootstrapStatic>(
    `${CONFIG.API.BASE_URL}/bootstrap-static/`,
    BootstrapStaticSchema,
    'bootstrap-static',
    CONFIG.CACHE.BOOTSTRAP_STATIC,
    bypassCache
  );
}

export async function getFixtures(bypassCache = false): Promise<Fixture[]> {
  return fetchWithValidation<Fixture[]>(
    `${CONFIG.API.BASE_URL}/fixtures/`,
    z.array(FixtureSchema),
    'fixtures',
    CONFIG.CACHE.FIXTURES,
    bypassCache
  );
}

export async function getEntry(entryId: number, bypassCache = false): Promise<Entry> {
  return fetchWithValidation<Entry>(
    `${CONFIG.API.BASE_URL}/entry/${entryId}/`,
    EntrySchema,
    `entry-${entryId}`,
    CONFIG.CACHE.BOOTSTRAP_STATIC, // Same TTL as bootstrap
    bypassCache
  );
}

export async function getPicks(entryId: number, gameweek: number, bypassCache = false): Promise<PicksResponse> {
  return fetchWithValidation<PicksResponse>(
    `${CONFIG.API.BASE_URL}/entry/${entryId}/event/${gameweek}/picks/`,
    PicksResponseSchema,
    `picks-${entryId}-${gameweek}`,
    CONFIG.CACHE.TEAM_PICKS,
    bypassCache
  );
}

export async function getTransfers(entryId: number, bypassCache = false): Promise<Transfer[]> {
  return fetchWithValidation<Transfer[]>(
    `${CONFIG.API.BASE_URL}/entry/${entryId}/transfers/`,
    z.array(TransferSchema),
    `transfers-${entryId}`,
    CONFIG.CACHE.BOOTSTRAP_STATIC,
    bypassCache
  );
}

// Helper to get the relevant gameweek (current or next)
export function getRelevantGameweek(events: BootstrapStatic['events']): BootstrapStatic['events'][0] {
  const nextGw = events.find(e => e.is_next);
  const currentGw = events.find(e => e.is_current);
  const finishedGws = events.filter(e => e.finished).sort((a, b) => b.id - a.id);
  
  // Prefer next, then current, then most recent finished
  return nextGw || currentGw || finishedGws[0];
}

export function clearCache(): void {
  cache.clear();
}