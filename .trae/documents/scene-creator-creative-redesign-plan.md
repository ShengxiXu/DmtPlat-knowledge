# 场景模板创建页创意重设计划

## 背景与问题

上一轮去卡片化后，页面已去掉白色浮层卡片，但用户反馈仍然“视觉上很不和谐”。从当前截图可见，主要问题在于：

1. **画面太平**：大面积单一浅灰背景，没有明暗层次和视觉重心。
2. **左右失衡**：左侧对话/表单内容视觉分量重，右侧预览区内容稀疏，像“贴”在旁边，没有形成统一的工作台。
3. **缺乏精致感**：tab、标题、进度点、输入胶囊等元素各自为政，没有形成一致的视觉语言。
4. **没有空间深度**：所有元素挤在同一平面，既没有卡片的包裹感，也没有层次的呼吸感。

因此，本次目标不是“再拿掉点什么”，而是**重新建立一套有层次、有节奏、有焦点的沉浸式创作工作台视觉系统**。

## 设计方向：沉浸式创作画布

将创建页视为一个整体的设计作品，而不是“左配置 + 右预览”的机械两栏。核心关键词：**层次、聚焦、精致、流动**。

### 1. 全局背景：有温度的舞台

- 页面背景从冷灰 `#f5f6f8` 改为暖调浅灰 `#f7f6fa`。
- 添加一道极淡的径向渐变高光（从画布中心偏上位置发出），给页面一个 implicit 的视觉焦点。
- 使用 `--kb-bg` 的覆盖或新增局部变量实现，避免影响全局主题系统。

### 2. 主画布区（左侧配置）

- 给主配置区一个“纸张/画布”质感：背景 `#ffffff`，顶部 1px 极淡高光，底部和右侧带极柔和的投影 `0 20px 60px rgba(0,0,0,0.04)`。
- 不是卡片，而是一块“铺在工作台上的纸”——有圆角但不大（20px），有阴影但极淡，重点是** grounding** 而不是** boxing**。
- 标题区加大字号、加重字重，进度点改为一条连接的微型进度线，位于标题下方，与 tab 形成清晰的“头部系统”。

### 3. 右侧面板：精致的实时检视器

- 背景改为半透明白色 `rgba(255,255,255,0.7)` + `backdrop-filter: blur(12px)`，形成轻玻璃质感。
- 左侧用 1px 渐变边框（上浅下淡）与主画布区分，取代硬线。
- 预览头部使用更大的图标、更紧凑的信息密度，添加“Live 实时”脉冲徽标。
- 字段列表使用图标 + 标签 + 类型的三段式，增强可读性；空状态使用柔和的插画化图标和引导文案。

### 4. 对话视图：时间线式聊天

- 消息之间增加一条淡紫色垂直时间线，将散落的对话串成一条叙事流。
- AI 消息使用白色背景 + 极淡阴影，用户消息使用紫色渐变背景（`#ede9fe → #ddd6fe`）+ 白色文字，不再使用描边。
- 头像改为更精致的紫色渐变圆环。
- 输入区从“悬浮胶囊”改为“底部工具栏”——一条与画布底部融合的圆角输入条，有 subtle 的上边框和内阴影，更像专业聊天/创作工具。

### 5. 表单与示例提取视图

- 统一使用新的 section 样式：左侧带序号/图标的垂直引线，section 之间用更克制的分隔线。
- 结构模板卡片改用“选中态高亮 + 柔和投影”，未选中态为 flat 描边，形成清晰的选中层次。
- 文件上传区改为与画布融合的 dashed 区域，hover 时产生 subtle 的紫色 glow，而不是突兀的白卡片。

### 6. 标签页系统

- 保留线型 tab，但增强 active 态：紫色下划线 + 文字加粗 + 图标着色，非 active 使用更淡的灰。
- 增加 tab 之间的视觉节奏，让 tab 成为头部系统的一部分。

### 7. 动效与微交互

- 消息进入使用现有的 `wa-message-in` 动画，但增强缓动。
- 预览字段变化时添加 subtle 的淡入/位移动画。
- 按钮、输入框聚焦时统一使用紫色 glow。
- Live 徽标增加脉冲动画。

## 具体改动

### 文件 1：`src/style.css`

追加一个新的创意样式块（在去卡片化样式之后），覆盖并增强现有元素：

1. **全局背景层**
   - `.wa-creator-form-new`：修改背景色、添加径向渐变高光。
   
2. **主画布**
   - `.wa-creator-panel--seamless`：保留去卡片化，但增加 grounding 阴影和圆角。
   - `.wa-creator-panel--seamless .wa-creator-panel-header`：增强标题排版、进度点改为进度线。
   - `.wa-creator-panel--seamless .wa-creator-panel-config`：增加纸张质感和内边距节奏。

3. **右侧面板**
   - `.wa-creator-panel--seamless .wa-creator-panel-preview`：玻璃质感背景、渐变左边界、更强头部。
   - `.wa-creator-panel-preview .wa-preview-card-header`：更大图标、Live 徽标。
   - `.wa-creator-panel-preview .wa-creator-preview-field`：三段式布局、图标、状态点优化。

4. **对话视图**
   - `.wa-creator-chat-config .wa-conversation-messages`：添加时间线伪元素。
   - `.wa-message-ai / .wa-message-user`：优化消息气泡样式。
   - `.wa-conversation-input-wrapper`：改为底部工具栏样式。
   - `.wa-conversation-input-capsule`：调整阴影和边框。

5. **表单/提取视图**
   - `.wa-creator-section`：新的 section header 样式和分隔线。
   - `.structure-card`：优化未选中/选中态层次。
   - 文件上传区：减少卡片感，增加 hover glow。

6. **标签页**
   - `.wa-creator > .wa-creator-tabs`：增强线型 tab 的 active 态。

7. **响应式**
   - 在 ≤1024px 时，右侧面板取消玻璃效果，改为与主画布相同的背景，避免移动端性能问题和视觉混乱。

### 文件 2：`src/views/WorkAssistant.js`

少量 HTML 调整以增强语义和样式钩子：

1. `renderCreatorPanel()`
   - 在 header 中为进度区增加 `.wa-creator-panel-progress-line` 容器（替代原有圆点进度），或在 CSS 中通过伪元素实现。
   - 保持其余结构不变。

2. `renderCreatorChatView()`
   - 输入区 HTML 保持不变，仅通过 CSS 改变样式。

3. `renderConversationPreview()` / `renderCreatorPreview()` / `renderCreatorExtractPreview()`
   - 为字段状态点增加更明确的 class（如 `wa-field-status--collected`、`wa-field-status--pending`），便于分别着色。
   - 空状态使用更具引导性的文案和图标。

4. `renderCreatorStructureSection()`
   - 结构卡片 HTML 基本不变，CSS 负责选中态层次。

## 验证方式

1. 本地开发服务运行后，访问 `http://localhost:5174/?view=workAssistant`。
2. 分别检查对话、表单、示例提取三页：
   - 页面是否有温暖的层次感和焦点。
   - 右侧预览区是否像“实时检视器”而不是浮动的卡片。
   - 对话消息是否有时间线/层次。
   - tab、标题、进度是否形成统一的头部系统。
3. 运行 `python verify-creator-review.py` 确认功能回归通过。
4. 在 1440px / 1024px / 768px 三种宽度下截图检查响应式表现。

## 涉及文件

- `src/style.css`（主要改动：追加创意样式块）
- `src/views/WorkAssistant.js`（少量改动：增强 class 语义、优化预览字段状态点）
