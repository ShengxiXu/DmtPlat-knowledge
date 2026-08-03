# 后端开发计划

> 目标：为 SSO Hub - AI 创作中心构建可持续演进的后端服务，将前端 localStorage 中的数据持久化，并补齐 AI 生成、文件处理、协作等核心能力。

---

## 1. 现状分析

### 1.1 已有后端能力

当前 `server/index.js` 仅提供：

| 接口                       | 方法 | 说明                                  |
| -------------------------- | ---- | ------------------------------------- |
| `GET /api/health`          | GET  | 健康检查                              |
| `POST /api/parse-template` | POST | 文件解析（PPTX/DOCX/XLSX/PDF/TXT/MD） |

文件解析器已具备：

- `server/parsers/pptx.js` — PPT 解析
- `server/parsers/docx.js` — Word 解析
- `server/parsers/xlsx.js` — Excel 解析
- `server/parsers/pdf.js` — PDF 解析

### 1.2 前端数据现状

前端大量使用 `localStorage` 存储业务数据：

| 数据类型   | 存储 Key                       | 所在文件                                           |
| ---------- | ------------------------------ | -------------------------------------------------- |
| 知识库     | `knowledgeBases` / `newKB`     | `KBList.js`, `EditKBModal.js`, `CreateKBModal.js`  |
| 内容模板   | `dmtplat_content_templates`    | `contentTemplates.js`, `ContentTemplateManager.js` |
| 我的文档   | `dmtplat_my_documents`         | `contentTemplates.js`                              |
| 自定义模板 | `wa_custom_templates`          | `workAssistantData.js`                             |
| 团队模板   | `wa_team_templates`            | `workAssistantData.js`                             |
| 创作历史   | `wa_work_history`              | `workAssistantData.js`                             |
| 草稿       | `wa_drafts`                    | `workAssistantData.js`                             |
| 默认岗位   | `wa_default_role`              | `workAssistantData.js`                             |
| 关联知识库 | `wa_selected_kbs_{templateId}` | `WorkAssistant.js`                                 |
| 主题       | `theme`                        | `Header.js`, `main.js`, `theme.js`                 |

### 1.3 前端 API 调用现状

- 文件解析：`fetch('http://localhost:3001/api/parse-template')`（`WorkAssistant.js`）
- AI 生成：目前使用 `mockGenerateContent`，`contentGenerator.js` 中已预留 `RemoteGenerator` 接口

---

## 2. 后端建设目标

### 2.1 核心目标

1. **数据持久化**：将 localStorage 中的业务数据迁移到后端数据库。
2. **用户隔离**：支持多用户，数据按用户隔离。
3. **AI 生成服务**：接入真实 LLM，提供流式生成接口。
4. **文件与模板管理**：支持模板导入、导出、版本管理。
5. **知识库能力**：文档上传、向量化、检索问答（为后续扩展预留）。
6. **协作能力**：团队模板审核、共享（为后续扩展预留）。

### 2.2 非目标（本次不展开）

- 复杂权限系统 RBAC（先按「用户-团队」两级设计，预留扩展点）
- 大规模分布式部署
- 实时协作编辑

---

## 3. 技术栈建议

### 3.1 服务端

| 层级     | 技术                               | 说明                                 |
| -------- | ---------------------------------- | ------------------------------------ |
| 框架     | Express 5                          | 已有基础，继续沿用                   |
| 数据库   | SQLite（开发）/ PostgreSQL（生产） | 推荐用 `better-sqlite3` 或 `pg`      |
| ORM      | 可选 Prisma 或自研轻量 DAO         | Prisma 适合长期演进；自研 DAO 更轻量 |
| 文件存储 | 本地磁盘 + MinIO/S3（生产）        | 当前 uploads 目录可直接扩展          |
| AI 调用  | OpenAI SDK / 自定义 fetch          | 预留多 Provider 切换能力             |
| 向量检索 | `sqlite-vec` 或 LanceDB            | 轻量本地方案；生产可换 PGVector      |
| 认证     | JWT（jsonwebtoken）                | 简单 Token 方案                      |

### 3.2 推荐组合

**阶段一（MVP，2-3 周）**：

- Express + better-sqlite3 + JWT
- 本地文件存储
- OpenAI SDK 兼容接口

**阶段二（生产化）**：

- 迁移到 PostgreSQL + Prisma
- MinIO/S3 文件存储
- PGVector 向量检索

---

## 4. 数据库设计

### 4.1 实体关系

```text
User
 ├── KnowledgeBase
 │    └── Document
 ├── ContentTemplate
 ├── MyDocument
 ├── SceneTemplate (custom)
 ├── TeamTemplate
 ├── WorkHistoryRecord
 └── Draft
```

### 4.2 表结构草案

#### `users`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `knowledge_bases`

```sql
CREATE TABLE knowledge_bases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### `kb_documents`

```sql
CREATE TABLE kb_documents (
  id TEXT PRIMARY KEY,
  kb_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT,
  content_text TEXT,
  chunks JSON,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kb_id) REFERENCES knowledge_bases(id)
);
```

#### `content_templates`

```sql
CREATE TABLE content_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  format TEXT,
  category JSON,
  fields JSON,
  prompt TEXT,
  theme_color TEXT,
  level TEXT DEFAULT 'personal',
  featured INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `my_documents`

```sql
CREATE TABLE my_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT,
  name TEXT NOT NULL,
  content JSON,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `scene_templates`（自定义场景模板）

```sql
CREATE TABLE scene_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  role_id TEXT,
  ability_id TEXT,
  output_type TEXT,
  icon TEXT,
  fields JSON,
  prompt_styles JSON,
  active_prompt_style TEXT,
  is_custom INTEGER DEFAULT 1,
  status TEXT DEFAULT 'approved',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `team_templates`

```sql
CREATE TABLE team_templates (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  role_id TEXT,
  ability_id TEXT,
  output_type TEXT,
  icon TEXT,
  fields JSON,
  version TEXT,
  change_log TEXT,
  status TEXT DEFAULT 'pending',
  creator TEXT,
  publisher_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `work_history`

```sql
CREATE TABLE work_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT,
  template_name TEXT,
  output_type TEXT,
  preview TEXT,
  result JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `drafts`

```sql
CREATE TABLE drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT,
  form_data JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `user_settings`

```sql
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  default_role_id TEXT,
  theme TEXT DEFAULT 'auto',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. API 设计

### 5.1 认证相关

| 接口                      | 方法 | 说明           |
| ------------------------- | ---- | -------------- |
| `POST /api/auth/register` | POST | 注册           |
| `POST /api/auth/login`    | POST | 登录，返回 JWT |
| `GET /api/auth/me`        | GET  | 获取当前用户   |

### 5.2 知识库

| 接口                                               | 方法   | 说明     |
| -------------------------------------------------- | ------ | -------- |
| `GET /api/knowledge-bases`                         | GET    | 列表     |
| `POST /api/knowledge-bases`                        | POST   | 创建     |
| `GET /api/knowledge-bases/:id`                     | GET    | 详情     |
| `PUT /api/knowledge-bases/:id`                     | PUT    | 更新     |
| `DELETE /api/knowledge-bases/:id`                  | DELETE | 删除     |
| `POST /api/knowledge-bases/:id/documents`          | POST   | 上传文档 |
| `GET /api/knowledge-bases/:id/documents`           | GET    | 文档列表 |
| `DELETE /api/knowledge-bases/:id/documents/:docId` | DELETE | 删除文档 |

### 5.3 内容模板

| 接口                                  | 方法   | 说明                                     |
| ------------------------------------- | ------ | ---------------------------------------- |
| `GET /api/content-templates`          | GET    | 列表（支持 category/format/source 筛选） |
| `POST /api/content-templates`         | POST   | 创建                                     |
| `GET /api/content-templates/:id`      | GET    | 详情                                     |
| `PUT /api/content-templates/:id`      | PUT    | 更新                                     |
| `DELETE /api/content-templates/:id`   | DELETE | 删除                                     |
| `POST /api/content-templates/:id/use` | POST   | 使用计数 +1                              |

### 5.4 我的文档

| 接口                           | 方法   | 说明      |
| ------------------------------ | ------ | --------- |
| `GET /api/my-documents`        | GET    | 列表      |
| `POST /api/my-documents`       | POST   | 创建/保存 |
| `GET /api/my-documents/:id`    | GET    | 详情      |
| `PUT /api/my-documents/:id`    | PUT    | 更新      |
| `DELETE /api/my-documents/:id` | DELETE | 删除      |

### 5.5 场景模板（工作助手）

| 接口                              | 方法   | 说明                |
| --------------------------------- | ------ | ------------------- |
| `GET /api/scene-templates`        | GET    | 列表（官方 + 个人） |
| `POST /api/scene-templates`       | POST   | 创建自定义模板      |
| `GET /api/scene-templates/:id`    | GET    | 详情                |
| `PUT /api/scene-templates/:id`    | PUT    | 更新                |
| `DELETE /api/scene-templates/:id` | DELETE | 删除                |

### 5.6 团队模板

| 接口                                   | 方法 | 说明     |
| -------------------------------------- | ---- | -------- |
| `GET /api/team-templates`              | GET  | 列表     |
| `POST /api/team-templates`             | POST | 提交审核 |
| `POST /api/team-templates/:id/approve` | POST | 通过审核 |
| `POST /api/team-templates/:id/reject`  | POST | 拒绝审核 |

### 5.7 创作历史与草稿

| 接口                     | 方法   | 说明         |
| ------------------------ | ------ | ------------ |
| `GET /api/work-history`  | GET    | 最近创作列表 |
| `POST /api/work-history` | POST   | 保存记录     |
| `GET /api/drafts`        | GET    | 草稿列表     |
| `POST /api/drafts`       | POST   | 保存草稿     |
| `DELETE /api/drafts/:id` | DELETE | 删除草稿     |

### 5.8 AI 生成

| 接口                       | 方法 | 说明                   |
| -------------------------- | ---- | ---------------------- |
| `POST /api/generate`       | POST | 流式生成内容（SSE）    |
| `POST /api/generate/ppt`   | POST | 生成 PPT 结构/文件     |
| `POST /api/parse-template` | POST | 已有文件解析接口，保留 |

### 5.9 用户设置

| 接口                | 方法 | 说明         |
| ------------------- | ---- | ------------ |
| `GET /api/settings` | GET  | 获取用户设置 |
| `PUT /api/settings` | PUT  | 更新用户设置 |

---

## 6. 实施阶段

### 阶段一：基础架构（Week 1）

**目标**：搭好后端骨架，完成数据库和认证。

- [ ] 选型确认（数据库、ORM、认证方式）
- [ ] 初始化数据库连接与迁移脚本
- [ ] 实现 JWT 认证中间件
- [ ] 实现 `/api/auth/register`、`/api/auth/login`、`/api/auth/me`
- [ ] 统一错误处理、日志、请求校验
- [ ] 环境变量配置（`.env.example`）

### 阶段二：数据持久化（Week 2）

**目标**：把 localStorage 中的核心业务数据搬到后端。

- [ ] 知识库 CRUD + 文档上传
- [ ] 内容模板 CRUD
- [ ] 我的文档 CRUD
- [ ] 场景模板 CRUD
- [ ] 团队模板与审核流程
- [ ] 创作历史与草稿
- [ ] 用户设置（默认岗位、主题等）

### 阶段三：前端联调（Week 3）

**目标**：前端改调接口，保留本地兜底方案。

- [ ] 封装 `apiClient.js`，统一处理 token、错误
- [ ] 替换 `localStorage` 读写为 API 调用
- [ ] 离线/无网络时降级到 localStorage
- [ ] 加载状态、错误提示、空状态处理
- [ ] 数据迁移工具：首次登录时将 localStorage 数据导入后端

### 阶段四：AI 生成服务（Week 4）

**目标**：接入真实 LLM，替代 mock 生成。

- [ ] 实现 `/api/generate` SSE 流式接口
- [ ] 接入 OpenAI / Claude / 国内模型
- [ ] Prompt 模板化管理
- [ ] 支持关联知识库检索（RAG 基础版）
- [ ] PPT 生成接口（返回结构或文件）

### 阶段五：文件与模板生态（Week 5-6）

**目标**：完善文件处理与模板市场能力。

- [ ] 模板导入/导出（JSON 格式）
- [ ] 文件解析结果持久化
- [ ] 模板版本管理
- [ ] 团队模板评论/评分（可选）
- [ ] 生产环境部署准备（Docker、PostgreSQL、S3）

---

## 7. 数据迁移策略

### 7.1 首次登录迁移

用户登录后，若后端无数据，前端将 localStorage 中的数据批量上传到后端：

```text
1. 登录成功
2. 调用 GET /api/settings
3. 若 404，进入迁移流程：
   - 上传 knowledgeBases
   - 上传 content_templates
   - 上传 my_documents
   - 上传 scene_templates / team_templates
   - 上传 work_history / drafts
   - 上传 settings
4. 迁移完成后标记 `migrated=true`
```

### 7.2 双写过渡

在阶段三可保留「后端优先，失败回退 localStorage」的策略，降低切换风险。

---

## 8. 安全与稳定性

### 8.1 安全

- JWT 使用 `HttpOnly` Cookie 或前端安全存储 Access Token
- 密码使用 bcrypt 哈希
- 文件上传限制类型与大小，避免恶意文件
- SQL 注入防护：使用参数化查询或 ORM
- CORS 限制为前端域名

### 8.2 稳定性

- 接口统一返回 `{ success, data, error, message }` 结构
- 全局异常捕获，避免服务崩溃
- 文件解析超时处理
- AI 接口流式输出异常处理

---

## 9. 目录结构建议

```text
server/
├── index.js                 # 入口
├── config.js                # 配置读取
├── db/
│   ├── index.js             # 数据库连接
│   ├── migrations/          # 迁移脚本
│   └── seeds/               # 初始数据
├── middleware/
│   ├── auth.js              # JWT 认证
│   ├── error.js             # 错误处理
│   └── upload.js            # 文件上传配置
├── routes/
│   ├── auth.js
│   ├── knowledgeBases.js
│   ├── documents.js
│   ├── contentTemplates.js
│   ├── myDocuments.js
│   ├── sceneTemplates.js
│   ├── teamTemplates.js
│   ├── workHistory.js
│   ├── drafts.js
│   ├── settings.js
│   └── generate.js
├── services/
│   ├── ai/
│   │   ├── openai.js
│   │   ├── claude.js
│   │   └── index.js
│   ├── vectorSearch.js
│   └── fileParser.js
├── parsers/                 # 已有解析器
│   ├── pptx.js
│   ├── docx.js
│   ├── xlsx.js
│   └── pdf.js
├── uploads/                 # 上传文件临时目录
├── utils/
│   ├── response.js
│   └── validators.js
└── .env.example
```

---

## 10. 下一步建议

1. **确认技术栈**：是否采用 Express + SQLite（better-sqlite3）+ JWT 的 MVP 方案？
2. **确认数据库选型**：开发阶段用 SQLite，生产是否计划迁移 PostgreSQL？
3. **确认 AI Provider**：OpenAI、Claude、国内模型（通义/豆包/文心）？
4. **确认用户体系**：是否需要注册登录，还是先做单用户模式（自动创建默认用户）？
5. **开始实施阶段一**：搭建基础架构。

---

## 附录：需要改动的关键前端文件

| 文件                                       | 改动说明                                   |
| ------------------------------------------ | ------------------------------------------ |
| `src/data/contentTemplates.js`             | localStorage 替换为 API 调用               |
| `src/data/workAssistantData.js`            | localStorage 替换为 API 调用               |
| `src/services/contentGenerator.js`         | 启用 RemoteGenerator，调用 `/api/generate` |
| `src/views/WorkAssistant.js`               | 关联知识库、历史记录、草稿改用 API         |
| `src/views/KBList.js`                      | 知识库列表改用 API                         |
| `src/views/ContentTemplateManager.js`      | 模板改用 API                               |
| `src/views/DocumentManager.js`             | 文档改用 API                               |
| `src/utils/apiClient.js`（新增）           | 统一 API 客户端                            |
| `src/utils/migrateLocalStorage.js`（新增） | 数据迁移工具                               |
