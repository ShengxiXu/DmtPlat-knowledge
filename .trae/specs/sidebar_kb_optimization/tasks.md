# 侧边栏知识库展示优化 - 实现计划

## [ ] Task 1: 侧边栏添加搜索功能

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 在侧边栏顶部添加搜索框
  - 支持实时筛选知识库
  - 支持键盘快捷键 Ctrl+K 聚焦搜索框
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 侧边栏显示搜索框
  - `human-judgment` TR-1.2: 输入关键词实时筛选
  - `human-judgment` TR-1.3: Ctrl+K 快捷键聚焦搜索框
- **Notes**: 使用模糊匹配实现搜索

## [ ] Task 2: 知识库分组展示

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 将知识库按类型分组（文档/问答/网页）
  - 支持展开/折叠分组
  - 显示每个分组的知识库数量
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: 知识库按类型分组显示
  - `human-judgment` TR-2.2: 点击分组标题展开/折叠
  - `human-judgment` TR-2.3: 显示分组数量
- **Notes**: 类型包括：文档、问答、网页

## [ ] Task 3: 添加收藏功能

- **Priority**: P1
- **Depends On**: None
- **Description**:
  - 在每个知识库项添加收藏按钮
  - 收藏的知识库显示在"我的收藏"分组
  - 支持取消收藏
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-3.1: 知识库项显示收藏按钮
  - `human-judgment` TR-3.2: 点击收藏添加到收藏列表
  - `human-judgment` TR-3.3: 再次点击取消收藏
- **Notes**: 使用 localStorage 保存收藏状态

## [ ] Task 4: 添加最近使用列表

- **Priority**: P1
- **Depends On**: None
- **Description**:
  - 在侧边栏顶部显示最近使用的知识库
  - 限制显示数量（最多5个）
  - 记录点击知识库的时间
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-4.1: 侧边栏显示最近使用列表
  - `human-judgment` TR-4.2: 点击知识库后更新最近使用
  - `human-judgment` TR-4.3: 最多显示5个最近使用
- **Notes**: 使用 localStorage 保存最近使用记录

## [ ] Task 5: 添加"查看全部"按钮

- **Priority**: P2
- **Depends On**: Task 2
- **Description**:
  - 当知识库数量超过限制（默认5个）时显示"查看全部"
  - 点击跳转到知识库列表页面
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-5.1: 超过数量限制显示"查看全部"
  - `human-judgment` TR-5.2: 点击跳转到知识库列表页
- **Notes**: 默认限制每个分组显示5个

## [ ] Task 6: 优化侧边栏样式

- **Priority**: P2
- **Depends On**: All
- **Description**:
  - 添加分组折叠/展开动画
  - 优化选中状态样式
  - 添加空状态提示
- **Test Requirements**:
  - `human-judgment` TR-6.1: 折叠/展开有平滑动画
  - `human-judgment` TR-6.2: 选中状态样式清晰
  - `human-judgment` TR-6.3: 搜索无结果显示提示
- **Notes**: 参考主流产品设计
