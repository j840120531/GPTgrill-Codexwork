# GPTgrill-Codexwork

[English](README.md) · [繁體中文](README.zh-TW.md)

**让高能力模型负责思考与决策，让高效率 Agent 负责执行，并让 Git 成为工程事实来源。**

GPTgrill-Codexwork 是一套开源编排层，用来连接 **ChatGPT 网页端的规划能力** 与 **本地 Codex 的执行能力**。

核心思路是模型分工：

- 在 ChatGPT Web 使用高能力模型，例如 **GPT-5.6 Sol High**，处理需求澄清、架构、Spec、关键决策与 Review；
- 在 Codex 端使用更适合大量执行工作的模型配置，例如环境支持时的 **Luna Max + subagents**，处理代码阅读、实现、测试、除错与并行工作；
- 使用 **Git** 持久化 Spec、Task、Dispatch 与 Report，让网页规划层和本地执行层共享同一份工程事实。

这样可以避免让最强模型承担所有机械式实现工作，同时把高质量推理集中在真正需要判断的节点。模型名称、额度和可用性可能随产品变化；本项目并不依赖任何模型“永久免费”或“永久无限”。

---

## 工作方式

```text
ChatGPT Web
  /grill
  需求 / 架构 / 决策
        │
        ▼
  spec it
        │
        ▼
  /goal task | /goal phase | /goal full
        │
        ▼
Git Repository
  SPEC.md / PHASES.md / tasks/*.md
  .gptgrill-codexwork/dispatch/*.json
        │
        ▼
GPTgrill-Codexwork Runner
  监听 control branch
        │
        ▼
Codex CLI + subagents
  实现 / 测试 / 修复
        │
        ▼
codex-with-chatgpt
  PLAN / REVIEW / FIX
        │
        ▼
Git branch + Phase/Final Report
```

GPTgrill-Codexwork 不替代 `codex-with-chatgpt`；它是在其上增加持久化调度与状态管理的一层。

---

## 组件

| 组件 | 职责 |
|---|---|
| **Grill Me Web Skill** | 澄清真实问题、约束、Non-goals、边界条件与验收标准。 |
| **GPTgrill-Codexwork Web Skill** | 把确认后的规划写成 Repo artifact 与 Dispatch manifest。 |
| **GPTgrill-Codexwork Runner** | 监听 Dispatch、管理执行状态、分支、Commit、Push 与 Report。 |
| **Codex CLI** | 执行代码修改、Shell、测试与修复。 |
| **codex-with-chatgpt** | 把 Codex 接回 ChatGPT，形成独立 Plan / Review / Fix 循环。 |
| **Git** | 作为规划层与执行层之间的持久化事实来源。 |

---

## 快速开始

### 依赖

- Node.js 20+
- Git
- Shell 中可用的 Codex CLI
- Codex 环境中已安装 `codex-with-chatgpt`
- 使用内置 `launchd` Service 安装器时需要 macOS
- ChatGPT 端能够使用本项目提供的 Web Skills，并具备写入目标 Repo artifact 的能力

### 安装本地 Runner

从 Release 包安装：

```bash
npm install -g ./gptgrill-codexwork-local-vX.Y.Z.tgz
gptgrill-codexwork --help
```

从源码安装：

```bash
git clone https://github.com/j840120531/GPTgrill-Codexwork.git
cd GPTgrill-Codexwork
npm install
npm run check
npm link
```

### 接入一个项目 Repo

```bash
gptgrill-codexwork bootstrap --workspace /path/to/project
gptgrill-codexwork doctor --workspace /path/to/project
gptgrill-codexwork install-service --workspace /path/to/project
gptgrill-codexwork status --workspace /path/to/project
```

`bootstrap` 会建立控制目录：

```text
.gptgrill-codexwork/
  README.md
  dispatch/
```

运行时状态保存在项目 Repo 外部的 `~/.gptgrill-codexwork/`。

需要交给 Codex 自动完成安装时，可参考 [`INSTALL_FOR_CODEX.md`](INSTALL_FOR_CODEX.md)。

---

## Web Skills

项目包含两个 Web Skill：

```text
skills/grill-me/SKILL.md
skills/gptgrill-codexwork/SKILL.md
```

Tagged Release 也会提供可直接上传的 Skill ZIP 包。

典型规划流程：

```text
/grill
  -> 挑战假设并澄清需求

spec it
  -> 产出可进入 Spec 的需求总结

/goal phase
  -> 写入 SPEC / PHASES / TASKS / dispatch
```

### 自治模式

| 模式 | 行为 |
|---|---|
| `task` | 执行一个 Task，完成 Review 后停在人工确认边界。 |
| `phase` | 完成当前 Phase 的剩余 Task，执行整合 Review，写 Phase Report，然后停止。 |
| `goal` | 连续执行所有剩余 Phase 与 Final Review，直到完成或 Blocked。 |

对大多数开发任务，`phase` 是较合适的默认模式。

---

## Repo Contract

接入后的项目通常会包含：

```text
AGENTS.md

specs/<goal>/
  SPEC.md
  PHASES.md
  tasks/
    P1-T01.md
    P1-T02.md

.gptgrill-codexwork/
  README.md
  dispatch/
    <goal-id>.json

reports/<goal>/
  P1.md
  P2.md
  FINAL.md
```

Dispatch manifest 是执行触发器：

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "goalId": "example-goal",
  "title": "Example goal",
  "status": "ready",
  "mode": "phase",
  "spec": "specs/example-goal/SPEC.md",
  "phases": [
    {
      "id": "P1",
      "title": "Core implementation",
      "tasks": [
        {
          "id": "P1-T01",
          "file": "specs/example-goal/tasks/P1-T01.md"
        }
      ]
    }
  ]
}
```

标准示例见 [`examples/dispatch.example.json`](examples/dispatch.example.json)。

### `revision` 作为人工授权令牌

在 `task` 和 `phase` 模式中，如果已经到达停止边界，需要提高 manifest 的 `revision` 才会继续执行：

```text
revision: 1 -> 2
```

这可以避免常驻 watcher 在没有新的明确授权时继续向下运行。

---

## 执行与安全模型

在启动自动执行前，Runner 会要求 Workspace 干净、Fetch 指定 Control Branch、取得 Workspace Lock，并验证 Dispatch State。

典型执行过程：

```text
fetch control branch
→ 选择可运行 dispatch
→ checkout/create gptgrill-codexwork/<goal-id>
→ 调用 Codex
→ 运行 C2C plan/review/fix loop
→ 由 Runner commit + push
→ 更新 runtime state
→ 按自治模式继续或停止
```

主要安全机制包括：

- 存在无关未提交修改时，不启动自动执行；
- 每个 Workspace 独立加锁；
- Task / Phase 继续执行需要显式 Revision Gate；
- Review 循环有最大次数限制；
- Spec 与 Report 存 Git，瞬时 Runtime State 存在 Git 外；
- 编排执行期间，Codex 被要求不要自行 Commit 或 Push。

安全与信任模型见 [`docs/SECURITY.md`](docs/SECURITY.md)。

---

## 多项目运行

每个 Repo 都可以安装独立 Watcher 与 Runtime State，因此同一台机器可以同时监控多个项目：

```text
Project A -> watcher A -> Codex
Project B -> watcher B -> Codex
Project C -> watcher C -> Codex
```

当前版本以 Workspace 为单位隔离执行。全局跨项目并发上限与 Priority Queue 尚未实现。

---

## Controller Chat 集成

对话路由由 `codex-with-chatgpt` 管理，而不是由 Runner 本身管理。

某个 Workspace 可以选择绑定一个长期 Controller Chat：

```bash
c2c session set \
  -w /path/to/project \
  --mode long-chat \
  --url "https://chatgpt.com/c/<conversation-id>"
```

Git 始终是长期工程事实来源；Controller Chat 是推理与 Review Workspace，需要时可以更换。

---

## 当前限制

- 自动执行目前调用本地 `codex` CLI，而不是直接驱动 Codex App GUI。
- `install-service` 目前针对 macOS `launchd`；也可以直接使用 CLI 的 `run` 或 `watch`。
- 暂未提供跨项目的全局并发限制与优先队列。
- 网页端写入 Repo 的能力取决于 ChatGPT 环境与已连接仓库的权限。

---

## 文档

- [`INSTALL_FOR_CODEX.md`](INSTALL_FOR_CODEX.md) — 引导式安装
- [`docs/CHATGPT_SKILL.md`](docs/CHATGPT_SKILL.md) — Web Skill 说明
- [`docs/SECURITY.md`](docs/SECURITY.md) — 安全与信任模型
- [`docs/RELEASE.md`](docs/RELEASE.md) — Release 流程

---

## License

MIT，见 [`LICENSE`](LICENSE)。
