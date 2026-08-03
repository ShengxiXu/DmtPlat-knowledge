# 知识库详情页功能完善 - 产品需求文档

## Overview

- **Summary**: 完善知识库详情页的五个标签页功能，包括文档管理、训练配置、问答测试、效果评估和应用绑定
- **Purpose**: 提供完整的知识库管理功能，让用户能够上传文档、配置训练参数、测试问答效果、评估模型性能并管理 API 密钥
- **Target Users**: 知识库管理员、开发人员、客服人员

## Goals

- 实现文档拖拽上传和文件管理功能
- 完善训练配置的交互逻辑
- 提供完整的问答测试体验
- 实现效果评估的数据筛选和详情查看
- 添加 API 密钥管理功能

## Non-Goals (Out of Scope)

- 不实现后端 API 调用（使用模拟数据）
- 不实现真正的文档索引和向量化
- 不实现用户认证和权限管理

## Background & Context

当前项目基于 Vite + JavaScript 构建，已有基础的 UI 框架和模拟数据。需要完善各标签页的交互功能。

## Functional Requirements

- **FR-1**: 文档管理 - 支持拖拽上传、文件预览、删除操作
- **FR-2**: 训练配置 - 支持分段策略配置、索引选项、训练日志查看
- **FR-3**: 问答测试 - 支持消息发送、AI 回复、聊天历史
- **FR-4**: 效果评估 - 支持评分统计展示、评分筛选、详情查看

- **FR-5**: 应用绑定 - 支持 API 密钥管理、复制密钥、新建密钥

## Non-Functional Requirements

- **NFR-1**: 界面响应时间 < 500ms
- **NFR-2**: 支持深色/浅色主题切换
- **NFR-3**: 响应式设计，适配不同屏幕尺寸

## Constraints

- **Technical**: Vite 5.x, JavaScript ES6+, CSS3
- **Business**: 使用模拟数据，无真实后端依赖
- **Dependencies**: 已有组件库和样式系统

## Assumptions

- 用户已熟悉基础的 Web 界面操作
- 浏览器支持现代 Web API（Clipboard API、Drag and Drop API）

## Acceptance Criteria

### AC-1: 文档拖拽上传

- **Given**: 用户进入文档管理页面
- **When**: 用户拖拽文件到上传区域
- **Then**: 显示上传提示，文件开始上传
- **Verification**: `human-judgment`

### AC-2: 文件预览

- **Given**: 用户在文档列表中选择一个文件
- **When**: 用户点击预览按钮
- **Then**: 弹出预览窗口显示文件内容
- **Verification**: `human-judgment`

### AC-3: 文件删除确认

- **Given**: 用户在文档列表中选择一个文件
- **When**: 用户点击删除按钮
- **Then**: 弹出确认对话框，确认后删除文件
- **Verification**: `human-judgment`

### AC-4: 训练配置保存

- **Given**: 用户在训练配置页面修改配置
- **When**: 用户点击保存按钮
- **Then**: 配置保存成功，显示提示
- **Verification**: `human-judgment`

### AC-5: 训练按钮交互

- **Given**: 用户在训练配置页面
- **When**: 用户点击开始训练按钮
- **Then**: 训练状态更新，日志实时显示
- **Verification**: `human-judgment`

### AC-6: 问答消息发送

- **Given**: 用户在问答测试页面
- **When**: 用户输入问题并发送
- **Then**: 显示用户消息，AI 回复后显示响应
- **Verification**: `human-judgment`

### AC-7: 评分筛选

- **Given**: 用户在效果评估页面
- **When**: 用户选择评分筛选条件
- **Then**: 列表按评分筛选显示
- **Verification**: `human-judgment`

### AC-8: 评价详情查看

- **Given**: 用户在效果评估列表中选择一条记录
- **When**: 用户点击查看按钮
- **Then**: 弹出详情窗口显示完整内容
- **Verification**: `human-judgment`

### AC-9: 密钥复制

- **Given**: 用户在应用绑定页面
- **When**: 用户点击复制按钮
- **Then**: 密钥复制到剪贴板，显示成功提示
- **Verification**: `human-judgment`

### AC-10: 新建密钥

- **Given**: 用户在应用绑定页面
- **When**: 用户点击新建密钥按钮
- **Then**: 弹出创建窗口，创建后显示新密钥
- **Verification**: `human-judgment`

## Open Questions

- [ ] 是否需要支持批量上传文件？
- [ ] 是否需要支持密钥过期时间设置？
