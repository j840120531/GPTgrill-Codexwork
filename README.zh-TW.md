# GPTgrill-Codexwork

[English](README.md) · [简体中文](README.zh-CN.md)

**讓高能力模型負責思考與決策，讓高效率 Agent 負責執行，並讓 Git 成為工程事實來源。**

GPTgrill-Codexwork 是一套開源編排層，用來連接 **ChatGPT 網頁端的規劃能力** 與 **本地 Codex 的執行能力**。

核心思路是模型分工：

- 在 ChatGPT Web 使用高能力模型，例如 **GPT-5.6 Sol High**，處理需求澄清、架構、Spec、關鍵決策與 Review；
- 在 Codex 端使用更適合大量執行工作的模型配置，例如環境支援時的 **Luna Max + subagents**，處理程式閱讀、實作、測試、除錯與平行工作；
- 使用 **Git** 持久化 Spec、Task、Dispatch 與 Report，讓網頁規劃層和本地執行層共享同一份工程事實。

這樣可以避免讓最強模型承擔所有機械式實作工作，同時把高品質推理集中在真正需要判斷的節點。模型名稱、額度和可用性可能隨產品變化；本專案並不依賴任何模型「永久免費」或「永久無限」。

---

## 工作方式

```text
ChatGPT Web
  /grill
  需求 / 架構 / 決策
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
  監聽 control branch
        │
        ▼
Codex CLI + subagents
  實作 / 測試 / 修復
        │
        ▼
codex-with-chatgpt
  PLAN / REVIEW / FIX
        │
        ▼
Git branch + Phase/Final Report
```

GPTgrill-Codexwork 不取代 `codex-with-chatgpt`；它是在其上增加持久化調度與狀態管理的一層。

---

## 元件

| 元件 | 職責 |
|---|---|
| **Grill Me Web Skill** | 澄清真實問題、約束、Non-goals、邊界條件與驗收標準。 |
| **GPTgrill-Codexwork Web Skill** | 把確認後的規劃寫成 Repo artifact 與 Dispatch manifest。 |
| **GPTgrill-Codexwork Runner** | 監聽 Dispatch、管理執行狀態、分支、Commit、Push 與 Report。 |
| **Codex CLI** | 執行程式修改、Shell、測試與修復。 |
| **codex-with-chatgpt** | 把 Codex 接回 ChatGPT，形成獨立 Plan / Review / Fix 迴圈。 |
| **Git** | 作為規劃層與執行層之間的持久化事實來源。 |

---

## 快速開始

### 需求

- Node.js 20+
- Git
- Shell 中可用的 Codex CLI
- Codex 環境中已安裝 `codex-with-chatgpt`
- 使用內建 `launchd` Service 安裝器時需要 macOS
- ChatGPT 端能夠使用本專案提供的 Web Skills，並具備寫入目標 Repo artifact 的能力

### 安裝本地 Runner

從 Release 套件安裝：

```bash
npm install -g ./gptgrill-codexwork-local-vX.Y.Z.tgz
gptgrill-codexwork --help
```

從原始碼安裝：

```bash
git clone https://github.com/j840120531/GPTgrill-Codexwork.git
cd GPTgrill-Codexwork
npm install
npm run check
npm link
```

### 接入一個專案 Repo

```bash
gptgrill-codexwork bootstrap --workspace /path/to/project
gptgrill-codexwork doctor --workspace /path/to/project
gptgrill-codexwork install-service --workspace /path/to/project
gptgrill-codexwork status --workspace /path/to/project
```

`bootstrap` 會建立控制目錄：

```text
.gptgrill-codexwork/
  README.md
  dispatch/
```

執行時狀態保存在專案 Repo 外部的 `~/.gptgrill-codexwork/`。

需要交給 Codex 自動完成安裝時，可參考 [`INSTALL_FOR_CODEX.md`](INSTALL_FOR_CODEX.md)。

---

## Web Skills

專案包含兩個 Web Skill：

```text
skills/grill-me/SKILL.md
skills/gptgrill-codexwork/SKILL.md
```

Tagged Release 也會提供可直接上傳的 Skill ZIP 套件。

典型規劃流程：

```text
/grill
  -> 挑戰假設並澄清需求

spec it
  -> 產出可進入 Spec 的需求總結

/goal phase
  -> 寫入 SPEC / PHASES / TASKS / dispatch
```

### 自治模式

| 模式 | 行為 |
|---|---|
| `task` | 執行一個 Task，完成 Review 後停在人工確認邊界。 |
| `phase` | 完成目前 Phase 的剩餘 Task，執行整合 Review，寫 Phase Report，然後停止。 |
| `goal` | 連續執行所有剩餘 Phase 與 Final Review，直到完成或 Blocked。 |

對大多數開發任務，`phase` 是較合適的預設模式。

---

## Repo Contract

接入後的專案通常會包含：

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

Dispatch manifest 是執行觸發器：

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

標準範例見 [`examples/dispatch.example.json`](examples/dispatch.example.json)。

### `revision` 作為人工授權令牌

在 `task` 和 `phase` 模式中，如果已經到達停止邊界，需要提高 manifest 的 `revision` 才會繼續執行：

```text
revision: 1 -> 2
```

這可以避免常駐 watcher 在沒有新的明確授權時繼續向下執行。

---

## 執行與安全模型

在啟動自動執行前，Runner 會要求 Workspace 乾淨、Fetch 指定 Control Branch、取得 Workspace Lock，並驗證 Dispatch State。

典型執行流程：

```text
fetch control branch
→ 選擇可執行 dispatch
→ checkout/create gptgrill-codexwork/<goal-id>
→ 呼叫 Codex
→ 執行 C2C plan/review/fix loop
→ 由 Runner commit + push
→ 更新 runtime state
→ 依自治模式繼續或停止
```

主要安全機制包括：

- 存在無關未提交修改時，不啟動自動執行；
- 每個 Workspace 獨立加鎖；
- Task / Phase 繼續執行需要明確 Revision Gate；
- Review 迴圈有最大次數限制；
- Spec 與 Report 存 Git，瞬時 Runtime State 存在 Git 外；
- 編排執行期間，Codex 被要求不要自行 Commit 或 Push。

安全與信任模型見 [`docs/SECURITY.md`](docs/SECURITY.md)。

---

## 多專案運作

每個 Repo 都可以安裝獨立 Watcher 與 Runtime State，因此同一台機器可以同時監控多個專案：

```text
Project A -> watcher A -> Codex
Project B -> watcher B -> Codex
Project C -> watcher C -> Codex
```

目前版本以 Workspace 為單位隔離執行。全域跨專案並發上限與 Priority Queue 尚未實作。

---

## Controller Chat 整合

對話路由由 `codex-with-chatgpt` 管理，而不是由 Runner 本身管理。

某個 Workspace 可以選擇綁定一個長期 Controller Chat：

```bash
c2c session set \
  -w /path/to/project \
  --mode long-chat \
  --url "https://chatgpt.com/c/<conversation-id>"
```

Git 始終是長期工程事實來源；Controller Chat 是推理與 Review Workspace，需要時可以更換。

---

## 目前限制

- 自動執行目前呼叫本地 `codex` CLI，而不是直接驅動 Codex App GUI。
- `install-service` 目前針對 macOS `launchd`；也可以直接使用 CLI 的 `run` 或 `watch`。
- 尚未提供跨專案的全域並發限制與優先佇列。
- 網頁端寫入 Repo 的能力取決於 ChatGPT 環境與已連接倉庫的權限。

---

## 文件

- [`INSTALL_FOR_CODEX.md`](INSTALL_FOR_CODEX.md) — 引導式安裝
- [`docs/CHATGPT_SKILL.md`](docs/CHATGPT_SKILL.md) — Web Skill 說明
- [`docs/SECURITY.md`](docs/SECURITY.md) — 安全與信任模型
- [`docs/RELEASE.md`](docs/RELEASE.md) — Release 流程

---

## License

MIT，見 [`LICENSE`](LICENSE)。
