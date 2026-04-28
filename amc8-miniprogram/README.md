# AMC 8 助手小程序

> 免费 · 开源感 · 多解法共享的 AMC 8 备考工具

---

## 项目简介

本小程序是一个**个人公益项目**，旨在帮助备考 AMC 8 的学生和数学爱好者：

- 浏览 2000 年至今的 AMC 8 真题（中英双语）
- 查看社区共享的多种解题思路
- 分享自己的解法（Markdown + LaTeX + 手写图）
- 自动记录错题，追踪备考进度

---

## 功能模块

| 模块 | 描述 |
|------|------|
| 📚 题库中心 | 按年份、题型、难度筛选真题 |
| 💡 智慧共享区 | 多维解析列表，按点赞/最新排序 |
| ✏️ 思路贡献器 | Markdown+LaTeX 编辑，图片上传，方法标签 |
| 📗 错题本 | 自动记录答错题目，支持一键查看解法 |
| 🏅 成就系统 | 解题大师、智慧之星等勋章 |

---

## 项目结构

```
amc8-miniprogram/
├── app.js / app.json / app.wxss    # 全局配置与样式
├── pages/
│   ├── index/                      # 首页（分类/年份快速入口）
│   ├── question-bank/              # 题库列表（筛选+无限滚动）
│   ├── question-detail/            # 题目详情+答题+解法浏览
│   ├── submit-solution/            # 提交解法（LaTeX编辑+图片上传）
│   ├── profile/                    # 个人中心（统计+成就+我的贡献）
│   └── error-book/                 # 错题本
├── components/
│   └── math-toolbar/               # 数学符号快捷输入组件
├── cloudfunctions/
│   ├── getQuestions/               # 查询题目（带筛选分页）
│   ├── submitSolution/             # 提交解法（含内容安全审核）
│   ├── voteSolution/               # 点赞/取消点赞（防重复）
│   ├── getUserStats/               # 用户统计与成就
│   └── updateErrorBook/            # 错题本增删
├── data/
│   ├── sample-questions.json       # 示例题目数据（8道真题，含LaTeX）
│   └── schema.md                   # 数据库 Schema 文档
├── utils/
│   └── util.js                     # 工具函数（格式化、LaTeX、徽章等）
└── project.config.json             # 微信开发者工具配置
```

---

## 快速开始

### 1. 环境准备

- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号，获取 AppID

### 2. 配置云开发

在 `project.config.json` 中填入你的 `appid`：

```json
{
  "appid": "wx你的AppID"
}
```

在 `app.js` 中填入云开发环境ID：

```js
wx.cloud.init({ env: 'your-cloud-env-id' });
```

### 3. 初始化云数据库

在微信云开发控制台创建以下集合：
- `questions`
- `user_solutions`
- `votes`
- `error_book`

导入 `data/sample-questions.json` 到 `questions` 集合作为初始数据。

### 4. 部署云函数

在微信开发者工具中，右键每个云函数目录 → **上传并部署（云端安装依赖）**：
- `getQuestions`
- `submitSolution`
- `voteSolution`
- `getUserStats`
- `updateErrorBook`

### 5. 集成 LaTeX 渲染

推荐使用 [towxml](https://github.com/sbfkcel/towxml)：

```bash
# 在项目根目录
npm install towxml
```

在需要渲染 LaTeX 的页面引入 towxml 组件，并将 `math-content` 的 `text` 节点替换为 towxml 渲染组件。详见 [towxml 文档](https://github.com/sbfkcel/towxml)。

---

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端框架 | 微信原生小程序框架 |
| LaTeX 渲染 | towxml / wx-katex |
| 后端 | 微信云开发（云数据库 + 云函数 + 云存储） |
| 内容审核 | 微信官方 `msgSecCheck` 接口 |
| 图片存储 | 微信云存储 |

---

## 版权与合规声明

> ⚠️ **重要**：AMC 8 题目版权归 [MAA（美国数学协会）](https://www.maa.org/) 所有。本小程序仅供个人学习参考，不得商业使用。

- **题目与解析物理隔离**：题目数据（`questions`）与用户解析（`user_solutions`）分集合存储
- **避风港原则**：如收到版权方通知，可快速下架争议题目（删除对应 `questions` 文档）
- **内容安全**：所有用户提交内容均通过微信 `msgSecCheck` 接口审核
- **解法版权**：用户贡献的解法版权归原作者所有，采用 CC BY 4.0 协议共享

---

## 路线图

- [x] 基础题库展示（中英双语，LaTeX 就绪）
- [x] 解法提交与展示（Markdown + LaTeX + 图片）
- [x] 点赞系统（防重复）
- [x] 错题本
- [x] 个人成就系统
- [ ] 全文搜索（云函数 + 正则）
- [ ] 模拟考试模式（限时 25 题）
- [ ] 解法质量评级（AI 辅助）
- [ ] 老师/教练管理后台

---

## 贡献

欢迎提交 Issue 或 PR！特别欢迎：
- 补充题目数据（LaTeX 格式）
- 翻译题目中文版
- 贡献解题思路样本数据
