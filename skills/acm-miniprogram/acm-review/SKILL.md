---
name: acm-review
description: "Automated code review and self-iterative optimization for the AMC 8 WeChat mini program."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [WeChat, MiniProgram, Code-Review, AMC8, Cloud-Functions, Automation, Iteration]
    related_skills: [github-code-review, github-pr-workflow, github-auth]
    config:
      - key: github_token
        description: "GitHub personal access token for posting PR/Issue comments"
      - key: repo_path
        description: "Absolute path to the amc8-miniprogram project root"
---

# AMC 8 小程序自动化 Code Review 技能

本技能指导 Hermes Agent 对 `amc8-miniprogram/` 进行全面代码审查，生成结构化报告，并将优化建议写回 GitHub Issue / PR Comment，形成持续迭代闭环。

---

## 快速开始

在 Hermes CLI 中，使用自然语言触发 Review（技能通过 `/skills load acm-review` 加载后生效）：

```
请 review AMC 8 小程序的最新变更，重点关注性能与安全。
review amc8-miniprogram 并在 GitHub 上创建 Issue 追踪问题。
请按照 acm-review 技能的工作流程对 amc8-miniprogram/ 执行全量审查。
```

---

## 1. 环境初始化

每次 Review 开始前，先确认工作目录和 GitHub 认证状态。

```bash
# 确认小程序代码目录存在
MINIPROGRAM_ROOT="${MINIPROGRAM_ROOT:-$(pwd)/amc8-miniprogram}"
if [ ! -d "$MINIPROGRAM_ROOT" ]; then
  echo "ERROR: miniprogram root not found at $MINIPROGRAM_ROOT"
  exit 1
fi
echo "Reviewing: $MINIPROGRAM_ROOT"

# 拉取最新代码
cd "$MINIPROGRAM_ROOT/.."
git fetch origin
git pull --ff-only origin main 2>/dev/null || echo "Already up to date or not on main"

# GitHub 认证检查（复用 github-auth 模式）
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  AUTH="gh"
else
  AUTH="curl"
  if [ -z "$GITHUB_TOKEN" ] && [ -f ~/.hermes/.env ]; then
    GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" ~/.hermes/.env | head -1 | cut -d= -f2 | tr -d '\n\r')
  fi
fi

# 解析仓库 owner/repo
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
echo "Repo: $OWNER/$REPO | Auth: $AUTH"
```

---

## 2. 变更范围收集

### 2a. 获取本次变更文件列表

```bash
cd "$MINIPROGRAM_ROOT/.."

# 相对于上一个 tag 或 main 分支的变更
git diff main...HEAD --name-only -- amc8-miniprogram/ 2>/dev/null \
  || git diff HEAD~1 --name-only -- amc8-miniprogram/
```

### 2b. 读取关键文件（全量审查时使用）

使用 `read_file` 工具逐一读取以下核心文件，理解完整上下文：

| 文件 | 审查要点 |
|------|---------|
| `amc8-miniprogram/app.js` | 云开发初始化、全局状态、语言切换逻辑 |
| `amc8-miniprogram/pages/*/**.js` | 页面生命周期、数据流、错误处理 |
| `amc8-miniprogram/cloudfunctions/*/index.js` | 云函数安全性、输入校验、幂等性 |
| `amc8-miniprogram/utils/util.js` | 工具函数正确性、边界处理 |
| `amc8-miniprogram/components/math-toolbar/` | 组件封装与复用性 |

### 2c. 搜索常见问题模式

```bash
cd "$MINIPROGRAM_ROOT"

# 调试语句残留
grep -rn "console\.log\|console\.error\|debugger" --include="*.js" . \
  | grep -v "cloudfunctions" | grep -v node_modules

# TODO / FIXME / HACK
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.js" --include="*.wxml" .

# 硬编码敏感信息（使用 gitleaks/trufflehog 扫描，或快速 grep 已知格式）
# 已知 GitHub token 格式、微信 AppID 格式、常见密钥命名
grep -rn \
  -e "ghp_[0-9A-Za-z]\{36,\}" \
  -e "sk-ant-[0-9A-Za-z\-]\{20,\}" \
  -e "OPENAI_API_KEY\s*=" \
  -e "wx[0-9a-f]\{16\}" \
  -e "\"env\":\s*\"[a-z0-9\-]\{8,\}\"" \
  --include="*.js" --include="*.json" . | grep -v node_modules

# wx.getUserInfo（已废弃，应使用 getUserProfile）
grep -rn "wx\.getUserInfo" --include="*.js" .

# 未处理的 Promise reject / fail 回调缺失
grep -rn "\.callFunction({" --include="*.js" . | grep -v "fail:"
```

---

## 3. 审查维度与检查清单

详细检查清单见 `references/review-checklist.md`，以下是核心维度：

### 3.1 代码质量

- **组件化程度**：重复 UI 逻辑是否已抽取为组件？`math-toolbar` 是否被合理复用？
- **异步规范**：混用 callback / Promise / async-await 的地方是否统一？
- **错误边界**：每个 `wx.cloud.callFunction` 和数据库操作是否都有 `fail`/`catch`？
- **setData 精细化**：是否避免了全量 `setData(this.data)` 导致的不必要渲染？

### 3.2 云函数安全

- **输入校验**：每个云函数的 `event` 参数是否做了类型和范围校验？
- **权限隔离**：敏感操作（如删除、投票）是否验证了 `openid`？
- **幂等性**：`voteSolution` 是否防止了重复点赞？`submitSolution` 是否防止重复提交？
- **内容安全**：`submitSolution` 对 `msgSecCheck` 失败是否有合理的降级策略？

### 3.3 性能

- **分页加载**：`_loadSolutions` 的分页是否正确（`skip + limit` 在云数据库大集合上效率低）？
- **setData 批量**：能否将多个 `setData` 合并为一次调用？
- **图片优化**：上传前是否压缩（`sizeType: ['compressed']` 已设置 ✅）？
- **冷启动**：`app.js` 的云初始化是否可延迟？

### 3.4 业务逻辑正确性

- **错题本**：`_checkErrorBook` 每次 `onLoad` 都查询一次 —— 是否需要缓存？
- **答题逻辑**：答错后自动加入错题本是否符合预期（`_toggleErrorBook(true)` 无法撤销）？
- **LaTeX 格式化**：`formatMathContent` 的正则是否覆盖所有边界（嵌套 `\[` 等）？
- **成就系统**：`getUserStats` 的成就判断逻辑是否存在竞态条件？

### 3.5 兼容性与合规

- **API 废弃**：`wx.getUserInfo` 已废弃，应改用 `wx.getUserProfile`（submit-solution.js 中已使用 ✅，其他页面需核查）。
- **版权合规**：题目数据是否与解析完全隔离（`questions` vs `user_solutions` 集合）？
- **隐私协议**：调用 `wx.getUserProfile` 前的 `desc` 字段是否合规？

---

## 4. 生成 Review 报告

审查完成后，使用 `templates/review-report.md` 模板填写报告。

报告结构：
```
## 🔍 AMC 8 小程序 Code Review — {日期}

**范围：** {变更文件数} 个文件（{新增行数}+ / {删除行数}-）
**整体评价：** 批准 ✅ | 请求变更 🔴 | 仅评论 💬

### 🔴 严重问题（必须修复）
### ⚠️ 警告（建议修复）
### 💡 优化建议（非阻塞）
### ✅ 做得好的地方

---
*由 Hermes Agent 自动生成 | acm-review skill v1.0.0*
```

---

## 5. 将结果写回 GitHub

### 5a. 创建 GitHub Issue（追踪问题清单）

**使用 gh：**

```bash
ISSUE_BODY=$(cat <<'EOF'
## 🔍 Hermes Agent — AMC 8 小程序 Review 报告

<!-- 将 review-report.md 内容粘贴至此 -->

---
*由 Hermes Agent 自动生成。下次 review 将检查本 Issue 中问题的落实情况。*
EOF
)

gh issue create \
  --title "📋 AMC 8 小程序 Code Review — $(date +%Y-%m-%d)" \
  --body "$ISSUE_BODY" \
  --label "code-review,automated"
```

**使用 curl：**

```bash
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$OWNER/$REPO/issues" \
  -d "{
    \"title\": \"📋 AMC 8 小程序 Code Review — $(date +%Y-%m-%d)\",
    \"body\": \"$(echo "$ISSUE_BODY" | sed 's/\"/\\\"/g' | sed 's/$/\\n/' | tr -d '\n')\",
    \"labels\": [\"code-review\", \"automated\"]
  }"
```

### 5b. 在 PR 上留 Review 评论

```bash
PR_NUMBER=<从 webhook/cron 传入>

# 获取 head SHA
if [ "$AUTH" = "gh" ]; then
  HEAD_SHA=$(gh pr view $PR_NUMBER --json headRefOid --jq '.headRefOid')
else
  HEAD_SHA=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['head']['sha'])")
fi

# 提交 Review（仅评论，不阻断 merge）
if [ "$AUTH" = "gh" ]; then
  gh pr review $PR_NUMBER --comment --body "$(cat /tmp/hermes-acm-review.md)"
else
  curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews" \
    -d "{
      \"commit_id\": \"$HEAD_SHA\",
      \"event\": \"COMMENT\",
      \"body\": \"$(cat /tmp/hermes-acm-review.md | sed 's/\"/\\\"/g' | tr '\n' ' ')\"
    }"
fi
```

---

## 6. 自我迭代闭环

本技能的核心价值在于**跨迭代追踪**——每次 Review 都检查上一轮提出的问题是否已修复。

### 6a. 查询上次 Review 的未解决问题

```bash
# 列出所有带 "code-review" 标签的 open issue
if [ "$AUTH" = "gh" ]; then
  gh issue list --label "code-review" --state open --json number,title,body
else
  curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$OWNER/$REPO/issues?labels=code-review&state=open&per_page=5"
fi
```

将上述输出提供给 LLM，在本次 Review 中额外检查这些问题是否已被修复，并在报告中标注 `✅ 已修复` 或 `⏳ 仍待处理`。

### 6b. 关闭已修复的 Issue

```bash
ISSUE_NUMBER=<已修复的 Issue 编号>
CLOSE_COMMENT="代码已在 $(git rev-parse --short HEAD) 中修复，关闭此 Issue。"

if [ "$AUTH" = "gh" ]; then
  gh issue comment $ISSUE_NUMBER --body "$CLOSE_COMMENT"
  gh issue close $ISSUE_NUMBER
else
  # 先留评论
  curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$OWNER/$REPO/issues/$ISSUE_NUMBER/comments" \
    -d "{\"body\": \"$CLOSE_COMMENT\"}"
  # 再关闭
  curl -s -X PATCH \
    -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$OWNER/$REPO/issues/$ISSUE_NUMBER" \
    -d '{"state": "closed"}'
fi
```

---

## 7. 完整 Review 工作流（端到端）

当用户说"review AMC 8 小程序"时，按以下步骤执行：

1. **初始化** — 运行第 1 节的环境检查脚本
2. **收集变更** — 运行第 2 节脚本，判断是全量 review 还是增量 review
3. **读取文件** — 使用 `read_file` 读取所有变更文件的完整内容
4. **查询历史问题** — 运行第 6a 节脚本，获取上次遗留的未解决 Issue
5. **执行审查** — 对照第 3 节检查清单逐条分析，同时检查历史问题落实情况
6. **生成报告** — 填写 `templates/review-report.md`，保存为 `/tmp/hermes-acm-review.md`
7. **写回 GitHub** — 根据是否有 PR：
   - 有 PR → 运行第 5b 节，在 PR 上留 Review 评论
   - 无 PR → 运行第 5a 节，创建 Issue 追踪问题
8. **关闭已修复** — 检查历史 Issue，关闭已解决的条目
9. **向用户汇报** — 以中文摘要形式回复用户，包含：问题数量、严重程度分布、GitHub 链接

---

## 8. 参考资源

- 详细审查清单：`references/review-checklist.md`
- 迭代追踪模板：`references/iteration-tracking-template.md`
- Review 报告模板：`templates/review-report.md`
- Webhook 配置示例：`references/webhook-config-example.yaml`
- 定时任务配置：`references/cron-job-example.md`
- 完整配置指南：`references/setup-guide.md`
