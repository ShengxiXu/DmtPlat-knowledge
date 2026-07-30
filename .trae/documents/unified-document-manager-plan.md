# 统一文档管理功能实现计划

## Context

当前项目已具备两类创作能力：

1. **内容模板创作**（`ContentTemplateManager.js`）：基于 word/table/email/list/steps 等格式模板生成文档，保存到 `localStorage` 键 `dmtplat_my_documents`。
2. **场景模板创作**（`WorkAssistant.js`）：基于角色/能力的场景模板生成 PPT/报告/表格/文本等结果，保存到 `localStorage` 键 `workAssistantHistory`。

但创作完成后的产物缺少统一的查看、搜索、筛选、删除和再次打开入口。用户需要在侧边栏新增一个「我的文档」页面，把两类产物集中管理。

## 目标

- 在「智能工作」导航区新增「我的文档」入口。
- 新增统一文档管理视图，聚合内容模板文档与场景模板生成记录。
- 支持搜索、来源筛选、输出类型筛选、排序、分页、删除。
- 支持打开内容文档进入编辑器继续编辑，支持打开场景记录查看生成结果。
- 复用现有数据层与样式，不改动已有存储键。

## 推荐方案

### 1. 导航与路由

- 侧边栏标签：**我的文档**
- 路由 ID：`myDocuments`
- 所属区块：智能工作（与「智能工作助手」「内容模板」同级）
- 图标：`folder-open`

### 2. 新增与修改文件

| 类型 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/views/DocumentManager.js` | 统一文档管理视图 |
| 修改 | `src/components/Sidebar.js` | 新增导航项 |
| 修改 | `src/main.js` | 注册路由并处理打开回调 |
| 修改 | `src/views/ContentTemplateManager.js` | 支持通过 `initialDocumentId` 加载已有文档进入编辑器 |
| 修改 | `src/views/WorkAssistant.js` | 支持通过 `initialRecordId` 恢复历史记录并展示结果 |
| 修改 | `src/style.css` | 追加少量 DocumentManager 专用样式 |

### 3. 统一文档展示模型

从两个数据源聚合后，归一化为统一列表项：

```ts
{
  id: string;                 // 原始 id（doc_xxx 或 wa_xxx）
  sourceType: 'content' | 'scene';
  title: string;
  templateId: string;
  templateName: string;
  outputType: string;         // content: word/table/email/list/steps
                              // scene: ppt/table/text/report/markdown/list/email/steps/qa
  outputTypeLabel: string;    // 文档、表格、邮件、清单、流程、PPT、报告…
  roleName?: string;          // scene 专用
  abilityName?: string;       // scene 专用
  mode?: string;              // scene 专用
  createdAt: ISOString;
  updatedAt: ISOString;
  raw: object;                // 原始 doc 或 record，打开时透传
}
```

- **content**：`format` 直接作为 `outputType`，标签取自 `contentTemplates.js` 的 `formatLabels`。
- **scene**：优先根据 `result` 结构推断（有 `pages` 则为 `ppt`，有 `columns/rows` 则为 `table`），否则回退 `template.outputType` 或 `text`。

### 4. DocumentManager.js 组件设计

#### 状态字段
- `searchQuery: string`
- `sourceFilter: 'all' | 'content' | 'scene'`
- `outputTypeFilter: string`
- `sortBy: 'updatedAt' | 'createdAt' | 'title'`
- `sortOrder: 'desc' | 'asc'`
- `currentPage: number`
- `pageSize: number`（建议 8）

#### 核心方法
- `loadDocuments()`：调用 `getMyDocuments()` 与 `getWorkHistory()`，归一化合并。
- `getFilteredDocuments()`：应用搜索、来源筛选、输出类型筛选、排序。
- `getPaginatedDocuments()`：分页。
- `render()`：渲染头部、搜索框、筛选栏、排序、卡片列表、空状态、分页。
- `renderDocumentCard(doc)`：卡片结构（图标、标题、来源标签、输出类型标签、模板名、时间、操作）。
- `bindEvents()`：搜索、筛选、排序、分页、打开、删除。
- `handleOpen(doc)`：根据 `sourceType` 触发 `onOpenContentDoc(doc.id)` 或 `onOpenSceneRecord(doc.id)`。
- `handleDelete(doc)`：二次确认后，content 调用 `deleteMyDocument`，scene 从 history 过滤后 `saveWorkHistory`。

#### 回调接口
- `setOnOpenContentDoc(callback)`
- `setOnOpenSceneRecord(callback)`

### 5. ContentTemplateManager.js 修改点

构造函数接收 `options.initialDocumentId`：
- `init()` 中在 `loadTemplates()` 后判断，若存在则查找 `getMyDocuments()` 并命中进入编辑器。
- 现有 `render()` 已优先判断 `this.contentDoc`，`saveContentDocument()` 会按 `id` 覆盖更新。
- 关闭编辑器回到模板列表时清空 `this.contentDoc`（已有 `closeContentEditor()`）。

### 6. WorkAssistant.js 修改点

构造函数接收 `options.initialRecordId` 和 `options.returnToView`：
- 新增 `restoreInitialRecord()`：从 `getWorkHistory()` 查找记录，恢复 `selectedTemplate`、`activeRole`、`currentFormData`、`currentMode`、`currentKBs`、`currentResult`。
- `renderEditor()` 中表单/模式/知识库初始值优先使用恢复值。
- 渲染后若 `currentResult` 存在，直接调用结果展示逻辑（非 PPT 调用 `renderResult`，PPT 调用 PPT 结果展示）。
- 返回按钮优先回到 `returnToView`（默认 `home`）。

### 7. main.js 与 Sidebar.js 修改点

Sidebar.js：
- 在 `workItems` 追加 `{ id: 'myDocuments', label: '我的文档', icon: 'folder-open' }`。

main.js：
- 引入 `DocumentManager`。
- `handleInitialRoute()` 白名单加入 `'myDocuments'`。
- `renderView()` switch 新增 `case 'myDocuments'`。
- 新增 `renderDocumentManager(container)`：
  - 点击 content 文档 → `renderContentTemplates(..., { initialDocumentId: docId })`
  - 点击 scene 记录 → `renderWorkAssistant(..., { initialRecordId: recordId, returnToView: 'myDocuments' })`
- `renderContentTemplates(container, options = {})` 透传 `initialDocumentId`。

### 8. CSS 方案

优先复用现有类：
- 页面结构：`.header`、`.header-title`、`.header-actions`、`.content`
- 搜索框：`.search-box`、`.input`
- 筛选标签：`.filter-tag`、`.filter-tags`
- 分页：`.pagination`、`.page-btn`、`.page-info`
- 空状态：`.wa-empty-state` 系列
- 按钮：`.btn`、`.btn-primary`、`.btn-secondary`、`.btn-ghost`、`.btn-sm`

在 `style.css` 末尾追加一个独立区块 `/* Document Manager */`，仅对卡片网格和元信息行做极少量 Flex 布局微调。

## 验证步骤

1. 侧边栏出现「我的文档」，点击可进入。
2. 分别通过内容模板和场景模板创建/保存产物，进入「我的文档」能看到两类产物。
3. 搜索、来源筛选、输出类型筛选、排序、分页均正常工作。
4. 点击 content 文档可进入编辑器，内容一致；修改保存后更新时间变化。
5. 点击 scene 记录可进入 WorkAssistant 结果展示；PPT 可切换大纲/幻灯片。
6. 删除文档后列表刷新，localStorage 中对应数据移除。
7. 清空所有文档后显示空状态提示。
8. 整体样式与现有页面保持一致。

## 风险与应对

| 风险 | 应对 |
|------|------|
| WorkAssistant 恢复历史记录时状态依赖复杂 | 仅恢复必要的 `selectedTemplate` / `formData` / `mode` / `KBs` / `result`，其余状态使用默认值 |
| 两类产物数据模型差异大 | 通过统一展示模型屏蔽差异，打开时再按原始结构处理 |
| localStorage 数据量大 | 保留分页，每次从 localStorage 读取；后续如需性能优化可再引入内存缓存 |

## 下一步

待方案确认后，按上述文件清单逐步实现。
