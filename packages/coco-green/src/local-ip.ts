import os from "node:os";

/**
 * 获取本机 IP（优先使用环境变量配置，否则自动获取内网 IP）
 */
export function getLocalIP(): string {
  const fromEnv = process.env["COCO_GREEN_BIND_IP"]?.trim();
  if (fromEnv) return fromEnv;

  const interfaces = os.networkInterfaces();
  const candidates: { name: string; ip: string; priority: number }[] = [];

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    const lowerName = name.toLowerCase();
    if (
      lowerName.includes("vethernet") ||
      lowerName.includes("virtualbox") ||
      lowerName.includes("vmware") ||
      lowerName.includes("docker") ||
      lowerName.includes("wsl")
    ) {
      continue;
    }

    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        const ip = alias.address;

        if (ip.startsWith("172.")) {
          candidates.push({ name, ip, priority: 1 });
          continue;
        }

        if (ip.startsWith("192.168.56.")) {
          candidates.push({ name, ip, priority: 1 });
          continue;
        }

        if (ip.startsWith("10.") || ip.startsWith("192.168.")) {
          candidates.push({ name, ip, priority: 3 });
        } else {
          candidates.push({ name, ip, priority: 2 });
        }
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);

  const best = candidates[0];
  if (best !== undefined) {
    return best.ip;
  }

  return "127.0.0.1";
}
