# 完整配置指南 — AMC 8 小程序自动化 Review

本指南帮助你从零完成 Hermes Agent 对 AMC 8 小程序的自动化 Code Review 配置。

---

## 步骤 1：安装并配置 Hermes

### 1.1 初始化 Hermes

```bash
# 运行安装脚本
./setup-hermes.sh

# 或者直接安装
pip install hermes-agent
```

### 1.2 配置 LLM 提供商

编辑 `~/.hermes/config.yaml`，选择适合代码理解的模型：

```yaml
# 推荐用于代码 Review 的模型
model: "claude-sonnet-4-5"        # 代码理解能力强，推荐首选
# model: "gpt-4.1"               # 备选：GPT-4.1
# model: "gemini-2.5-pro"        # 备选：Gemini 2.5 Pro（超长上下文）

provider: anthropic               # 或 openai / google

# 工作目录指向小程序项目
terminal:
  cwd: "/path/to/hermes-agent"    # 替换为实际的仓库路径
```

### 1.3 配置 API Keys

编辑 `~/.hermes/.env`（仅存放密钥）：

```bash
# LLM API Key（三选一）
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OPENAI_API_KEY=sk-your-key-here
# GEMINI_API_KEY=your-key-here

# GitHub 访问令牌（用于读取 PR 信息、写入 Issue/Comment）
# 所需权限：repo（读写 Issues 和 PR Comments）
GITHUB_TOKEN=ghp_your_token_here

# Webhook 签名密钥（如启用自动化 Webhook 触发）
GITHUB_WEBHOOK_SECRET=your_random_32char_secret
```

---

## 步骤 2：启用 acm-review 技能

```bash
# 查看技能是否已被识别
hermes skills list | grep acm

# 加载技能（首次使用）
hermes skills load acm-review

# 验证技能加载成功
hermes skills info acm-review
```

---

## 步骤 3：首次手动 Review（验证配置）

```bash
# 启动 Hermes CLI
hermes

# 在 CLI 中输入（中文亦可）：
请使用 acm-review 技能，对 amc8-miniprogram/ 目录执行首次全量 Code Review。
```

预期输出：
- Agent 自动拉取最新代码
- 读取核心文件并执行审查
- 生成结构化报告（Critical / Warning / Suggestion / Looks Good）
- 提示是否将结果写入 GitHub Issue

---

## 步骤 4：配置自动化触发（二选一）

### 方案 A：定时任务（适合周期性 Review）

参见 `references/cron-job-example.md` 中的配置方法。

简要步骤：
1. 启动 Hermes Gateway：`hermes gateway start`
2. 添加定时任务：`hermes cron add --schedule "0 9 * * 1" --skill acm-review --prompt "..."`
3. Gateway 会在后台按计划执行 Review

### 方案 B：GitHub Webhook（适合 PR 触发的实时 Review）

参见 `references/webhook-config-example.yaml` 中的配置方法。

简要步骤：
1. 在 `~/.hermes/config.yaml` 中添加 webhook 路由配置
2. 启动 Gateway：`hermes gateway start`
3. 在 GitHub 仓库设置中添加 Webhook（URL: `http://your-server:8644/webhook`）
4. 提交 PR 即可自动触发 Review

---

## 步骤 5：配置团队通知（可选）

如需将 Review 结果推送到团队 IM，在 `~/.hermes/config.yaml` 中添加：

### 飞书（推荐）

```yaml
gateway:
  platforms:
    feishu:
      enabled: true
      extra:
        app_id: "${FEISHU_APP_ID}"
        app_secret: "${FEISHU_APP_SECRET}"
        webhook_url: "${FEISHU_WEBHOOK_URL}"  # 飞书机器人 Webhook
```

在 `.env` 中添加：

```bash
FEISHU_APP_ID=cli_your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your-hook
```

### 企业微信

```yaml
gateway:
  platforms:
    wecom:
      enabled: true
      extra:
        corp_id: "${WECOM_CORP_ID}"
        corp_secret: "${WECOM_CORP_SECRET}"
        agent_id: "${WECOM_AGENT_ID}"
```

---

## 步骤 6：建立迭代闭环

配置完成后，Review 闭环自动工作：

```
PR 提交 / 定时触发
       ↓
Hermes Agent 执行 Review
       ↓
读取历史 GitHub Issue（上次遗留的问题）
       ↓
生成报告（含"历史问题追踪"章节）
       ↓
写回 GitHub（PR Comment 或新 Issue）
       ↓
关闭已修复的历史 Issue
       ↓
下次 Review 时重复此循环
```

---

## 常见问题

### Q: 如何只 review 特定目录？

在 prompt 中明确指定：

```
请只 review amc8-miniprogram/cloudfunctions/ 目录下的云函数安全性。
```

### Q: Review 结果太长，如何控制输出？

在 prompt 中添加约束：

```
请生成简洁版报告，每个问题描述不超过 2 句话，总报告不超过 500 字。
```

### Q: 如何跳过某类检查？

在 prompt 中声明：

```
本次 review 重点关注安全和业务逻辑，跳过性能优化建议。
```

### Q: 如何在 Review 中包含历史上下文？

启用 Hermes Memory 功能（在 `config.yaml` 中配置 `memory.enabled: true`），
Agent 会自动记住历次 Review 的重要结论。

---

## 验证清单

- [ ] `hermes skills list` 显示 `acm-review`
- [ ] 首次手动 Review 成功完成并生成报告
- [ ] GitHub Issue 成功创建（含 `code-review` 标签）
- [ ] 定时任务或 Webhook 已配置并通过测试触发
- [ ] （可选）团队 IM 收到 Review 通知
