# 用户聊天页面左侧面板 - 产品需求文档

## Overview
- **Summary**: 实现用户聊天页面左侧面板，包含知识库选择、历史对话记录等功能
- **Purpose**: 提供清晰的知识库切换和历史对话管理界面
- **Target Users**: 知识库用户、客服人员

## Goals
- 实现新对话功能
- 显示个人知识库和共享知识库
- 支持知识库分类展开/折叠
- 显示历史对话记录
- 支持搜索历史对话

## Non-Goals (Out of Scope)
- 不实现真实后端 API 调用
- 不实现用户认证系统

## Background & Context
参考用户提供的设计截图，左侧面板需要包含知识库导航和历史对话两部分。

## Functional Requirements
- **FR-1**: 新对话按钮
- **FR-2**: 个人知识库入口
- **FR-3**: 共享知识库（可折叠）
- **FR-4**: 知识库广场入口
- **FR-5**: 创建共享知识库入口
- **FR-6**: 历史对话列表
- **FR-7**: 历史对话搜索

## Acceptance Criteria

### AC-1: 新对话按钮
- **Given**: 用户在聊天页面
- **When**: 点击"新对话"按钮
- **Then**: 清空当前聊天内容，开始新对话
- **Verification**: `human-judgment`

### AC-2: 知识库导航
- **Given**: 用户在聊天页面
- **When**: 点击知识库名称
- **Then**: 切换到该知识库的聊天
- **Verification**: `human-judgment`

### AC-3: 历史对话
- **Given**: 用户在聊天页面
- **When**: 点击历史对话项
- **Then**: 加载该对话的历史记录
- **Verification**: `human-judgment`

### AC-4: 搜索历史
- **Given**: 用户在聊天页面
- **When**: 在搜索框输入关键词
- **Then**: 筛选匹配的历史对话
- **Verification**: `human-judgment`
