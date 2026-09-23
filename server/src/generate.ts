import { validateCardContent, validateCardImage, type CardContent } from '@mcteamster/white-core';

/**
 * AI generation adapter for booster pack card generation.
 *
 * Generates cards matching a pack theme using an AI text provider.
 * In production, wire to an OpenAI/Anthropic/etc. API via environment variables.
 * In sandbox/test mode (no API key configured), returns stub cards.
 */

export interface GeneratedCard {
  title: string;
  description: string;
  author: string;
  image?: string;
}

/**
 * Generate a batch of themed cards.
 * - Uses the AI provider configured via env (AI_API_KEY, AI_API_BASE, AI_MODEL).
 * - Falls back to stub cards if no provider is configured (sandbox/test mode).
 * - Each card is validated; invalid cards are not included (caller retries).
 */
export async function generateCards(
  theme: string,
  count: number,
  packKey: string,
): Promise<GeneratedCard[]> {
  const apiKey = process.env.AI_API_KEY;
  const apiBase = process.env.AI_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    // Sandbox mode: return deterministic stub cards for testing
    return generateStubCards(theme, count, packKey);
  }

  // Production: call AI provider
  const prompt = buildGenerationPrompt(theme, count, packKey);

  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(`AI provider returned HTTP ${response.status}`);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const content = JSON.parse(data.choices[0].message.content) as { cards: GeneratedCard[] };

    if (!Array.isArray(content.cards)) {
      throw new Error('AI response did not contain a cards array');
    }

    return content.cards.slice(0, count);
  } catch (err) {
    console.error(`[boosters] AI generation failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

const SYSTEM_PROMPT = `You generate content for "Blank White Cards", a creative card game where players write cards with funny, creative, or thought-provoking rules and scenarios. Each card has a title (1-50 chars), a description/rule (1-140 chars), and an author attribution.

Generate cards as a JSON object: { "cards": [ { "title": "...", "description": "...", "author": "..." }, ... ] }

Keep titles concise and punchy. Descriptions are card rules or scenarios — playful, creative, and on-theme. Author should be the pack key (max 25 chars).`;

function buildGenerationPrompt(theme: string, count: number, packKey: string): string {
  return `Generate exactly ${count} Blank White Cards themed around: "${theme}".

The author for all cards should be "${packKey.slice(0, 25)}".

Return JSON: { "cards": [ { "title": "...", "description": "...", "author": "..." } ] }`;
}

/**
 * Generate stub cards for sandbox/test mode.
 * Cards have deterministic content based on theme and index.
 */
function generateStubCards(theme: string, count: number, packKey: string): GeneratedCard[] {
  const author = packKey.slice(0, 25);
  const cards: GeneratedCard[] = [];
  for (let i = 0; i < count; i++) {
    const title = `${theme} Card ${i + 1}`.slice(0, 50);
    const description = `A themed card from the ${theme} booster pack. Card ${i + 1} of ${count}.`.slice(0, 140);
    cards.push({ title, description, author });
  }
  return cards;
}

/**
 * Validate a generated card's content.
 * Returns the validation result from the shared validator.
 */
export function validateGeneratedCard(card: GeneratedCard): { valid: boolean; error?: string } {
  const content: CardContent = {
    title: card.title,
    description: card.description,
    author: card.author,
    image: card.image,
  };
  return validateCardContent(content);
}

/**
 * Validate a generated card image.
 * If the image is a data:image/ URI, drops it (returns card without image).
 * If the image fails the 1-bit checksum, drops it.
 */
export function sanitiseGeneratedImage(card: GeneratedCard): GeneratedCard {
  if (!card.image) return card;
  const result = validateCardImage(card.image);
  if (!result.valid) {
    console.warn(`[boosters] Dropping invalid image: ${result.error}`);
    return { ...card, image: undefined };
  }
  return card;
}
