import {
  createCliParser,
  flagOption,
  stringListOption,
  stringOption,
} from "@coco-share/coco-cli";

export const BLUE_CLI_DEFS = [
  flagOption("help", {
    aliases: ["help"],
    short: "h",
    description: "显示帮助并退出",
  }),
  flagOption("version", {
    aliases: ["version"],
    short: "v",
    description: "显示版本并退出",
  }),
  stringOption("ip", {
    aliases: ["ip", "host", "server"],
    short: "i",
    description:
      "coco-green 地址（host:port 或 http://host:port）。提供后将不再交互询问。",
    optional: true,
    valueLabel: "地址",
  }),
  stringOption("path", {
    aliases: ["path", "install-dir", "dir"],
    short: "p",
    description:
      "安装路径：global 表示全局安装；其他值表示自定义安装根目录（支持相对或绝对路径）。提供后将不再交互询问。",
    optional: true,
    valueLabel: "路径",
  }),
  stringListOption("skill", {
    aliases: ["skill"],
    short: "s",
    description:
      "要安装的技能名（可重复传入或逗号分隔）。提供至少一个后将不再交互选择技能。",
    valueLabel: "技能名",
  }),
  stringListOption("agent", {
    aliases: ["agent"],
    short: "a",
    description:
      "目标 Agent（可重复传入或逗号分隔：cursor | claudeCode | codex）。提供至少一个后将不再交互选择。",
    valueLabel: "agent",
  }),
] as const;

export const blueCli = createCliParser(BLUE_CLI_DEFS);
