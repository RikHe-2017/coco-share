export interface BlueCliArgs {
  ip?: string;
  path?: string;
}

export function parseBlueArgs(argv: string[]): BlueCliArgs {
  let ip: string | undefined;
  let pathOverride: string | undefined;

  for (const raw of argv) {
    if (raw.startsWith("--ip=")) {
      ip = raw.slice("--ip=".length);
    } else if (raw.startsWith("--path=")) {
      pathOverride = raw.slice("--path=".length);
    }
  }

  const out: BlueCliArgs = {};
  if (ip !== undefined) {
    out.ip = ip;
  }
  if (pathOverride !== undefined) {
    out.path = pathOverride;
  }
  return out;
}
