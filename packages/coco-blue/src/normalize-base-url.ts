export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "") {
    throw new Error("服务器地址为空。");
  }

  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  let u: URL;
  try {
    u = new URL(withProto);
  } catch {
    throw new Error(`无效的服务器地址：${input}`);
  }

  if (u.hostname === "") {
    throw new Error(`无效的服务器地址：${input}`);
  }

  if (u.pathname !== "/" && u.pathname !== "") {
    throw new Error("请只填写 host:port，不要包含 URL 路径。");
  }

  return `${u.protocol}//${u.host}`;
}
