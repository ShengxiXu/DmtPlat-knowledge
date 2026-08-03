# 知识库类型配置与模板创建 - 实现计划

## [ ] Task 1: 重构 CreateKBModal 组件 - 添加类型选择界面

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 将模态框改为分步表单模式
  - 第一步：选择创建方式（空白创建 / 模板创建）
  - 第二步：选择知识库类型（文档/网页/数据库/问答）
  - 使用卡片式布局展示类型选项
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `human-judgment` TR-1.1: 模态框显示分步表单，第一步为创建方式选择
  - `human-judgment` TR-1.2: 4种知识库类型以卡片形式展示，包含图标、名称、描述
- **Notes**: 需要设计清晰的进度指示器

## [ ] Task 2: 实现文档知识库配置表单

- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 创建文档类型专属配置面板
  - 支持格式多选（PDF, Word, Markdown, TXT）
  - 分块策略选择（按段落/按字符数/智能分块）
  - 分块大小输入、OCR识别开关、索引优先级选择
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-2.1: 选择文档类型后显示对应配置项
  - `human-judgment` TR-2.2: 所有开关、选择器、输入框功能正常
- **Notes**: 需要添加表单验证

## [ ] Task 3: 实现网页知识库配置表单

- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 创建网页类型专属配置面板
  - URL输入、爬取深度配置、域名限制开关
  - 更新周期选择、最大页面数、内容提取规则配置
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-3.1: 选择网页类型后显示对应配置项
  - `human-judgment` TR-3.2: URL输入支持多行或逗号分隔
- **Notes**: 需要添加URL格式验证

## [ ] Task 4: 实现数据库知识库配置表单

- **Priority**: P1
- **Depends On**: Task 1
- **Description**:
  - 创建数据库类型专属配置面板
  - 数据库类型选择（MySQL/PostgreSQL/SQL Server）
  - 连接信息输入（主机、端口、数据库名、用户名、密码）
  - 表选择、更新策略、同步频率配置
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-4.1: 选择数据库类型后显示对应配置项
  - `human-judgment` TR-4.2: 密码输入框显示为密码类型
- **Notes**: 需要添加连接测试功能（可选）

## [ ] Task 5: 实现问答知识库配置表单

- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 创建问答类型专属配置面板
  - 问答对导入（文件上传）
  - 训练参数配置（训练轮数、相似度阈值、最大返回数）
  - 意图识别开关、多轮对话开关、评分规则选择
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-5.1: 选择问答类型后显示对应配置项
  - `human-judgment` TR-5.2: 文件上传支持CSV/JSON格式
- **Notes**: 需要添加文件格式验证

## [ ] Task 6: 创建模板数据和模板选择组件

- **Priority**: P1
- **Depends On**: Task 1
- **Description**:
  - 创建模板数据文件（业务场景模板、行业模板）
  - 实现模板选择界面（左侧分类树 + 右侧模板列表）
  - 添加模板搜索功能
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-6.1: 选择"按模板创建"后显示模板选择界面
  - `human-judgment` TR-6.2: 模板分类树展开/折叠正常工作
- **Notes**: 需要设计模板预览弹窗

## [ ] Task 7: 实现模板应用逻辑

- **Priority**: P1
- **Depends On**: Task 6
- **Description**:
  - 选择模板后自动填充对应配置项
  - 允许用户修改模板预设配置
  - 完成创建流程并返回知识库列表
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-7.1: 选择模板后配置项自动填充
  - `human-judgment` TR-7.2: 用户可修改填充的配置项
- **Notes**: 需要确保模板配置与知识库类型正确匹配

## [ ] Task 8: 添加表单验证和错误提示

- **Priority**: P1
- **Depends On**: Task 2-5
- **Description**:
  - 为所有配置项添加实时验证
  - 显示错误提示和成功状态
  - 添加表单提交前的完整性检查
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgment` TR-8.1: 必填项为空时显示错误提示
  - `human-judgment` TR-8.2: 格式错误时显示相应提示
- **Notes**: 使用统一的验证样式

## [ ] Task 9: 更新样式和动画效果

- **Priority**: P2
- **Depends On**: Task 1-7
- **Description**:
  - 添加分步表单切换动画
  - 优化卡片选中状态样式
  - 添加表单验证动画反馈
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `human-judgment` TR-9.1: 步骤切换有平滑过渡动画
  - `human-judgment` TR-9.2: 选中卡片有高亮效果
- **Notes**: 保持与现有UI风格一致

## [ ] Task 10: 测试和Bug修复

- **Priority**: P2
- **Depends On**: Task 1-9
- **Description**:
  - 测试所有配置类型的创建流程
  - 修复发现的bug
  - 确保深色/浅色主题适配正常
- **Acceptance Criteria Addressed**: 所有AC
- **Test Requirements**:
  - `human-judgment` TR-10.1: 4种类型都能成功创建知识库
  - `human-judgment` TR-10.2: 模板创建功能正常工作
- **Notes**: 需要测试各种边界情况
