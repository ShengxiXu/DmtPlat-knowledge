# DmtPlat-knowledge - 数智化互通平台

一个基于 Vite 构建的现代化 AI 知识库与智能工作助手前端工程，集知识库管理、AI 内容创作、文档生成于一体。

## 功能特性

### 智能工作助手

- 🤖 **AI 创作中心** - 对话式生成文档 / PPT / 表格 / 视频 / 音乐，支持模型切换、知识库挂载、附件上传
- 🧩 **场景模板** - 按岗位模板结构化生成 PPT / 报告，支持场景分类与列表/卡片视图切换
- 📝 **内容模板** - 内置文档模板，直接进入富文本编辑器创作
- ⚡ **常用模板快速入口** - 首页场景/内容模板卡片内嵌 3 个可自定义的常用模板，支持管理弹窗配置
- 🎨 **PPT 风格模板** - 可视化缩略图弹窗选择主题，篇幅下拉配置（最多 30 页）
- 📄 **我的文档** - 创作内容统一管理，最近创作快速跳转

### 知识库管理

- 📚 **知识库管理** - 创建、编辑、删除知识库
- 📄 **文档管理** - 上传、管理、索引文档（支持 docx / pdf / txt 等）
- 🌐 **网页爬取** - 配置爬取深度和 URL，自动爬取网页内容
- 🗄️ **数据库连接** - 连接数据库作为数据源，支持增量同步
- 💬 **问答管理** - 添加、导入、管理问答对
- 🎯 **训练配置** - 配置分段策略、索引选项
- 💬 **智能问答** - 基于知识库的问答测试
- 📊 **效果评估** - 查看问答准确率和评分
- 🔗 **API 绑定** - 管理 API 密钥和接入示例

### 通用

- ✏️ **富文本编辑器** - 基于 Tiptap 的飞书级编辑体验，支持文档创作 / 模板编辑双模式工具栏
- 🌙 **深色模式** - 支持浅色 / 深色主题切换
- 📱 **响应式设计** - 适配各种屏幕尺寸

## 技术栈

- **构建工具**: Vite 5.x
- **语言**: JavaScript ES6+
- **样式**: CSS3 (CSS Variables)
- **富文本**: Tiptap 3.x
- **文档生成**: pptxgenjs (PPT) / docx (Word) / xlsx (Excel) / mammoth (docx 解析)
- **后端服务**: Express 5.x（文件上传、文档解析）
- **代码规范**: ESLint + Prettier

## 项目结构

```
dmtplat-test/
├── src/
│   ├── components/              # 通用组件
│   │   ├── ChatContainer.js     # 聊天容器
│   │   ├── ChatSidebar.js       # 聊天侧边栏
│   │   ├── CreateKBModal.js     # 创建知识库模态框
│   │   ├── DataSourceForm.js    # 数据源配置表单
│   │   ├── EditKBModal.js       # 编辑知识库模态框
│   │   ├── Header.js            # 头部组件
│   │   ├── KBCard.js            # 知识库卡片
│   │   ├── KBConfigForms.js     # 知识库配置表单
│   │   ├── Modal.js             # 模态框组件
│   │   ├── Sidebar.js           # 侧边栏组件
│   │   └── TemplateSelector.js  # 模板选择器
│   ├── views/                   # 页面视图
│   │   ├── WorkAssistant.js     # 智能工作助手（AI 创作中心）
│   │   ├── ContentTemplateManager.js  # 内容模板管理
│   │   ├── DocumentManager.js   # 我的文档管理
│   │   ├── KBList.js            # 知识库列表
│   │   ├── KBDetail.js          # 知识库详情
│   │   └── UserChat.js          # 用户聊天
│   ├── editor/                  # 富文本编辑器
│   │   ├── RichEditor.js        # 编辑器核心
│   │   ├── RichToolbar.js       # 编辑器工具栏
│   │   └── migrate.js           # 内容迁移
│   ├── data/                    # 数据层
│   │   ├── workAssistantData.js # 工作助手数据与本地存储
│   │   ├── contentTemplates.js  # 内容模板数据
│   │   ├── templates.js         # 模板数据
│   │   └── mockData.js          # 模拟数据
│   ├── services/
│   │   └── contentGenerator.js  # 内容生成服务
│   ├── utils/                   # 工具函数
│   │   ├── helpers.js
│   │   ├── theme.js             # 主题切换
│   │   └── fieldRenderer.js
│   ├── main.js                  # 应用入口与路由
│   ├── style.css                # 全局样式
│   ├── ctm-styles.css           # 内容模板样式
│   └── ppt-skeleton.css         # PPT 骨架样式
├── server/                      # 后端服务（文件上传/解析）
├── eslint.config.js             # ESLint 配置
├── .gitignore                   # Git 忽略配置
├── .prettierrc                  # Prettier 配置
├── vite.config.js               # Vite 配置
├── postcss.config.js            # PostCSS 配置
├── package.json                 # 项目依赖
└── README.md                    # 项目说明
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev          # 仅启动前端
npm run dev:all      # 同时启动前端与后端服务
```

启动后访问: http://localhost:5173

### 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 预览构建产物

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

### 代码格式化

```bash
npm run format
```

## 使用说明

### 智能工作助手

1. 在侧边栏点击「智能工作」进入首页
2. 在输入框直接描述需求，选择生成类型（文档 / PPT / 表格等）后发送
3. 或点击「场景模板」「内容模板」卡片头部进入模板市场挑选模板
4. 卡片底部的常用模板快速入口可直接进入编辑器；点击「管理」按钮可自定义常用模板

### 知识库管理

1. 在侧边栏点击「知识库列表」查看所有知识库
2. 点击「新建知识库」创建新的知识库
3. 点击知识库卡片查看详情

### 文档上传

1. 进入知识库详情页
2. 切换到「文档管理」标签
3. 拖拽文件到上传区域或点击选择文件

### 网页爬取

1. 进入知识库详情页
2. 切换到「网页爬取」标签
3. 输入爬取 URL 和深度，点击开始爬取

### 数据库连接

1. 进入知识库详情页
2. 切换到「数据库连接」标签
3. 配置数据库连接参数，测试并保存连接

### 问答管理

1. 进入知识库详情页
2. 切换到「问答管理」标签
3. 添加新问答对或导入批量问答

### 训练配置

1. 进入知识库详情页
2. 切换到「训练配置」标签
3. 设置分段策略和索引选项

### 问答测试

1. 进入知识库详情页
2. 切换到「问答测试」标签
3. 在输入框中输入问题并发送

### 用户聊天

1. 在侧边栏点击「用户聊天」
2. 选择要使用的知识库
3. 在输入框中输入问题或点击建议问题

## 主题切换

1. 在侧边栏点击「主题」
2. 选择浅色模式、深色模式或自动切换

## License

MIT
