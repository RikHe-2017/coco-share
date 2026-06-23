function quoteArg(value: string): string {
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) {
    return value;
  }
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}

export interface BlueInviteCliCommandOptions {
  readonly hostPort: string;
  readonly skillNames?: readonly string[];
  readonly agents?: readonly string[];
  readonly installPath?: string;
}

export function formatBlueInviteCliCommand(opts: BlueInviteCliCommandOptions): string {
  const parts: string[] = [
    "npx",
    "@coco-share/coco-blue",
    `--ip=${quoteArg(opts.hostPort)}`,
  ];
  if (opts.skillNames) {
    for (const name of opts.skillNames) {
      parts.push(`--skill=${quoteArg(name)}`);
    }
  }
  if (opts.agents) {
    for (const agent of opts.agents) {
      parts.push(`--agent=${quoteArg(agent)}`);
    }
  }
  if (opts.installPath !== undefined) {
    parts.push(`-p=${quoteArg(opts.installPath)}`);
  }
  return parts.join(" ");
}
