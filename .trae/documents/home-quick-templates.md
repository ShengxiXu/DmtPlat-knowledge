# 智能工作首页：场景模板 / 内容模板快速入口（可配置）

## Context（背景）

当前智能工作首页（`renderHome`）在 hero 输入框下方放了两个入口卡片：「场景模板」和「内容模板」。点击它们会分别跳转到模板市场页（`activeTab = 'templateMarket'`）或内容模板页（`onNavigate('contentTemplates')`）。用户每次想用一个具体模板，都得先进市场页再挑，高频常用模板没有直达路径。

需求：在「场景模板」「内容模板」这两个入口卡片下方，各放 **3 个常用模板的快速入口**，点击直接进入该模板的编辑器。具体放哪 3 个模板**支持用户自定义配置**。配置入口用每个区块右下角的小「管理」按钮，点击弹出选择弹窗，从全部模板里勾选 3 个。配置结果持久化到 localStorage。

## 交互与视觉

- 两个入口卡片（`wa-chat-alt-modes`）保持不变，在它下方新增一行「快速入口区」`wa-chat-quick-row`，内部左右两栏对应场景/内容。
- 每栏内：标题「常用场景模板 / 常用内容模板」+ 横排 3 个 mini 卡片 + 右下角「管理」文字按钮。
- mini 卡片：图标 + 模板名（单行省略），hover 高亮。点击直接进入编辑器。
- 未配置时：显示占位「点击管理，添加常用模板」。
- 「管理」按钮点击 → 弹出模态框 `wa-quick-config-modal`，列出该类型全部模板（场景=所有 workTemplates，内容=defaultContentTemplates），单选最多 3 个，保存。

## 实现方案

### 1. 数据存储 — `src/data/workAssistantData.js`

在现有 STORAGE 常量区（约 L2132）新增：

```js
const STORAGE_QUICK_SCENE_KEY = 'workAssistantQuickScene';   // 场景模板快速入口（存 templateId 数组，最多3）
const STORAGE_QUICK_CONTENT_KEY = 'workAssistantQuickContent'; // 内容模板快速入口（同上）

export function getQuickSceneTemplateIds() { /* 读 localStorage，返回 string[]，默认 [] */ }
export function setQuickSceneTemplateIds(ids) { /* 写入，截断到3 */ }
export function getQuickContentTemplateIds() { /* 同上 */ }
export function setQuickContentTemplateIds(ids) { /* 同上 */ }
```

模式参考现有 `getLastRole/setLastRole`（L2175-2181）。

### 2. WorkAssistant.js — 导入与构造

- 在 `import { ... } from '../data/workAssistantData.js'`（L2-35）追加 4 个新函数。
- 在 `import { ... } from '../data/contentTemplates.js'`（L36-43）追加 `defaultContentTemplates`（如未导入）。
- constructor（L64 附近）初始化：`this.quickSceneIds = getQuickSceneTemplateIds(); this.quickContentIds = getQuickContentTemplateIds();`

### 3. 首页渲染 — `renderHome`（L423-548）

在 `wa-chat-alt-modes` 区块（L484-501）之后、`wa-chat-recents`（L503）之前插入：

```js
<div class="wa-chat-quick-row">
  ${this.renderQuickEntries('scene')}
  ${this.renderQuickEntries('content')}
</div>
```

新增方法 `renderQuickEntries(type)`：
- `type === 'scene'`：用 `this.quickSceneIds` 在 `getAllTemplates()` 里查到模板对象；空则渲染占位。
- `type === 'content'`：用 `this.quickContentIds` 在 `defaultContentTemplates` 里查；空则占位。
- 每个模板渲染成 mini 卡片 `wa-quick-card`，带 `data-template-id` 和 `data-quick-type`。
- 区块右下角渲染「管理」按钮 `wa-quick-manage`，带 `data-quick-type`。

### 4. 事件绑定 — `bindHomeEvents`（L3717 附近）

新增三段：

a) **快速卡片点击 → 直接进入编辑器**：
```js
this.container.querySelectorAll('.wa-quick-card').forEach((card) => {
  card.addEventListener('click', () => {
    const type = card.dataset.quickType;
    const id = card.dataset.templateId;
    if (type === 'scene') {
      const tpl = getAllTemplates().find(t => t.id === id);
      if (tpl) { this.selectedTemplate = tpl; this.activeTab = 'editor'; this.render(); }
    } else {
      if (this.onNavigate) this.onNavigate('contentTemplates', { initialContentTemplateId: id });
    }
  });
});
```
（复用现有「场景模板进入编辑器」的选中逻辑：参考 `activeTab='editor'` + `this.selectedTemplate` 的现有用法，见 L330、L189 附近）

b) **「管理」按钮 → 打开配置弹窗**：
```js
this.container.querySelectorAll('.wa-quick-manage').forEach((btn) => {
  btn.addEventListener('click', () => this.openQuickConfigModal(btn.dataset.quickType));
});
```

c) **配置弹窗内部交互**（在 `openQuickConfigModal` 里绑定，或单独 `bindQuickConfigModalEvents`）：
- 模板项点击 → 切换选中态，最多 3 个（超过提示并阻止）。
- 「保存」按钮 → 调 `setQuickSceneTemplateIds/setQuickContentTemplateIds`，更新 `this.quickSceneIds/quickContentIds`，关闭弹窗，局部刷新快速入口区（不整体 re-render，避免输入框失焦；可用 `renderQuickEntries` 重新生成 HTML 替换 `.wa-chat-quick-row` 内对应栏）。
- 「取消」/遮罩点击 → 关闭弹窗。

### 5. 配置弹窗 — 新增 `openQuickConfigModal(type)`

- 用 `insertAdjacentHTML('beforeend', ...)` 在 `this.container` 末尾插入弹窗 DOM（复用项目现有 `wa-modal-overlay` / `wa-modal` 类，见 PPT 主题选择弹窗的实现模式）。
- 场景模板：遍历 `getAllTemplates()` 渲染可选项（图标+名称+描述）。
- 内容模板：遍历 `defaultContentTemplates` 渲染可选项（format 标签+名称+描述）。
- 已选中的（在 `this.quickSceneIds/quickContentIds` 里）默认带 `selected` 样式。
- 底部「取消 / 保存」按钮，保存时校验数量 ≤ 3。

### 6. CSS — `src/style.css`

在 `wa-chat-alt-modes` 样式块（L20014 附近）之后新增：

- `.wa-chat-quick-row`：两栏 grid，`gap:12px`，与 `wa-chat-alt-modes` 同宽（`max-width:720px`）。
- `.wa-quick-block`：卡片容器，圆角，标题 + 卡片行 + 管理按钮。
- `.wa-quick-cards`：横排 flex，3 个 mini 卡片均匀分布。
- `.wa-quick-card`：迷你卡片，图标 + 名称，hover 高亮边框。
- `.wa-quick-manage`：右下角小文字按钮，低调灰色，hover 强调。
- `.wa-quick-empty`：占位提示。
- `.wa-quick-config-modal` 内列表项：可复用 `wa-ppt-template-grid` 风格或新写简洁列表项（图标+文字+勾选）。

复用现有 `wa-modal-overlay`、`wa-modal`、`wa-modal-header`、`wa-modal-body`、`wa-modal-footer` 样式（PPT 主题弹窗已用）。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/data/workAssistantData.js` | 新增 4 个存取函数 + 2 个 STORAGE 常量 |
| `src/views/WorkAssistant.js` | 导入、构造初始化、`renderQuickEntries`、`openQuickConfigModal`、事件绑定、首页 HTML 插入 |
| `src/style.css` | 新增 `.wa-chat-quick-*` 与配置弹窗相关样式 |

## 验证

1. `npm run dev` 启动，访问 `http://localhost:5173/?view=workAssistant`。
2. 首页「场景模板」「内容模板」下方应各出现快速入口区（首次为空占位）。
3. 点「管理」→ 弹窗列出全部模板，勾选 3 个，保存 → 快速入口区显示对应 3 个 mini 卡片。
4. 尝试选第 4 个 → 被阻止并提示。
5. 点击场景 mini 卡片 → 直接进入该模板编辑器（`activeTab='editor'`）。
6. 点击内容 mini 卡片 → 跳转内容模板页并打开该模板。
7. 刷新页面 → 配置仍在（localStorage 持久化）。
8. 浏览器走查暗色/亮色主题下视觉一致。
