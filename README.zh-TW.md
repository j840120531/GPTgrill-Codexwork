# GPTgrill-Codexwork

[English](README.md) · [简体中文](README.zh-CN.md)

**讓高能力模型負責思考與決策，讓高效率 Agent 負責執行。**

GPTgrill-Codexwork 的核心目的，是把 **ChatGPT 網頁端的高品質推理能力** 與 **本地 Codex 的工程執行能力** 串成一套可持續運作的開發工作流。

在 ChatGPT 網頁端，可以依不同產品或 Repo 建立獨立 Project，使用當下可用的高能力模型（例如 GPT-5.6 Sol High）進行需求討論、Grill、架構設計、Spec 撰寫與關鍵決策。這一層負責的是「先把要做什麼想清楚」，並優先利用 ChatGPT 網頁端既有方案與額度，而不是把所有高階推理都轉成額外的 API token 消耗。

需求定案後，GPTgrill-Codexwork 會把結果轉成可執行的 Spec、Phase、Task 與 Dispatch，交給本地 Codex。Codex 端則可以使用更適合大量執行工作的模型與設定，例如在環境支援時使用 Luna Max 搭配 subagents，平行處理程式閱讀、實作、測試、除錯與驗證；遇到需要高階判斷或獨立 Review 的節點，再透過 `codex-with-chatgpt` 回到 ChatGPT Controller Chat。

換句話說，這套工具不是要讓最強模型包辦所有工作，而是刻意做**模型分工**：

```text
ChatGPT Web / GPT-5.6 Sol High
  -> Grill / 需求澄清 / 架構 / Spec / 關鍵決策 / Review

Git + GPTgrill-Codexwork
  -> 保存工程狀態 / 任務調度 / Phase & Task 邊界 / 自動交接

Codex / Luna Max + subagents（若環境支援）
  -> 大量程式閱讀 / 實作 / 測試 / 修復 / 平行工作

ChatGPT Web
  -> 獨立審查 / 階段性決策 / 下一輪規劃
```

這樣做的目標，是在維持高品質決策的同時，把大量執行工作交給速度更快、成本更低的 Agent 層，降低不必要的高階模型 token 消耗，並讓一個人能更有效率地同時管理多個專案與 Repo。

> 模型名稱、方案與可用額度可能隨 OpenAI 產品調整。本專案不假設任何模型「永久免費」或「永久無上限」；核心設計是把高成本推理集中在真正需要的節點，並讓執行層盡量使用更高效率的模型與 subagents。

---

## GPTgrill-Codexwork 解決什麼問題

沒有 GPTgrill-Codexwork 時，一個典型流程往往是：

1. 在 ChatGPT 網頁裡討論需求。
2. 把需求問清楚。
3. 寫 Spec。
4. 手動切到 Codex。
5. 告訴 Codex 去讀哪個 Spec / Task。
6. 等 Codex 實現。
7. 再手動回 ChatGPT 做 review。
8. 把 review 意見複製回 Codex。
9. 每一個 Task、每一個 Phase 都重複一次。

GPTgrill-Codexwork 主要自動化的是第 4-9 步。

理想體驗會變成：

```text
/grill
  -> 把需求問清楚
spec it
  -> 收斂成 spec-ready 的需求總結
/goal phase
  -> 寫 SPEC / PHASES / TASKS / dispatch
  -> 本地 GPTgrill-Codexwork 自動發現任務
  -> Codex 自動執行
  -> ChatGPT 透過 codex-with-chatgpt 自動審查
  -> Codex 自動修復
  -> 生成 Phase Report
  -> 停下來等你確認下一階段
```

如果你明確想一路跑到底：

```text
/loop
  -> 一直按 Phase 執行
  -> 直到整個 Goal 完成或 BLOCKED
```

---

# 整體架構

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ChatGPT 網頁 Project                                                │
│                                                                     │
│  Grill Me Skill                                                     │
│      │                                                              │
│      ├─ 澄清問題 / 約束 / Non-goals / Acceptance Criteria          │
│      ▼                                                              │
│  GPTgrill-Codexwork Web Skill                                                │
│      │                                                              │
│      ├─ SPEC.md                                                     │
│      ├─ PHASES.md                                                   │
│      ├─ tasks/*.md                                                  │
│      └─ .gptgrill-codexwork/dispatch/<goal-id>.json                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ GitHub / control branch
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 目標專案 Repo                                                       │
│                                                                     │
│  specs/...                 .gptgrill-codexwork/dispatch/...                  │
│       │                            │                                │
└───────┼────────────────────────────┼────────────────────────────────┘
        │                            │ git fetch
        │                            ▼
        │                   ┌────────────────────┐
        │                   │ GPTgrill-Codexwork Runner   │
        │                   │ 本地排程 / 狀態機  │
        │                   └─────────┬──────────┘
        │                             │ codex exec --full-auto
        │                             ▼
        │                        ┌──────────┐
        │                        │  Codex   │
        │                        └────┬─────┘
        │                             │ 使用已安裝 Skill
        │                             ▼
        │                  ┌──────────────────────┐
        └─────────────────►│ codex-with-chatgpt   │
                           │ PLAN / REVIEW / FIX  │
                           └──────────┬───────────┘
                                      │
                                      ▼
                                  ChatGPT 審查
```

## 每一層分別負責什麼

| 元件 | 負責 | 不應該負責 |
|---|---|---|
| ChatGPT Web | 需求、規劃、Spec、Review、面向使用者的決策 | 本地 shell 執行 |
| Grill Me Skill | 把“到底要做什麼”問清楚 | 實現程式碼 |
| GPTgrill-Codexwork Web Skill | 把確認後的需求寫成 repo artifact + dispatch | 啟動本地程序 |
| GPTgrill-Codexwork Runner | 監聽 dispatch、決定下一個 Task、狀態機、commit/push、report | 產品方向 |
| Codex | 改檔案、跑命令、測試、實現 | 長期 scope 決策 |
| codex-with-chatgpt | Codex ↔ ChatGPT 的 plan/review/fix 迴圈 | Phase/Task 排程 |
| Git | 持久化的工程事實與交接層 | 臨時 runtime 狀態 |

---

# 重要：GPTgrill-Codexwork 有兩部分

“GPTgrill-Codexwork”這個名字同時指網頁 Skill 和本地 Runner，第一次看很容易混淆。

## 1. ChatGPT 網頁 Skill

檔案：

```text
skills/gptgrill-codexwork/SKILL.md
```

這個安裝在 ChatGPT 網頁裡。

它**不會直接在你的 Mac 上執行 Codex**。

它做的是：

```text
討論結果
  -> SPEC.md
  -> PHASES.md
  -> tasks/*.md
  -> .gptgrill-codexwork/dispatch/<goal-id>.json
```

## 2. 本地 GPTgrill-Codexwork Runner

就是這個整個 repo 在 Mac 上的安裝版本。

它負責：

```text
git fetch
  -> 找到新的 dispatch
  -> 判斷是否允許執行
  -> 自動啟動 Codex
  -> 管理 Task/Phase/Goal 狀態
  -> commit / push
  -> 生成報告
```

所以完整安裝關係是：

```text
ChatGPT 網頁
  ├─ Grill Me Skill
  └─ GPTgrill-Codexwork Skill

Mac 本地
  ├─ GPTgrill-Codexwork Runner
  ├─ Codex CLI
  └─ codex-with-chatgpt Skill
```

---

# 和 codex-with-chatgpt 會不會衝突？

不會。

GPTgrill-Codexwork 就是按“你已經裝了 codex-with-chatgpt”這個前提設計的。

兩者職責不同：

```text
GPTgrill-Codexwork
  決定：下一步應該跑哪個 Task？
  決定：跑完一個 Task / Phase 後要不要停？
  管理：branch、runtime state、commit/push、report

codex-with-chatgpt
  和 ChatGPT 一起決定：這個 Task 應該怎麼實現？
  讓 ChatGPT 獨立讀取當前 workspace 做 review
  迴圈：PLAN -> EXECUTION -> EXECUTED -> REVIEW -> PLAN/DONE
```

`gptgrill-codexwork doctor` 還會主動檢查 Codex 環境裡有沒有安裝 `codex-with-chatgpt` Skill。

---

# ChatGPT Project 和本地 workspace 怎麼繫結？

GPTgrill-Codexwork 本身不會把“任意網頁對話”繫結到“任意本地目錄”。

workspace 身份主要由 **codex-with-chatgpt** 管理。

推薦模型是：

```text
一個本地 workspace
    ↕
一個 codex-with-chatgpt connector
    ↕
一個 ChatGPT Project
```

這可以避免一個無關的普通 Chat 意外控制到錯誤的本地 repo。

GPTgrill-Codexwork 本地 Runner 只會處理你在那個 workspace 中配置的 Git repo，以及該 repo control branch 上出現的 dispatch。

## Project mode 和固定 Controller Chat

`codex-with-chatgpt` 支援不同對話模式。

如果你希望：

- 平時就在一個主對話裡討論需求，
- `/grill` 也在這裡，
- `/goal phase` 也在這裡，
- Codex 的 C2C plan/review 也回到這裡，
- Phase 完成後繼續在這裡彙報，

可以把一個長期對話作為 **Controller Chat**，並使用 `long-chat` 模式。

例如：

```bash
c2c session -w /path/to/project --json

c2c session set \
  -w /path/to/project \
  --mode long-chat \
  --url "https://chatgpt.com/c/<controller-chat-id>"
```

這是可選配置。

GPTgrill-Codexwork 自己不管理 ChatGPT conversation URL；對話路由屬於 `codex-with-chatgpt`。

---

# 網頁 Skills

當前 repo 內有兩個網頁 Skill。

## Grill Me

檔案：

```text
skills/grill-me/SKILL.md
```

用途：

- 把真實問題問清楚；
- 區分“目標”和“你當前想到的解決方案”；
- 挑戰假設；
- 明確 scope / non-goals；
- 找出約束、邊界條件、失敗場景；
- 寫出可驗證的 acceptance criteria。

常用控制：

```text
/grill
harder
skip
summary
spec it
```

其中：

- `/grill`：開始或繼續需求追問；
- `harder`：更強地挑戰假設和矛盾；
- `skip`：跳過當前問題；
- `summary`：看目前已經確認到哪裡；
- `spec it`：需求足夠清楚後，生成 spec-ready synthesis。

`spec it` 不會直接啟動 Codex。

## GPTgrill-Codexwork Web Skill

檔案：

```text
skills/gptgrill-codexwork/SKILL.md
```

用途：

- 把已經確認的需求寫成正式 Spec；
- 拆 Phase；
- 拆 Task；
- 寫 dispatch；
- 選擇自治級別。

常用控制：

```text
/goal task
/goal phase
/goal full
/loop
```

## 網頁手動安裝 Skill

如果你的 ChatGPT 網頁支援直接上傳 Skill，分別上傳：

```text
skills/grill-me/SKILL.md
skills/gptgrill-codexwork/SKILL.md
```

**不要把整個 gptgrill-codexwork repo ZIP 當成一個 Skill 上傳。**

如果你是在 GitHub 上點：

```text
Code -> Download ZIP
```

下載整個倉庫，那麼先解壓，然後找到：

```text
gptgrill-codexwork-main/
  skills/
    grill-me/
      SKILL.md
    gptgrill-codexwork/
      SKILL.md
```

把這兩個 `SKILL.md` 分別上傳即可。

---

# 三種自治模式

GPTgrill-Codexwork 故意把自治程度分成三檔。

## `task`

只做當前一個未完成 Task，審查、push，然後暫停。

適合：

- 高風險功能；
- 需求還在變化；
- 你想緊密控制每一步。

```text
Task 1
  -> Codex
  -> ChatGPT review
  -> fix loop
  -> PASS
  -> pause
```

## `phase`

做完整個當前 Phase，執行 Phase integration review，生成報告，push，然後暫停。

這是**推薦預設模式**。

```text
P1-T01 -> review/fix
P1-T02 -> review/fix
P1-T03 -> review/fix
       -> phase integration review
       -> phase report
       -> pause
```

## `goal`

從當前狀態一路做完整個 Goal，包括最終 review。

對應：

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

如果中間 BLOCKED，會停止。

---

# 目標專案中會產生哪些檔案

一個典型專案最終會長這樣：

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

.gptgrill-codexwork/
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

應該進 Git 的內容：

- Spec；
- Task；
- Acceptance Criteria；
- Phase 定義；
- Report；
- Dispatch policy。

不應該進 Git 的 runtime state：

- 當前執行到哪個 Task；
- 當前 Phase；
- PID；
- lock；
- 本地錯誤狀態；
- watcher 內部執行狀態。

GPTgrill-Codexwork 把 runtime state 放在：

```text
~/.gptgrill-codexwork/state/<workspace-hash>/<goal-id>.json
```

這樣不會產生大量無意義的狀態 commit。

---

# Dispatch manifest

網頁 GPT 會寫：

```text
.gptgrill-codexwork/dispatch/<goal-id>.json
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

標準例子見：

[`examples/dispatch.example.json`](examples/dispatch.example.json)

## `revision` 是“明確授權繼續”的 token

`revision` 從 `1` 開始。

對於 `task` 和 `phase` 模式，GPTgrill-Codexwork 到人工邊界後會主動暫停。

如果你想繼續，網頁端應該把：

```text
revision: 1
```

改成：

```text
revision: 2
```

這代表：

> 使用者已經明確批准下一次執行。

這樣即使 watcher 每 30 秒一直輪詢，也不會因為“服務還活著”就偷偷繼續下一階段。

如果之前是 BLOCKED，修好 Spec / Task 後也應該同步增加 `revision`，才會允許再次執行。

---

# Task 應該怎麼寫

不要寫這種：

```text
最佳化 evaluator。
```

這種 Task 對自動執行幾乎沒有約束力。

推薦寫成：

```markdown
# P1-T01 — Evaluator output validation

## Objective
讓非法 evaluator 輸出穩定失敗，並返回確定性的錯誤。

## Acceptance Criteria
- [ ] 合法輸出透過 schema validation。
- [ ] 非法輸出返回確定性的 validation error。
- [ ] 現有 smoke cases 全部保持透過。
- [ ] 不改變 scoring semantics。

## Constraints
- 保持現有 public response schema。
- 不修改無關評分邏輯。

## Out of Scope
- 新增 evaluator 維度。
- UI 修改。
```

自動審查是否靠譜，很大程度取決於 Acceptance Criteria 是否明確。

---

# 本地執行時到底發生什麼

每個 Task 大致會經歷：

```text
1. fetch control branch
2. 找到可執行 manifest
3. 獲取 workspace lock
4. 確認 workspace 是 clean 的
5. checkout / 建立 gptgrill-codexwork/<goal-id>
6. merge 最新 control/base branch
7. 讀取 SPEC + 當前 Task
8. 呼叫 Codex
9. Codex 呼叫 codex-with-chatgpt
10. ChatGPT PLAN / REVIEW
11. Codex 修復直到 DONE 或 BLOCKED
12. GPTgrill-Codexwork commit
13. GPTgrill-Codexwork push
14. 更新本地 runtime state
15. 根據 task/phase/goal 決定繼續或暫停
```

GPTgrill-Codexwork 實際呼叫 Codex 的形式等價於：

```text
codex exec --full-auto -C <workspace> -
```

給 Codex 的 prompt 會要求它：

- 讀取 repo instructions；
- 讀取 Spec；
- 讀取當前 Task；
- 使用 `codex-with-chatgpt`；
- 只實現當前 scope；
- 跑測試；
- 經過 ChatGPT 獨立 review；
- review 不透過就繼續修；
- 不自己 commit / push。

Git commit/push 統一由 GPTgrill-Codexwork 管，這樣狀態更確定。

---

# Branch 模型

預設工作分支：

```text
gptgrill-codexwork/<goal-id>
```

例如：

```text
gptgrill-codexwork/HZ-004
```

預設 control branch：

```text
origin/main
```

可以透過環境變數修改：

```bash
export GPTGRILL_CODEXWORK_CONTROL_REMOTE=origin
export GPTGRILL_CODEXWORK_CONTROL_BRANCH=main
```

如果本地 workspace 有未提交修改，GPTgrill-Codexwork 預設會拒絕開始 autonomous run，避免把你正在做的工作混進自動執行結果裡。

---

# Phase Review 和 Final Review

GPTgrill-Codexwork 不只做單 Task review。

一個 Phase 所有 Task 都完成後，可以額外執行一次：

```text
Phase integration review
```

目的是檢查：

> 單獨每個 Task 都對，但組合起來有沒有出問題？

整個 Goal 完成後，還可以再做一次：

```text
Final goal review
```

用完整 Spec、Acceptance Criteria、迴歸測試來驗收最終結果。

報告會寫到：

```text
reports/<goal-id>/<phase-id>.md
reports/<goal-id>/FINAL.md
```

---

# 本地安裝

## 前置要求

- macOS（當前內建 background service helper 使用 `launchd`）
- Node.js >= 20
- Git
- 已安裝並登入 Codex CLI
- 目標 workspace 已安裝並配置好 `codex-with-chatgpt`

前臺手動執行並不強依賴 macOS，但自動常駐 watcher 目前使用的是 macOS `launchd`。

## 安裝 GPTgrill-Codexwork Runner

```bash
git clone https://github.com/j840120531/GPTgrill-Codexwork.git
cd gptgrill-codexwork
npm install
npm run build
npm test
npm link
```

驗證：

```bash
gptgrill-codexwork --help
```

## 給某個專案 bootstrap

```bash
gptgrill-codexwork bootstrap --workspace /path/to/project
gptgrill-codexwork doctor --workspace /path/to/project
```

`doctor` 會檢查：

- 當前目錄是不是 Git repo；
- Codex 命令是否可用；
- `codex-with-chatgpt` Skill 是否存在；
- control remote 是否配置；
- control branch 能不能 fetch；
- `.gptgrill-codexwork/dispatch` 是否存在。

## 手動跑一次

```bash
gptgrill-codexwork run --workspace /path/to/project
```

## 安裝 macOS 常駐 watcher

```bash
gptgrill-codexwork install-service --workspace /path/to/project
```

預設每 30 秒輪詢一次。

日誌：

```text
~/Library/Logs/gptgrill-codexwork/
```

解除安裝：

```bash
gptgrill-codexwork uninstall-service --workspace /path/to/project
```

---

# 讓 Codex 一次性幫你裝好

見：

[`INSTALL_FOR_CODEX.md`](INSTALL_FOR_CODEX.md)

建議直接在目標專案裡讓 Codex：

```text
clone / pull GPTgrill-Codexwork
-> 執行 build/test
-> npm link
-> bootstrap 當前專案
-> doctor
-> 檢查 codex-with-chatgpt
-> 安裝 watcher
-> 不要自動建立真實 Goal
```

---

# 推薦的日常使用流程

## 1. 先 Grill

在繫結對應 workspace 的 ChatGPT Project 裡：

```text
/grill
我想修改模擬醫生的拒絕邏輯……
```

一直討論到 `SPEC-READY`。

然後：

```text
spec it
```

## 2. 人工確認需求方向

這一步不要省。

先確認：

- 問題定義對不對；
- scope 對不對；
- non-goals 對不對；
- acceptance criteria 能不能驗證。

## 3. 派發一個 Phase

```text
/goal phase
```

GPTgrill-Codexwork Web Skill 會寫：

```text
SPEC.md
PHASES.md
tasks/*.md
dispatch.json
```

## 4. 本地自動開始執行

GPTgrill-Codexwork watcher：

```text
git fetch
-> 看到新 revision
-> 自動啟動 Codex
```

## 5. Codex + ChatGPT 自動審查

```text
Codex
  -> EXECUTED
ChatGPT
  -> REVIEW
有問題
  -> PLAN
Codex
  -> 修
ChatGPT
  -> DONE
```

## 6. Phase 完成後看 Report

```text
reports/<goal-id>/<phase-id>.md
```

## 7. 決定是否繼續

如果是 `phase` 模式：

> 你確認繼續後，網頁 GPT 增加 manifest `revision`。

如果想整條一路做完：

```text
/goal full
```

或者：

```text
/loop
```

---

# Status 與故障排查

檢視 GPTgrill-Codexwork 狀態：

```bash
gptgrill-codexwork status --workspace /path/to/project
```

健康檢查：

```bash
gptgrill-codexwork doctor --workspace /path/to/project
```

## 為什麼任務沒有啟動？

常見原因：

- manifest `status` 不是 `ready`；
- 到了 Task / Phase 邊界但沒有增加 `revision`；
- workspace 有未提交修改；
- control branch fetch 失敗；
- `codex-with-chatgpt` Skill 不存在；
- Spec 或 Task 檔案缺失；
- 另一個 GPTgrill-Codexwork process 已經持有 workspace lock。

## 為什麼任務變成 BLOCKED？

常見原因：

- Codex 執行失敗；
- C2C review 返回 BLOCKED；
- Acceptance Criteria 無法滿足；
- Phase / Final review 沒透過；
- Git merge / push 失敗；
- 當前 repo 實際狀態和已批准 Spec 衝突。

GPTgrill-Codexwork 的原則是：

> 失敗就停，不要為了“看起來完成”而偷偷跳過驗收條件。

---

# 安全邊界

GPTgrill-Codexwork 是排程器，不是完整安全沙箱。

`codex exec --full-auto` 許可權很強。

建議：

- 始終使用獨立工作分支；
- Spec 寫清楚；
- Acceptance Criteria 可驗證；
- 預設使用 `phase`；
- 高風險改動使用 `task`；
- 只有 scope 已經穩定時才使用 `/loop`；
- 不要用無人值守的 full-goal 模式做破壞性 migration、credential rotation、生產基礎設施變更等需要顯式人工確認的操作。

詳見：

[`docs/SECURITY.md`](docs/SECURITY.md)

---

# Repo 目錄結構

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
│   └── gptgrill-codexwork/
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

# 開發

```bash
npm install
npm run build
npm test
```

如果修改 orchestration 行為，至少要驗證：

- manifest validation；
- task / phase revision gate；
- branch 行為；
- fake-Codex E2E；
- BLOCKED state 行為。

---

# 設計原則

1. **Repo 才是持久化合同。** Chat history 是上下文，但真正執行應該以 Git 裡的 Spec/Task 為準。
2. **先確認人類意圖，再給自治權。** 先 Grill，再 Dispatch。
3. **自治程度分級。** Task、Phase、Goal 是不同的許可權邊界。
4. **Codex 執行，ChatGPT 獨立 Review。** 不讓同一個 Agent 自己實現、自己驗收。
5. **Runtime state 放本地。** 不汙染 Git 歷史。
6. **Acceptance Criteria 比“Agent 說已經好了”更重要。**
7. **遇到衝突或不確定就停。** 不要偷偷擴大 scope 讓任務看起來能透過。

---

# 當前 Scope

GPTgrill-Codexwork 當前聚焦的是：

> 單機、本地 Codex、Git-backed、ChatGPT Web 驅動的開發閉環。

它目前不是：

- 多使用者託管 CI 平臺；
- 通用遠端執行服務；
- GitHub Actions 替代品；
- `codex-with-chatgpt` 替代品；
- 完整 multi-agent swarm runtime。

當前目標非常明確：

```text
ChatGPT Web
  -> repo
  -> local Codex
  -> ChatGPT review
  -> report
```

把這條鏈路做得足夠清楚、可檢查、可暫停、可恢復、可控。
