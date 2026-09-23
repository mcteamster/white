import { readFileSync } from "fs";
import type { BoosterPackConfig } from "@mcteamster/white-core";

export type { BoosterPackConfig };

const REQUIRED_FIELDS = ['key', 'name', 'description', 'icon', 'cardCount', 'price', 'currency', 'theme'] as const;

function validateBoosterConfig(data: unknown): BoosterPackConfig[] | null {
  if (!Array.isArray(data)) return null;
  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) return null;
    for (const field of REQUIRED_FIELDS) {
      if (!(field in entry)) return null;
    }
    if (
      typeof entry.key !== 'string' ||
      typeof entry.name !== 'string' ||
      typeof entry.description !== 'string' ||
      typeof entry.icon !== 'string' ||
      typeof entry.cardCount !== 'number' ||
      typeof entry.price !== 'number' ||
      typeof entry.currency !== 'string' ||
      typeof entry.theme !== 'string'
    ) {
      return null;
    }
    if (entry.cardCount < 1 || entry.cardCount > 100) {
      console.warn(`[boosters] Pack "${entry.key}" has out-of-range cardCount ${entry.cardCount} — must be 1–100`);
      return null;
    }
  }
  return data as BoosterPackConfig[];
}

/**
 * Load booster pack config from file.
 * If the file is missing or invalid, an empty catalog is returned and the
 * server starts normally. Mirrors the loadPresets pattern.
 */
export function loadBoosters(configPath: string): BoosterPackConfig[] {
  let config: BoosterPackConfig[] = [];

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const validated = validateBoosterConfig(parsed);
    if (validated) {
      config = validated;
      console.info(`[boosters] Loaded ${config.length} booster pack(s) from ${configPath}`);
    } else {
      console.warn(`[boosters] Invalid config in ${configPath} — missing required fields or bad values. Empty catalog.`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('ENOENT')) {
      console.warn(`[boosters] Config file not found: ${configPath} — empty catalog (boosters disabled).`);
    } else {
      console.warn(`[boosters] Failed to load ${configPath}: ${msg} — empty catalog.`);
    }
  }

  return config;
}
