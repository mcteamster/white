/**
 * Shared card content and image validators.
 * Mirrors the constraints enforced in api/handlers/submitCard.ts.
 * Used by both the submitCard API path and booster fulfillment.
 */

export interface CardContent {
  title: string;
  description: string;
  author: string;
  image?: string;
  date?: string | number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Expected checksum for a valid compressed 1-bit image */
const VALID_IMAGE_CHECKSUM = 250000;

/**
 * Validate a card's content fields.
 * title: 1–50 chars
 * description: 1–140 chars
 * author: 1–25 chars
 * image: if present, must be compressed 1-bit format (not data:image/ PNG URI)
 */
export function validateCardContent(content: CardContent): ValidationResult {
  if (!content.title || content.title.length < 1 || content.title.length > 50) {
    return { valid: false, error: `Invalid title length: ${content.title?.length ?? 0} (must be 1–50)` };
  }
  if (!content.description || content.description.length < 1 || content.description.length > 140) {
    return { valid: false, error: `Invalid description length: ${content.description?.length ?? 0} (must be 1–140)` };
  }
  if (!content.author || content.author.length < 1 || content.author.length > 25) {
    return { valid: false, error: `Invalid author length: ${content.author?.length ?? 0} (must be 1–25)` };
  }
  if (content.image !== undefined) {
    const imageResult = validateCardImage(content.image);
    if (!imageResult.valid) return imageResult;
  }
  return { valid: true };
}

/**
 * Validate a card image string.
 * Rejects data:image/ PNG data URIs.
 * Validates the compressed 1-bit format checksum.
 */
export function validateCardImage(image: string): ValidationResult {
  if (image.startsWith('data:image/')) {
    return { valid: false, error: 'PNG data URIs are not accepted — image must be in compressed 1-bit format' };
  }
  const checksum = image.split('').reduce((total, char) => total + (char.charCodeAt(0) - 32), 0);
  if (checksum !== VALID_IMAGE_CHECKSUM) {
    return { valid: false, error: `Invalid image checksum: ${checksum} (expected ${VALID_IMAGE_CHECKSUM})` };
  }
  return { valid: true };
}
