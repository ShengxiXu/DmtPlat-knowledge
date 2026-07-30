# 场景模板创建页去卡片化执行计划

## 摘要

上一轮已在 `WorkAssistant.js` 中为三个创建视图（对话、表单、示例提取）统一了 `renderCreatorPanel` 单面板结构，并添加了 `.wa-creator-panel--seamless` 修饰类。当前 `style.css` 仍未写入对应的去卡片化覆盖样式，导致页面依旧呈现“白底圆角阴影卡片”浮在灰底上的观感。本计划目标是在 `style.css` 中追加一套 `.wa-creator-panel--seamless` 覆盖样式，把创建器转变为直接铺在页面上的连续工作台，并验证三页效果与回归测试。

## 当前状态分析

### 已完成的改动

- `src/views/WorkAssistant.js:5118`
  - `renderCreatorPanel()` 输出 `<div class="wa-creator-panel wa-creator-panel--seamless wa-creator-${variant}-panel">`。
  - 对话、表单、示例提取三个视图均已通过该函数渲染。

- `src/style.css:14860` 附近
  - 已存在 `.wa-creator-form-new` 的灰底铺满样式。
  - 已存在 `.wa-creator-form-card / .wa-creator-canvas / .wa-creator-preview-card` 的透明化覆盖（lines 15678-15704）。

### 缺失的改动

- `src/style.css` 中**没有** `.wa-creator-panel--seamless` 的覆盖规则。
- 因此基础 `.wa-creator-panel`（lines 15441-15452）的白色背景、圆角、阴影仍然生效。
- `.wa-creator-tab`（lines 12143-12171）仍是 pill 按钮样式，需要线型化覆盖。
- `.wa-creator-section`（lines 12227-12232）仍有卡片背景/边框/圆角，需要扁平化覆盖。
- `.wa-creator-panel-preview .wa-creator-preview-field`（lines 15563-15578）仍是白底圆角小卡片，需要列表行化覆盖。

## 拟议改动

### 1. `src/style.css`：追加去卡片化样式块

在文件末尾（响应式媒体查询之后）追加一段 `.wa-creator-panel--seamless` 覆盖样式，具体包括：

#### 1.1 外层容器去卡片化

- 移除背景、边框、圆角、阴影。
- 宽度 100%，无最大宽度限制，与灰底页面融为一体。

```css
.wa-creator-panel--seamless {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
}

.wa-creator-panel--seamless .wa-creator-panel-header {
  padding: 16px 0 20px;
  background: transparent;
  border-bottom: none;
}
```

#### 1.2 主体两栏与分隔

- 配置区与预览区共享页面背景。
- 仅通过极淡的左边框分隔预览区。

```css
.wa-creator-panel--seamless .wa-creator-panel-body {
  display: grid;
  grid-template-columns: 58% 42%;
  align-items: start;
  gap: 0;
}

.wa-creator-panel--seamless .wa-creator-panel-config {
  padding: 8px 32px 8px 0;
  min-width: 0;
}

.wa-creator-panel--seamless .wa-creator-panel-preview {
  padding: 8px 0 8px 32px;
  background: transparent;
  border-left: 1px solid rgba(0,0,0,0.06);
  min-width: 0;
}
```

#### 1.3 配置区 section 扁平化

- 去掉背景、边框、圆角，改用底部分隔线。

```css
.wa-creator-panel--seamless .wa-creator-panel-config .wa-creator-section {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 24px 0;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.wa-creator-panel--seamless .wa-creator-panel-config .wa-creator-section:last-child {
  border-bottom: none;
}
```

#### 1.4 预览字段列表化

- 字段从“白底圆角卡片”改为“连续列表行”。
- 仅保留底部分隔线，悬停时极淡背景。

```css
.wa-creator-panel--seamless .wa-creator-panel-preview .wa-preview-card-header {
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.wa-creator-panel--seamless .wa-creator-panel-preview .wa-creator-preview-icon {
  background: rgba(124,58,237,0.1);
  color: #7c3aed;
  border-radius: 10px;
}

.wa-creator-panel--seamless .wa-creator-panel-preview .wa-creator-preview-fields {
  gap: 0;
  margin-top: 16px;
}

.wa-creator-panel--seamless .wa-creator-panel-preview .wa-creator-preview-field {
  padding: 12px 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  border-radius: 0;
  box-shadow: none;
}

.wa-creator-panel--seamless .wa-creator-panel-preview .wa-creator-preview-field:last-child {
  border-bottom: none;
}

.wa-creator-panel--seamless .wa-creator-panel-preview .wa-creator-preview-field:hover {
  background: rgba(0,0,0,0.02);
  box-shadow: none;
}
```

#### 1.5 底部操作区扁平化

- 移除背景，添加顶部分隔线。

```css
.wa-creator-panel--seamless .wa-creator-panel-footer {
  padding: 20px 0 0;
  border-top: 1px solid rgba(0,0,0,0.06);
  background: transparent;
}
```

#### 1.6 对话视图扁平化

- 消息气泡去掉边框/阴影。
- 输入胶囊阴影减弱。

```css
.wa-creator-panel--seamless .wa-creator-chat-config .wa-message-content {
  background: #fff;
  border: none;
  box-shadow: none;
}

.wa-creator-panel--seamless .wa-creator-chat-config .wa-message-user .wa-message-content {
  background: #ede9fe;
  color: #6d28d9;
  border: none;
}

.wa-creator-panel--seamless .wa-conversation-input-capsule {
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.wa-creator-panel--seamless .wa-conversation-input-capsule:focus-within {
  box-shadow: 0 2px 16px rgba(124,58,237,0.08);
}
```

#### 1.7 标签页线型化

- 顶部 tab 从 pill 按钮改为下划线式线型 tab。
- 需要覆盖已有的 `.wa-creator-tabs` / `.wa-creator-tab` 规则，使用更高特异性的选择器 `.wa-creator-form-new .wa-creator-tabs`。

```css
.wa-creator-form-new .wa-creator-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  margin-bottom: 16px;
}

.wa-creator-form-new .wa-creator-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 0;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.wa-creator-form-new .wa-creator-tab:hover {
  color: #7c3aed;
  background: transparent;
}

.wa-creator-form-new .wa-creator-tab.active {
  color: #7c3aed;
  background: transparent;
  border-bottom-color: #7c3aed;
  font-weight: 600;
}
```

#### 1.8 响应式补充

- 在 `@media (max-width: 1024px)` 中补充 `.wa-creator-panel--seamless` 适配：单列堆叠、移除左边框。

```css
@media (max-width: 1024px) {
  .wa-creator-panel--seamless .wa-creator-panel-body {
    grid-template-columns: 1fr;
  }
  .wa-creator-panel--seamless .wa-creator-panel-config {
    padding: 0 0 24px 0;
  }
  .wa-creator-panel--seamless .wa-creator-panel-preview {
    padding: 24px 0 0 0;
    border-left: none;
    border-top: 1px solid rgba(0,0,0,0.06);
  }
}

@media (max-width: 768px) {
  .wa-creator-form-new { padding: 16px 16px 32px; }
  .wa-creator-panel--seamless .wa-creator-panel-header,
  .wa-creator-panel--seamless .wa-creator-panel-footer {
    padding: 16px 0;
  }
}
```

### 2. 不变更的文件

- `src/views/WorkAssistant.js`：HTML 结构已满足去卡片化要求，无需修改。
- `verify-creator-review.py`：仅用于回归验证，无需修改。

## 假设与决策

1. ** specificity 策略**：`.wa-creator-panel--seamless` 作为容器修饰类，其内部覆盖规则比基础规则更具体，可确保生效。
2. **Tab 样式覆盖**：由于基础 `.wa-creator-tab` 已存在，使用 `.wa-creator-form-new .wa-creator-tab` 提升特异性，避免被旧规则覆盖。
3. **不改动交互逻辑**：仅调整视觉样式，保持事件绑定、字段增删、对话流程等逻辑不变。
4. **颜色变量与硬编码**：本次覆盖使用硬编码 hex/rgba 值，与当前 `.wa-creator-panel` 等样式保持一致；后续如需主题化可统一迁移到 CSS 变量。

## 验证步骤

1. **本地开发服务**：确认 `npm run dev`（或等价命令）已在 `http://localhost:5174` 运行。
2. **浏览器人工检查**：
   - 访问 `http://localhost:5174/?view=workAssistant`。
   - 点击“创建场景模板”，切换到对话/表单/示例提取三页。
   - 检查：无白色浮层/圆角/阴影的卡片外框；配置区与预览区仅由细线分隔；预览字段为连续列表行；顶部 tab 为下划线线型样式。
3. **回归测试**：运行 `python verify-creator-review.py`，确保三个创建流程全部通过。
4. **响应式检查**：将浏览器窗口缩至 ≤1024px 和 ≤768px，确认配置区与预览区堆叠、无内容截断。

## 涉及文件

- `src/style.css`（追加样式）
- `src/views/WorkAssistant.js`（只读确认，无需修改）
- `verify-creator-review.py`（验证用）
