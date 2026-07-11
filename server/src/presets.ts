import { readFileSync } from "fs";
import { presetDecks } from "@mcteamster/white-core";

export interface PresetDeckConfig {
  key: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  refreshMs: number;
}

const REQUIRED_FIELDS: (keyof PresetDeckConfig)[] = ['key', 'name', 'description', 'icon', 'url', 'refreshMs'];

function validateConfig(data: unknown): PresetDeckConfig[] | null {
  if (!Array.isArray(data)) return null;
  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) return null;
    for (const field of REQUIRED_FIELDS) {
      if (!(field in entry)) return null;
    }
    if (typeof entry.key !== 'string' || typeof entry.name !== 'string' ||
        typeof entry.description !== 'string' || typeof entry.icon !== 'string' ||
        typeof entry.url !== 'string' || typeof entry.refreshMs !== 'number') {
      return null;
    }
  }
  return data as PresetDeckConfig[];
}

function refreshDeck(preset: PresetDeckConfig) {
  try {
    console.debug(`${new Date()} Refreshing Deck: ${preset.key}`);
    fetch(preset.url).then(async (res) => {
      if (res.ok) {
        presetDecks[preset.key] = await res.json();
      } else {
        console.warn(`[presets] Failed to refresh ${preset.key}: HTTP ${res.status}`);
      }
    }).catch((err) => {
      console.warn(`[presets] Failed to fetch ${preset.key}: ${err instanceof Error ? err.message : String(err)}`);
    });
    setTimeout(refreshDeck, preset.refreshMs, preset);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Load preset config from file, initialise cache, and start polling.
 * If the file is missing or invalid, no presets are loaded (blank only).
 * Returns the loaded config for use by the /presets route.
 */
export function loadPresets(configPath: string): PresetDeckConfig[] {
  let config: PresetDeckConfig[] = [];

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const validated = validateConfig(parsed);
    if (validated) {
      config = validated;
    } else {
      console.warn(`[presets] Invalid config in ${configPath} — missing required fields. No presets loaded.`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('ENOENT')) {
      console.warn(`[presets] Config file not found: ${configPath} — no presets loaded.`);
    } else {
      console.warn(`[presets] Failed to load ${configPath}: ${msg} — no presets loaded.`);
    }
  }

  // Initialise cache entries
  for (const preset of config) {
    presetDecks[preset.key] = { cards: [] };
  }

  // Start polling with staggered startup
  config.forEach((preset, i) => {
    setTimeout(refreshDeck, 1000 * 5 * (i + 1), preset);
  });

  return config;
}
