# Goal Loop

[English](README.md)

**ChatGPT 决定要做什么，Codex 负责把它做出来，ChatGPT 再独立审查，Goal Loop 负责让整个闭环持续运转。**

Goal Loop 是一个基于 Git 仓库的本地调度层，用来把 ChatGPT 网页端的需求讨论、Spec、Phase、Task，稳定地交给本地 Codex 执行，并通过 `codex-with-chatgpt` 让 ChatGPT 继续做规划、审查和修复反馈。

它的角色不是替代 `codex-with-chatgpt`，而是**在它上面再加一层任务调度和状态管理**。

---

## Goal Loop 解决什么问题

没有 Goal Loop 时，一个典型流程往往是：

1. 在 ChatGPT 网页里讨论需求。
2. 把需求问清楚。
3. 写 Spec。
4. 手动切到 Codex。
5. 告诉 Codex 去读哪个 Spec / Task。
6. 等 Codex 实现。
7. 再手动回 ChatGPT 做 review。
8. 把 review 意见复制回 Codex。
9. 每一个 Task、每一个 Phase 都重复一次。

Goal Loop 主要自动化的是第 4-9 步。

理想体验会变成：

```text
/grill
  -> 把需求问清楚
spec it
  -> 收敛成 spec-ready 的需求总结
/goal phase
  -> 写 SPEC / PHASES / TASKS / dispatch
  -> 本地 Goal Loop 自动发现任务
  -> Codex 自动执行
  -> ChatGPT 通过 codex-with-chatgpt 自动审查
  -> Codex 自动修复
  -> 生成 Phase Report
  -> 停下来等你确认下一阶段
```

如果你明确想一路跑到底：

```text
/loop
  -> 一直按 Phase 执行
  -> 直到整个 Goal 完成或 BLOCKED
```

---

# 整体架构

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ChatGPT 网页 Project                                                │
│                                                                     │
│  Grill Me Skill                                                     │
│      │                                                              │
│      ├─ 澄清问题 / 约束 / Non-goals / Acceptance Criteria          │
│      ▼                                                              │
│  Goal Loop Web Skill                                                │
│      │                                                              │
│      ├─ SPEC.md                                                     │
│      ├─ PHASES.md                                                   │
│      ├─ tasks/*.md                                                  │
│      └─ .goal-loop/dispatch/<goal-id>.json                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ GitHub / control branch
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 目标项目 Repo                                                       │
│                                                                     │
│  specs/...                 .goal-loop/dispatch/...                  │
│       │                            │                                │
└───────┼────────────────────────────┼────────────────────────────────┘
        │                            │ git fetch
        │                            ▼
        │                   ┌────────────────────┐
        │                   │ Goal Loop Runner   │
        │                   │ 本地调度 / 状态机  │
        │                   └─────────┬──────────┘
        │                             │ codex exec --full-auto
        │                             ▼
        │                        ┌──────────┐
        │                        │  Codex   │
        │                        └────┬─────┘
        │                             │ 使用已安装 Skill
        │                             ▼
        │                  ┌──────────────────────┐
        └─────────────────►│ codex-with-chatgpt   │
                           │ PLAN / REVIEW / FIX  │
                           └──────────┬───────────┘
                                      │
                                      ▼
                                  ChatGPT 审查
```

## 每一层分别负责什么

| 组件 | 负责 | 不应该负责 |
|---|---|---|
| ChatGPT Web | 需求、规划、Spec、Review、面向用户的决策 | 本地 shell 执行 |
| Grill Me Skill | 把“到底要做什么”问清楚 | 实现代码 |
| Goal Loop Web Skill | 把确认后的需求写成 repo artifact + dispatch | 启动本地进程 |
| Goal Loop Runner | 监听 dispatch、决定下一个 Task、状态机、commit/push、report | 产品方向 |
| Codex | 改文件、跑命令、测试、实现 | 长期 scope 决策 |
| codex-with-chatgpt | Codex ↔ ChatGPT 的 plan/review/fix 循环 | Phase/Task 调度 |
| Git | 持久化的工程事实与交接层 | 临时 runtime 状态 |

---

# 重要：Goal Loop 有两部分

“Goal Loop”这个名字同时指网页 Skill 和本地 Runner，第一次看很容易混淆。

## 1. ChatGPT 网页 Skill

文件：

```text
skills/goal-loop/SKILL.md
```

这个安装在 ChatGPT 网页里。

它**不会直接在你的 Mac 上运行 Codex**。

它做的是：

```text
讨论结果
  -> SPEC.md
  -> PHASES.md
  -> tasks/*.md
  -> .goal-loop/dispatch/<goal-id>.json
```

## 2. 本地 Goal Loop Runner

就是这个整个 repo 在 Mac 上的安装版本。

它负责：

```text
git fetch
  -> 找到新的 dispatch
  -> 判断是否允许执行
  -> 自动启动 Codex
  -> 管理 Task/Phase/Goal 状态
  -> commit / push
  -> 生成报告
```

所以完整安装关系是：

```text
ChatGPT 网页
  ├─ Grill Me Skill
  └─ Goal Loop Skill

Mac 本地
  ├─ Goal Loop Runner
  ├─ Codex CLI
  └─ codex-with-chatgpt Skill
```

---

# 和 codex-with-chatgpt 会不会冲突？

不会。

Goal Loop 就是按“你已经装了 codex-with-chatgpt”这个前提设计的。

两者职责不同：

```text
Goal Loop
  决定：下一步应该跑哪个 Task？
  决定：跑完一个 Task / Phase 后要不要停？
  管理：branch、runtime state、commit/push、report

codex-with-chatgpt
  和 ChatGPT 一起决定：这个 Task 应该怎么实现？
  让 ChatGPT 独立读取当前 workspace 做 review
  循环：PLAN -> EXECUTION -> EXECUTED -> REVIEW -> PLAN/DONE
```

`goal-loop doctor` 还会主动检查 Codex 环境里有没有安装 `codex-with-chatgpt` Skill。

---

# ChatGPT Project 和本地 workspace 怎么绑定？

Goal Loop 本身不会把“任意网页对话”绑定到“任意本地目录”。

workspace 身份主要由 **codex-with-chatgpt** 管理。

推荐模型是：

```text
一个本地 workspace
    ↕
一个 codex-with-chatgpt connector
    ↕
一个 ChatGPT Project
```

这可以避免一个无关的普通 Chat 意外控制到错误的本地 repo。

Goal Loop 本地 Runner 只会处理你在那个 workspace 中配置的 Git repo，以及该 repo control branch 上出现的 dispatch。

## Project mode 和固定 Controller Chat

`codex-with-chatgpt` 支持不同对话模式。

如果你希望：

- 平时就在一个主对话里讨论需求，
- `/grill` 也在这里，
- `/goal phase` 也在这里，
- Codex 的 C2C plan/review 也回到这里，
- Phase 完成后继续在这里汇报，

可以把一个长期对话作为 **Controller Chat**，并使用 `long-chat` 模式。

例如：

```bash
c2c session -w /path/to/project --json

c2c session set \
  -w /path/to/project \
  --mode long-chat \
  --url "https://chatgpt.com/c/<controller-chat-id>"
```

这是可选配置。

Goal Loop 自己不管理 ChatGPT conversation URL；对话路由属于 `codex-with-chatgpt`。

---

# 网页 Skills

当前 repo 内有两个网页 Skill。

## Grill Me

文件：

```text
skills/grill-me/SKILL.md
```

用途：

- 把真实问题问清楚；
- 区分“目标”和“你当前想到的解决方案”；
- 挑战假设；
- 明确 scope / non-goals；
- 找出约束、边界条件、失败场景；
- 写出可验证的 acceptance criteria。

常用控制：

```text
/grill
harder
skip
summary
spec it
```

其中：

- `/grill`：开始或继续需求追问；
- `harder`：更强地挑战假设和矛盾；
- `skip`：跳过当前问题；
- `summary`：看目前已经确认到哪里；
- `spec it`：需求足够清楚后，生成 spec-ready synthesis。

`spec it` 不会直接启动 Codex。

## Goal Loop Web Skill

文件：

```text
skills/goal-loop/SKILL.md
```

用途：

- 把已经确认的需求写成正式 Spec；
- 拆 Phase；
- 拆 Task；
- 写 dispatch；
- 选择自治级别。

常用控制：

```text
/goal task
/goal phase
/goal full
/loop
```

## 网页手动安装 Skill

如果你的 ChatGPT 网页支持直接上传 Skill，分别上传：

```text
skills/grill-me/SKILL.md
skills/goal-loop/SKILL.md
```

**不要把整个 goal-loop repo ZIP 当成一个 Skill 上传。**

如果你是在 GitHub 上点：

```text
Code -> Download ZIP
```

下载整个仓库，那么先解压，然后找到：

```text
goal-loop-main/
  skills/
    grill-me/
      SKILL.md
    goal-loop/
      SKILL.md
```

把这两个 `SKILL.md` 分别上传即可。

---

# 三种自治模式

Goal Loop 故意把自治程度分成三档。

## `task`

只做当前一个未完成 Task，审查、push，然后暂停。

适合：

- 高风险功能；
- 需求还在变化；
- 你想紧密控制每一步。

```text
Task 1
  -> Codex
  -> ChatGPT review
  -> fix loop
  -> PASS
  -> pause
```

## `phase`

做完整个当前 Phase，执行 Phase integration review，生成报告，push，然后暂停。

这是**推荐默认模式**。

```text
P1-T01 -> review/fix
P1-T02 -> review/fix
P1-T03 -> review/fix
       -> phase integration review
       -> phase report
       -> pause
```

## `goal`

从当前状态一路做完整个 Goal，包括最终 review。

对应：

```text
/goal full
```

或者：

```text
/loop
```

流程：

```text
Phase 1
  -> review
Phase 2
  -> review
Phase 3
  -> review
Final review
  -> DONE
```

如果中间 BLOCKED，会停止。

---

# 目标项目中会产生哪些文件

一个典型项目最终会长这样：

```text
AGENTS.md

specs/
  HZ-004/
    SPEC.md
    PHASES.md
    tasks/
      P1-T01.md
      P1-T02.md
      P2-T01.md

.goal-loop/
  README.md
  dispatch/
    HZ-004.json

reports/
  HZ-004/
    P1.md
    P2.md
    FINAL.md
```

## Durable state vs transient state

应该进 Git 的内容：

- Spec；
- Task；
- Acceptance Criteria；
- Phase 定义；
- Report；
- Dispatch policy。

不应该进 Git 的 runtime state：

- 当前执行到哪个 Task；
- 当前 Phase；
- PID；
- lock；
- 本地错误状态；
- watcher 内部运行状态。

Goal Loop 把 runtime state 放在：

```text
~/.goal-loop/state/<workspace-hash>/<goal-id>.json
```

这样不会产生大量无意义的状态 commit。

---

# Dispatch manifest

网页 GPT 会写：

```text
.goal-loop/dispatch/<goal-id>.json
```

示例：

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "goalId": "HZ-004",
  "title": "Evaluator hardening",
  "status": "ready",
  "mode": "phase",
  "spec": "specs/HZ-004/SPEC.md",
  "phases": [
    {
      "id": "P1",
      "title": "Core validation",
      "tasks": [
        {
          "id": "P1-T01",
          "file": "specs/HZ-004/tasks/P1-T01.md"
        }
      ]
    }
  ],
  "execution": {
    "maxReviewIterations": 5,
    "phaseReview": true,
    "finalReview": true,
    "autoPush": true
  }
}
```

标准例子见：

[`examples/dispatch.example.json`](examples/dispatch.example.json)

## `revision` 是“明确授权继续”的 token

`revision` 从 `1` 开始。

对于 `task` 和 `phase` 模式，Goal Loop 到人工边界后会主动暂停。

如果你想继续，网页端应该把：

```text
revision: 1
```

改成：

```text
revision: 2
```

这代表：

> 用户已经明确批准下一次执行。

这样即使 watcher 每 30 秒一直轮询，也不会因为“服务还活着”就偷偷继续下一阶段。

如果之前是 BLOCKED，修好 Spec / Task 后也应该同步增加 `revision`，才会允许再次执行。

---

# Task 应该怎么写

不要写这种：

```text
优化 evaluator。
```

这种 Task 对自动执行几乎没有约束力。

推荐写成：

```markdown
# P1-T01 — Evaluator output validation

## Objective
让非法 evaluator 输出稳定失败，并返回确定性的错误。

## Acceptance Criteria
- [ ] 合法输出通过 schema validation。
- [ ] 非法输出返回确定性的 validation error。
- [ ] 现有 smoke cases 全部保持通过。
- [ ] 不改变 scoring semantics。

## Constraints
- 保持现有 public response schema。
- 不修改无关评分逻辑。

## Out of Scope
- 新增 evaluator 维度。
- UI 修改。
```

自动审查是否靠谱，很大程度取决于 Acceptance Criteria 是否明确。

---

# 本地执行时到底发生什么

每个 Task 大致会经历：

```text
1. fetch control branch
2. 找到可执行 manifest
3. 获取 workspace lock
4. 确认 workspace 是 clean 的
5. checkout / 创建 goal-loop/<goal-id>
6. merge 最新 control/base branch
7. 读取 SPEC + 当前 Task
8. 调用 Codex
9. Codex 调用 codex-with-chatgpt
10. ChatGPT PLAN / REVIEW
11. Codex 修复直到 DONE 或 BLOCKED
12. Goal Loop commit
13. Goal Loop push
14. 更新本地 runtime state
15. 根据 task/phase/goal 决定继续或暂停
```

Goal Loop 实际调用 Codex 的形式等价于：

```text
codex exec --full-auto -C <workspace> -
```

给 Codex 的 prompt 会要求它：

- 读取 repo instructions；
- 读取 Spec；
- 读取当前 Task；
- 使用 `codex-with-chatgpt`；
- 只实现当前 scope；
- 跑测试；
- 经过 ChatGPT 独立 review；
- review 不通过就继续修；
- 不自己 commit / push。

Git commit/push 统一由 Goal Loop 管，这样状态更确定。

---

# Branch 模型

默认工作分支：

```text
goal-loop/<goal-id>
```

例如：

```text
goal-loop/HZ-004
```

默认 control branch：

```text
origin/main
```

可以通过环境变量修改：

```bash
export GOAL_LOOP_CONTROL_REMOTE=origin
export GOAL_LOOP_CONTROL_BRANCH=main
```

如果本地 workspace 有未提交修改，Goal Loop 默认会拒绝开始 autonomous run，避免把你正在做的工作混进自动执行结果里。

---

# Phase Review 和 Final Review

Goal Loop 不只做单 Task review。

一个 Phase 所有 Task 都完成后，可以额外执行一次：

```text
Phase integration review
```

目的是检查：

> 单独每个 Task 都对，但组合起来有没有出问题？

整个 Goal 完成后，还可以再做一次：

```text
Final goal review
```

用完整 Spec、Acceptance Criteria、回归测试来验收最终结果。

报告会写到：

```text
reports/<goal-id>/<phase-id>.md
reports/<goal-id>/FINAL.md
```

---

# 本地安装

## 前置要求

- macOS（当前内置 background service helper 使用 `launchd`）
- Node.js >= 20
- Git
- 已安装并登录 Codex CLI
- 目标 workspace 已安装并配置好 `codex-with-chatgpt`

前台手动运行并不强依赖 macOS，但自动常驻 watcher 目前使用的是 macOS `launchd`。

## 安装 Goal Loop Runner

```bash
git clone https://github.com/j840120531/goal-loop.git
cd goal-loop
npm install
npm run build
npm test
npm link
```

验证：

```bash
goal-loop --help
```

## 给某个项目 bootstrap

```bash
goal-loop bootstrap --workspace /path/to/project
goal-loop doctor --workspace /path/to/project
```

`doctor` 会检查：

- 当前目录是不是 Git repo；
- Codex 命令是否可用；
- `codex-with-chatgpt` Skill 是否存在；
- control remote 是否配置；
- control branch 能不能 fetch；
- `.goal-loop/dispatch` 是否存在。

## 手动跑一次

```bash
goal-loop run --workspace /path/to/project
```

## 安装 macOS 常驻 watcher

```bash
goal-loop install-service --workspace /path/to/project
```

默认每 30 秒轮询一次。

日志：

```text
~/Library/Logs/goal-loop/
```

卸载：

```bash
goal-loop uninstall-service --workspace /path/to/project
```

---

# 让 Codex 一次性帮你装好

见：

[`INSTALL_FOR_CODEX.md`](INSTALL_FOR_CODEX.md)

建议直接在目标项目里让 Codex：

```text
clone / pull Goal Loop
-> 运行 build/test
-> npm link
-> bootstrap 当前项目
-> doctor
-> 检查 codex-with-chatgpt
-> 安装 watcher
-> 不要自动创建真实 Goal
```

---

# 推荐的日常使用流程

## 1. 先 Grill

在绑定对应 workspace 的 ChatGPT Project 里：

```text
/grill
我想修改模拟医生的拒绝逻辑……
```

一直讨论到 `SPEC-READY`。

然后：

```text
spec it
```

## 2. 人工确认需求方向

这一步不要省。

先确认：

- 问题定义对不对；
- scope 对不对；
- non-goals 对不对；
- acceptance criteria 能不能验证。

## 3. 派发一个 Phase

```text
/goal phase
```

Goal Loop Web Skill 会写：

```text
SPEC.md
PHASES.md
tasks/*.md
dispatch.json
```

## 4. 本地自动开始执行

Goal Loop watcher：

```text
git fetch
-> 看到新 revision
-> 自动启动 Codex
```

## 5. Codex + ChatGPT 自动审查

```text
Codex
  -> EXECUTED
ChatGPT
  -> REVIEW
有问题
  -> PLAN
Codex
  -> 修
ChatGPT
  -> DONE
```

## 6. Phase 完成后看 Report

```text
reports/<goal-id>/<phase-id>.md
```

## 7. 决定是否继续

如果是 `phase` 模式：

> 你确认继续后，网页 GPT 增加 manifest `revision`。

如果想整条一路做完：

```text
/goal full
```

或者：

```text
/loop
```

---

# Status 与故障排查

查看 Goal Loop 状态：

```bash
goal-loop status --workspace /path/to/project
```

健康检查：

```bash
goal-loop doctor --workspace /path/to/project
```

## 为什么任务没有启动？

常见原因：

- manifest `status` 不是 `ready`；
- 到了 Task / Phase 边界但没有增加 `revision`；
- workspace 有未提交修改；
- control branch fetch 失败；
- `codex-with-chatgpt` Skill 不存在；
- Spec 或 Task 文件缺失；
- 另一个 Goal Loop process 已经持有 workspace lock。

## 为什么任务变成 BLOCKED？

常见原因：

- Codex 执行失败；
- C2C review 返回 BLOCKED；
- Acceptance Criteria 无法满足；
- Phase / Final review 没通过；
- Git merge / push 失败；
- 当前 repo 实际状态和已批准 Spec 冲突。

Goal Loop 的原则是：

> 失败就停，不要为了“看起来完成”而偷偷跳过验收条件。

---

# 安全边界

Goal Loop 是调度器，不是完整安全沙箱。

`codex exec --full-auto` 权限很强。

建议：

- 始终使用独立工作分支；
- Spec 写清楚；
- Acceptance Criteria 可验证；
- 默认使用 `phase`；
- 高风险改动使用 `task`；
- 只有 scope 已经稳定时才使用 `/loop`；
- 不要用无人值守的 full-goal 模式做破坏性 migration、credential rotation、生产基础设施变更等需要显式人工确认的操作。

详见：

[`docs/SECURITY.md`](docs/SECURITY.md)

---

# Repo 目录结构

```text
.
├── README.md
├── README.zh-CN.md
├── INSTALL_FOR_CODEX.md
├── package.json
├── examples/
│   └── dispatch.example.json
├── docs/
│   ├── CHATGPT_SKILL.md
│   └── SECURITY.md
├── skills/
│   ├── grill-me/
│   │   └── SKILL.md
│   └── goal-loop/
│       └── SKILL.md
├── src/
│   ├── cli.js
│   ├── codex.js
│   ├── config.js
│   ├── git.js
│   ├── manifest.js
│   ├── process.js
│   ├── prompts.js
│   ├── reports.js
│   ├── runner.js
│   ├── service.js
│   ├── state.js
│   └── util.js
└── test/
```

---

# 开发

```bash
npm install
npm run build
npm test
```

如果修改 orchestration 行为，至少要验证：

- manifest validation；
- task / phase revision gate；
- branch 行为；
- fake-Codex E2E；
- BLOCKED state 行为。

---

# 设计原则

1. **Repo 才是持久化合同。** Chat history 是上下文，但真正执行应该以 Git 里的 Spec/Task 为准。
2. **先确认人类意图，再给自治权。** 先 Grill，再 Dispatch。
3. **自治程度分级。** Task、Phase、Goal 是不同的权限边界。
4. **Codex 执行，ChatGPT 独立 Review。** 不让同一个 Agent 自己实现、自己验收。
5. **Runtime state 放本地。** 不污染 Git 历史。
6. **Acceptance Criteria 比“Agent 说已经好了”更重要。**
7. **遇到冲突或不确定就停。** 不要偷偷扩大 scope 让任务看起来能通过。

---

# 当前 Scope

Goal Loop 当前聚焦的是：

> 单机、本地 Codex、Git-backed、ChatGPT Web 驱动的开发闭环。

它目前不是：

- 多用户托管 CI 平台；
- 通用远程执行服务；
- GitHub Actions 替代品；
- `codex-with-chatgpt` 替代品；
- 完整 multi-agent swarm runtime。

当前目标非常明确：

```text
ChatGPT Web
  -> repo
  -> local Codex
  -> ChatGPT review
  -> report
```

把这条链路做得足够清楚、可检查、可暂停、可恢复、可控。
