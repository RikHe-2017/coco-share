import type {
  AnyOption,
  EnumOption,
  FlagOption,
  NumberOption,
  StringListOption,
  StringOption,
} from "./option-def.js";

type OptShape<O extends AnyOption> = O extends FlagOption<infer I>
  ? I extends PropertyKey
    ? Readonly<Record<I, boolean>>
    : never
  : O extends StringOption<infer I, infer Opt>
    ? I extends PropertyKey
      ? Opt extends true
        ? Partial<Readonly<Record<I, string>>>
        : Readonly<Record<I, string>>
      : never
    : O extends NumberOption<infer I>
      ? I extends PropertyKey
        ? Readonly<Record<I, number>>
        : never
      : O extends EnumOption<infer I, infer Opt>
        ? I extends PropertyKey
          ? Opt extends true
            ? Partial<Readonly<Record<I, string>>>
            : Readonly<Record<I, string>>
          : never
        : O extends StringListOption<infer I>
          ? I extends PropertyKey
            ? Readonly<Record<I, readonly string[]>>
            : never
          : never;

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;

export type InferCliValues<T extends readonly AnyOption[]> = keyof UnionToIntersection<
  T[number] extends infer O ? (O extends AnyOption ? OptShape<O> : never) : never
> extends never
  ? Record<string, never>
  : UnionToIntersection<
      T[number] extends infer O ? (O extends AnyOption ? OptShape<O> : never) : never
    >;
