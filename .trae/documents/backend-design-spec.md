# 后端设计文档

> 项目：SSO Hub - AI 创作中心
> 版本：v1.0
> 目标：将前端 localStorage 中的业务数据持久化到后端，补齐 AI 生成、文件解析、模板市场等核心能力。

---

## 1. 设计目标与范围

### 1.1 核心目标

1. **数据持久化**：替代前端 `localStorage`，将所有业务数据存储到后端数据库。
2. **用户隔离**：支持多用户，数据按用户隔离。
3. **AI 生成服务**：提供统一流式生成接口，支持多种输出类型（文本、表格、PPT、邮件等）。
4. **文件解析服务**：复用并扩展现有 PPTX/DOCX/XLSX/PDF/TXT/MD 解析能力。
5. **模板市场**：支持自定义模板、团队模板、审核流程。
6. **知识库服务**：文档上传、内容提取、向量化检索（RAG 基础）。

### 1.2 设计范围

- 服务端架构与目录结构
- 数据库表结构（含 SQL）
- RESTful API 规范（含请求/响应示例）
- 认证与权限设计
- AI 生成流程设计
- 文件上传与解析流程
- 错误处理与日志规范
- 前端集成方案

### 1.3 非功能需求

- **响应时间**：普通 API < 200ms，AI 流式首包 < 2s。
- **并发**：MVP 支持 50 并发用户。
- **可用性**：单实例部署，后续可扩展为多实例。
- **安全性**：JWT 认证、密码哈希、文件类型校验、SQL 注入防护。

---

## 2. 技术架构

### 2.1 架构图

```text
┌─────────────────────────────────────────────────────────────┐
│                         前端 (Vite)                          │
│  WorkAssistant / ContentTemplateManager / DocumentManager   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / SSE
┌───────────────────────▼─────────────────────────────────────┐
│                      API Gateway                             │
│  Express + CORS + JWT 认证 + 请求日志 + 错误处理             │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   业务 API    │ │  AI 生成服务  │ │ 文件解析服务 │
│  CRUD 路由   │ │  /api/generate│ │ /api/parse   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   SQLite/    │ │  OpenAI /    │ │  parsers/    │
│  PostgreSQL  │ │  Claude /    │ │  pptx/docx/  │
│              │ │  国产模型     │ │  xlsx/pdf    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 2.2 技术选型

| 组件     | 选型                                | 说明                             |
| -------- | ----------------------------------- | -------------------------------- |
| 运行时   | Node.js 20+                         | 项目已使用 ESM                   |
| Web 框架 | Express 5                           | 已有基础，生态成熟               |
| 数据库   | SQLite（MVP）/ PostgreSQL（生产）   | SQLite 用 better-sqlite3，零配置 |
| ORM      | Prisma                              | 类型安全、迁移方便               |
| 认证     | JWT（jsonwebtoken）                 | 无状态、易扩展                   |
| 密码哈希 | bcrypt                              | 标准方案                         |
| 文件上传 | multer                              | 已有基础                         |
| AI 调用  | OpenAI SDK + 自定义 fetch           | 兼容多 Provider                  |
| 向量检索 | sqlite-vec（MVP）/ PGVector（生产） | 轻量本地方案                     |
| 日志     | pino                                | 高性能 JSON 日志                 |
| 校验     | zod                                 | 请求体验证                       |
| 环境配置 | dotenv                              | 标准方案                         |

---

## 3. 目录结构

```text
server/
├── index.js                      # 服务入口
├── config.js                     # 配置读取（环境变量）
├── prisma/
│   ├── schema.prisma             # 数据库模型
│   ├── migrations/               # 迁移文件
│   └── seed.js                   # 初始数据
├── middleware/
│   ├── auth.js                   # JWT 认证
│   ├── errorHandler.js           # 全局错误处理
│   ├── requestLogger.js          # 请求日志
│   └── upload.js                 # multer 上传配置
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
│   │   ├── index.js              # AI 服务统一入口
│   │   ├── openai.js             # OpenAI 适配器
│   │   ├── claude.js             # Claude 适配器
│   │   └── openaiCompatible.js   # 国产模型兼容适配器
│   ├── vectorSearch.js           # 向量检索服务
│   ├── fileParser.js             # 文件解析调度
│   └── promptBuilder.js          # Prompt 构建
├── parsers/                      # 已有解析器
│   ├── pptx.js
│   ├── docx.js
│   ├── xlsx.js
│   └── pdf.js
├── uploads/                      # 上传临时目录
├── utils/
│   ├── response.js               # 统一响应格式
│   ├── validators.js             # 校验工具
│   └── helpers.js                # 通用工具
├── .env.example
└── package.json
```

---

## 4. 数据库设计

### 4.1 E-R 关系图

```text
User ||--o{ KnowledgeBase : owns
User ||--o{ ContentTemplate : owns
User ||--o{ MyDocument : owns
User ||--o{ SceneTemplate : owns
User ||--o{ TeamTemplate : submits
User ||--o{ WorkHistory : creates
User ||--o{ Draft : saves
User ||--|| UserSetting : has

KnowledgeBase ||--o{ KBDocument : contains
```

### 4.2 完整表结构

#### 4.2.1 `users`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**说明**：

- `id` 使用 `cuid()` 或 `nanoid()` 生成。
- `role` 先简化为 `user` / `admin`。

#### 4.2.2 `knowledge_bases`

```sql
CREATE TABLE knowledge_bases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSON,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'training', 'error')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**`config` 示例**：

```json
{
  "chunkSize": 500,
  "overlap": 50,
  "indexType": "vector",
  "visibility": "private"
}
```

#### 4.2.3 `kb_documents`

```sql
CREATE TABLE kb_documents (
  id TEXT PRIMARY KEY,
  kb_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  original_name TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  content_text TEXT,
  chunks JSON,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'indexed', 'error')),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kb_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**`chunks` 示例**：

```json
[
  { "index": 0, "text": "...", "embedding": [0.1, 0.2, ...] }
]
```

#### 4.2.4 `content_templates`

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
  theme_color TEXT DEFAULT '#6b7280',
  level TEXT DEFAULT 'personal' CHECK (level IN ('official', 'personal')),
  featured INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**`fields` 示例**：

```json
[
  {
    "id": "f1",
    "name": "topic",
    "label": "主题",
    "type": "text",
    "required": true
  }
]
```

#### 4.2.5 `my_documents`

```sql
CREATE TABLE my_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT,
  name TEXT NOT NULL,
  content JSON,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 4.2.6 `scene_templates`

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
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 4.2.7 `team_templates`

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
  prompt_styles JSON,
  active_prompt_style TEXT,
  version TEXT DEFAULT '1.0.0',
  change_log TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  creator TEXT,
  publisher_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 4.2.8 `work_history`

```sql
CREATE TABLE work_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT,
  template_name TEXT,
  output_type TEXT,
  form_data JSON,
  preview TEXT,
  result JSON,
  selected_kbs JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 4.2.9 `drafts`

```sql
CREATE TABLE drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT,
  form_data JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 4.2.10 `user_settings`

```sql
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  default_role_id TEXT,
  theme TEXT DEFAULT 'auto' CHECK (theme IN ('auto', 'light', 'dark')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 5. API 设计规范

### 5.1 通用约定

- 基础路径：`/api`
- 统一响应格式：

```json
{
  "success": true,
  "data": {},
  "error": null,
  "message": null
}
```

错误响应：

```json
{
  "success": false,
  "data": null,
  "error": "VALIDATION_ERROR",
  "message": "字段校验失败"
}
```

- 认证方式：`Authorization: Bearer <token>`
- 分页参数：`page`（默认 1）、`pageSize`（默认 20）
- 时间格式：ISO 8601

### 5.2 认证接口

#### 5.2.1 注册

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "alice",
  "email": "alice@example.com",
  "password": "yourpassword"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_xxx",
      "username": "alice",
      "email": "alice@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 5.2.2 登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "alice",
  "password": "yourpassword"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "user": { "id": "usr_xxx", "username": "alice" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 5.2.3 获取当前用户

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 5.3 知识库接口

#### 5.3.1 创建知识库

```http
POST /api/knowledge-bases
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "产品知识库",
  "description": "产品相关文档",
  "config": { "chunkSize": 500 }
}
```

#### 5.3.2 列表知识库

```http
GET /api/knowledge-bases
Authorization: Bearer <token>
```

响应：

```json
{
  "success": true,
  "data": [
    {
      "id": "kb_xxx",
      "name": "产品知识库",
      "description": "...",
      "documentCount": 5,
      "createdAt": "2026-07-29T10:00:00Z"
    }
  ]
}
```

#### 5.3.3 上传文档

```http
POST /api/knowledge-bases/:id/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

响应：

```json
{
  "success": true,
  "data": {
    "id": "doc_xxx",
    "name": "API文档.pdf",
    "status": "pending"
  }
}
```

#### 5.3.4 删除知识库

```http
DELETE /api/knowledge-bases/:id
Authorization: Bearer <token>
```

### 5.4 内容模板接口

#### 5.4.1 获取模板列表

```http
GET /api/content-templates?category=office&format=word&source=all
Authorization: Bearer <token>
```

Query 参数：

| 参数       | 说明                            |
| ---------- | ------------------------------- |
| `category` | 场景分类 ID                     |
| `format`   | 格式：word/markdown/table 等    |
| `source`   | `all` / `official` / `personal` |
| `search`   | 关键词搜索                      |

#### 5.4.2 创建模板

```http
POST /api/content-templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "周报模板",
  "description": "自动生成工作周报",
  "format": "markdown",
  "category": ["office"],
  "fields": [...],
  "prompt": "根据以下信息生成周报：..."
}
```

#### 5.4.3 更新/删除模板

```http
PUT /api/content-templates/:id
DELETE /api/content-templates/:id
```

### 5.5 我的文档接口

```http
GET /api/my-documents
POST /api/my-documents
GET /api/my-documents/:id
PUT /api/my-documents/:id
DELETE /api/my-documents/:id
```

### 5.6 场景模板接口

```http
GET /api/scene-templates?roleId=sales
POST /api/scene-templates
GET /api/scene-templates/:id
PUT /api/scene-templates/:id
DELETE /api/scene-templates/:id
```

### 5.7 团队模板接口

```http
GET /api/team-templates
POST /api/team-templates
POST /api/team-templates/:id/approve
POST /api/team-templates/:id/reject
```

### 5.8 创作历史与草稿

```http
GET /api/work-history
POST /api/work-history

GET /api/drafts
POST /api/drafts
DELETE /api/drafts/:id
```

### 5.9 AI 生成接口

#### 5.9.1 流式生成

```http
POST /api/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "templateId": "tpl_xxx",
  "formData": { "topic": "竞品分析" },
  "mode": "free",
  "selectedKBs": ["kb_xxx"],
  "options": { "tone": "formal" }
}
```

响应：`text/event-stream`

```text
event: thinking
data: {"step": "匹配模板：竞品分析"}

event: result_meta
data: {"result": {"content": "..."}}

event: chunk
data: {"text": "竞品"}

event: done
data: {"result": {"content": "..."}}
```

#### 5.9.2 PPT 生成

```http
POST /api/generate/ppt
Authorization: Bearer <token>
Content-Type: application/json

{
  "templateId": "tpl_xxx",
  "formData": { "topic": "Q3 汇报" },
  "config": {
    "theme": "business",
    "color": "green",
    "pageCount": "8",
    "ratio": "16:9"
  }
}
```

响应：

```json
{
  "success": true,
  "data": {
    "outline": [...],
    "slides": [...]
  }
}
```

### 5.10 文件解析接口（已有）

```http
POST /api/parse-template
Content-Type: multipart/form-data

file: <binary>
```

### 5.11 用户设置

```http
GET /api/settings
PUT /api/settings
```

---

## 6. 认证与权限设计

### 6.1 JWT 认证流程

```text
1. 用户注册/登录 → 服务端生成 JWT
2. 前端存储 token（localStorage / memory）
3. 后续请求携带 Authorization: Bearer <token>
4. 服务端验证 token，提取 userId
5. 所有业务查询自动附加 user_id = ? 条件
```

### 6.2 Token 配置

```javascript
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  expiresIn: '7d',
  algorithm: 'HS256',
};
```

### 6.3 权限规则

| 资源     | 规则                                                  |
| -------- | ----------------------------------------------------- |
| 知识库   | 仅所有者可访问                                        |
| 内容模板 | `personal` 仅所有者可编辑，`official` 仅 admin 可编辑 |
| 我的文档 | 仅所有者可访问                                        |
| 场景模板 | 官方模板只读，自定义模板仅所有者可编辑                |
| 团队模板 | 所有登录用户可查看已审核的，提交者/管理员可操作       |

### 6.4 密码安全

- 使用 `bcrypt.hash(password, 12)` 存储
- 登录时使用 `bcrypt.compare()` 校验

---

## 7. AI 生成服务设计

### 7.1 生成流程

```text
1. 接收请求：templateId + formData + selectedKBs + options
2. 加载模板定义与字段
3. 若 selectedKBs 非空：
   - 对每个知识库做向量检索
   - 合并相关文本作为上下文
4. 构建 Prompt（系统提示 + 模板说明 + 字段值 + 上下文）
5. 调用 LLM（流式输出）
6. 解析并返回 SSE 事件
```

### 7.2 Prompt 模板

```text
你是一名专业的{role}助手。

任务：{templateName}
{templateDescription}

输出要求：
- 输出格式：{outputType}
- 语言风格：{tone}
- 字数限制：{length}

参考信息：
{context}

用户输入：
{formData}

请直接输出结果，不要包含解释。
```

### 7.3 Provider 适配器

```javascript
// services/ai/index.js
const providers = {
  openai: require('./openai'),
  claude: require('./claude'),
  openaiCompatible: require('./openaiCompatible'),
};

export async function* generateStream(messages, options) {
  const provider = providers[process.env.AI_PROVIDER];
  yield* provider.stream(messages, options);
}
```

### 7.4 RAG 基础流程

```text
1. 用户输入 query（模板字段组合）
2. 对 query 生成 embedding
3. 在 selectedKBs 的 chunks 中做相似度搜索（Top-K=5）
4. 将 Top-K 文本拼入 Prompt 上下文
5. 生成结果
```

---

## 8. 文件上传与解析

### 8.1 上传流程

```text
1. 前端上传文件
2. multer 保存到 server/uploads/
3. 根据 MIME 类型调用对应解析器
4. 返回解析结果
5. 异步删除临时文件
```

### 8.2 支持的文件类型

| 类型 | MIME                                                                      | 扩展名 |
| ---- | ------------------------------------------------------------------------- | ------ |
| PPTX | application/vnd.openxmlformats-officedocument.presentationml.presentation | .pptx  |
| DOCX | application/vnd.openxmlformats-officedocument.wordprocessingml.document   | .docx  |
| XLSX | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet         | .xlsx  |
| PDF  | application/pdf                                                           | .pdf   |
| TXT  | text/plain                                                                | .txt   |
| MD   | text/markdown / text/x-markdown                                           | .md    |

### 8.3 知识库文档处理

上传至知识库的文档会额外执行：

1. 文本提取
2. 分片（chunkSize=500, overlap=50）
3. 向量化（调用 embedding 模型）
4. 存入 `kb_documents.chunks`
5. 状态更新为 `indexed`

---

## 9. 错误处理与日志

### 9.1 错误码规范

| 错误码                | HTTP 状态 | 说明                |
| --------------------- | --------- | ------------------- |
| `UNAUTHORIZED`        | 401       | 未登录或 token 无效 |
| `FORBIDDEN`           | 403       | 无权限访问资源      |
| `NOT_FOUND`           | 404       | 资源不存在          |
| `VALIDATION_ERROR`    | 400       | 请求参数校验失败    |
| `DUPLICATE_ERROR`     | 409       | 资源已存在          |
| `INTERNAL_ERROR`      | 500       | 服务器内部错误      |
| `AI_GENERATION_ERROR` | 502       | AI 生成失败         |
| `FILE_PARSE_ERROR`    | 422       | 文件解析失败        |

### 9.2 全局错误处理中间件

```javascript
export function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    data: null,
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || '服务器内部错误',
  });
}
```

### 9.3 日志规范

使用 `pino` 记录：

- 所有请求：`{ method, path, statusCode, durationMs, userId }`
- 错误：`{ level: 'error', error, stack, userId, requestId }`
- AI 调用：`{ level: 'info', event: 'ai.generate', provider, durationMs }`

---

## 10. 环境变量

```bash
# server/.env
NODE_ENV=development
PORT=3001

# 数据库
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET=your-secret-key-at-least-32-characters
JWT_EXPIRES_IN=7d

# AI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 文件上传
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
```

---

## 11. 前端集成方案

### 11.1 API 客户端

新增 `src/utils/apiClient.js`：

```javascript
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  return res.json();
}
```

### 11.2 数据层改造

将 `src/data/contentTemplates.js` 和 `src/data/workAssistantData.js` 中的 localStorage 读写改为 API 调用：

```javascript
// before
export function getMyContentTemplates() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

// after
export async function getMyContentTemplates() {
  const res = await api('/content-templates?source=personal');
  return res.data;
}
```

### 11.3 离线降级

```javascript
async function getWithFallback(fetcher, fallbackKey) {
  try {
    return await fetcher();
  } catch (err) {
    if (!navigator.onLine) {
      return JSON.parse(localStorage.getItem(fallbackKey) || '[]');
    }
    throw err;
  }
}
```

### 11.4 初始数据迁移

新增 `src/utils/migrateLocalStorage.js`：

```javascript
export async function migrateIfNeeded() {
  const migrated = localStorage.getItem('dmtplat_migrated');
  if (migrated) return;

  const payload = collectLocalStorageData();
  await api('/auth/migrate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  localStorage.setItem('dmtplat_migrated', 'true');
}
```

---

## 12. 部署方案

### 12.1 开发环境

```bash
npm install
npx prisma migrate dev
npm run dev:all
```

### 12.2 生产环境（Docker）

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "server/index.js"]
```

### 12.3 启动命令

```bash
# 开发
npm run dev:all

# 生产
npm run build
npm run server
```

---

## 13. 后续扩展建议

1. **权限系统**：引入角色权限表 `roles`、`permissions`、`role_permissions`。
2. **团队空间**：增加 `teams`、`team_members`、`team_resources` 表。
3. **WebSocket**：实时通知（模板审核结果、知识库训练完成）。
4. **缓存层**：Redis 缓存热门模板和知识库检索结果。
5. **任务队列**：使用 BullMQ 处理文件解析、向量化等耗时任务。

---

## 14. 需要确认的事项

1. 是否确认使用 **SQLite + Prisma + JWT** 作为 MVP 技术栈？
2. AI Provider 首选哪家？（OpenAI / Claude / 国产模型）
3. 是否先做注册登录，还是先做单用户自动创建模式？
4. 是否需要我直接开始编写第一阶段代码？
