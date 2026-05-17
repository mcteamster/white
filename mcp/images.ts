import { inflateSync } from 'node:zlib';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

function compressToRLE(pixels: Uint8Array, width: number, height: number): string {
  // Threshold to 1-bit: '1' = white, '0' = black
  // Then RLE encode, starting with white run
  const RLE: number[] = [];
  let currentColour = '1';
  let currentCount = 0;

  for (let i = 0; i < width * height; i++) {
    const bit = pixels[i] < 128 ? '0' : '1';

    if (currentCount === 55263) {
      RLE.push(55263, 0);
      currentCount = 0;
    }

    if (bit === currentColour) {
      currentCount++;
    } else {
      RLE.push(currentCount);
      currentCount = 1;
      currentColour = currentColour === '1' ? '0' : '1';
    }
  }
  RLE.push(currentCount);

  return RLE.map(run => String.fromCharCode(run + 32)).join('');
}

export function compressImageDataUri(dataUri: string): string {
  // Write input to a temp file
  const id = randomBytes(4).toString('hex');
  const inputPath = join(tmpdir(), `bwc_in_${id}.png`);
  const outputPath = join(tmpdir(), `bwc_out_${id}.raw`);

  try {
    // Strip data URI prefix and write binary
    const base64 = dataUri.replace(/^data:image\/[^;]+;base64,/, '');
    writeFileSync(inputPath, Buffer.from(base64, 'base64'));

    // ffmpeg: resize to cover 500x500, crop center, convert to 1-channel grayscale raw
    execSync(
      `ffmpeg -y -i "${inputPath}" -vf "scale=500:500:force_original_aspect_ratio=increase,crop=500:500,format=gray" -f rawvideo -pix_fmt gray "${outputPath}"`,
      { stdio: 'pipe' }
    );

    const pixels = new Uint8Array(readFileSync(outputPath));
    return compressToRLE(pixels, 500, 500);
  } finally {
    try { unlinkSync(inputPath); } catch {}
    try { unlinkSync(outputPath); } catch {}
  }
}

export function compressImageFromFile(imagePath: string): string {
  const id = randomBytes(4).toString('hex');
  const outputPath = join(tmpdir(), `bwc_out_${id}.raw`);

  try {
    execSync(
      `ffmpeg -y -i "${imagePath}" -vf "scale=500:500:force_original_aspect_ratio=increase,crop=500:500,format=gray" -f rawvideo -pix_fmt gray "${outputPath}"`,
      { stdio: 'pipe' }
    );

    const pixels = new Uint8Array(readFileSync(outputPath));
    return compressToRLE(pixels, 500, 500);
  } finally {
    try { unlinkSync(outputPath); } catch {}
  }
}
