# 迭代追踪模板

此模板用于记录每次 Hermes Agent Review 的结论，并在下次 Review 时检查落实情况，形成持续优化闭环。

**使用方式：**
1. 每次 Review 完成后，将新发现的问题追加到"问题记录表"中。
2. 下次 Review 开始前，先读取此模板（或对应 GitHub Issue），检查"状态"列。
3. 已修复的问题标记为 `✅ 已修复`，并在备注中填写修复 commit。
4. 持续未修复超过 3 次 Review 的问题升级为 🔴 高优。

---

## 问题记录表

| # | 发现日期 | 文件位置 | 问题描述 | 严重性 | 状态 | 修复 Commit | 备注 |
|---|----------|----------|----------|--------|------|-------------|------|
| 1 | YYYY-MM-DD | `cloudfunctions/submitSolution/index.js` | `methodTag` 未做白名单校验 | ⚠️ 警告 | ⏳ 待处理 | — | 可注入任意 tag 值 |
| 2 | YYYY-MM-DD | `cloudfunctions/voteSolution/index.js` | 并发投票未使用原子操作 | ⚠️ 警告 | ⏳ 待处理 | — | 高并发下计数可能不准 |
| 3 | YYYY-MM-DD | `pages/question-detail/question-detail.js` | `_checkErrorBook` 查询无 openid 过滤 | 🔴 严重 | ⏳ 待处理 | — | 可能读取其他用户数据 |

> 🔵 **新建记录时**：复制最后一行，填入本次 Review 的新发现。

---

## 迭代摘要

| 迭代 | 日期 | Review 范围 | 新增问题 | 修复问题 | 遗留问题 | GitHub Issue |
|------|------|------------|----------|----------|----------|-------------|
| #1 | YYYY-MM-DD | 全量 Review（v1.0 初始版本） | 3 | 0 | 3 | [#N](https://github.com/owner/repo/issues/N) |
| #2 | YYYY-MM-DD | 增量（PR #M） | 1 | 2 | 2 | [#N+1](https://github.com/owner/repo/issues/N) |

---

## 优化趋势

Hermes Agent 在每次迭代后自动更新以下指标：

```
迭代 #1: 🔴×1  ⚠️×2  💡×5
迭代 #2: 🔴×0  ⚠️×1  💡×3   ← 修复了 1 个严重 + 1 个警告
迭代 #3: 🔴×0  ⚠️×0  💡×2   ← 持续改善
```

目标：连续 3 次 Review 均无 🔴 严重问题，⚠️ 警告 < 2 个。

---

## 注意事项

- **不重复提问**：Hermes Agent 在开始 Review 前会读取此文件，避免对已知问题重复提出相同建议。
- **优先级动态调整**：如果某问题连续 2 次未修复，在下次报告中将其严重性上调一级。
- **自动化更新**：通过 `cron/` 定时任务或 Webhook 触发时，Agent 会自动更新"状态"列。
