# 智能工作三模式重构方案

## Context

用户对方案 A（聊天式首页 + FieldModal）不满意：聊天首页把场景模板的创建/管理/编辑入口全部隐藏了，丢失了原有功能。用户希望重新梳理产品架构，提供**三种独立的创作模式**，从统一的 Hub 首页进入：

1. **AI 对话** — 自由聊天式流式输出，与模板无关，可关联知识库
2. **场景模板** — 恢复原有完整流程（模板列表 → 选模板进编辑器填字段生成 / 创建模板 / 模板市场）
3. **内容模板** — 选中内容模板后跳转到 ContentTemplateManager 编辑

## 架构总览

```
侧边栏「智能工作」→ WorkAssistant
  └─ Hub 首页 (renderHome)
       ├─ Mode 1: AI 对话 (activeTab='chat')       ← 新增 renderChatMode()
       ├─ Mode 2: 场景模板 (activeTab='sceneTemplates') ← 新增 renderSceneTemplates()
       │     ├─ 选模板 → renderEditor()             ← 复用现有
       │     ├─ 创建模板 → renderTemplateCreator()   ← 复用现有
       │     └─ 模板市场 → renderTemplateMarket()    ← 复用现有
       └─ Mode 3: 内容模板 (activeTab='contentTemplates') ← 新增 renderContentTemplates()
             └─ 选模板 → onNavigate('contentTemplates')  ← 复用现有路由
```

所有模式均可通过"返回"按钮回到 Hub 首页。

## 实施步骤

### Step 1: 新增自由对话生成器

**文件**: `src/data/workAssistantData.js` + `src/services/contentGenerator.js`

在 `workAssistantData.js` 新增 `mockChatResponse(userMessage, selectedKBs)` 函数：

- 返回 `{ content: string, citations: [] }`
- 基于用户消息生成结构化回复（理解 → 要点 → 建议），约 30-50 行

在 `contentGenerator.js` 新增 `generateChat(userMessage, selectedKBs, options)` 异步生成器：

- 复用 thinking/chunk/done 事件结构
- 内部调用 `mockChatResponse` 而非 `mockGenerateContent`
- 与现有 `generate()` 并列导出

### Step 2: 构造函数新增状态

**文件**: `src/views/WorkAssistant.js` 构造函数 (line ~56)

```javascript
this.chatKBs = []; // Mode 1 选中的知识库
this.sceneListCategory = 'all'; // Mode 2 分类
this.sceneListSearch = ''; // Mode 2 搜索
this.contentListCategory = 'all'; // Mode 3 分类
// chatMessages / chatStreaming 已存在，复用
```

### Step 3: 扩展 render() 调度

**文件**: `src/views/WorkAssistant.js` render() (line ~292)

在现有 4 个分支后新增 3 个：

```javascript
if (this.activeTab === 'chat') {
  this.renderChatMode();
  return;
}
if (this.activeTab === 'sceneTemplates') {
  this.renderSceneTemplates();
  return;
}
if (this.activeTab === 'contentTemplates') {
  this.renderContentTemplates();
  return;
}
```

### Step 4: 重写 renderHome() 为 Hub 首页

**文件**: `src/views/WorkAssistant.js` renderHome() (line 386-483)

替换为 Hub 布局，复用现有 `.wa-hub-*` CSS（style.css line 17744+）：

- **顶部栏**: 复用 `.wa-chat-topbar`（品牌 + 文档计数 + 历史 + 主题切换）
- **Hero 区**: 复用 `.wa-hub-hero`（问候语 + 副标题 + 可选输入框）
- **三模式卡片**: 复用 `.wa-hub-portals` + `.wa-hub-portal`
  - AI 对话: `--portal-color:#8b5cf6`, icon `fa-comments`
  - 场景模板: `--portal-color:#3b82f6`, icon `fa-layer-group`
  - 内容模板: `--portal-color:#10b981`, icon `fa-file-lines`
- **最近创作**: 复用 `.wa-hub-recents` + `getRecentHistory()` + `renderRecentItem()`

新增 `bindHubEvents()`:

- 三张 `.wa-hub-portal` 点击 → `this.activeTab = mode; this.render();`
- 顶部按钮（文档/历史/主题）复用现有逻辑
- Hero 输入框回车 → 进 Mode 1 并发送首条消息

### Step 5: 新增 renderChatMode() — Mode 1 AI 对话

**文件**: `src/views/WorkAssistant.js`

复用 `.wa-chat-*` CSS，纯聊天界面（无模板卡片）：

- 顶部栏: 返回 Hub 按钮 + "AI 对话"标题 + KB 选择器 + 新对话 + 主题切换
- 主区域: `chatMessages` 为空时显示欢迎提示，有消息时渲染消息流
- 底部: composer 输入框

新增方法:

- `renderChatMode()` — 渲染聊天界面
- `bindChatModeEvents()` — 绑定发送/返回/KB选择/主题
- `async startFreeChat(userMessage)` — 仿 `startChatGeneration()` (line 662)，但调用 `generateChat()`，userMsg 类型为 `'free-text'`，aiMsg 无 template
- 调整 `renderChatUserMessage()` (line 528) 处理 `msg.type === 'free-text'`
- 调整 `renderChatResultCard()` (line 610) 处理无 template 的情况（简化卡片）

### Step 6: 新增 renderSceneTemplates() — Mode 2 场景模板

**文件**: `src/views/WorkAssistant.js`

复用 `.wa-market-*` CSS 卡片样式：

- 顶部栏: 返回 Hub + "场景模板"标题 + "模板市场"按钮 + "创建模板"按钮
- 分类 Tab + 搜索框
- 模板卡片网格: 用 `getAllTemplates()` 按分类/搜索过滤

新增方法:

- `renderSceneTemplates()` — 渲染列表页
- `renderSceneListCard(template)` — 单个模板卡片（简化版 `renderMarketCard`）
- `bindSceneTemplatesEvents()` — 绑定事件:
  - 卡片点击 → `this.selectedTemplate = t; this.activeTab='editor'; this.render();`
  - 创建模板 → `this.activeTab='templateCreator'; this.creatorTab='chat'; this.resetCreatorState(); this.render();`
  - 模板市场 → `this.activeTab='templateMarket'; this.render();`

**复用现有**: `renderEditor()` (line 1037), `renderTemplateCreator()` (line 6076), `renderTemplateMarket()` (line 8669) 全部不动。

### Step 7: 新增 renderContentTemplates() — Mode 3 内容模板

**文件**: `src/views/WorkAssistant.js`

结构同 Mode 2，但渲染 `getAllContentTemplates()`：

- 顶部栏: 返回 Hub + "内容模板"标题
- 分类 Tab（按 format: 全部/文档/表格/邮件/...）
- 模板卡片网格

新增方法:

- `renderContentTemplates()` — 渲染列表页
- `renderContentListCard(template)` — 卡片用 `getContentIcon()` + `formatLabels[]`
- `bindContentTemplatesEvents()` — 卡片点击 → `this.onNavigate('contentTemplates', { initialContentTemplateId: template.id })`

### Step 8: CSS 增补

**文件**: `src/style.css` 末尾

最小新增:

- `.wa-hub-portal-icon.mode-chat` — 紫色渐变
- `.wa-hub-portal-icon.mode-scene` — 蓝色渐变
- `.wa-hub-portal-icon.mode-content` — 绿色渐变
- `.wa-chat-back-btn` — 返回 Hub 按钮样式
- `.wa-chat-kb-picker` / `.wa-chat-kb-picker-dropdown` — Mode 1 KB 多选下拉
- `.wa-scene-search` — 搜索框容器

### Step 9: 清理方案 A 废弃代码

**文件**: `src/views/WorkAssistant.js`

- 删除 `renderChatTemplateCard()` (line 495)
- 删除 `renderMinimalTemplateRow()` (line 362)
- 将 `bindHomeEvents()` (line 3026) 替换为 `bindHubEvents()`
- `handleNaturalLanguageCreate()` (line 876) 保留但不再被 Hub 触发

## 关键文件

| 文件                               | 改动类型                                                  |
| ---------------------------------- | --------------------------------------------------------- |
| `src/views/WorkAssistant.js`       | 重写 renderHome + 新增 3 个 mode 渲染方法 + 调整 render() |
| `src/services/contentGenerator.js` | 新增 `generateChat()`                                     |
| `src/data/workAssistantData.js`    | 新增 `mockChatResponse()`                                 |
| `src/style.css`                    | 追加 mode 渐变 + 少量新类                                 |

## 复用清单（不改动）

- `renderEditor()` / `renderPPTEditor()` — 场景模板编辑器
- `renderTemplateCreator()` — 模板创建流程
- `renderTemplateMarket()` — 模板市场
- `renderHistory()` — 工作历史
- `getRecentHistory()` / `renderRecentItem()` — 最近创作
- `getAllTemplates()` / `getAllContentTemplates()` — 模板数据
- `getRoleById()` / `getAbilityById()` / `getOutputTypeLabel()` — 元数据
- `.wa-hub-*` / `.wa-chat-*` / `.wa-market-*` CSS — 现有样式
- `main.js` 路由 — 无需改动
- `Sidebar.js` — 无需改动（保持单个"智能工作"入口）

## 验证方式

1. 启动 dev server (`npm run dev:all`)，访问 `http://localhost:5173/?view=workAssistant`
2. Hub 首页: 三张模式卡片显示，hover 有上浮+光晕效果，最近创作列表正常
3. Mode 1 (AI 对话): 点击卡片进入聊天 → 输入文字 → 流式回复 → KB 选择器可用 → 返回 Hub
4. Mode 2 (场景模板): 点击卡片进入列表 → 选模板进编辑器填字段生成 → 创建模板流程 → 模板市场 → 返回 Hub
5. Mode 3 (内容模板): 点击卡片进入列表 → 选模板跳转 ContentTemplateManager → 返回 Hub
6. 主题切换在所有模式下正常工作
7. 控制台无报错
