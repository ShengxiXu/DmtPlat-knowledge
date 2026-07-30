# 场景模板创建页去卡片化重设计划

## 背景

上一轮已将左右两张卡片合并为单一面板，但用户反馈仍像“卡片风格”，希望更整体、更融合。本次目标是把创建器从“浮在灰底上的白卡片”进一步转变为“直接铺在页面上的连续工作区”，通过间距、对齐和极淡分隔线组织信息，而不是用背景色、边框、圆角、阴影来框定范围。

## 设计方向

- **外层去卡片化**：移除 `.wa-creator-panel` 的背景、边框、圆角、阴影，改为透明背景全宽铺满。
- **顶部去标题栏化**：header 不再使用渐变背景和底边框，只保留标题/描述/进度。
- **配置区扁平化**：内部 `.wa-creator-section` 去掉卡片背景，改用上下细线分隔。
- **预览区一体化**：与配置区共享页面背景，仅用极淡的左边框区分。
- **预览字段列表化**：字段从“白底边框圆角卡片”改为“连续列表行”，只有底部分隔线。
- **对话视图扁平化**：消息气泡去掉边框/阴影，输入胶囊阴影减弱。
- **标签页线型化**：顶部 tab 从 pill 按钮改为下划线式线型 tab。

## 具体改动

### 1. `src/views/WorkAssistant.js`

在 `renderCreatorPanel()` 中为面板容器新增修饰类 `.wa-creator-panel--seamless`：

```js
<div class="wa-creator-panel wa-creator-panel--seamless wa-creator-${variant}-panel">
```

其余 HTML 结构（header / body / footer / config / preview）保持不变，确保事件绑定和现有逻辑不受影响。

### 2. `src/style.css`

#### 2.1 外层容器去卡片化

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

#### 2.2 主体两栏与分隔

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

#### 2.3 配置区 section 扁平化

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

#### 2.4 预览字段列表化

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

#### 2.5 底部操作区扁平化

```css
.wa-creator-panel--seamless .wa-creator-panel-footer {
  padding: 20px 0 0;
  border-top: 1px solid rgba(0,0,0,0.06);
  background: transparent;
}
```

#### 2.6 对话视图扁平化

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

#### 2.7 标签页线型化

```css
.wa-creator-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  margin-bottom: 16px;
}

.wa-creator-tab {
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

.wa-creator-tab:hover {
  color: #7c3aed;
  background: transparent;
}

.wa-creator-tab.active {
  color: #7c3aed;
  background: transparent;
  border-bottom-color: #7c3aed;
  font-weight: 600;
}
```

### 3. 响应式

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

## 实施顺序

1. 在 `WorkAssistant.js` 的 `renderCreatorPanel()` 中添加 `.wa-creator-panel--seamless`。
2. 在 `style.css` 末尾追加去卡片化样式块。
3. 浏览器验证三页效果，确认无外层卡片、字段呈列表行、tab 为线型。
4. 运行 `python verify-creator-review.py` 回归测试。

## 验证方式

- 浏览器访问 `http://localhost:5173/?view=workAssistant`，检查三页：
  - 无白色浮层/圆角/阴影的卡片外框
  - 配置区与预览区仅由细线分隔
  - 预览字段为连续列表行
  - 顶部 tab 为下划线线型样式
- 运行 `python verify-creator-review.py` 全量通过。

## 涉及文件

- `src/views/WorkAssistant.js`
- `src/style.css`
