/**
 * Booster pack catalog config loader for the api/ (CDK/Lambda) deployment.
 *
 * Reads pack definitions from CDK context key `boosterPacksConfig` as a JSON string,
 * or from the environment variable BOOSTERS_CONFIG as a JSON string.
 * Falls back to an empty catalog on any error.
 */

export interface BoosterPackConfig {
  key: string;
  name: string;
  description: string;
  icon: string;
  cardCount: number;
  price: number;
  currency: string;
  theme: string;
}

const REQUIRED_FIELDS = ['key', 'name', 'description', 'icon', 'cardCount', 'price', 'currency', 'theme'] as const;

function validateBoosterConfig(data: unknown): BoosterPackConfig[] | null {
  if (!Array.isArray(data)) return null;
  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) return null;
    for (const field of REQUIRED_FIELDS) {
      if (!(field in entry)) return null;
    }
    if (
      typeof entry.key !== 'string' || typeof entry.name !== 'string' ||
      typeof entry.description !== 'string' || typeof entry.icon !== 'string' ||
      typeof entry.cardCount !== 'number' || typeof entry.price !== 'number' ||
      typeof entry.currency !== 'string' || typeof entry.theme !== 'string'
    ) return null;
    if (entry.cardCount < 1 || entry.cardCount > 100) return null;
  }
  return data as BoosterPackConfig[];
}

let _cachedConfig: BoosterPackConfig[] | null = null;

/**
 * Load and cache booster pack config from environment.
 * BOOSTERS_CONFIG env var should be a JSON array string.
 * Returns empty array on any error.
 */
export function getBoosterConfig(): BoosterPackConfig[] {
  if (_cachedConfig !== null) return _cachedConfig;

  const raw = process.env.BOOSTERS_CONFIG;
  if (!raw) {
    console.warn('[boosters] BOOSTERS_CONFIG not set — empty catalog');
    _cachedConfig = [];
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    const validated = validateBoosterConfig(parsed);
    if (validated) {
      _cachedConfig = validated;
      console.info(`[boosters] Loaded ${validated.length} pack(s) from BOOSTERS_CONFIG`);
    } else {
      console.warn('[boosters] BOOSTERS_CONFIG invalid — empty catalog');
      _cachedConfig = [];
    }
  } catch (e: unknown) {
    console.warn(`[boosters] Failed to parse BOOSTERS_CONFIG: ${e instanceof Error ? e.message : String(e)} — empty catalog`);
    _cachedConfig = [];
  }

  return _cachedConfig;
}
