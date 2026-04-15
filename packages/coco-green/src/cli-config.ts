import {
  createCliParser,
  enumOption,
  flagOption,
  numberOption,
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
