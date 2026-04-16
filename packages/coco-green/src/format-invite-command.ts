function quoteArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function formatBlueInviteCliCommand(opts: {
  readonly hostPort: string;
  readonly skillNames?: readonly string[];
}): string {
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
  return parts.join(" ");
}
