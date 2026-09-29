/**
 * Returns the canonical chunk key string for a given zero-based chunk index.
 *
 * The formula maps index → first card number in that chunk (chunkIndex * 100 + 1),
 * then zero-pads to at least three digits:
 *   0  → "001"
 *   1  → "101"
 *   9  → "901"
 *   10 → "1001"
 */
export function chunkKey(chunkIndex: number): string {
  return String(chunkIndex * 100 + 1).padStart(3, '0');
}
