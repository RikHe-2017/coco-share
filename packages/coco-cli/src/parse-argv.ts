import type { AnyOption } from "./option-def.js";
import { OptionRegistry } from "./registry.js";
import type { InferCliValues } from "./shape.js";

interface MutableValues {
  flags: Record<string, boolean>;
  strings: Record<string, string | undefined>;
  numbers: Record<string, number | undefined>;
  enums: Record<string, string | undefined>;
  lists: Record<string, string[]>;
}

function wantsValue(opt: AnyOption): boolean {
  return opt.kind !== "flag";
}

function parseIntStrict(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  if (!/^-?\d+$/.test(t)) return undefined;
  const n = Number(t);
  if (!Number.isSafeInteger(n)) return undefined;
  return n;
}

function takeLongEquals(raw: string): { name: string; value: string | undefined } {
  const eq = raw.indexOf("=");
  if (eq === -1) {
    return { name: raw.slice(2), value: undefined };
  }
  return {
    name: raw.slice(2, eq),
    value: raw.slice(eq + 1),
  };
}

function takeShortEquals(raw: string): { chars: string; value: string | undefined } {
  const rest = raw.slice(1);
  const eq = rest.indexOf("=");
  if (eq === -1) {
    return { chars: rest, value: undefined };
  }
  return {
    chars: rest.slice(0, eq),
    value: rest.slice(eq + 1),
  };
}

export type ParseArgvOutcome<T> =
  | { ok: true; values: T }
  | { ok: false; message: string };

export function parseArgv<const T extends readonly AnyOption[]>(
  argv: string[],
  defs: T,
): ParseArgvOutcome<InferCliValues<T>> {
  const registry = new OptionRegistry(defs);
  const state: MutableValues = {
    flags: Object.create(null) as Record<string, boolean>,
    strings: Object.create(null) as Record<string, string | undefined>,
    numbers: Object.create(null) as Record<string, number | undefined>,
    enums: Object.create(null) as Record<string, string | undefined>,
    lists: Object.create(null) as Record<string, string[]>,
  };

  const setFlag = (id: string): void => {
    state.flags[id] = true;
  };

  const setString = (id: string, value: string): void => {
    state.strings[id] = value;
  };

  const setNumber = (id: string, value: number): void => {
    state.numbers[id] = value;
  };

  const setEnum = (id: string, value: string): void => {
    state.enums[id] = value;
  };

  const pushList = (id: string, value: string): void => {
    const cur = state.lists[id];
    if (cur === undefined) {
      state.lists[id] = [value];
    } else {
      cur.push(value);
    }
  };

  const consumeValue = (
    opt: AnyOption,
    value: string | undefined,
    argv: string[],
    i: number,
  ): { nextIndex: number } | { error: string } => {
    let v = value;
    let next = i + 1;
    if (v === undefined) {
      const nextRaw = argv[next];
      if (nextRaw === undefined) {
        return { error: `缺少 ${formatOptionLabel(opt)} 的值。` };
      }
      if (nextRaw.startsWith("-") && nextRaw !== "-") {
        return { error: `缺少 ${formatOptionLabel(opt)} 的值（下一个参数以 “-” 开头）。` };
      }
      v = nextRaw;
      next += 1;
    }
    return applyValue(opt, v, { nextIndex: next });
  };

  const applyValue = (
    opt: AnyOption,
    rawValue: string,
    advance: { nextIndex: number },
  ): { nextIndex: number } | { error: string } => {
    switch (opt.kind) {
      case "flag": {
        return { error: "内部错误：flag 不应携带值。" };
      }
      case "string": {
        setString(opt.id, rawValue);
        return { nextIndex: advance.nextIndex };
      }
      case "number": {
        const n = parseIntStrict(rawValue);
        if (n === undefined) {
          return { error: `${formatOptionLabel(opt)} 需要整数，收到：${rawValue}` };
        }
        if (opt.min !== undefined && n < opt.min) {
          return { error: `${formatOptionLabel(opt)} 不能小于 ${String(opt.min)}。` };
        }
        if (opt.max !== undefined && n > opt.max) {
          return { error: `${formatOptionLabel(opt)} 不能大于 ${String(opt.max)}。` };
        }
        setNumber(opt.id, n);
        return { nextIndex: advance.nextIndex };
      }
      case "enum": {
        if (!opt.values.includes(rawValue)) {
          return {
            error: `${formatOptionLabel(opt)} 必须是 ${opt.values.join(" | ")} 之一，收到：${rawValue}`,
          };
        }
        setEnum(opt.id, rawValue);
        return { nextIndex: advance.nextIndex };
      }
      case "stringList": {
        pushList(opt.id, rawValue);
        return { nextIndex: advance.nextIndex };
      }
    }
  };

  let i = 0;
  while (i < argv.length) {
    const raw = argv[i];
    if (raw === undefined) break;

    if (!raw.startsWith("-") || raw === "-") {
      return { ok: false, message: `无法解析的参数：${raw}` };
    }

    if (raw.startsWith("--")) {
      const { name, value } = takeLongEquals(raw);
      if (name === "") {
        return { ok: false, message: "无效的 long 选项。" };
      }
      const opt = registry.getByLong(name);
      if (opt === undefined) {
        return { ok: false, message: `未知选项：--${name}` };
      }

      if (opt.kind === "flag") {
        if (value !== undefined) {
          return { ok: false, message: `--${name} 不需要值。` };
        }
        setFlag(opt.id);
        i += 1;
        continue;
      }

      const r = consumeValue(opt, value, argv, i);
      if ("error" in r) {
        return { ok: false, message: r.error };
      }
      i = r.nextIndex;
      continue;
    }

    const { chars, value } = takeShortEquals(raw);
    if (chars === "") {
      return { ok: false, message: "无效的 short 选项。" };
    }

    if (chars.length === 1) {
      const opt = registry.getByShort(chars);
      if (opt === undefined) {
        return { ok: false, message: `未知选项：-${chars}` };
      }
      if (opt.kind === "flag") {
        if (value !== undefined) {
          return { ok: false, message: `-${chars} 不需要值。` };
        }
        setFlag(opt.id);
        i += 1;
        continue;
      }
      const r = consumeValue(opt, value, argv, i);
      if ("error" in r) {
        return { ok: false, message: r.error };
      }
      i = r.nextIndex;
      continue;
    }

    const head = chars[0];
    if (head === undefined) {
      return { ok: false, message: "无效的 short 选项。" };
    }
    const tail = chars.slice(1);
    const opt = registry.getByShort(head);
    if (opt === undefined) {
      return { ok: false, message: `未知选项：-${head}` };
    }
    if (!wantsValue(opt)) {
      return {
        ok: false,
        message: `-${head} 是开关项，不能与附加参数连在一起（收到：-${chars}）。请分开书写，例如 -h -v。`,
      };
    }
    if (value !== undefined) {
      return {
        ok: false,
        message: `short 选项与值请使用 -${head}=${value} 或 -${head} ${value} 的形式。`,
      };
    }
    const r = applyValue(opt, tail, { nextIndex: i + 1 });
    if ("error" in r) {
      return { ok: false, message: r.error };
    }
    i = r.nextIndex;
  }

  for (const opt of registry.options) {
    switch (opt.kind) {
      case "flag": {
        if (state.flags[opt.id] !== true) {
          state.flags[opt.id] = false;
        }
        break;
      }
      case "string": {
        if (!opt.optional && state.strings[opt.id] === undefined) {
          return { ok: false, message: `缺少必填选项 ${formatOptionLabel(opt)}。` };
        }
        break;
      }
      case "number": {
        state.numbers[opt.id] ??= opt.default;
        break;
      }
      case "enum": {
        if (!opt.optional && state.enums[opt.id] === undefined) {
          return { ok: false, message: `缺少必填选项 ${formatOptionLabel(opt)}。` };
        }
        break;
      }
      case "stringList": {
        state.lists[opt.id] ??= [];
        break;
      }
    }
  }

  const out = Object.create(null) as Record<string, unknown>;
  for (const opt of registry.options) {
    switch (opt.kind) {
      case "flag": {
        out[opt.id] = state.flags[opt.id] === true;
        break;
      }
      case "string": {
        out[opt.id] = state.strings[opt.id];
        break;
      }
      case "number": {
        out[opt.id] = state.numbers[opt.id];
        break;
      }
      case "enum": {
        out[opt.id] = state.enums[opt.id];
        break;
      }
      case "stringList": {
        out[opt.id] = state.lists[opt.id] ?? [];
        break;
      }
    }
  }

  return { ok: true, values: out as InferCliValues<T> };
}

function formatOptionLabel(opt: AnyOption): string {
  const primary = opt.aliases[0];
  if (primary === undefined) return opt.id;
  if (opt.short !== undefined) {
    return `-${opt.short} / --${primary}`;
  }
  return `--${primary}`;
}
