export type OptionKind = "flag" | "string" | "number" | "enum" | "stringList";

interface OptionCommon<Id extends string = string> {
  readonly id: Id;
  /** Long names without leading `--`; first entry is the primary name in help. */
  readonly aliases: readonly string[];
  /** Single ASCII letter, without leading `-`. */
  readonly short?: string;
  readonly description: string;
}

export type FlagOption<Id extends string = string> = OptionCommon<Id> & {
  readonly kind: "flag";
};

export type StringOption<
  Id extends string = string,
  Optional extends boolean = boolean,
> = OptionCommon<Id> & {
  readonly kind: "string";
  readonly optional: Optional;
  readonly valueLabel: string;
};

export type NumberOption<Id extends string = string> = OptionCommon<Id> & {
  readonly kind: "number";
  readonly default: number;
  readonly min?: number;
  readonly max?: number;
  readonly valueLabel: string;
};

export type EnumOption<
  Id extends string = string,
  Optional extends boolean = boolean,
> = OptionCommon<Id> & {
  readonly kind: "enum";
  readonly values: readonly string[];
  readonly optional: Optional;
  readonly valueLabel: string;
};

export type StringListOption<Id extends string = string> = OptionCommon<Id> & {
  readonly kind: "stringList";
  readonly valueLabel: string;
};

export type AnyOption =
  | FlagOption
  | StringOption
  | NumberOption
  | EnumOption
  | StringListOption;

export function flagOption<const Id extends string>(
  id: Id,
  init: {
    aliases: readonly string[];
    short?: string;
    description: string;
  },
): FlagOption<Id> {
  const out: FlagOption<Id> = {
    kind: "flag",
    id,
    aliases: init.aliases,
    description: init.description,
  };
  if (init.short !== undefined) {
    return { ...out, short: init.short };
  }
  return out;
}

export function stringOption<const Id extends string, const Opt extends boolean>(
  id: Id,
  init: {
    aliases: readonly string[];
    short?: string;
    description: string;
    optional: Opt;
    valueLabel: string;
  },
): StringOption<Id, Opt> {
  const out: StringOption<Id, Opt> = {
    kind: "string",
    id,
    aliases: init.aliases,
    description: init.description,
    optional: init.optional,
    valueLabel: init.valueLabel,
  };
  if (init.short !== undefined) {
    return { ...out, short: init.short };
  }
  return out;
}

export function numberOption<const Id extends string>(
  id: Id,
  init: {
    aliases: readonly string[];
    short?: string;
    description: string;
    default: number;
    min?: number;
    max?: number;
    valueLabel: string;
  },
): NumberOption<Id> {
  let out: NumberOption<Id> = {
    kind: "number",
    id,
    aliases: init.aliases,
    description: init.description,
    default: init.default,
    valueLabel: init.valueLabel,
  };
  if (init.short !== undefined) {
    out = { ...out, short: init.short };
  }
  if (init.min !== undefined) {
    out = { ...out, min: init.min };
  }
  if (init.max !== undefined) {
    out = { ...out, max: init.max };
  }
  return out;
}

export function enumOption<const Id extends string, const Opt extends boolean>(
  id: Id,
  init: {
    aliases: readonly string[];
    short?: string;
    description: string;
    values: readonly string[];
    optional: Opt;
    valueLabel: string;
  },
): EnumOption<Id, Opt> {
  const out: EnumOption<Id, Opt> = {
    kind: "enum",
    id,
    aliases: init.aliases,
    description: init.description,
    values: init.values,
    optional: init.optional,
    valueLabel: init.valueLabel,
  };
  if (init.short !== undefined) {
    return { ...out, short: init.short };
  }
  return out;
}

export function stringListOption<const Id extends string>(
  id: Id,
  init: {
    aliases: readonly string[];
    short?: string;
    description: string;
    valueLabel: string;
  },
): StringListOption<Id> {
  const out: StringListOption<Id> = {
    kind: "stringList",
    id,
    aliases: init.aliases,
    description: init.description,
    valueLabel: init.valueLabel,
  };
  if (init.short !== undefined) {
    return { ...out, short: init.short };
  }
  return out;
}
