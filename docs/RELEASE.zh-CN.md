# Goal Loop 发布说明

[English](RELEASE.md)

Goal Loop 本身有两层，因此 Release 也需要同时发布两类东西：ChatGPT 网页 Skill，以及本地 Goal Loop Runner。

## 每个 Release 应包含的文件

| 文件 | 用在哪里 | 安装 / 使用方式 |
|---|---|---|
| `grill-me-web-skill-vX.Y.Z.zip` | ChatGPT 网页 | 作为一个 Skill 单独上传 |
| `goal-loop-web-skill-vX.Y.Z.zip` | ChatGPT 网页 | 作为一个 Skill 单独上传 |
| `goal-loop-local-vX.Y.Z.tgz` | 本地 Mac / Terminal / Codex 环境 | `npm install -g ./goal-loop-local-vX.Y.Z.tgz` |
| `goal-loop-local-vX.Y.Z.zip` | 本地源码包 | 解压后 `npm install`、`npm run check`、`npm link` |
| `SHA256SUMS.txt` | 校验文件完整性 | `shasum -a 256 -c SHA256SUMS.txt` |
| GitHub 自动生成的 Source code ZIP/TAR | 完整仓库快照 | 开发、审计、备份 |

两个网页 Skill 必须分开发布、分开安装。不要把整个 Goal Loop 仓库 ZIP 当成一个 ChatGPT Skill 上传。

## 本地 Runner 和 Codex App 的关系

Goal Loop 当前真正启动 Codex 的方式是调用本机的 `codex` 命令：

```text
codex exec --full-auto -C <workspace> -
```

所以你平时使用 **Codex App** 没有问题，也不会和 Goal Loop 冲突；但是 Goal Loop Runner 目前并不是去操作 Codex App 的图形界面，而是走 Codex CLI 这条执行路径。

先检查：

```bash
which codex
codex --version
```

如果这两个命令正常，就不用额外处理。你可以继续用 Codex App 做人工交互，同时让 Goal Loop 在后台通过 CLI 跑自动任务。

如果你只有 Codex App，但终端里没有 `codex` 命令，那么还需要额外安装官方 Codex CLI，Goal Loop 才能自动启动任务。

Codex App 和 CLI 属于同一个 Codex 生态，可以共享账号和配置上下文；只是 Goal Loop 当前明确依赖 CLI 作为执行入口。

以后如果要做 App Server / App-native adapter，可以作为新的执行适配器加入，但不是现在这版的前置条件。

## 自动 Release 工作流

仓库里的：

```text
.github/workflows/release.yml
```

会负责完整打包和发布。

例如准备发布 `v0.2.0`：

```bash
git tag -a v0.2.0 -m "Goal Loop v0.2.0"
git push origin v0.2.0
```

GitHub Actions 会自动：

1. 运行 `npm ci`；
2. 运行 `npm run check`；
3. 检查 Git tag 版本是否和 `package.json` 一致；
4. 打包两个网页 Skill ZIP；
5. 打包本地 Runner 的 `.tgz` 和 `.zip`；
6. 生成 SHA-256 校验文件；
7. 创建 GitHub Release，并把所有文件作为 Release Assets 上传。

工作流也支持手动 `workflow_dispatch`。手动运行时会打包并保存成 workflow artifact，但因为没有 tag，不会直接发布 GitHub Release。

## 版本规则

打 tag 前，先保证：

```text
package.json
package-lock.json
```

使用同一个语义化版本号。

如果 tag 是：

```text
v0.3.0
```

但 `package.json` 仍然是：

```text
0.2.0
```

Release workflow 会直接失败，避免版本和安装包对不上。

## 推荐安装方式

### ChatGPT 网页端

分别上传：

```text
grill-me-web-skill-vX.Y.Z.zip
goal-loop-web-skill-vX.Y.Z.zip
```

### 本地 Runner：安装包方式

```bash
npm install -g ./goal-loop-local-vX.Y.Z.tgz
goal-loop --help
```

### 本地 Runner：源码 ZIP 方式

```bash
unzip goal-loop-local-vX.Y.Z.zip
cd goal-loop-vX.Y.Z
npm install
npm run check
npm link
goal-loop --help
```

然后对每个需要接入 Goal Loop 的项目执行：

```bash
goal-loop bootstrap --workspace /path/to/project
goal-loop doctor --workspace /path/to/project
goal-loop install-service --workspace /path/to/project
```
