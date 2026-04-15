/**
 * PowerShell 单引号字符串转义：将 ' 写成 ''。
 */
export function quotePowerShellSingleQuotedArg(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function formatBlueInviteCliCommand(opts: {
  readonly hostPort: string;
  readonly skillNames: readonly string[];
}): string {
  const parts: string[] = [
    "npx",
    "@coco-share/coco-blue",
    `--ip=${quotePowerShellSingleQuotedArg(opts.hostPort)}`,
  ];
  for (const name of opts.skillNames) {
    parts.push(`--skill=${quotePowerShellSingleQuotedArg(name)}`);
  }
  return parts.join(" ");
}
