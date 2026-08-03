# 飞书级富文本编辑器升级计划(TipTap/ProseMirror)

## Context(背景与目标)

当前内容模板中心的两类编辑器编辑能力薄弱:

- **模板编辑器**(`renderWordCanvas`/`renderTableCanvas` 等):前一轮已加 contenteditable + execCommand 工具栏,但原生 execCommand 已废弃,嵌套结构(多级列表/嵌套表格)能力有限。
- **文档创作编辑器**(`renderWordEditor`/`renderTableEditor` 等,基于 `contentDoc`):仍是 `<textarea>`/`<input>`,完全无富文本,且表格只有增删行。

用户要求:做成像飞书那样丰富的编辑功能,且选中模板直接创作时也要具备同等编辑能力。已确认选型:**引入 TipTap/ProseMirror** + **完整飞书版表格**。

预期结果:模板编辑器与文档创作编辑器共用同一套 TipTap 富文本内核与飞书风格工具栏,支持格式、颜色、字号、列表、对齐、引用、代码、链接、图片、分割线、撤销重做,以及表格的合并单元格、列宽拖拽、表头切换、单元格背景色、Tab 导航。

## 技术选型

TipTap 是基于 ProseMirror 的无头、框架无关富文本框架,支持 Vanilla JavaScript(`import { Editor } from '@tiptap/core'`)。表格扩展 `@tiptap/extension-table` 开箱即用提供 `mergeCells`/`splitCell`/`resizable`/`setCellAttribute`/`toggleHeaderRow`/`goToNextCell` 等命令,覆盖飞书表格核心能力。

### 新增依赖

```
@tiptap/core
@tiptap/starter-kit          # 包含 bold/italic/列表/引用/代码块/历史等
@tiptap/extension-underline
@tiptap/extension-text-align
@tiptap/extension-text-style
@tiptap/extension-color       # 文字颜色
@tiptap/extension-highlight   # 背景高亮
@tiptap/extension-link
@tiptap/extension-image
@tiptap/extension-task-list
@tiptap/extension-task-item
@tiptap/extension-subscript
@tiptap/extension-superscript
@tiptap/extension-placeholder
@tiptap/extension-table
@tiptap/extension-table-row
@tiptap/extension-table-header
@tiptap/extension-table-cell
```

## 架构设计

### 三层结构

1. **内核层** `src/editor/RichEditor.js` — TipTap 封装,框架无关
2. **UI 层** `src/editor/RichToolbar.js` — 飞书风格工具栏,按格式配置按钮组
3. **迁移层** `src/editor/migrate.js` — 现有结构化数据 ↔ HTML/JSON 双向转换

### 数据存储策略

现有 `contentDoc.data` / `editorTemplate.content` 结构保留外壳,内容字段从纯文本升级为 **HTML 字符串**(TipTap `getHTML()` 输出)。

- word: `section.text` / `section.guide` 存 HTML
- table: 不再使用 `columns`/`rows` 二维数组,改为存单个 `html` 字段(含 `<table>`),向后兼容通过 migrate 转换
- email: `body[]` 每段存 HTML,`signature` 存 HTML
- list: `item.text` 存 HTML
- steps: `step.detail` 存 HTML

读取旧数据时自动调用 migrate 转为 HTML,写入时统一存 HTML。导出逻辑同步适配。

## 实施步骤

### 阶段 1:内核与工具栏(新建文件)

**新建 `src/editor/RichEditor.js`**
- 导出 `createRichEditor({ element, format, content, onUpdate })`
- 按 format 组装扩展集:
  - 通用:StarterKit + Underline + TextAlign + TextStyle + Color + Highlight + Link + Image + Subscript + Superscript + Placeholder
  - word/email/list/steps:上述 + TaskList/TaskItem(list 用)
  - table:上述 + Table(resizable:true, cellMinWidth:80) + TableRow + TableHeader + TableCell
- 初始内容:`content` 为 HTML 字符串,通过 `editor.commands.setContent(content)` 注入
- `onUpdate` 回调返回 `{ html, json }`
- 暴露 `getHTML()` / `setHTML()` / `destroy()` / `getInstance()`

**新建 `src/editor/RichToolbar.js`**
- 导出 `createRichToolbar({ editor, container, format })`
- 按钮分组(飞书风格):
  - 撤销重做:undo/redo
  - 文本格式:bold/italic/underline/strikeThrough/code
  - 标题:H1/H2/H3/paragraph(下拉菜单)
  - 列表:bulletList/orderedList/taskList
  - 对齐:left/center/right/justify
  - 颜色:文字色(色板)/高亮色(色板)
  - 插入:link(弹窗输入 URL)/image(弹窗输入 URL)/divider/quote/codeBlock
  - 清除格式:clearNodes + unsetAllMarks
  - 表表格式专属:插入表/上行下行/左列右列/删行列/合并拆分/表头切换/单元格背景色
- 监听 `editor.on('selectionUpdate')` / `on('transaction')` 实时刷新按钮 active 状态
- 色板/链接弹窗用浮层 div,点击外部关闭

### 阶段 2:数据迁移层(新建文件)

**新建 `src/editor/migrate.js`**
- `legacyWordToHtml(data)` — sections[{title,guide,text}] → `<h2>title</h2><p>guide</p><div>text</div>`
- `legacyTableToHtml(data)` — columns/rows → `<table><thead>...</thead><tbody>...</tbody></table>`
- `legacyEmailToHtml(data)` — subject/greeting/body[]/closing/signature → 结构化 HTML
- `legacyListToHtml(data)` — items[{text,checked}] → `<ul data-type="taskList">...`
- `legacyStepsToHtml(data)` — steps[{title,detail}] → `<h3>title</h3><p>detail</p>`
- `htmlToLegacyWord(html)` — 反向,用于导出/向后兼容(解析 DOM)
- `htmlToLegacyTable(html)` — 反向,解析 `<table>` 得到 columns/rows(供 CSV 导出)
- 统一入口 `ensureHtmlContent(data, format)` — 若已是 HTML 直接返回,否则迁移

### 阶段 3:文档创作编辑器改造

**修改 `src/views/ContentTemplateManager.js`**

- `renderContentEditor`(L565):body 容器改为 `<div id="ctm-doc-editor-area"></div>` 挂载点,渲染后调用 `createRichEditor` 挂载
- `renderWordEditor`(L617):移除 textarea,改为挂载点 + meta 输入区(主题/时间/部门/撰稿人保留为 input)
- `renderTableEditor`(L668):整体替换为挂载点,内容用 `legacyTableToHtml` 转 HTML 后注入 TipTap Table
- `renderEmailEditor`(L699):主题/称呼/结尾保留 input,正文/签名改为挂载点
- `renderListEditor`(L736):改为挂载点,用 TaskList 扩展
- `renderStepsEditor`(L755):改为挂载点
- `bindEvents`(L1699/):移除旧的 doc-title/section-text 逐字段监听,改为监听 `editor.on('update')` 同步 `contentDoc.data.html`
- `syncContentDocFromDOM`(L2691):改为遍历所有 RichEditor 实例调 `getHTML()`,meta/title 等输入框仍读 value
- `handleDocStructureAction`(L2764):list/steps 的增删项改用 TipTap 命令(插入/删除节点),或保留数据数组模式但每项存 HTML
- `exportContentDocument`(L2829):从 HTML 解析回对应格式(markdown/csv/eml)
- 顶部工具栏:在 `ctm-doc-editor-header` 下方插入 `RichToolbar` 挂载点

### 阶段 4:模板编辑器改造

**修改 `src/views/ContentTemplateManager.js`**

- `renderWordCanvas`(L1171)/`renderTableCanvas`(L1258)/`renderEmailCanvas`/`renderListCanvas`/`renderStepsCanvas`:同样改为挂载点 + RichEditor
- `renderWordToolbar`(L1221)/`renderSheetEditor`(L1262):标记为 deprecated,由 RichToolbar/RichEditor 接管
- 模板编辑器 bindEvents(L1932 起):移除旧 `.ctm-fusion-toolbar-btn` / `.ctm-sheet-*` 事件,改由 RichToolbar 内部绑定
- `collectEditorContent`(L2836):改为读 `editor.getHTML()` 写入 `editorTemplate.content`
- 表格操作方法(`addTableRow`/`insertTableColumn`/`deleteTableColumn`/`focusSheetCell` 等,L3202 起):替换为调用 TipTap 表格命令 `editor.chain().focus().addRowAfter().run()` 等
- `migrateTemplateFormat`(L2988):格式间迁移改为 HTML 中转(旧二维数组 → HTML → 目标格式外壳)

### 阶段 5:样式与交互

**修改 `src/ctm-styles.css`**

- 新增 `.ctm-rich-toolbar` 飞书风格工具栏(替换/扩展现有 `.ctm-fusion-toolbar`)
- 新增 `.ctm-rich-toolbar-btn` active/hover/disabled 状态
- 新增色板 `.ctm-color-popover`、链接弹窗 `.ctm-link-popover`
- 新增 `.ProseMirror` 编辑区样式:placeholder、各级标题、列表、引用、代码块、链接、图片
- 表格样式:`.tableWrapper` 滚动容器、`th/td` 边框、`.selectedCell` 选中态、`.column-resize-handle` 拖拽手柄、表头 `position: sticky` 冻结首行
- 保留旧 `.ctm-doc-*` 样式供 meta 输入区复用

### 阶段 6:清理与验证

- 移除已废弃的 `renderWordToolbar`/`renderSheetEditor` 及其专属 CSS
- `npm run build` 确认无错
- `npx eslint src/` 修复新增文件的 lint 问题
- 浏览器端验证(见下)

## 关键文件

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/editor/RichEditor.js` | 新建 | TipTap 封装 |
| `src/editor/RichToolbar.js` | 新建 | 飞书风格工具栏 |
| `src/editor/migrate.js` | 新建 | 数据双向迁移 |
| `src/views/ContentTemplateManager.js` | 修改 | 文档/模板编辑器接入新内核 |
| `src/ctm-styles.css` | 修改 | 工具栏、编辑区、表格样式 |
| `package.json` | 修改 | 新增 TipTap 依赖 |

## 复用与废弃

- **复用**:`escapeHtml`(已有)、`showToast`(L2675)、`saveMyDocument`/`saveMyTemplates`(数据持久层不变,仅内容字段格式升级)
- **废弃**:`renderWordToolbar`(L1221)、`renderSheetEditor`(L1262)、模板编辑器中 `.ctm-fusion-toolbar-btn`/`.ctm-sheet-*` 事件绑定、文档编辑器中 `renderWordEditor` 等的 textarea/input 实现

## 风险与权衡

1. **包体积**:TipTap + 扩展约增加 200-300KB(gzip 后约 70-100KB)。可接受,因编辑能力是核心功能。
2. **数据兼容**:旧 localStorage 数据需迁移。`ensureHtmlContent` 在读取时自动转换,无需用户操作。建议在数据对象加 `_v: 2` 版本号。
3. **冻结首行首列**:TipTap 官方不支持,用 CSS `thead th { position: sticky; top: 0 }` 实现,可满足视觉冻结。
4. **单元格数据类型(数字/日期/下拉)**:飞书电子表格特性,与富文本文档表格模型冲突,不做。文档表格单元格支持富文本已足够。
5. **图片上传**:本期仅支持 URL 插入图片,不做本地上传(需后端存储,超出范围)。支持粘贴/拖拽图片为 base64(StarterKit Image 默认行为)。

## 验证方法

1. `npm install` 安装新依赖
2. `npm run build` 确认构建通过
3. `npx eslint src/editor/ src/views/ContentTemplateManager.js` 无 error
4. 启动 `npm run dev`,浏览器验证:
   - 模板中心 → 新建模板 → 空白模板 → 切换各格式(word/table/email/list/steps),工具栏按钮齐全且生效
   - word:加粗/颜色/标题/列表/引用/链接/图片/分割线/撤销重做,多章节不溢出
   - table:插入表、合并单元格、拆分、列宽拖拽、表头切换、单元格背景色、Tab 导航、右键菜单
   - 保存模板 → 重新打开编辑,内容正确还原
   - 选中模板 → 使用 → 文档创作编辑器具备相同工具栏与能力
   - 旧数据(已有模板/文档)打开后自动迁移显示正常
   - 导出功能(word→md / table→csv / email→eml)正常
5. 回归:模板中心列表、搜索、分类筛选、卡片/列表视图不受影响


创建模板的时候，和选中模板进行创作内容的时候应该展示的功能不一样，创作模板的时候不需要创作内容时候那么多的功能，你把这个问题考虑清楚，看看功能上怎么分配