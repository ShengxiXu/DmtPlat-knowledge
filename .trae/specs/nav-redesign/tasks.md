# 导航栏重新设计 - 实现计划

## [x] Task 1: 更新ChatSidebar组件结构

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 修改ChatSidebar组件，按新结构组织导航项
  - 结构：新对话按钮 → 个人知识库 → 共享知识库（可展开）→ 分隔线 → 历史对话 → 主题/设置
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 导航项按正确顺序显示
  - `human-judgement` TR-1.2: 导航项图标对齐一致

## [ ] Task 2: 实现共享知识库展开/收起功能

- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 为共享知识库添加展开/收起状态管理
  - 子菜单包含：知识库广场、我加入的
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-2.1: 点击共享知识库切换展开状态
  - `programmatic` TR-2.2: 展开时显示子菜单，收起时隐藏

## [ ] Task 3: 添加视觉分隔线

- **Priority**: P1
- **Depends On**: Task 1
- **Description**:
  - 在知识库区域和系统区域之间添加分隔线
  - 分隔线样式与整体设计风格一致
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 分隔线清晰可见
  - `human-judgement` TR-3.2: 分隔线位置正确（知识库与系统区域之间）

## [ ] Task 4: 实现选中状态样式

- **Priority**: P0
- **Depends On**: Task 1
- **Description**:
  - 为导航项添加选中状态样式
  - 确保点击导航项时正确高亮显示
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `programmatic` TR-4.1: 点击导航项后添加active类
  - `programmatic` TR-4.2: 其他导航项移除active类

## [ ] Task 5: 更新样式文件

- **Priority**: P1
- **Depends On**: Task 1
- **Description**:
  - 更新CSS样式，确保新导航结构正确渲染
  - 修复对齐问题，确保所有导航项图标对齐
- **Acceptance Criteria Addressed**: [AC-1, AC-3]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 所有导航项文本对齐
  - `human-judgement` TR-5.2: 图标大小和间距一致

## [ ] Task 6: 验证主题切换支持

- **Priority**: P1
- **Depends On**: Task 5
- **Description**:
  - 测试深色/浅色主题切换时导航栏样式
  - 确保所有元素颜色正确响应主题变化
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-6.1: 切换主题时导航栏背景色正确变化
  - `programmatic` TR-6.2: 切换主题时文字和图标颜色正确变化
