import assert from "node:assert/strict";
import { test } from "vitest";

import {
  createCliParser,
  enumOption,
  flagOption,
  numberOption,
  stringListOption,
  stringOption,
} from "../packages/coco-cli/dist/index.js";
import { OptionRegistry } from "../packages/coco-cli/dist/registry.js";

const parser = createCliParser([
  flagOption("help", {
    aliases: ["help"],
    short: "h",
    description: "show help",
  }),
  stringOption("host", {
    aliases: ["host"],
    short: "i",
    description: "server host",
    optional: true,
    valueLabel: "host",
  }),
  numberOption("port", {
    aliases: ["port"],
    short: "p",
    description: "server port",
    default: 3001,
    min: 1,
    max: 65535,
    valueLabel: "port",
  }),
  enumOption("mode", {
    aliases: ["mode"],
    short: "m",
    description: "mode",
    values: ["active", "passive"],
    optional: true,
    valueLabel: "mode",
  }),
  stringListOption("skill", {
    aliases: ["skill"],
    short: "s",
    description: "skill",
    valueLabel: "name",
  }),
]);

test("coco-cli parses long, short, attached, and default values", () => {
  const parsed = parser.parse([
    "--host=127.0.0.1:3001",
    "-p",
    "8080",
    "-mactive",
    "--skill",
    "alpha",
    "-s=beta",
  ]);

  assert.equal(parsed.ok, true);
  assert.deepEqual({ ...parsed.values }, {
    help: false,
    host: "127.0.0.1:3001",
    port: 8080,
    mode: "active",
    skill: ["alpha", "beta"],
  });
});

test("coco-cli reports invalid values and unknown options", () => {
  assert.match(parser.parse(["--port=0"]).message, /不能小于 1/);
  assert.match(parser.parse(["--mode=other"]).message, /active \| passive/);
  assert.match(parser.parse(["--missing"]).message, /未知选项/);
  assert.match(parser.parse(["-hfoo"]).message, /开关项/);
});

test("coco-cli applies defaults for omitted optional values", () => {
  const parsed = parser.parse([]);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.values.help, false);
  assert.equal(parsed.values.host, undefined);
  assert.equal(parsed.values.port, 3001);
  assert.deepEqual(parsed.values.skill, []);
});

test("coco-cli formats help and rejects alias conflicts", () => {
  const help = parser.formatHelp({
    name: "demo",
    version: "0.0.0",
    description: "demo parser",
    usage: "demo [options]",
  });

  assert.match(help, /-h, --help/);
  assert.match(help, /-p, --port <port>/);
  assert.throws(
    () =>
      new OptionRegistry([
        flagOption("one", { aliases: ["same"], short: "x", description: "one" }),
        flagOption("two", { aliases: ["same"], short: "y", description: "two" }),
      ]),
    /long 别名冲突/,
  );
  assert.throws(
    () =>
      new OptionRegistry([
        flagOption("one", { aliases: ["one"], short: "x", description: "one" }),
        flagOption("two", { aliases: ["two"], short: "x", description: "two" }),
      ]),
    /short 别名冲突/,
  );
});
