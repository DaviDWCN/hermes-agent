# 定时任务配置示例 — AMC 8 小程序定期 Review

使用 Hermes 内置的 `cron` 调度器，可以无需外部 CI/CD 系统，直接在 Hermes Gateway 运行时定期触发 AMC 8 小程序 Code Review。

---

## 方式一：通过 Hermes CLI 创建定时任务

```bash
# 每周一 09:00 执行一次完整 Review
hermes cron add \
  --schedule "0 9 * * 1" \
  --skill "acm-review" \
  --prompt "请对 amc8-miniprogram/ 目录执行每周定期 Code Review。
检查所有核心文件（pages、cloudfunctions、utils），
按照 acm-review 技能的完整工作流程生成报告，
并在 GitHub 上创建 Issue 追踪本次发现的问题。
同时检查上周遗留的 open Issue 是否已修复，关闭已解决的条目。" \
  --label "acm-weekly-review"

# 每天 22:00 执行一次增量 Review（仅检查当天变更）
hermes cron add \
  --schedule "0 22 * * *" \
  --skill "acm-review" \
  --prompt "请对 amc8-miniprogram/ 目录执行今日增量 Code Review。
先运行以下命令获取今天的变更文件（在 Agent 执行时动态确定当天日期）：
  git log --since='midnight' --name-only --pretty=format: -- amc8-miniprogram/ | sort -u
如今天没有新提交，回复'今日无新变更，跳过 Review'即可。
有变更时，生成简短报告并在 GitHub 上创建 Issue（如有严重问题）。" \
  --label "acm-daily-review"
```

---

## 方式二：直接编辑 jobs.json

编辑 `~/.hermes/cron/jobs.json`，添加以下条目：

```json
[
  {
    "id": "acm-weekly-review",
    "label": "AMC 8 小程序每周 Review",
    "schedule": "0 9 * * 1",
    "skills": ["acm-review"],
    "prompt": "请对 amc8-miniprogram/ 目录执行每周定期 Code Review。按照 acm-review 技能的完整工作流程：1. 收集本周变更文件；2. 读取核心文件内容；3. 查询上周遗留未解决的 GitHub Issue；4. 执行全维度审查（代码质量、云函数安全、性能、业务逻辑、合规）；5. 生成结构化报告；6. 创建 GitHub Issue 追踪新发现的问题；7. 关闭本周已修复的历史 Issue。",
    "enabled": true,
    "timezone": "Asia/Shanghai"
  },
  {
    "id": "acm-daily-incremental-review",
    "label": "AMC 8 小程序每日增量 Review",
    "schedule": "0 22 * * 1-5",
    "skills": ["acm-review"],
    "prompt": "请检查 amc8-miniprogram/ 目录今天是否有新的 git 提交（运行 git log --since='midnight' 获取当天变更）。如有，对变更文件执行快速 Code Review，重点检查安全问题和明显的 bug；如无新变更，直接回复'今日无新提交'。",
    "enabled": false,
    "timezone": "Asia/Shanghai"
  }
]
```

> **注意**：`enabled: false` 的任务不会自动执行，需改为 `true` 后重启 Gateway 才生效。

---

## 方式三：hermes cron 命令管理

```bash
# 列出所有定时任务
hermes cron list

# 查看某个任务的历史输出
hermes cron output acm-weekly-review

# 手动立即触发一次（测试用）
hermes cron run acm-weekly-review

# 暂停/恢复任务
hermes cron pause acm-daily-incremental-review
hermes cron resume acm-daily-incremental-review

# 删除任务
hermes cron remove acm-weekly-review
```

---

## Cron 表达式参考

| 表达式 | 含义 |
|--------|------|
| `0 9 * * 1` | 每周一 09:00 |
| `0 9 * * 1-5` | 工作日（周一至周五）09:00 |
| `0 22 * * 1-5` | 工作日 22:00 |
| `0 9 * * 0` | 每周日 09:00 |
| `0 9 1 * *` | 每月 1 日 09:00 |
| `0 */6 * * *` | 每 6 小时一次 |

时区使用 IANA 时区名称，中国大陆使用 `Asia/Shanghai`。

---

## 任务输出查看

定时任务的执行结果保存在 `~/.hermes/cron/output/<job_id>/` 目录下，每次执行一个带时间戳的 Markdown 文件。

```bash
# 查看最新一次执行结果
ls -lt ~/.hermes/cron/output/acm-weekly-review/ | head -5
cat ~/.hermes/cron/output/acm-weekly-review/<最新文件>.md
```
