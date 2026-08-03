# 侧边栏知识库展示优化 - 产品需求文档

## Overview

- **Summary**: 优化侧边栏知识库展示方式，支持大量知识库的管理，提升用户体验
- **Purpose**: 解决侧边栏直接列出所有知识库的问题，当知识库数量增多时提供更好的导航体验
- **Target Users**: 知识库管理员、客服人员、开发人员

## Goals

- 实现侧边栏知识库搜索功能
- 添加知识库分类/分组
- 支持收藏和常用知识库标记
- 实现折叠/展开功能
- 显示最近使用的知识库

## Non-Goals (Out of Scope)

- 不改变现有的知识库列表页面功能
- 不实现真实后端 API 调用

## Background & Context

当前侧边栏直接展示所有知识库，当知识库数量增多时会导致侧边栏过长，影响用户体验。参考主流产品（如飞书、Notion）的设计模式进行优化。

## Functional Requirements

- **FR-1**: 侧边栏添加知识库搜索功能
- **FR-2**: 支持知识库分组/分类管理
- **FR-3**: 添加收藏知识库功能
- **FR-4**: 显示最近使用的知识库
- **FR-5**: 支持折叠/展开知识库列表
- **FR-6**: 限制侧边栏显示数量，超出时显示"查看全部"

## Non-Functional Requirements

- **NFR-1**: 搜索响应时间 < 200ms
- **NFR-2**: 支持键盘快捷键搜索
- **NFR-3**: 响应式设计

## Constraints

- **Technical**: Vite 5.x, JavaScript ES6+, CSS3
- **Dependencies**: 已有组件库和样式系统

## Acceptance Criteria

### AC-1: 侧边栏搜索

- **Given**: 用户在侧边栏
- **When**: 输入搜索关键词
- **Then**: 实时筛选显示匹配的知识库
- **Verification**: `human-judgment`

### AC-2: 知识库分组

- **Given**: 用户在侧边栏
- **When**: 点击分组名称
- **Then**: 展开/折叠该分组下的知识库
- **Verification**: `human-judgment`

### AC-3: 收藏功能

- **Given**: 用户在侧边栏
- **When**: 点击知识库的收藏按钮
- **Then**: 知识库添加到收藏列表
- **Verification**: `human-judgment`

### AC-4: 最近使用

- **Given**: 用户进入侧边栏
- **When**: 页面加载完成
- **Then**: 显示最近使用的知识库列表
- **Verification**: `human-judgment`

### AC-5: 查看全部

- **Given**: 知识库数量超过限制
- **When**: 用户点击"查看全部"
- **Then**: 跳转到知识库列表页面
- **Verification**: `human-judgment`

## Open Questions

- [ ] 是否需要支持自定义分组？
- [ ] 是否需要支持拖拽排序？
