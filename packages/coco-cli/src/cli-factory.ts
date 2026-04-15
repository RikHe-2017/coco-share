import type { AnyOption } from "./option-def.js";
import { formatHelp, type ProgramMeta } from "./help.js";
import { parseArgv, type ParseArgvOutcome } from "./parse-argv.js";
import type { InferCliValues } from "./shape.js";

export interface CliParser<T extends readonly AnyOption[]> {
  readonly defs: T;
  parse(argv: string[]): ParseArgvOutcome<InferCliValues<T>>;
  formatHelp(meta: ProgramMeta): string;
}

export function createCliParser<const T extends readonly AnyOption[]>(
  defs: T,
): CliParser<T> {
  return {
    defs,
    parse(argv: string[]): ParseArgvOutcome<InferCliValues<T>> {
      return parseArgv(argv, defs);
    },
    formatHelp(meta: ProgramMeta): string {
      return formatHelp(meta, defs);
    },
  };
}
