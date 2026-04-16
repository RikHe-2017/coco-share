# coco-share

> 你精心调教的 Agent Skills，凭什么只能烂在自己的硬盘里？

---

## 这是什么？

一套让你把本地 Agent Skills **通过局域网分享给同事**的命令行工具，不需要上传到任何公共平台，不需要 Git 仓库，不需要 U 盘，甚至不需要打开微信。

两个包，一绿一蓝，各司其职：

| 包 | 角色 | 一句话 |
|---|---|---|
| `coco-green` | 服务端 | 把你的 Skills 挂在局域网上 |
| `coco-blue` | 客户端 | 从局域网上把 Skills 薅下来 |

支持的 Agent：**Cursor**、**Claude Code**、**Codex**。

---

## 为什么要做这个？

场景还原：

> 你：「我写了个超好用的 Skill，你要不要？」
> 同事：「要啊，发我一下。」
> 你：「……」（开始思考怎么发）

你可以把文件夹压缩发微信，但微信会把 `.md` 文件压成乱码。
你可以传到云盘，但公司网络访问云盘需要 VPN，VPN 又要申请权限。
你可以推到 GitHub，但那个 Skill 里有三行公司内网地址。

**coco-share 的答案是：别折腾了，直接在局域网传。**

---

## 超快速开始

### 分享方（coco-green）
什么这参数那配置的，我管你这那的，我直接把下面的提示词改改发给我的大模型再说。
"使用 @coco-share/coco-green 把我的 skillxxx(此处替换成你的skill名称)分享出去。不知道coco-green 如何使用？使用coco-green -h查看帮助"
大模型最后会输出一行命令，吧这个命令复制一下，发给接收方完事。

### 接受方（coco-blue）
命令行粘贴，完事！


## 快速开始

### 分享方（coco-green）

```bash
npx @coco-share/coco-green
```

启动后会显示你的局域网地址，比如 `http://192.168.1.5:3001`。

把这个地址告诉同事，完事。

**懒人模式（主动模式）：**

```bash
npx @coco-share/coco-green --mode active
```

主动模式会直接生成一条完整的 `npx` 命令，你只需要把那行命令复制给同事，同事粘贴执行，全程无需对话。适合那种「我说地址你记不住」的同事。

### 接收方（coco-blue）

```bash
npx @coco-share/coco-blue
```

coco-green 会直接输出完整命令，执行该命令coco-blue会主动询问你，你只需要告诉coco-blue你要装在哪，给谁装就行。

如果你已经知道要装什么，可以全部用参数指定，跳过所有交互：

```bash
npx @coco-share/coco-blue --ip 192.168.1.5:3001 --skill my-skill --agent claude-code
```

---

## 功能细节

### 自动发现 Skills

coco-green 启动时会扫描你指定目录（默认当前目录）下所有包含 `SKILL.md` 的子文件夹，自动识别为可分享的 Skill。不需要配置文件，不需要注册，放进去就能用。

### 智能 IP 检测

coco-green 会自动检测你的局域网 IP，并过滤掉 Docker、VMware、VirtualBox、WSL 等虚拟网卡产生的假 IP。毕竟把 `172.17.0.1` 发给同事，同事会以为你在整他。

### 冲突处理

安装时如果目标路径已存在同名文件夹，coco-blue 会问你怎么处理：

- **跳过** — 这个 Skill 我已经有了，不动它
- **覆盖** — 删掉旧的，装新的
- **改名** — 新旧并存，给新的起个名字
- **中止** — 算了不装了

### 安装位置

- **全局**：装到各 Agent 的默认全局路径（`~/.claude/skills`、`~/.cursor/skills-cursor`、`~/.codex/skills`）
- **自定义根目录**：装到你指定的目录下，子路径结构与全局一致

---

## CLI 参数速查

### coco-green

```
--port, -p     监听端口（默认 3001）
--dir, -d      Skills 根目录（默认当前目录）
--mode, -m     passive（默认）或 active
--help         帮助
--version      版本
```

### coco-blue

```
--ip           coco-green 地址（如 192.168.1.5:3001）
--skill        指定技能名（可多次使用或逗号分隔）
--agent        指定 Agent（claude-code / cursor / codex，可多次使用）
--path         自定义安装根目录（指定后自动跳过安装位置选择）
--help         帮助
--version      版本
```

---

## 安装路径参考

| Agent | 全局路径 |
|---|---|
| Claude Code | `~/.claude/skills/<skill-name>/` |
| Cursor | `~/.cursor/skills-cursor/<skill-name>/` |
| Codex | `~/.codex/skills/<skill-name>/` |

---

## 项目结构

```
coco-share/
├── packages/
│   ├── coco-cli/     # 公共 CLI 解析工具（内部依赖）
│   ├── coco-green/   # 服务端
│   └── coco-blue/    # 客户端
```

---

## License

MIT — 随便用，出了事别找我。
