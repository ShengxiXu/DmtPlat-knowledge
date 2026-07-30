# 场景模板创建页高级视觉重设计划

## 摘要

针对用户反馈的「红框（底部固定操作栏）遮挡内容、对话页与预览卡片设计死板、缺乏高级感」问题，对 WorkAssistant 内的三个场景模板创建入口（对话创建、表单创建、示例提取）进行第二轮视觉精修。核心目标是：**去掉任何会遮挡内容的固定/悬浮元素，把对话页从“后台聊天面板”升级为“沉浸式创作画布”，把右侧预览从“配置面板”升级为“作品成品卡”**，并统一紫灰高级感视觉语言。

## 当前状态分析

### 已完成的改动

- `src/views/WorkAssistant.js` 的 `renderCreatorFormView()` 已将操作按钮从原先 `position: fixed` 的 `.wa-creator-form-bottom` 移入表单卡片内部 `.wa-creator-form-card-footer`，初步解决了固定底栏遮挡问题。
- 三个创建页均使用两栏布局：表单/提取约 60/40，对话约 55/45。
- 预览卡片已引入 Live 呼吸灯、字段收集状态点等基础元素。

### 仍存在的问题

1. **对话页仍像传统聊天后台**：`.wa-creator-chat-main` 是一个完整白卡片包裹聊天区 + 贴底输入框，左右两栏都是规整矩形，视觉上呆板、缺乏创作氛围。
2. **预览卡片质感普通**：`.wa-creator-preview-card` 仍是带边框的矩形面板，字段堆叠像配置列表，没有“模板成品”的纸张/作品感。
3. **CSS 存在历史遗留**：`.wa-creator-form-bottom` 的 `position: fixed` 样式仍保留在 `style.css` 中，且 `.wa-creator-form-layout` 出现多次定义（L14146 与 L14632），存在冲突和维护风险。
4. **输入区缺乏高级感**：对话输入区为贴底平铺的矩形输入框，没有悬浮/胶囊的轻盈感。
5. **示例提取页未同步升级**：右侧识别结果预览仍使用旧版预览卡片风格。

## 修改方案

### 整体视觉方向

- **背景**：统一 `#f5f6f8` 浅灰底，内容区为纯白/半透明白，减少硬边框。
- **强调色**：沿用紫色主题，改为更克制的渐变 `#7c3aed → #a78bfa`，用于头像、图标、主按钮、实时指示器。
- **阴影**：多层柔和投影 `0 1px 2px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.06)` 替代生硬边框。
- **布局**：
  - 对话创建：62% / 38%，左侧为“沉浸画布”，右侧为“悬浮作品卡”。
  - 表单创建：58% / 42%，主表单区与右侧预览保持呼吸感。
  - 示例提取：与表单页保持一致的 58/42 视觉语言。
- **去卡片化外层**：两栏直接在灰背景上形成“悬浮面板”，不再用一个大卡片包裹两栏。

### 1. 对话创建页：沉浸创作画布

#### 文件：`src/views/WorkAssistant.js`

- `renderCreatorChatView()`
  - 保留最外层 `.wa-creator-form-new`，但内部不再用 `.wa-creator-form-card` 包裹。
  - 左侧 `.wa-creator-chat-main` 改为 `.wa-creator-canvas`：
    - 白色背景、圆角 20px、柔和阴影、细边框。
    - 顶部新增 `.wa-creator-canvas-header`：左侧小标题“对话创建模板”+ 副标题，右侧显示对话轮次/进度徽章。
    - 消息区 `.wa-conversation-messages` 内边距加大到 28px，消息间距 20px。
  - AI 消息 `.wa-message-ai`：
    - 头像改为 36px 紫灰渐变圆形（`linear-gradient(135deg, #7c3aed, #a78bfa)`）。
    - 气泡改为纯白背景、1px `#e5e7eb` 边框、圆角 16px/16px/16px/4px 不对称圆角，增加“来源感”。
    - 文字 14px，行高 1.7。
  - 用户消息 `.wa-message-user`：
    - 右对齐，气泡改为白色背景 + 紫色文字 + 1px `#e5e7eb` 边框，避免高饱和色块。
    - 圆角 16px/16px/4px/16px 与 AI 消息镜像不对称。
  - 输入区 `.wa-conversation-input-wrapper`：
    - 改为底部居中“悬浮胶囊” `.wa-conversation-input-capsule`：
      - 最大宽度 640px，背景半透明白 `rgba(255,255,255,0.95)` + `backdrop-filter: blur(12px)`。
      - 圆角 28px，阴影 `0 8px 32px rgba(0,0,0,0.08)`。
      - 输入框无边框，发送按钮为紫色渐变圆形图标按钮。
    - 不再贴满卡片底部，而是像浮在画布上方。
  - 完成/确认操作区 `.wa-conversation-actions`：
    - 改为底部悬浮操作条，同样使用胶囊/半透毛玻璃风格，放置于输入区上方或替代输入区出现。
    - 按钮使用紫色渐变 pill。

#### 文件：`src/style.css`

- 重定义 `.wa-creator-chat-layout` 为 `grid-template-columns: 62% 38%`，gap 28px，max-width 1440px，居中对齐。
- 新增/重定义：
  - `.wa-creator-canvas`：白色背景、圆角 20px、阴影、细边框、overflow hidden、height calc(100vh - 200px)。
  - `.wa-creator-canvas-header`：padding 20px 28px、底部 1px 分隔线、flex 两端对齐。
  - `.wa-conversation-messages`：flex 1、overflow-y auto、padding 28px、gap 20px。
  - `.wa-message`：max-width 80%、animation wa-message-in。
  - `.wa-message-ai` / `.wa-message-user` 的气泡圆角与背景按上述方案。
  - `.wa-message-avatar`：紫灰渐变圆形。
  - `.wa-conversation-input-capsule`：悬浮胶囊样式。
  - `.wa-conversation-actions-float`：底部悬浮操作条样式。
- 删除或覆盖 `.wa-creator-form-bottom` 的 `position: fixed`，确保不再出现固定底栏。

### 2. 表单创建页：融入页面流的操作区

#### 文件：`src/views/WorkAssistant.js`

- `renderCreatorFormView()`
  - 保持 `.wa-creator-form-layout` 两栏结构，但统一外层不再套大卡片。
  - 左侧 `.wa-creator-form-card` 内部的 `.wa-creator-form-card-footer` 保留在卡片底部，作为页面流的一部分（非 fixed）。
  - 右侧 `.wa-creator-preview-card` 底部保留“生成提示词”快捷按钮，方便用户不滚动左侧即可操作。
  - 确保 `.wa-creator-form-card-body` 最后一个 section 与 footer 之间没有额外空白被遮挡。

#### 文件：`src/style.css`

- 统一 `.wa-creator-form-layout` 定义为 `grid-template-columns: 58% 42%`，删除 L14146 的旧 220px/1fr 定义或合并为单一来源。
- `.wa-creator-form-new`：padding 24px 24px 40px（取消原先 120px 的大底部留白，因为已无 fixed 底栏）。
- `.wa-creator-form-card`：max-width none、圆角 18px、柔和阴影。
- `.wa-creator-form-card-footer`：border-top、padding 16px 28px、flex 两端对齐、无 fixed 属性。

### 3. 示例提取页：与表单页视觉统一

#### 文件：`src/views/WorkAssistant.js`

- `renderCreatorExtractView()`
  - 结构同步表单页：左侧 `.wa-creator-form-card wa-creator-extract-card`，右侧 `.wa-creator-preview-card wa-creator-extract-preview`。
  - 识别结果为空时，右侧预览卡显示轻量插画式空状态（图标 + 文案），而非普通文字提示。
  - 有识别结果后，预览卡底部显示“进入确认页”操作按钮。

#### 文件：`src/style.css`

- `.wa-creator-extract-layout` 继承 `.wa-creator-form-layout` 的 58/42 比例。
- `.wa-creator-extract-card` 内部上传区域使用更大的拖拽区域、圆角 16px、虚线边框、hover 时紫灰渐变边框。

### 4. 实时预览卡片：模板成品卡

#### 文件：`src/views/WorkAssistant.js`

- `renderCreatorPreview()` / `renderConversationPreview()` / `renderCreatorExtractPreview()`
  - 统一使用新的 `.wa-creator-preview-card` 结构：
    - 顶部 `.wa-preview-card-header`：大图标（紫灰渐变背景）+ 模板名称 + 角色/能力/输出形式标签行。
    - 中部 `.wa-preview-card-body`：字段清单。每个字段左侧状态点（已收集绿色/待收集灰色），字段名 13px，类型标签 11px 大写。
    - 底部 `.wa-preview-card-footer`：主操作按钮（紫色渐变 pill）+ 可选的取消/重新创建按钮。
  - 标题旁始终显示 Live 呼吸灯徽章。
  - 空状态时显示更精致的占位文案。

#### 文件：`src/style.css`

- `.wa-creator-preview-card`：
  - 背景白色、圆角 18px、padding 24px。
  - 阴影 `0 1px 2px rgba(0,0,0,0.02), 0 12px 32px rgba(0,0,0,0.06)`。
  - 边框 1px `#e8e8e8`。
  - position sticky、top 20px、max-height calc(100vh - 180px)、overflow-y auto。
- `.wa-preview-card-header`：flex、gap 14px、padding-bottom 16px、border-bottom 1px `#f3f4f6`。
- `.wa-creator-preview-icon`：48px、紫灰渐变、圆角 14px、白色图标。
- `.wa-creator-preview-name`：16px、font-weight 700、letter-spacing -0.01em。
- `.wa-preview-tag`：padding 4px 10px、圆角 20px、背景 `rgba(124,58,237,0.08)`、颜色 `#7c3aed`、font-size 12px。
- `.wa-creator-preview-fields`：gap 10px、margin-top 16px。
- `.wa-creator-preview-field`：padding 10px 14px、背景 `#f9fafb`、圆角 10px、flex 两端对齐、hover 背景 `#f3f4f6`。
- `.wa-field-status`：8px 圆点、collected `#10b981`、pending `#d1d5db`。
- `.wa-preview-card-footer`：margin-top 20px、padding-top 16px、border-top 1px `#f3f4f6`、flex 两端对齐。
- `.wa-preview-live`：绿色呼吸灯 + Live 字样、font-size 12px。

### 5. CSS 清理与统一

#### 文件：`src/style.css`

- 删除 `.wa-creator-form-bottom` 的 `position: fixed` 及相关样式，或注释为 deprecated。
- 删除/合并重复的 `.wa-creator-form-layout` 定义。
- 统一三个创建页的布局变量与间距，避免多处 hardcode。
- 在 `@media (max-width: 1024px)` 中确保：
  - 所有两栏布局变为单列。
  - 悬浮胶囊输入区宽度自适应。
  - 预览卡片不再 sticky，随文档流排列。
- 在 `@media (max-width: 768px)` 中进一步收紧 padding 和字体。

## 假设与决策

1. **“红框”定位**：根据历史计划文档 `scene-creator-redesign.md` 及当前残留 CSS，判定用户所指的“红框遮挡”主要是 `.wa-creator-form-bottom` 固定底栏及其视觉沉重感。当前 HTML 虽已移除 fixed 底栏，但 CSS 残留并可能在某些状态复用，因此彻底清理。
2. **色彩基调**：沿用现有紫色主题 `#7c3aed`，但降低饱和度使用，通过渐变 `#7c3aed → #a78bfa` 提升高级感，不引入新的品牌色。
3. **交互行为不变**：不修改对话逻辑、字段编辑逻辑、识别逻辑、提示词生成逻辑，仅调整视觉呈现与 DOM 结构。
4. **预览卡片统一**：三个创建页共用同一套预览卡片结构，仅在标题和底部按钮文案上区分（实时预览 / 实时生成的模板 / 识别结果）。
5. **响应式范围**：优先保证 1440px 以上桌面端的高级感，1024px 以下改为单列，768px 以下进一步紧凑。

## 验证步骤

1. 启动本地开发服务器 `npm run dev`（已在 5173 端口运行）。
2. 访问 `http://localhost:5173/?view=workAssistant`。
3. 分别进入：
   - **对话创建**：确认输入区为悬浮胶囊、消息气泡为非对称圆角、预览卡片像作品卡、无固定底栏。
   - **表单创建**：滚动到底部，确认 `.wa-creator-form-card-footer` 随文档流结束，无内容被遮挡。
   - **示例提取**：确认上传区、识别结果预览卡与表单页视觉一致。
4. 打开浏览器 DevTools，检查 1440px、1024px、768px 三个断点下布局无错位、无遮挡。
5. 运行 `python verify-creator-review.py`，确认表单/对话/提取三种创建流程的自动化测试通过。
6. 手动测试：在对话页输入多轮消息，确认消息区可滚动、输入胶囊始终可见且不遮挡最后一条消息。

## 涉及文件

- `src/views/WorkAssistant.js`
  - `renderCreatorChatView()`
  - `renderCreatorFormView()`
  - `renderCreatorExtractView()`
  - `renderCreatorPreview()`
  - `renderConversationPreview()`
  - `renderCreatorExtractPreview()`
  - `renderConversationMessages()`
- `src/style.css`
  - `.wa-creator-form-new`
  - `.wa-creator-form-layout`
  - `.wa-creator-chat-layout`
  - `.wa-creator-canvas`（新增）
  - `.wa-conversation-input-capsule`（新增/重定义）
  - `.wa-conversation-actions-float`（新增）
  - `.wa-creator-preview-card` 及其子元素
  - `.wa-creator-form-bottom`（删除 fixed 样式）
  - 响应式媒体查询
