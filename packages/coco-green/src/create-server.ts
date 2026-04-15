import { PassThrough } from "node:stream";

import type { Context } from "koa";
import Koa from "koa";
import bodyParser from "@koa/bodyparser";
import archiver from "archiver";

import type { SkillRecord } from "./scan-skills.js";

function isSafeSkillName(name: string): boolean {
  if (name === "" || name === "." || name === "..") return false;
  if (name.includes("/") || name.includes("\\")) return false;
  if (name.includes("..")) return false;
  return true;
}

function readNameList(body: unknown): string[] | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  if (!("nameList" in body)) return undefined;
  const list = (body as { nameList: unknown }).nameList;
  if (!Array.isArray(list)) return undefined;
  if (!list.every((x): x is string => typeof x === "string")) return undefined;
  return list;
}

export function createApp(skills: SkillRecord[]): Koa {
  const byName = new Map(skills.map((s) => [s.name, s]));

  const app = new Koa();

  app.use(bodyParser());

  app.use(async (ctx: Context, next) => {
    if (ctx.path === "/getAllSkills" && ctx.method === "GET") {
      ctx.type = "application/json";
      ctx.body = {
        skills: skills.map((s) => ({
          name: s.name,
          description: s.description,
        })),
      };
      return;
    }
    await next();
  });

  app.use(async (ctx: Context, next) => {
    if (ctx.path === "/getSkillBySkillNames" && ctx.method === "POST") {
      const nameList = readNameList(ctx.request.body);
      if (nameList === undefined) {
        ctx.status = 400;
        ctx.type = "application/json";
        ctx.body = { error: '请求体应为 JSON：{ "nameList": string[] }' };
        return;
      }
      if (nameList.length === 0) {
        ctx.status = 400;
        ctx.type = "application/json";
        ctx.body = { error: "nameList 不能为空" };
        return;
      }
      const entries: { name: string; absPath: string }[] = [];
      for (const name of nameList) {
        if (!isSafeSkillName(name)) {
          ctx.status = 400;
          ctx.type = "application/json";
          ctx.body = { error: `无效的技能名称：${name}` };
          return;
        }
        const rec = byName.get(name);
        if (rec === undefined) {
          ctx.status = 400;
          ctx.type = "application/json";
          ctx.body = { error: `未知的技能：${name}` };
          return;
        }
        entries.push({ name, absPath: rec.absPath });
      }

      const archive = archiver("zip", { zlib: { level: 9 } });
      const out = new PassThrough();
      archive.on("error", (err: Error) => {
        out.destroy(err);
        ctx.app.emit("error", err, ctx);
      });

      ctx.status = 200;
      ctx.set("Content-Type", "application/zip");
      ctx.set("Content-Disposition", 'attachment; filename="skills.zip"');
      ctx.body = out;

      for (const entry of entries) {
        archive.directory(entry.absPath, entry.name);
      }

      archive.pipe(out);
      void archive.finalize();
      return;
    }
    await next();
  });

  app.use((ctx: Context) => {
    ctx.status = 404;
    ctx.type = "application/json";
    ctx.body = { error: "未找到" };
  });

  return app;
}
