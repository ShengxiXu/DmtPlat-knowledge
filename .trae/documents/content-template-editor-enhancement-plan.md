# 内容模板中心功能增强计划

## 背景与目标

当前内容模板中心的「创建内容模板」功能存在两处明显短板：

1. **空白模板编辑器只支持 word 章节模式**：右侧「模板格式」下拉框已存在，但切换格式后左侧画布和右侧大纲不会联动，无法编辑表格、邮件、清单、流程等结构的模板。
2. **「上传模板文件」和「从范文提取」两个入口未实现**：点击后没有任何效果或仅关闭弹窗。

本计划旨在补齐这两块能力，使模板编辑器真正支持 5 种格式（word/table/email/list/steps），并打通上传解析、范文提取两条快速创建路径。

---

## 方案一：多格式模板编辑器

### 核心思路

将模板编辑器的「画布 + 侧边栏」从「仅 word/sections」重构为按 `editorTemplate.format` 动态渲染。新增 5 套模板级编辑渲染器（结构与内容文档编辑器的 `renderXxxEditor` 类似，但语义是「编辑模板结构」），并实现格式切换时的数据迁移、保存校验。

### 关键改动文件

#### 1. `src/views/ContentTemplateManager.js`

**新增字段（constructor）**

```js
this.editorFormatChanging = false; // 格式切换中标志
```

**拆分 `renderEditorModal`**

- 左侧画布：根据 `t.format` 调用对应渲染方法。
- 右侧边栏：「章节大纲」改为按格式展示结构概览。

**新增渲染方法**

| 方法                                  | 用途                                          |
| ------------------------------------- | --------------------------------------------- |
| `renderTemplateCanvas(t)`             | 根据 format 分发到具体画布                    |
| `renderTemplateSidebar(t)`            | 根据 format 渲染右侧结构/大纲                 |
| `renderTemplateWordEditor(content)`   | 章节结构编辑（迁移现有逻辑）                  |
| `renderTemplateTableEditor(content)`  | 表格：编辑列名、增删列/行                     |
| `renderTemplateEmailEditor(content)`  | 邮件：subject/greeting/body/closing/signature |
| `renderTemplateListEditor(content)`   | 清单：编辑清单项                              |
| `renderTemplateStepsEditor(content)`  | 流程：编辑步骤 title + desc                   |
| `renderTemplateWordOutline(content)`  | word 章节大纲                                 |
| `renderTemplateTableOutline(content)` | table 列/行预览                               |
| `renderTemplateEmailOutline(content)` | email 字段清单                                |
| `renderTemplateListOutline(content)`  | list 项大纲                                   |
| `renderTemplateStepsOutline(content)` | steps 步骤大纲                                |

**新增结构操作方法**

- Table：`addTableColumn / deleteTableColumn / addTableRow / deleteTableRow`
- List：`addListItem / deleteListItem / moveListItem`
- Steps：`addStep / deleteStep / moveStep`
- Email：`addEmailBodyPara / deleteEmailBodyPara / moveEmailBodyPara`
- Word：复用现有 `addSection / moveSection / changeSectionLevel / deleteSection`

**格式迁移 `migrateTemplateFormat(newFormat)`**

切换 `#ctm-editor-format` 时触发，规则如下（不完整列举）：

- word → table：section.title 转为行，列名取 `['章节','说明']`。
- word → steps：section.title → step.title，guide → step.desc。
- table → word：第一列 → section.title，第二列 → guide。
- email → word：subject/body/closing 映射为章节。
- 无法合理迁移时采用目标格式默认空结构，并备份原 content 到 `_legacyContent`。

切换前通过 `confirm('切换格式会尝试迁移现有结构，是否继续？')` 提示用户。

**保存校验 `validateTemplateContent(content, format)`**

- word：至少 1 个 section。
- table：至少 1 列、1 行，列名非空。
- email：subject、greeting、closing 非空。
- list：至少 1 条非空 item。
- steps：至少 1 个 step，title 非空。

**修改 `saveEditorTemplate`**

按 format 分别收集 DOM 数据到 `content`，再组装模板对象并调用 `saveMyContentTemplate`。

**事件绑定补充**

- `#ctm-editor-format` 的 `change` 事件：触发格式迁移并刷新。
- 在 `.ctm-fusion-canvas` 上委托各类结构操作按钮。
- 画布中的 `input/textarea` 在 `input/blur` 时同步回 `this.editorTemplate.content`。

#### 2. `src/ctm-styles.css`

新增/复用以下样式类：

```css
.ctm-template-table-wrap { ... }
.ctm-template-table th input { ... }
.ctm-template-table .col-actions { ... }
.ctm-template-list-item { ... }
.ctm-template-step { ... }
.ctm-fusion-outline-item[data-format="table"] { ... }
.ctm-format-migrate-notice { ... }
```

保持与现有 `ctm-doc-*` 风格一致，避免新增大量样式。

---

## 方案二：上传模板文件与从范文提取

### 核心思路

在「创建内容模板」弹窗中补齐两个入口：

1. **上传模板文件**：前端选择文件后调用已有后端接口 `/api/parse-template`，将解析结果转换为模板草稿并进入编辑器。
2. **从范文提取**：弹出一个简单输入框，用户粘贴范文后由客户端启发式规则分析格式、提取结构，生成草稿并进入编辑器。

### 关键改动文件

#### 1. `src/views/ContentTemplateManager.js`

**新增状态字段（constructor）**

```js
this.showUploadModal = false;
this.showExtractModal = false;
this.uploadFile = null; // { fileName, fileType, fileObj }
this.extractText = '';
this.extractParsing = false;
```

**修改 `.ctm-create-option` 点击处理**

```js
else if (type === 'upload') {
  this.openUploadModal();
} else if (type === 'extract') {
  this.openExtractModal();
}
```

**新增渲染方法**

- `renderUploadModal()`：文件上传弹窗，含拖拽区域、文件信息、开始提取按钮。
- `renderExtractModal()`：范文输入弹窗，含模板名称输入框、范文 textarea、识别按钮。

在 `render()` 中追加这两个弹窗。

**新增业务方法**

- `openUploadModal() / closeUploadModal()`
- `openExtractModal() / closeExtractModal()`
- `handleUploadFileSelect(file)`：校验扩展名，更新状态。
- `async startUploadTemplate()`：构造 FormData，POST 到 `http://localhost:3001/api/parse-template`，解析结果转草稿。
- `convertParsedResultToTemplate(data)`：将服务端返回转为 `editorTemplate` 结构。
  - xlsx → table（取第一个 sheet 的 headers 和 sampleRows）。
  - docx/pdf → word（headings → sections；无 headings 则用 paragraphs 兜底）。
  - txt/md → word（按行识别章节）。
- `startExtractTemplateFromExample()`：读取输入，调用提取逻辑。
- `extractContentTemplateFromExample(name, text)`：启发式推断格式并生成 content。
  - 含 `|` 多行 → table
  - 含「步骤」或以编号开头 → steps
  - 含 `- ` / `□` / `[ ]` → list
  - 含「尊敬的」「主题：」「此致」→ email
  - 其他 → word（按标题规则识别章节）
- `guessSectionsFromText(lines)`：辅助识别章节标题。

**事件绑定补充**

- 上传弹窗：关闭按钮、拖拽/点击选择文件、`change` 事件、`#ctm-upload-start` 点击。
- 提取弹窗：关闭按钮、`#ctm-extract-start` 点击。
- overlay 关闭逻辑同步关闭 upload/extract modal。

#### 2. `src/ctm-styles.css`

```css
.ctm-upload-modal, .ctm-extract-modal { width: 560px; }
.ctm-upload-zone { ... }
.ctm-upload-zone.dragover { ... }
.ctm-upload-file-info { ... }
.ctm-extract-modal textarea { min-height: 200px; }
```

#### 3. 后端：`server/index.js`

**无需修改**。现有 `/api/parse-template` 已支持 docx/xlsx/pdf/txt/md 解析。前端 accept 限制为 `.docx,.xlsx,.txt,.md`，与现有 parser 对齐。

---

## 数据结构约定

沿用 `src/data/contentTemplates.js` 中已有的 content 结构：

```js
// word
content: { sections: [{ title, level, guide }] }

// table
content: { columns: [], rows: [[]] }

// email
content: { subject, greeting, body: [], closing, signature }

// list
content: { items: [] }

// steps
content: { steps: [{ title, desc }] }
```

---

## 执行顺序

1. 先实现方案一的多格式编辑器基础能力（渲染、迁移、保存校验）。
2. 再实现方案二的上传/提取入口，使解析后的草稿能正确进入多格式编辑器。
3. 补充 CSS，进行端到端验证。

---

## 验证步骤

1. 打开模板中心 → 新建 → 空白模板。
2. 右侧切换格式为「表格」，确认画布变为表格列/行编辑，侧边栏显示列结构。
3. 添加/删除列和行，保存后预览，确认结构正确。
4. 切换格式为「邮件」，确认出现邮件字段编辑区，保存后预览正常。
5. 编辑现有 word 模板，切换为「流程」，确认章节迁移为步骤。
6. 点击「上传模板文件」，上传 `.docx`，确认进入编辑器且章节被提取。
7. 上传 `.xlsx`，确认编辑器自动为表格格式，列名和行数据正确。
8. 点击「从范文提取」，粘贴带编号段落的文本，确认生成 word 模板。
9. 粘贴 Markdown 表格文本，确认生成 table 模板。
10. 运行 `npm run build`，确认构建通过。

---

## Critical Files

- `e:/project/dmtplat-test/src/views/ContentTemplateManager.js`
- `e:/project/dmtplat-test/src/ctm-styles.css`
- `e:/project/dmtplat-test/server/index.js`（只读复用，不修改）
- `e:/project/dmtplat-test/src/data/contentTemplates.js`（只读参考结构）
