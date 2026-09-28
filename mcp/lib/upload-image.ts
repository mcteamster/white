import { statSync } from 'node:fs';
import { isAbsolute } from 'node:path';

// Shared ffmpeg filter for square-crop + 500x500 + 1-bit gray line-art normalisation.
// Passed as a single spawnSync argument (no shell), so the commas/quotes are ffmpeg
// filter syntax, never shell tokens.
export const IMAGE_FILTER =
  "crop=min(iw\\,ih):min(iw\\,ih),scale=500:500,format=gray,lut=c0='if(val,if(gt(val\\,127)\\,255\\,0)\\,0)'";

/**
 * Validate a caller-supplied file path for the `upload_image` tool before any
 * subprocess is spawned. Rejects non-absolute paths and paths that do not
 * reference an existing regular file. Throws a descriptive Error on failure;
 * the caller's try/finally surfaces the message to the MCP caller.
 *
 * Lives in its own module (with no game-engine imports) so the injection-rejection
 * paths can be unit-tested without ffmpeg or the full MCP server.
 */
export function validateUploadImagePath(file_path: string): void {
  if (!isAbsolute(file_path)) {
    throw new Error(`file_path must be an absolute path (got: ${JSON.stringify(file_path)})`);
  }
  const st = statSync(file_path, { throwIfNoEntry: false });
  if (!st) {
    throw new Error(`file not found: ${file_path}`);
  }
  if (!st.isFile()) {
    throw new Error(`file_path must reference a regular file: ${file_path}`);
  }
}
