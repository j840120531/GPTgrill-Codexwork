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

Codex App 和 CLI 属于同一个 Codex 生态；只是 Goal Loop 当前明确依赖 CLI 作为执行入口。

以后如果要做 App Server / App-native adapter，可以作为新的执行适配器加入，但不是现在这版的前置条件。

## 推荐：完全在 GitHub 网页一键发布

不需要在本地创建 tag，也不需要打开 Codex App。

进入：

```text
GitHub repo
→ Actions
→ Release
→ Run workflow
```

输入版本号，例如：

```text
0.2.0
```

或：

```text
v0.2.0
```

工作流会自动：

1. 强制从当前 `main` HEAD 发布；
2. 检查 `package.json` 与 `package-lock.json` 版本一致；
3. 检查输入版本和 package version 一致；
4. 拒绝覆盖已经存在的 tag 或 Release；
5. 运行 `npm ci`；
6. 运行 `npm run check`；
7. 打包两个网页 Skill ZIP；
8. 打包本地 Runner 的 `.tgz` 和 `.zip`；
9. 生成 `SHA256SUMS.txt`；
10. 创建 annotated Git tag；
11. push tag；
12. 创建 GitHub Release；
13. 上传全部 Release Assets。

也就是说，正常发布流程不再依赖你的 Mac。

## 仍然支持 tag-triggered release

如果有高级场景需要自己创建 tag，仍然可以：

```bash
git tag -a v0.2.0 -m "Goal Loop v0.2.0"
git push origin v0.2.0
```

push `v*` tag 后，同一个 Release workflow 会验证、打包并发布。

但对日常使用，推荐直接从 GitHub Actions 手动 Run workflow。

## 版本规则

发布前先保证：

```text
package.json
package-lock.json
```

使用同一个语义化版本号。

例如准备发布：

```text
v0.3.0
```

那么 `package.json` 与 `package-lock.json` 都必须是：

```text
0.3.0
```

否则 Release workflow 会直接失败，避免 tag、Release 名称与安装包版本不一致。

手动 GitHub Release 还会额外检查：

- 必须发布当前 `main` HEAD；
- tag 不得已存在；
- Release 不得已存在；
- 不会 force-update 旧 tag。

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

源码 ZIP 会包含 `test/`，因此 `npm run check` 可以在解压包里直接执行。

然后对每个需要接入 Goal Loop 的项目执行：

```bash
goal-loop bootstrap --workspace /path/to/project
goal-loop doctor --workspace /path/to/project
goal-loop install-service --workspace /path/to/project
```

## Release workflow 文件

实现位于：

```text
.github/workflows/release.yml
```

它同时支持：

```text
workflow_dispatch
push tags: v*
```

推荐把 GitHub Actions 视为正式发布入口；本地 Git 命令只保留为高级/兼容路径。
