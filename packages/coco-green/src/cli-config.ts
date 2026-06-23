import {
  createCliParser,
  enumOption,
  flagOption,
  numberOption,
  stringListOption,
  stringOption,
} from "@coco-share/coco-cli";

export const GREEN_CLI_DEFS = [
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
  numberOption("port", {
    aliases: ["port"],
    short: "p",
    description: "HTTP 监听端口",
    default: 3001,
    min: 1,
    max: 65535,
    valueLabel: "端口",
  }),
  stringOption("path", {
    aliases: ["path"],
    description:
      "要分享的Skills 根目录（绝对路径）。提供该参数后将不再交互询问。",
    optional: true,
    valueLabel: "目录",
  }),
  stringListOption("skill", {
    aliases: ["skill"],
    short: "s",
    description:
      "要分享的技能名（可重复传入或逗号分隔）。提供至少一个后将跳过主动模式下的技能选择，并默认按主动模式分享。",
    valueLabel: "技能名",
  }),
  stringListOption("agent", {
    aliases: ["agent"],
    short: "a",
    description:
      "主动模式下接收方目标 Agent（可重复传入或逗号分隔：cursor | claudeCode | codex）。提供至少一个后将跳过目标 Agent 选择。",
    valueLabel: "agent",
  }),
  stringOption("installPath", {
    aliases: ["install-path"],
    description:
      "主动模式下接收方安装路径：global 表示全局安装；其他值表示自定义安装根目录。",
    optional: true,
    valueLabel: "路径",
  }),
  enumOption("mode", {
    aliases: ["mode"],
    short: "m",
    description:
      "分享模式（必填其一：命令行提供，或在启动后交互选择）。active=仅暴露所选技能并生成安装命令；passive=暴露目录下全部技能。",
    values: ["active", "passive"],
    optional: true,
    valueLabel: "模式",
  }),
] as const;

export const greenCli = createCliParser(GREEN_CLI_DEFS);
