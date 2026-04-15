export interface GreenCliArgs {
  port: number;
  path?: string;
}

export function parseGreenArgs(argv: string[]): GreenCliArgs {
  let port = 3001;
  let pathOverride: string | undefined;

  for (const raw of argv) {
    if (raw.startsWith("--port=")) {
      const n = Number(raw.slice("--port=".length));
      if (!Number.isInteger(n) || n <= 0 || n > 65535) {
        throw new Error(`无效的 --port 参数：${raw}`);
      }
      port = n;
    } else if (raw.startsWith("--path=")) {
      pathOverride = raw.slice("--path=".length);
    }
  }

  const out: GreenCliArgs = { port };
  if (pathOverride !== undefined) {
    out.path = pathOverride;
  }
  return out;
}
