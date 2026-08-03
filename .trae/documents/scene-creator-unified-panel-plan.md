# 场景模板创建页统一单面板重设计划

## 背景

上一轮改动将创建页从旧版居中布局改为两栏卡片布局（左侧配置 + 右侧预览），但用户反馈仍然像“两个独立卡片”，整体感弱、不够高级、内容不多却显凌乱。本次迭代的目标是把左右两张卡片合并为**一个连续的工作台面板**，通过内部比例、背景色和细线分隔来区分配置与预览，从而提升整体感与高级感。

## 设计方向

- **一个容器、一个阴影、一个圆角**：整个创建区域作为一张大面板呈现。
- **头部与底部横跨全宽**：强化“这是一个整体工作台”的心理模型。
- **配置区**使用纯白背景，**预览区**使用极浅灰 `#f9fafb` 背景 + 1px 左边框，仅作为功能分区暗示，不再是一张独立卡片。
- **减少视觉噪音**：去掉重复标题、去掉右侧卡片的独立 header、去掉多余的阴影/边框；footer 只保留一组统一的操作。
- **更克制的色彩**：延续紫灰渐变作为头像/图标强调，大面积使用白、灰、细线。

## 具体改动

### 1. `src/views/WorkAssistant.js` — 统一面板外壳

新增公共 helper：

```js
renderCreatorPanel({ variant, title, desc, progress, config, preview, footer });
```

`variant` 为 `form` / `chat` / `extract`，用于各自微调高度与内边距。结构为：

```
.wa-creator-form-new
  └─ .wa-creator-panel.wa-creator-{variant}-panel
      ├─ .wa-creator-panel-header (标题/描述/进度)
      ├─ .wa-creator-panel-body (58%/42% 网格)
      │   ├─ .wa-creator-panel-config (配置区)
      │   └─ .wa-creator-panel-preview (预览区)
      └─ .wa-creator-panel-footer (统一操作/状态)
```

#### 表单创建 `renderCreatorFormView()`

- 去掉 `wa-creator-form-layout`、`wa-creator-form-card` 外层。
- 保留 `wa-creator-form-card-body` 作为配置区内层（沿用字段样式）。
- 预览直接调用 `this.renderCreatorPreview()`，不再包 `wa-creator-preview-card`。
- 操作按钮（取消 + 生成提示词）移到 `.wa-creator-panel-footer`。
- 删除右侧预览卡里的重复“生成提示词”按钮。

#### 对话创建 `renderCreatorChatView()`

- 去掉 `wa-creator-chat-layout`、`wa-creator-canvas` 独立卡片。
- 标题与进度点移入 `.wa-creator-panel-header`。
- 配置区只包含消息区与悬浮胶囊输入。
- `confirm/complete` 状态的操作按钮（重新创建 + 进入提示词确认）移到 `.wa-creator-panel-footer`。
- 其他状态 footer 显示 Live 指示灯 + “继续对话以完善模板结构”提示。

#### 示例提取 `renderCreatorExtractView()`

- 与表单结构一致：上传区 + 表单项进配置区，识别结果进预览区。
- 取消 / 进入确认页按钮统一在 `.wa-creator-panel-footer`。

#### 三个预览函数

- `renderCreatorPreview()` / `renderConversationPreview()` / `renderCreatorExtractPreview()` 只返回头部、字段清单、描述，**移除各自的底部操作区**。
- `renderCreatorExtractPreview()` 的空状态重构为预览区内的轻量占位。

#### 事件绑定清理

- 删除 `#wa-creator-generate-review-side` 的事件监听与 `updateStep1GenerateButton` 中的 `sideBtn` 引用。
- 删除 `#wa-conversation-restart-side` 与 `#wa-conversation-confirm-review-side` 的事件监听。
- 保留并确保 `#wa-extract-cancel`、`#wa-extract-confirm-review` 只在面板 footer 出现一次。

### 2. `src/style.css` — 统一面板样式

#### 新增核心面板样式

```css
.wa-creator-panel {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 20px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 16px 40px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.wa-creator-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 32px;
  background: linear-gradient(135deg, #fafaff 0%, #fdf8ff 100%);
  border-bottom: 1px solid #f0f0f0;
}

.wa-creator-panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
}
.wa-creator-panel-desc {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
  line-height: 1.5;
}

.wa-creator-panel-body {
  display: grid;
  grid-template-columns: 58% 42%;
  align-items: stretch;
  min-height: 0;
}

.wa-creator-panel-config {
  padding: 28px 32px;
  min-width: 0;
}

.wa-creator-panel-preview {
  padding: 28px 32px;
  background: #f9fafb;
  border-left: 1px solid #f0f0f0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.wa-creator-panel-footer {
  padding: 16px 32px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
```

#### 预览区内部元素调整

- `.wa-creator-preview-icon` 缩小至 40px，圆角 12px，更克制。
- `.wa-creator-preview-name` 16px，与面板标题形成层级。
- `.wa-creator-preview-fields` 去掉 margin-top（由面板 padding 控制）。
- `.wa-preview-card-header` 去掉 border-bottom 或改为更淡的 `#f3f4f6`。
- `.wa-creator-preview-field` 背景改为 `#fff` 或透明，减少灰色块堆砌。

#### 对话页特殊处理

```css
.wa-creator-chat-panel .wa-creator-panel-body {
  height: calc(100vh - 232px);
  min-height: 520px;
}

.wa-creator-chat-config {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.wa-creator-chat-config .wa-conversation-messages {
  flex: 1;
  padding: 28px;
}
.wa-creator-chat-config .wa-conversation-input-wrapper {
  padding: 16px 28px 24px;
}
```

#### 清理旧两卡样式

以下选择器直接替换或删除，避免残留：

- `.wa-creator-form-layout`
- `.wa-creator-chat-layout`
- `.wa-creator-extract-layout`
- `.wa-creator-form-card`（保留 `.wa-creator-form-card-body` 供字段样式复用，但去掉外层卡片样式）
- `.wa-creator-preview-card` 的 background/border/box-shadow/position:sticky
- `.wa-creator-canvas` 及 `::before` 装饰线
- `.wa-creator-canvas-header`
- `.wa-creator-form-main` / `.wa-creator-form-side` / `.wa-creator-chat-side` 的 sticky 行为

#### 响应式

```css
@media (max-width: 1024px) {
  .wa-creator-panel-body {
    grid-template-columns: 1fr;
  }
  .wa-creator-panel-preview {
    border-left: none;
    border-top: 1px solid #f0f0f0;
  }
  .wa-creator-chat-panel .wa-creator-panel-body {
    height: auto;
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .wa-creator-panel-header,
  .wa-creator-panel-footer {
    padding: 16px 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .wa-creator-panel-config,
  .wa-creator-panel-preview {
    padding: 20px;
  }
}
```

## 实施顺序

1. `WorkAssistant.js` 新增 `renderCreatorPanel()` helper。
2. 重写 `renderCreatorFormView()`，同步清理右侧生成按钮与事件监听。
3. 重写 `renderCreatorChatView()`，将操作按钮统一到底部 footer。
4. 重写 `renderCreatorExtractView()`。
5. 修改三个预览函数，移除底部操作区。
6. `style.css` 新增统一面板样式并清理旧两卡样式。
7. 浏览器验证三页效果、footer 不遮挡、响应式无错位。
8. 运行 `python verify-creator-review.py` 回归测试。

## 验证方式

- 浏览器访问 `http://localhost:5173/?view=workAssistant`，依次进入对话/表单/示例提取三页，确认：
  - 只有一个连续面板，而非左右两张独立卡片。
  - 头部、底部横跨全宽。
  - 预览区为浅灰背景 + 左边框，不独立成卡。
  - 操作按钮集中在面板底部。
- DevTools 验证 1280px、1024px、768px 断点下布局正确。
- 运行 `python verify-creator-review.py` 全量通过。

## 涉及文件

- `src/views/WorkAssistant.js`
- `src/style.css`
