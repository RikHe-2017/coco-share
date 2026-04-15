import type { AnyOption } from "./option-def.js";

function assertAsciiShort(short: string, optionId: string): void {
  if (short.length !== 1) {
    throw new Error(`选项 ${optionId} 的 short 必须是单个 ASCII 字符。`);
  }
  if (!/[a-zA-Z]/.test(short)) {
    throw new Error(`选项 ${optionId} 的 short 必须是 a-zA-Z。`);
  }
}

export class OptionRegistry {
  readonly options: readonly AnyOption[];
  private readonly longToId = new Map<string, AnyOption>();
  private readonly shortToOption = new Map<string, AnyOption>();

  constructor(options: readonly AnyOption[]) {
    this.options = options;
    for (const opt of options) {
      if (opt.aliases.length === 0) {
        throw new Error(`选项 ${opt.id} 至少需要一个 long 别名。`);
      }
      for (const a of opt.aliases) {
        if (a === "") {
          throw new Error(`选项 ${opt.id} 存在空的 long 别名。`);
        }
        if (a.startsWith("-")) {
          throw new Error(`long 别名不应包含前导 “-”：${a}`);
        }
        const prev = this.longToId.get(a);
        if (prev !== undefined) {
          throw new Error(`long 别名冲突：--${a}（${prev.id} 与 ${opt.id}）`);
        }
        this.longToId.set(a, opt);
      }
      if (opt.short !== undefined) {
        assertAsciiShort(opt.short, opt.id);
        const prevS = this.shortToOption.get(opt.short);
        if (prevS !== undefined) {
          throw new Error(
            `short 别名冲突：-${opt.short}（${prevS.id} 与 ${opt.id}）`,
          );
        }
        this.shortToOption.set(opt.short, opt);
      }
    }
  }

  getByLong(name: string): AnyOption | undefined {
    return this.longToId.get(name);
  }

  getByShort(ch: string): AnyOption | undefined {
    return this.shortToOption.get(ch);
  }
}
