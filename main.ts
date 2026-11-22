// make.fun news-image entry program for handing entry.png to the judge.
// Enforces PNG signature, IHDR dimensions (1..1024 px), and a 1,048,576-byte size cap.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_DIMENSION = 1024;
const MAX_FILE_SIZE_IN_BYTES = 1_048_576;
const PNG_SIGNATURE: Buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const repoRoot: string = dirname(fileURLToPath(import.meta.url));
const outputDir: string = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const entryPath: string = join(repoRoot, "entry.png");

let bytes: Buffer;
try {
  bytes = readFileSync(entryPath);
} catch (error: unknown) {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    throw new Error(`Missing entry.png at expected path: ${entryPath}`);
  }
  throw new Error(
    `Failed to read entry.png at ${entryPath}: ${error instanceof Error ? error.message : String(error)}`,
  );
}

/** Verify PNG signature, IHDR dimensions, and byte size, returning verified width and height. */
function verifyPng(bytes: Buffer, entryPath: string): { width: number; height: number } {
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`Invalid PNG file at ${entryPath}: missing PNG signature`);
  }

  if (bytes.length < 24 || bytes.readUInt32BE(8) < 13 || bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`Invalid PNG file at ${entryPath}: missing or truncated IHDR chunk`);
  }

  const width: number = bytes.readUInt32BE(16);
  const height: number = bytes.readUInt32BE(20);

  if (width < 1 || width > MAX_DIMENSION) {
    throw new Error(`Invalid PNG width ${width}: must be between 1 and ${MAX_DIMENSION}`);
  }

  if (height < 1 || height > MAX_DIMENSION) {
    throw new Error(`Invalid PNG height ${height}: must be between 1 and ${MAX_DIMENSION}`);
  }

  if (bytes.length > MAX_FILE_SIZE_IN_BYTES) {
    throw new Error(
      `PNG file size ${bytes.length} bytes exceeds maximum of ${MAX_FILE_SIZE_IN_BYTES} bytes`,
    );
  }

  return { width, height };
}

const { width, height } = verifyPng(bytes, entryPath);
const outputPath: string = join(outputDir, "entry.png");

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, bytes);

console.log(`Handed entry.png (${width}x${height}, ${bytes.length} bytes) to ${outputPath}.`);
