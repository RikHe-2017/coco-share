import fs from "node:fs/promises";
import path from "node:path";

import { unzipSync } from "fflate";

export async function extractZipBufferToDir(
  buffer: Buffer,
  destDir: string,
): Promise<void> {
  const data = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const files = unzipSync(data);
  for (const [relPath, contents] of Object.entries(files)) {
    if (relPath.endsWith("/")) {
      continue;
    }
    const target = path.join(destDir, relPath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents);
  }
}
