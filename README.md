# DmtPlat-knowledge - AI 知识库模块

一个基于 Vite 构建的现代化 AI 知识库管理系统前端工程。

## 功能特性

- 📚 **知识库管理** - 创建、编辑、删除知识库
- 📄 **文档管理** - 上传、管理、索引文档
- 🌐 **网页爬取** - 配置爬取深度和URL，自动爬取网页内容
- 🗄️ **数据库连接** - 连接数据库作为数据源，支持增量同步
- 💬 **问答管理** - 添加、导入、管理问答对
- 🎯 **训练配置** - 配置分段策略、索引选项
- 💬 **智能问答** - 基于知识库的问答测试
- 📊 **效果评估** - 查看问答准确率和评分
- 🔗 **API 绑定** - 管理 API 密钥和接入示例
- 🌙 **深色模式** - 支持浅色/深色主题切换
- 📱 **响应式设计** - 适配各种屏幕尺寸

## 技术栈

- **构建工具**: Vite 6.x
- **语言**: JavaScript ES6+
- **样式**: CSS3 (CSS Variables)
- **代码规范**: ESLint + Prettier

## 项目结构

```
kb-module/
├── src/
│   ├── components/
│   │   ├── ChatContainer.js    # 聊天容器组件
│   │   ├── ChatSidebar.js      # 聊天侧边栏组件
│   │   ├── CreateKBModal.js    # 创建知识库模态框
│   │   ├── DataSourceForm.js   # 数据源配置表单
│   │   ├── EditKBModal.js      # 编辑知识库模态框
│   │   ├── Header.js           # 头部组件
│   │   ├── KBCard.js           # 知识库卡片组件
│   │   ├── KBConfigForms.js    # 知识库配置表单
│   │   ├── Modal.js            # 模态框组件
│   │   ├── Sidebar.js          # 侧边栏组件
│   │   └── TemplateSelector.js # 模板选择器组件
│   ├── views/
│   │   ├── KBList.js           # 知识库列表视图
│   │   ├── KBDetail.js         # 知识库详情视图
│   │   └── UserChat.js         # 用户聊天视图
│   ├── data/
│   │   ├── mockData.js         # 模拟数据
│   │   └── templates.js        # 模板数据
│   ├── utils/
│   │   └── helpers.js          # 工具函数
│   ├── index.html              # 入口 HTML
│   ├── main.js                 # 应用入口
│   └── style.css               # 全局样式
├── .eslintrc.cjs              # ESLint 配置
├── .gitignore                 # Git 忽略配置
├── .prettierrc                # Prettier 配置
├── vite.config.js             # Vite 配置
├── postcss.config.js          # PostCSS 配置
├── package.json               # 项目依赖
└── README.md                  # 项目说明
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

启动后访问: http://localhost:5173

### 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录

### 代码检查

```bash
npm run lint
```

### 代码格式化

```bash
npm run format
```

## 使用说明

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
3. 输入爬取URL和深度，点击开始爬取

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
