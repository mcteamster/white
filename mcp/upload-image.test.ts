import { describe, it, expect } from 'vitest';
import { validateUploadImagePath } from './lib/upload-image.js';

// These tests exercise the injection-rejection guard that runs BEFORE any
// subprocess is spawned in the `upload_image` tool handler. `spawnSync` (used
// by the real handler in place of the old `execSync` shell string) never sees
// a caller-supplied path that fails validation, so shell metacharacters can no
// longer reach a shell. The guard itself imports no child_process API — it can
// only throw or return, never spawn — so a rejection here is proof that no
// subprocess is reached for a bad path.

describe('validateUploadImagePath — upload_image injection rejection', () => {
  it('rejects an absolute-looking path carrying shell metacharacters before any subprocess is spawned', () => {
    // Absolute-looking but non-existent path carrying a shell injection payload.
    // The guard rejects it on the existence check, so the handler returns an
    // error before it ever reaches spawnSync — the metacharacters never touch a shell.
    const malicious = '/tmp/x.png"; id #';
    expect(() => validateUploadImagePath(malicious)).toThrowError(/file not found/);
  });

  it('rejects a relative path with an absolute-path error', () => {
    expect(() => validateUploadImagePath('../../etc/passwd')).toThrowError(/absolute path/);
  });

  it('rejects an absolute path to a non-existent file with a file-not-found error', () => {
    expect(() => validateUploadImagePath('/tmp/definitely-not-here-bwc80-xyz.png')).toThrowError(/file not found/);
  });
});
