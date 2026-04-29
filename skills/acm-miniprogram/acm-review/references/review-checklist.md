# AMC 8 小程序 Review 详细检查清单

每次执行 Code Review 时，系统性地过一遍以下各项。为每个问题标记：✅ 通过 / ⚠️ 警告 / 🔴 严重 / 💡 建议。

---

## 一、微信小程序通用规范

### 1.1 API 废弃检查

| 废弃 API | 替代方案 | 优先级 |
|----------|----------|--------|
| `wx.getUserInfo` | `wx.getUserProfile` | 🔴 严重 |
| `wx.getStorageSync` 同步滥用 | 改用异步 `wx.getStorage` | ⚠️ 警告 |
| `Page.data` 直接赋值（不用 setData） | 必须通过 `setData` 触发响应式更新 | 🔴 严重 |
| `wx.navigateTo` 超过 10 层堆栈 | 用 `wx.redirectTo` 或 `wx.reLaunch` | ⚠️ 警告 |

### 1.2 生命周期使用

- [ ] `onLoad`：异步数据加载是否有 loading 状态保护？
- [ ] `onUnload`：是否清理了定时器、监听器（如有）？
- [ ] `onShow`：是否避免了重复请求（可用标志位 `this._loaded`）？
- [ ] `onReachBottom`：分页加载时是否加了防抖/节流？

### 1.3 setData 优化

- [ ] 避免在 `setData` 中传入大数组整体（应增量 push）
- [ ] 避免频繁 `setData`（如 for 循环中每次调用）
- [ ] 使用路径更新：`this.setData({ 'list[0].vote_count': n })` 而非全量替换
- [ ] 数据格式化（如 `timeAgo`）是否在 setData 前完成，而非在 WXML 中实时计算？

---

## 二、云函数安全审查

### 2.1 输入校验（每个云函数）

```
checklist for each cloud function:
  getQuestions:
    □ questionId 是否为合法字符串（防注入）？
    □ 分页参数 page/limit 是否有上下界限制（limit <= 50）？
    □ 筛选条件（year, category, difficulty）是否白名单校验？

  submitSolution:
    □ questionId 是否验证其在 questions 集合中存在？
    □ text 是否有最小长度限制（防空提交）？
    □ text 是否有最大长度限制（防 DDoS）？
    □ imgList 长度是否限制（<= 3）？
    □ methodTag 是否白名单校验（只允许预定义的 tag 值）？
    □ msgSecCheck 失败时是否拒绝还是放行（fail-open 策略记录日志了吗）？

  voteSolution:
    □ 是否校验 solutionId 格式？
    □ 是否使用事务防止并发重复点赞（云数据库事务或原子 inc）？
    □ openid 是否从 wx-server-sdk 的 WXContext 获取（不信任客户端传入）？

  getUserStats:
    □ openid 是否从 WXContext 获取？
    □ 成就计算是否防止整数溢出？

  updateErrorBook:
    □ action 是否限制为 'add' | 'remove'？
    □ questionId 是否校验存在性？
    □ 同一用户同一题目的错题本条目是否 upsert（防重复 add）？
```

### 2.2 权限隔离

- [ ] 所有写操作（submit、vote、updateErrorBook）是否强制从 `WXContext.OPENID` 获取用户标识，而非从 `event` 参数读取？
- [ ] 云数据库安全规则（collection 权限）是否配置为"仅创建者可读写自己的数据"？
- [ ] 管理员操作（如隐藏违规内容）是否有角色验证？

### 2.3 幂等性

- [ ] `voteSolution` 是否通过 `votes` 集合的复合唯一索引（`user_openid + solution_id`）防重？
- [ ] `updateErrorBook(add)` 是否幂等（重复 add 不产生重复记录）？
- [ ] 解法提交是否有防重（相同 openid + questionId + text 短时间内重复提交）？

---

## 三、性能审查

### 3.1 数据库查询

- [ ] `skip + limit` 分页在集合超过 1000 条时性能会下降——是否考虑游标分页（基于 `_id` 或 `created_at` 的范围查询）？
- [ ] 高频查询字段（`q_id`, `openid`, `status`）是否已建索引（在云开发控制台配置）？
- [ ] `_checkErrorBook` 每次 `onLoad` 都发起查询——是否可以缓存在 `app.globalData` 或 `wx.storage` 中？

### 3.2 渲染性能

- [ ] 解法列表是否使用了虚拟列表（当条目 > 20 时）？
- [ ] 图片是否使用了懒加载（`lazy-load` 属性）？
- [ ] WXML 中是否避免了复杂的 `wx:for` 嵌套（超过 2 层）？

### 3.3 网络请求

- [ ] 能否合并 `_loadQuestion` 和 `_loadSolutions` 为一次云函数调用？
- [ ] 是否有请求去重（快速连续点击导致同一云函数被调用多次）？

---

## 四、业务逻辑正确性

### 4.1 答题流程

- [ ] 已答题状态（`answered: true`）后点击其他选项是否被正确拦截？
- [ ] 答错后自动加入错题本的操作是否会覆盖用户之前手动移除的意图？（建议改为"询问是否加入"）
- [ ] 官方解法的显示/隐藏状态是否在页面销毁后正确重置？

### 4.2 错题本

- [ ] 用户登录状态变化时，错题本数据是否会混淆（`_checkErrorBook` 依赖 openid，但客户端查询可能不带权限过滤）？
- [ ] 错题本查询是否加了 `openid` 过滤（不然会看到所有用户的错题记录）？

### 4.3 LaTeX 渲染

- [ ] `formatMathContent` 的 `\[...\]` → `$$...$$` 正则使用了 `s` flag（`.` 匹配换行），边界情况：多个公式连续时是否有歧义？
- [ ] 内联公式 `\(...\)` 转换后的 `$...$` 是否与 Markdown 的粗体 `*...*` 发生冲突？

### 4.4 成就系统

- [ ] `getUserStats` 中的成就判断是否为幂等的读操作（不应在 stats 查询时写数据）？
- [ ] 成就"解题大师"等的阈值逻辑是否与 `app.globalData` 或本地缓存保持一致？

---

## 五、代码质量

### 5.1 DRY 原则

- [ ] `getCategoryLabel`、`getDifficultyLabel`、`getMethodLabel` 等工具函数是否在所有页面统一从 `utils/util.js` 引入，而非各页面自行定义？
- [ ] `showToast` 的调用模式是否统一（参数顺序、图标类型）？
- [ ] 云函数调用的错误处理样板代码是否可抽取为共用 helper？

### 5.2 命名规范

- [ ] 私有方法（如 `_loadQuestion`）是否一致使用下划线前缀？
- [ ] 事件处理函数是否遵循 `on + 动词 + 名词` 命名（如 `onVoteTap` 而非 `vote`）？

### 5.3 注释质量

- [ ] 非显而易见的逻辑（如 `solutionsLoading` 防重复请求的 early return）是否有注释说明？
- [ ] 所有 `TODO`/`FIXME` 是否关联了 Issue 编号？

---

## 六、合规与隐私

- [ ] `wx.getUserProfile` 的 `desc` 参数是否准确描述用途（隐私协议要求）？
- [ ] 是否收集了超出必要范围的用户信息（如不必要的地理位置）？
- [ ] AMC 题目版权：题目文本是否仅存在于 `questions` 集合，解法存于 `user_solutions`，两者物理隔离？
- [ ] `project.config.json` 中的 `appid` 是否已替换为占位符，未泄露到代码库？

---

## 七、测试覆盖度评估

由于微信小程序无原生单元测试框架，评估以下替代手段：

- [ ] 云函数是否有对应的本地测试脚本（如 `tests/` 目录下的 Node.js 脚本）？
- [ ] 关键工具函数（`formatMathContent`、`timeAgo` 等）是否有独立的 Node.js 单元测试？
- [ ] 是否有端到端测试计划文档（即使尚未实现）？

---

## 严重性判定参考

| 等级 | 图标 | 判定标准 | 是否阻塞合并 |
|------|------|----------|------------|
| 严重 | 🔴 | 安全漏洞、数据丢失风险、崩溃、核心功能损坏 | 是 |
| 警告 | ⚠️ | 非核心路径的 bug、缺少错误处理、合规隐患 | 通常是 |
| 建议 | 💡 | 性能优化、重构机会、代码可读性提升 | 否 |
| 通过 | ✅ | 良好实践、值得肯定的设计决策 | N/A |
