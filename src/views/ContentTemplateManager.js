import {
  defaultContentTemplates,
  formatLabels,
  contentTemplateFormats,
  sceneCategories,
  sceneCategoryColors,
  getFeaturedTemplates,
  getMyContentTemplates,
  saveMyContentTemplate,
  deleteMyContentTemplate,
  getAllContentTemplates,
  incrementTemplateUsage,
  getContentTemplateById,
  saveMyDocument,
  getMyDocuments,
} from '../data/contentTemplates.js';
import { workRoles, getRoleById } from '../data/workAssistantData.js';
import { generateId } from '../utils/helpers.js';
import { createRichEditor } from '../editor/RichEditor.js';
import { createRichToolbar } from '../editor/RichToolbar.js';
import {
  ensureHtmlContent,
  readHtmlFromData,
  writeHtmlToData,
  htmlToLegacyWord,
  htmlToLegacyTable,
  htmlToLegacyEmail,
  htmlToLegacyList,
  htmlToLegacySteps,
} from '../editor/migrate.js';

const SCENE_TO_ROLES = {
  project: ['product'],
  office: ['customer_service', 'marketing', 'sales', 'hr', 'product'],
  sales: ['sales'],
  strategy: ['product', 'marketing'],
  marketing: ['marketing'],
  hr: ['hr'],
  product: ['product'],
  personal: [
    'sales',
    'marketing',
    'hr',
    'product',
    'customer_service',
    'tech_support',
  ],
};

function getTemplateRoleIds(template) {
  const ids = new Set();
  (template.category || []).forEach((cat) => {
    (SCENE_TO_ROLES[cat] || []).forEach((id) => ids.add(id));
  });
  return Array.from(ids);
}

export class ContentTemplateManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.onSelect = options.onSelect || (() => {});
    this.onClose = options.onClose || null;
    this.onBack = options.onBack || null;
    this.initialDocumentId = options.initialDocumentId || null;
    this.currentCategory = options.initialCategory || 'all';
    this.currentFormat = 'all';
    this.currentSource = 'all';
    this.searchKeyword = '';
    this.viewMode = 'grid';
    this.templates = [];
    this.previewTemplate = null;
    this.editorTemplate = null;
    this.editorMode = 'create';
    this.aiChatMessages = [];
    this.aiChatStep = 0;
    this.aiDraftTemplate = null;
    this.extractText = '';
    this.showNewModal = false;
    this.showUploadModal = false;
    this.showExtractModal = false;
    this.uploadFile = null;
    this.extractParsing = false;
    // 富文本编辑器实例管理
    this.richEditor = null; // 文档创作编辑器实例
    this.richToolbar = null; // 文档创作工具栏实例
    this.tplRichEditor = null; // 模板编辑器实例
    this.tplRichToolbar = null; // 模板工具栏实例
    this.init();
  }

  /** 销毁当前活跃的富文本编辑器实例 */
  destroyRichEditors() {
    try {
      if (this.richToolbar) {
        this.richToolbar.destroy();
        this.richToolbar = null;
      }
      if (this.richEditor) {
        this.richEditor.destroy();
        this.richEditor = null;
      }
      if (this.tplRichToolbar) {
        this.tplRichToolbar.destroy();
        this.tplRichToolbar = null;
      }
      if (this.tplRichEditor) {
        this.tplRichEditor.destroy();
        this.tplRichEditor = null;
      }
    } catch (err) {
      console.error('[destroyRichEditors] error:', err);
    }
  }

  init() {
    this.loadTemplates();
    this.loadInitialDocument();
    this.render();
    this.bindEvents();
  }

  loadInitialDocument() {
    if (!this.initialDocumentId) return;
    const docs = getMyDocuments();
    const found = docs.find((d) => d.id === this.initialDocumentId);
    if (found) {
      this.contentDoc = JSON.parse(JSON.stringify(found));
    } else {
      this.showToast('文档不存在或已被删除');
      this.initialDocumentId = null;
    }
  }

  loadTemplates() {
    this.templates = getAllContentTemplates();
  }

  refreshList() {
    this.loadTemplates();
    this.render();
    this.bindEvents();
  }

  getFilteredTemplates() {
    let list = [...this.templates];
    if (this.currentCategory === 'featured') {
      list = list.filter((t) => t.featured);
    } else if (this.currentCategory !== 'all') {
      list = list.filter(
        (t) => t.category && t.category.includes(this.currentCategory)
      );
    }
    if (this.currentFormat !== 'all') {
      list = list.filter((t) => t.format === this.currentFormat);
    }
    if (this.currentSource === 'official') {
      list = list.filter((t) => t.level === 'official');
    } else if (this.currentSource === 'personal') {
      list = list.filter((t) => t.level === 'personal');
    }
    if (this.searchKeyword) {
      const kw = this.searchKeyword.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(kw) ||
          (t.description && t.description.toLowerCase().includes(kw)) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(kw)))
      );
    }
    return list;
  }

  getCategoryCounts() {
    const counts = { all: this.templates.length, featured: 0 };
    this.templates.forEach((t) => {
      if (t.featured) counts.featured++;
      (t.category || []).forEach((cat) => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return counts;
  }

  getFormatCounts() {
    const counts = { all: this.templates.length };
    this.templates.forEach((t) => {
      counts[t.format] = (counts[t.format] || 0) + 1;
    });
    return counts;
  }

  getSourceCounts() {
    const counts = { all: this.templates.length, official: 0, personal: 0 };
    this.templates.forEach((t) => {
      if (t.level === 'official') counts.official++;
      if (t.level === 'personal') counts.personal++;
    });
    return counts;
  }

  render() {
    // render 前销毁富文本编辑器实例,避免重复挂载
    this.destroyRichEditors();

    if (this.contentDoc) {
      this.container.innerHTML = this.renderContentEditor();
      this.mountDocRichEditor();
      return;
    }

    const categoryCounts = this.getCategoryCounts();
    const formatCounts = this.getFormatCounts();
    const filtered = this.getFilteredTemplates();
    const featured = getFeaturedTemplates();

    this.container.innerHTML = `
      <div class="ctm-library">
        <div class="ctm-lib-header">
          <div class="ctm-lib-header-inner">
            <div class="ctm-lib-title-section">
              ${this.onBack ? `<button class="ctm-lib-back-btn" data-action="ctm-back" title="返回"><i class="fa-solid fa-arrow-left"></i></button>` : ''}
              <div class="ctm-lib-title-text">
                <h1 class="ctm-lib-title">模板中心</h1>
                <p class="ctm-lib-subtitle">精选模板，助你高效完成工作</p>
              </div>
            </div>
            <div class="ctm-lib-search-row">
              <div class="ctm-lib-search-box">
                <i class="fa-solid fa-magnifying-glass ctm-lib-search-icon"></i>
                <input type="text" class="ctm-lib-search-input" placeholder="搜索模板名称、描述、标签..." value="${this.searchKeyword}" />
                <button class="ctm-lib-new-btn" id="ctm-lib-new" type="button" title="新建模板">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
              <div class="ctm-lib-source-tabs">
                <div class="ctm-lib-source-tab ${this.currentSource === 'all' ? 'active' : ''}" data-source="all">全部</div>
                <div class="ctm-lib-source-tab ${this.currentSource === 'official' ? 'active' : ''}" data-source="official">官方</div>
                <div class="ctm-lib-source-tab ${this.currentSource === 'personal' ? 'active' : ''}" data-source="personal">我的</div>
              </div>
            </div>
          </div>
        </div>

        <div class="ctm-lib-body">
          <div class="ctm-lib-categories">
            ${this.renderCategories()}
          </div>

          <div class="ctm-lib-content">
            ${this.currentCategory === 'all' || this.currentCategory === 'featured' ? this.renderFeaturedSection(featured.slice(0, 6)) : ''}

            <div class="ctm-lib-section">
              <div class="ctm-lib-section-header">
                <div class="ctm-lib-section-title">
                  ${this.getSectionTitle()}
                  <span class="ctm-lib-section-count">${filtered.length}</span>
                </div>
                <div class="ctm-lib-section-controls" style="display:flex;align-items:center;gap:12px;">
                  <div class="ctm-lib-format-filter">
                    <div class="ctm-lib-format-tab ${this.currentFormat === 'all' ? 'active' : ''}" data-format="all">全部格式</div>
                    ${Object.entries(formatLabels)
                      .map(
                        ([key, val]) => `
                      <div class="ctm-lib-format-tab ${this.currentFormat === key ? 'active' : ''}" data-format="${key}">
                        <i class="fa-solid ${val.icon}" style="color:${val.color}"></i>
                        ${val.label}
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                  ${this.renderViewToggle()}
                </div>
              </div>

              ${
                filtered.length === 0
                  ? this.renderEmpty()
                  : this.viewMode === 'grid'
                    ? `
                <div class="ctm-lib-grid">
                  ${filtered.map((t) => this.renderTemplateCard(t)).join('')}
                </div>
              `
                    : `
                <div class="ctm-template-list">
                  ${filtered.map((t) => this.renderTemplateListItem(t)).join('')}
                </div>
              `
              }
            </div>
          </div>
        </div>
      </div>

      ${this.showNewModal ? this.renderNewModal() : ''}
      ${this.showUploadModal ? this.renderUploadModal() : ''}
      ${this.showExtractModal ? this.renderExtractModal() : ''}
      ${this.previewTemplate ? this.renderPreviewModal() : ''}
      ${this.editorTemplate ? this.renderEditorModal() : ''}
      ${this.aiDraftTemplate ? this.renderAIModal() : ''}
    `;

    // 模板编辑器弹窗渲染后,挂载富文本编辑器(精简功能模式)
    if (this.editorTemplate) {
      this.mountTplRichEditor();
    }
  }

  renderCategories() {
    const categoryCounts = this.getCategoryCounts();
    return `
      <div class="ctm-lib-cat-list">
        ${sceneCategories
          .map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isActive = this.currentCategory === cat.id;
            return `
              <div class="ctm-lib-cat-item ${isActive ? 'active' : ''}" data-category="${cat.id}">
                <div class="ctm-lib-cat-icon">
                  <i class="fa-solid ${cat.icon}"></i>
                </div>
                <span class="ctm-lib-cat-name">${cat.name}</span>
                <span class="ctm-lib-cat-count">${count}</span>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  getSectionTitle() {
    if (this.currentCategory === 'all') return '全部模板';
    if (this.currentCategory === 'featured') return '精选模板';
    const cat = sceneCategories.find((c) => c.id === this.currentCategory);
    return cat ? cat.name + '模板' : '模板';
  }

  renderViewToggle() {
    return `
      <div class="ctm-view-toggle">
        <button class="ctm-view-btn ${this.viewMode === 'grid' ? 'active' : ''}" data-view="grid" title="卡片视图">
          <i class="fa-solid fa-th-large"></i>
        </button>
        <button class="ctm-view-btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list" title="列表视图">
          <i class="fa-solid fa-list"></i>
        </button>
      </div>
    `;
  }

  renderTemplateListItem(template) {
    const formatInfo = formatLabels[template.format] || formatLabels.word;
    const themeColor = template.themeColor || '#6b7280';
    const isPersonal = template.level === 'personal';
    const roleIds = getTemplateRoleIds(template);
    const roles = roleIds.map((id) => getRoleById(id)).filter(Boolean);

    return `
      <div class="ctm-template-list-item" data-id="${template.id}">
        <div class="ctm-list-preview">
          <div class="ctm-card-preview-header">
            <div class="ctm-card-type-icon" style="background:${themeColor}15;color:${themeColor}">
              <i class="fa-solid ${formatInfo.icon}"></i>
            </div>
            ${template.featured ? '<div class="ctm-card-featured-badge"><i class="fa-solid fa-star"></i></div>' : ''}
          </div>
          <div class="ctm-card-preview-body">
            ${this.getMiniPreview(template)}
          </div>
        </div>
        <div class="ctm-list-info">
          <div class="ctm-list-title-row">
            <h3 class="ctm-list-title">${this.escapeHtml(template.name)}</h3>
            <span class="ctm-card-source ${isPersonal ? 'personal' : 'official'}">
              ${isPersonal ? '我的' : '官方'}
            </span>
          </div>
          <p class="ctm-list-desc">${this.escapeHtml(template.description || '')}</p>
          <div class="ctm-list-meta">
            <span class="ctm-list-meta-item"><i class="fa-solid fa-users-viewfinder"></i> ${(template.usedCount || 0).toLocaleString()} 人使用</span>
            <span class="ctm-list-meta-item"><i class="fa-solid ${formatInfo.icon}"></i> ${formatInfo.label}</span>
            <div class="ctm-list-tags">
              ${roles.map((r) => `<span class="ctm-list-tag role">${r.name}</span>`).join('')}
              ${(template.tags || [])
                .slice(0, 3)
                .map(
                  (tag) =>
                    `<span class="ctm-list-tag">${this.escapeHtml(tag)}</span>`
                )
                .join('')}
            </div>
          </div>
        </div>
        <div class="ctm-list-actions">
          <button class="ctm-hover-btn" data-action="preview" title="预览详情">
            <i class="fa-regular fa-eye"></i>
          </button>
          ${isPersonal ? `<button class="ctm-hover-btn" data-action="edit" title="编辑"><i class="fa-regular fa-pen-to-square"></i></button>` : ''}
          <button class="btn btn-primary btn-sm ctm-hover-use-btn" data-action="use">
            <i class="fa-solid fa-play"></i> 使用
          </button>
        </div>
      </div>
    `;
  }

  renderFeaturedSection(featured) {
    if (featured.length === 0) return '';
    return `
      <div class="ctm-lib-section">
        <div class="ctm-lib-section-header">
          <div class="ctm-lib-section-title">
            <i class="fa-solid fa-star" style="color:#f59e0b"></i> 精选推荐
          </div>
          <div class="ctm-lib-section-more" data-category="featured">查看全部 <i class="fa-solid fa-chevron-right" style="font-size:12px"></i></div>
        </div>
        <div class="ctm-lib-grid">
          ${featured
            .slice(0, 8)
            .map((t) => this.renderTemplateCard(t))
            .join('')}
        </div>
      </div>
    `;
  }

  getMiniPreview(template) {
    const format = template.format;
    const themeColor = template.themeColor || '#6366f1';

    const truncate = (str, maxLen) => {
      if (!str) return '';
      if (str.length <= maxLen) return str;
      return str.slice(0, maxLen - 1) + '…';
    };

    if (format === 'word' && template.content?.sections) {
      const sections = template.content.sections.slice(0, 5);
      return `
        <div class="pv-real-doc">
          <div class="pv-real-title" style="color:${themeColor};border-left:3px solid ${themeColor}">${template.name}</div>
          <div class="pv-real-body">
            ${sections
              .map(
                (s) => `
              <div class="pv-real-section">
                <div class="pv-real-h">${truncate(s.title, 16)}</div>
                ${s.guide ? `<div class="pv-real-p">${truncate(s.guide, 22)}</div>` : ''}
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    if (format === 'table' && template.content?.columns) {
      const columns = template.content.columns.slice(0, 5);
      const rows = template.content.rows || columns.map(() => ({}));
      const sampleRows = rows.slice(0, 3);
      return `
        <div class="pv-real-table">
          <div class="pv-real-table-title" style="color:${themeColor}">${template.name}</div>
          <div class="pv-real-table-wrap">
            <div class="pv-real-thead">
              ${columns.map((c) => `<div class="pv-real-th">${truncate(c.title || c, 6)}</div>`).join('')}
            </div>
            ${sampleRows
              .map(
                () => `
              <div class="pv-real-tr">
                ${columns.map(() => `<div class="pv-real-td"><span></span></div>`).join('')}
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    if (format === 'email') {
      return `
        <div class="pv-real-email">
          <div class="pv-real-email-top" style="background:${themeColor}08">
            <div class="pv-real-avatar" style="background:${themeColor}">${template.name.slice(0, 1)}</div>
            <div class="pv-real-email-info">
              <div class="pv-real-email-from">${truncate(template.name, 10)}</div>
              <div class="pv-real-email-sub" style="color:${themeColor}">关于${truncate(template.name, 8)}的通知</div>
            </div>
          </div>
          <div class="pv-real-email-body">
            <div class="pv-real-p">您好，${truncate(template.description || '', 20)}</div>
            <div class="pv-real-p">具体内容如下：</div>
            <div class="pv-real-bullet">• 要点一</div>
            <div class="pv-real-bullet">• 要点二</div>
          </div>
        </div>
      `;
    }

    if (format === 'list' && template.content?.items) {
      const items = template.content.items.filter((i) => i.trim()).slice(0, 6);
      return `
        <div class="pv-real-list">
          <div class="pv-real-list-title" style="color:${themeColor}">${template.name}</div>
          <div class="pv-real-list-body">
            ${items
              .map(
                (item) => `
              <div class="pv-real-list-item">
                <div class="pv-real-list-check" style="border-color:${themeColor}"></div>
                <div class="pv-real-list-text">${truncate(item, 14)}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    if (format === 'steps' && template.content?.steps) {
      const steps = template.content.steps.slice(0, 5);
      return `
        <div class="pv-real-steps">
          <div class="pv-real-steps-title" style="color:${themeColor}">${template.name}</div>
          <div class="pv-real-steps-body">
            ${steps
              .map(
                (s, i) => `
              <div class="pv-real-step-item">
                <div class="pv-real-step-num" style="background:${themeColor}">${i + 1}</div>
                <div class="pv-real-step-text">${truncate(typeof s === 'string' ? s : s.title, 14)}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="pv-real-doc">
        <div class="pv-real-title" style="color:${themeColor};border-left:3px solid ${themeColor}">${template.name}</div>
        <div class="pv-real-body">
          <div class="pv-real-section">
            <div class="pv-real-h">一、概述</div>
            <div class="pv-real-p">${truncate(template.description || '', 22)}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderTemplateCard(template) {
    const formatInfo = formatLabels[template.format] || formatLabels.word;
    const themeColor = template.themeColor || '#6b7280';
    const isPersonal = template.level === 'personal';
    const roleIds = getTemplateRoleIds(template);
    const roles = roleIds.map((id) => getRoleById(id)).filter(Boolean);

    return `
      <div class="ctm-template-card" data-id="${template.id}">
        <div class="ctm-card-preview">
          <div class="ctm-card-preview-header">
            <div class="ctm-card-type-icon" style="background:${themeColor}15;color:${themeColor}">
              <i class="fa-solid ${formatInfo.icon}"></i>
            </div>
            ${template.featured ? '<div class="ctm-card-featured-badge"><i class="fa-solid fa-star"></i></div>' : ''}
          </div>
          <div class="ctm-card-preview-body">
            ${this.getMiniPreview(template)}
          </div>
          <div class="ctm-card-hover-actions">
            <button class="ctm-hover-btn" data-action="preview" title="预览详情">
              <i class="fa-regular fa-eye"></i>
            </button>
            ${isPersonal ? `<button class="ctm-hover-btn" data-action="edit" title="编辑"><i class="fa-regular fa-pen-to-square"></i></button>` : ''}
            <button class="btn btn-primary btn-sm ctm-hover-use-btn" data-action="use">
              <i class="fa-solid fa-play"></i> 使用
            </button>
          </div>
        </div>
        <div class="ctm-card-footer">
          <h3 class="ctm-card-title">${this.escapeHtml(template.name)}</h3>
          <p class="ctm-card-desc">${this.escapeHtml(template.description || '')}</p>
          <div class="ctm-card-tags">
            ${roles
              .slice(0, 2)
              .map((r) => `<span class="ctm-card-tag role">${r.name}</span>`)
              .join('')}
            ${(template.tags || [])
              .slice(0, 2)
              .map(
                (tag) =>
                  `<span class="ctm-card-tag">${this.escapeHtml(tag)}</span>`
              )
              .join('')}
          </div>
          <div class="ctm-card-meta-row">
            <span class="ctm-card-meta">
              <i class="fa-solid fa-users-viewfinder"></i> ${(template.usedCount || 0).toLocaleString()} 人使用
            </span>
            <span class="ctm-card-source ${isPersonal ? 'personal' : 'official'}">
              ${isPersonal ? '我的' : '官方'}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderContentEditor() {
    const doc = this.contentDoc;
    if (!doc) return '';
    const formatInfo = formatLabels[doc.format] || formatLabels.word;

    return `
      <div class="ctm-doc-editor">
        <div class="ctm-doc-editor-header">
          <button class="ctm-doc-back" data-action="close-doc-editor">
            <i class="fa-solid fa-arrow-left"></i> 返回模板中心
          </button>
          <div class="ctm-doc-title-wrap">
            <input type="text" class="ctm-doc-title-input" value="${this.escapeHtml(doc.title)}" data-field="doc-title" />
            <span class="ctm-doc-source">基于模板：${this.escapeHtml(doc.templateName)}</span>
          </div>
          <div class="ctm-doc-actions">
            <button class="btn btn-outline" data-action="share-doc">
              <i class="fa-solid fa-share-nodes"></i> 分享
            </button>
            <button class="btn btn-outline" data-action="export-doc">
              <i class="fa-solid fa-download"></i> 导出
            </button>
            <button class="btn btn-primary" data-action="save-doc">
              <i class="fa-solid fa-floppy-disk"></i> 保存
            </button>
          </div>
        </div>
        <div class="ctm-doc-editor-body">
          ${this.renderContentEditorFields(doc)}
        </div>
      </div>
    `;
  }

  renderContentEditorFields(doc) {
    const data = doc.data || {};
    const format = doc.format;
    ensureHtmlContent(data, format);

    // word/email 有额外元数据输入区
    let metaBar = '';
    if (format === 'word') {
      const meta = data.meta || {};
      metaBar = `
        <div class="ctm-doc-meta-bar">
          ${this.renderMetaItem('主题', meta['主题'] || '', '输入主题')}
          ${this.renderMetaItem('时间', meta['时间'] || '', '例如：2026 年第 x 季度')}
          ${this.renderMetaItem('部门', meta['部门'] || '', '输入部门')}
          ${this.renderMetaItem('撰稿人', meta['撰稿人'] || '', '输入撰稿人')}
        </div>
      `;
    } else if (format === 'email') {
      metaBar = `
        <div class="ctm-doc-meta-bar">
          ${this.renderMetaItem('主题', data.subject || '', '邮件主题')}
          ${this.renderMetaItem('称呼', data.greeting || '', '收件人称呼')}
          ${this.renderMetaItem('结尾', data.closing || '', '结尾敬语')}
        </div>
      `;
    }

    const placeholder =
      format === 'table'
        ? '插入表格后开始编辑单元格...'
        : format === 'list'
        ? '添加待办事项...'
        : '开始输入内容...';

    return `
      <div class="ctm-doc-rich-body">
        ${metaBar}
        <div id="ctm-doc-toolbar-mount"></div>
        <div class="ctm-rich-editor-area" id="ctm-doc-editor-mount" data-placeholder="${placeholder}"></div>
      </div>
    `;
  }

  renderMetaItem(label, value, placeholder) {
    return `
      <div class="ctm-doc-meta-item">
        <label>${label}</label>
        <input type="text" data-field="meta-${label}" value="${this.escapeHtml(
      value
    )}" placeholder="${placeholder}" />
      </div>
    `;
  }

  /** 挂载文档创作富文本编辑器(完整飞书功能) */
  mountDocRichEditor() {
    if (!this.contentDoc) return;
    const mount = this.container.querySelector('#ctm-doc-editor-mount');
    const toolbarMount = this.container.querySelector('#ctm-doc-toolbar-mount');
    if (!mount || !toolbarMount) return;

    const format = this.contentDoc.format;
    const html = readHtmlFromData(this.contentDoc.data, format);

    try {
      this.richEditor = createRichEditor({
        element: mount,
        format,
        content: html,
        placeholder: '开始创作内容...',
        onUpdate: ({ html: newHtml }) => {
          // 实时同步到 contentDoc.data(不持久化,保存时才写 localStorage)
          if (this.contentDoc) {
            writeHtmlToData(this.contentDoc.data, format, newHtml);
          }
        },
      });
      this.richToolbar = createRichToolbar({
        editor: this.richEditor,
        container: toolbarMount,
        format,
        mode: 'document',
      });
    } catch (err) {
      console.error('[mountDocRichEditor] error:', err);
      mount.innerHTML =
        '<div style="padding:24px;color:#dc2626;">富文本编辑器加载失败,请刷新页面重试。</div>';
    }
  }

  /** 挂载模板编辑器富文本编辑器(精简功能模式) */
  mountTplRichEditor() {
    if (!this.editorTemplate) return;
    const mount = this.container.querySelector('#ctm-tpl-editor-mount');
    const toolbarMount = this.container.querySelector('#ctm-tpl-toolbar-mount');
    if (!mount || !toolbarMount) return;

    const format = this.editorTemplate.format || 'word';
    const content = this.editorTemplate.content || {};
    ensureHtmlContent(content, format);
    const html = readHtmlFromData(content, format);

    try {
      this.tplRichEditor = createRichEditor({
        element: mount,
        format,
        content: html,
        placeholder: '定义模板内容...',
        onUpdate: ({ html: newHtml }) => {
          if (this.editorTemplate) {
            writeHtmlToData(this.editorTemplate.content, format, newHtml);
          }
        },
      });
      this.tplRichToolbar = createRichToolbar({
        editor: this.tplRichEditor,
        container: toolbarMount,
        format,
        mode: 'template',
      });
    } catch (err) {
      console.error('[mountTplRichEditor] error:', err);
      mount.innerHTML =
        '<div style="padding:24px;color:#dc2626;">富文本编辑器加载失败,请刷新页面重试。</div>';
    }
  }

  escapeHtml(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  renderEmpty() {
    return `
      <div class="ctm-empty-state">
        <div class="ctm-empty-icon">
          <i class="fa-regular fa-file-lines"></i>
        </div>
        <div class="ctm-empty-title">暂无符合条件的模板</div>
        <div class="ctm-empty-desc">试试其他分类或搜索关键词</div>
      </div>
    `;
  }

  renderNewModal() {
    return `
      <div class="ctm-modal-overlay" id="ctm-new-modal">
        <div class="ctm-modal ctm-new-modal" onclick="event.stopPropagation()">
          <div class="ctm-modal-header">
            <h2 class="ctm-modal-title">创建内容模板</h2>
            <button class="ctm-modal-close" data-action="close-new">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="ctm-modal-body">
            <div class="ctm-create-options">
              <div class="ctm-create-option" data-create="ai">
                <div class="ctm-create-option-icon" style="background:linear-gradient(135deg,#667eea,#764ba2)">
                  <i class="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <div class="ctm-create-option-content">
                  <h3 class="ctm-create-option-title">AI 生成模板</h3>
                  <p class="ctm-create-option-desc">描述你的需求，AI 帮你智能生成模板结构</p>
                </div>
                <div class="ctm-create-option-arrow">
                  <i class="fa-solid fa-chevron-right"></i>
                </div>
              </div>
              <div class="ctm-create-option" data-create="upload">
                <div class="ctm-create-option-icon" style="background:linear-gradient(135deg,#11998e,#38ef7d)">
                  <i class="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <div class="ctm-create-option-content">
                  <h3 class="ctm-create-option-title">上传模板文件</h3>
                  <p class="ctm-create-option-desc">上传 Word/Excel/文本文件，自动提取结构</p>
                </div>
                <div class="ctm-create-option-arrow">
                  <i class="fa-solid fa-chevron-right"></i>
                </div>
              </div>
              <div class="ctm-create-option" data-create="extract">
                <div class="ctm-create-option-icon" style="background:linear-gradient(135deg,#f093fb,#f5576c)">
                  <i class="fa-solid fa-magnifying-glass-chart"></i>
                </div>
                <div class="ctm-create-option-content">
                  <h3 class="ctm-create-option-title">从范文提取</h3>
                  <p class="ctm-create-option-desc">粘贴范文内容，AI 分析并提取模板结构</p>
                </div>
                <div class="ctm-create-option-arrow">
                  <i class="fa-solid fa-chevron-right"></i>
                </div>
              </div>
              <div class="ctm-create-option" data-create="blank">
                <div class="ctm-create-option-icon" style="background:linear-gradient(135deg,#667db6,#0082c8);opacity:.7">
                  <i class="fa-regular fa-file"></i>
                </div>
                <div class="ctm-create-option-content">
                  <h3 class="ctm-create-option-title">空白模板</h3>
                  <p class="ctm-create-option-desc">从空白开始，手动创建模板结构</p>
                </div>
                <div class="ctm-create-option-arrow">
                  <i class="fa-solid fa-chevron-right"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderPreviewModal() {
    const t = this.previewTemplate;
    if (!t) return '';
    const formatInfo = formatLabels[t.format] || formatLabels.word;
    const themeColor = t.themeColor || '#6b7280';
    const isPersonal = t.level === 'personal';

    return `
      <div class="ctm-modal-overlay" id="ctm-preview-modal">
        <div class="ctm-modal ctm-preview-modal" onclick="event.stopPropagation()">
          <div class="ctm-preview-left" style="--preview-color:${themeColor}">
            <div class="ctm-preview-left-toolbar">
              <button class="ctm-preview-toolbtn" data-action="clone-preview" title="克隆到我的模板">
                <i class="fa-regular fa-copy"></i>
              </button>
              ${isPersonal ? `<button class="ctm-preview-toolbtn" data-action="edit-preview" title="编辑模板"><i class="fa-regular fa-pen-to-square"></i></button>` : ''}
              ${isPersonal ? `<button class="ctm-preview-toolbtn ctm-preview-toolbtn-danger" data-action="delete-preview" title="删除模板"><i class="fa-regular fa-trash-can"></i></button>` : ''}
            </div>
            <div class="ctm-preview-left-inner">
              <div class="ctm-preview-format-tag" style="background:${formatInfo.color}20;color:${formatInfo.color}">
                <i class="fa-solid ${formatInfo.icon}"></i> ${formatInfo.label}
              </div>
              <h2 class="ctm-preview-title">${t.name}</h2>
              <p class="ctm-preview-desc">${t.description || ''}</p>
              <div class="ctm-preview-meta">
                <div class="ctm-preview-meta-item">
                  <i class="fa-solid fa-users-viewfinder"></i>
                  <span>${(t.usedCount || 0).toLocaleString()} 次使用</span>
                </div>
                <div class="ctm-preview-meta-item">
                  <i class="fa-regular fa-calendar"></i>
                  <span>${t.createdAt || ''}</span>
                </div>
                <div class="ctm-preview-meta-item">
                  ${isPersonal ? '<i class="fa-solid fa-user"></i><span>我的模板</span>' : '<i class="fa-solid fa-building-columns"></i><span>官方模板</span>'}
                </div>
              </div>
              <div class="ctm-preview-tags">
                ${(t.tags || [])
                  .map((tag) => `<span class="ctm-preview-tag">${tag}</span>`)
                  .join('')}
              </div>
              <div class="ctm-preview-actions">
                <button class="btn btn-primary btn-lg ctm-preview-use-btn" data-action="use-preview">
                  <i class="fa-solid fa-play"></i> 使用此模板
                </button>
                ${isPersonal ? `<button class="btn btn-secondary btn-lg" data-action="edit-preview"><i class="fa-regular fa-pen-to-square"></i> 编辑模板</button>` : ''}
                <button class="btn btn-outline btn-lg" data-action="export-preview">
                  <i class="fa-solid fa-file-export"></i> 导出 Word
                </button>
              </div>
            </div>
          </div>
          <div class="ctm-preview-right">
            <div class="ctm-preview-right-header">
              <span class="ctm-preview-right-title">模板结构预览</span>
              <button class="ctm-modal-close" data-action="close-preview">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="ctm-preview-right-body">
              ${this.renderPreviewContent(t)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderPreviewContent(template) {
    const format = template.format;
    const content = template.content || {};

    if (format === 'word' && content.sections) {
      return `
        <div class="ctm-preview-word">
          <div class="ctm-preview-word-title">${template.name}</div>
          <div class="ctm-preview-word-sections">
            ${content.sections
              .map(
                (s) => `
              <div class="ctm-preview-section">
                <div class="ctm-preview-section-title" style="padding-left:${(s.level - 1) * 20}px">
                  <i class="fa-solid fa-hashtag" style="opacity:.4"></i> ${s.title}
                </div>
                ${s.guide ? `<div class="ctm-preview-section-guide">💡 ${s.guide}</div>` : ''}
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    if (format === 'table' && content.columns) {
      return `
        <div class="ctm-preview-table-wrap">
          <table class="ctm-preview-table">
            <thead>
              <tr>
                ${content.columns.map((col) => `<th>${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${(content.rows || [])
                .map(
                  (row) => `
                <tr>
                  ${(Array.isArray(row) ? row : Object.values(row)).map((cell) => `<td>${cell || ''}</td>`).join('')}
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (format === 'email') {
      return `
        <div class="ctm-preview-email">
          <div class="ctm-preview-email-subject">
            <span class="ctm-preview-email-label">主题：</span>${content.subject || ''}
          </div>
          <div class="ctm-preview-email-greeting">${content.greeting || ''}</div>
          <div class="ctm-preview-email-body">
            ${(content.body || []).map((line) => `<p>${line}</p>`).join('')}
          </div>
          <div class="ctm-preview-email-closing">${content.closing || ''}</div>
          <div class="ctm-preview-email-signature">${content.signature || ''}</div>
        </div>
      `;
    }

    if (format === 'list') {
      return `
        <div class="ctm-preview-list">
          ${(content.items || [])
            .map((item) => {
              if (!item.trim())
                return '<div class="ctm-preview-list-gap"></div>';
              return `<div class="ctm-preview-list-item">${item}</div>`;
            })
            .join('')}
        </div>
      `;
    }

    if (format === 'steps') {
      return `
        <div class="ctm-preview-steps">
          ${(content.steps || [])
            .map(
              (step, i) => `
            <div class="ctm-preview-step">
              <div class="ctm-preview-step-num">${i + 1}</div>
              <div class="ctm-preview-step-content">
                <div class="ctm-preview-step-title">${step.title}</div>
                ${step.desc ? `<div class="ctm-preview-step-desc">${step.desc}</div>` : ''}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    }

    return '<div>暂无预览</div>';
  }

  renderEditorModal() {
    const t = this.editorTemplate;
    if (!t) return '';

    const format = t.format || 'word';
    const saveLabel =
      this.editorMode === 'use'
        ? '保存并使用'
        : this.editorMode === 'edit'
          ? '保存修改'
          : '保存模板';
    const sourceHint =
      this.editorMode === 'use' && t.sourceName
        ? `<div class="ctm-fusion-source-hint">基于《${t.sourceName}》进行二次创作</div>`
        : '';

    return `
      <div class="ctm-modal-overlay" id="ctm-editor-modal">
        <div class="ctm-fusion-editor" onclick="event.stopPropagation()">
          <div class="ctm-fusion-header">
            <div class="ctm-fusion-header-left">
              <button class="ctm-fusion-back-btn" data-action="close-editor">
                <i class="fa-solid fa-arrow-left"></i>
              </button>
              <div class="ctm-fusion-title-input-wrap">
                <input type="text" class="ctm-fusion-title-input" id="ctm-editor-name" value="${t.name || ''}" placeholder="输入模板名称..." />
                ${sourceHint}
              </div>
            </div>
            <div class="ctm-fusion-header-right">
              <button class="btn btn-ghost ctm-fusion-preview-btn" data-action="preview-editor">
                <i class="fa-regular fa-eye"></i> 预览
              </button>
              <button class="btn btn-primary" data-action="save-template">
                <i class="fa-solid fa-check"></i> ${saveLabel}
              </button>
            </div>
          </div>

          <div class="ctm-fusion-body">
            <div class="ctm-fusion-canvas">
              ${this.renderFormatCanvas(t)}
            </div>

            <div class="ctm-fusion-sidebar">
              <div class="ctm-fusion-sidebar-section">
                <div class="ctm-fusion-sidebar-title">
                  <i class="fa-solid fa-gear"></i> 模板设置
                </div>
                <div class="ctm-fusion-sidebar-body">
                  <div class="ctm-fusion-field">
                    <label class="ctm-fusion-field-label">模板描述</label>
                    <textarea class="ctm-fusion-field-textarea" id="ctm-editor-desc" placeholder="简要描述模板的用途和适用场景">${t.description || ''}</textarea>
                  </div>
                  <div class="ctm-fusion-field-row">
                    <div class="ctm-fusion-field">
                      <label class="ctm-fusion-field-label">模板格式</label>
                      <select class="ctm-fusion-field-select" id="ctm-editor-format">
                        ${Object.entries(formatLabels)
                          .map(
                            ([key, val]) => `
                          <option value="${key}" ${format === key ? 'selected' : ''}>${val.label}</option>
                        `
                          )
                          .join('')}
                      </select>
                    </div>
                    <div class="ctm-fusion-field">
                      <label class="ctm-fusion-field-label">场景分类</label>
                      <select class="ctm-fusion-field-select" id="ctm-editor-category">
                        ${sceneCategories
                          .filter((c) => c.id !== 'all' && c.id !== 'featured')
                          .map(
                            (cat) => `
                          <option value="${cat.id}" ${(t.category || []).includes(cat.id) ? 'selected' : ''}>${cat.name}</option>
                        `
                          )
                          .join('')}
                      </select>
                    </div>
                  </div>
                  <div class="ctm-fusion-field">
                    <label class="ctm-fusion-field-label">标签</label>
                    <input type="text" class="ctm-fusion-field-input" id="ctm-editor-tags" value="${(t.tags || []).join(', ')}" placeholder="用逗号分隔，如：周报,汇报,项目" />
                  </div>
                </div>
              </div>

              ${this.renderFormatSidebar(t)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderFormatCanvas(t) {
    const format = t.format || 'word';

    // word/email 有元数据输入区(与文档创作编辑器一致,便于结构化定义)
    let metaBar = '';
    if (format === 'word') {
      const meta = t.content?.meta || {};
      metaBar = `
        <div class="ctm-doc-meta-bar">
          ${this.renderMetaItem('主题', meta['主题'] || '', '输入主题')}
          ${this.renderMetaItem('时间', meta['时间'] || '', '例如：2026 年第 x 季度')}
          ${this.renderMetaItem('部门', meta['部门'] || '', '输入部门')}
          ${this.renderMetaItem('撰稿人', meta['撰稿人'] || '', '输入撰稿人')}
        </div>
      `;
    } else if (format === 'email') {
      const c = t.content || {};
      metaBar = `
        <div class="ctm-doc-meta-bar">
          ${this.renderMetaItem('主题', c.subject || '', '邮件主题')}
          ${this.renderMetaItem('称呼', c.greeting || '', '收件人称呼')}
          ${this.renderMetaItem('结尾', c.closing || '', '结尾敬语')}
        </div>
      `;
    }

    const placeholder =
      format === 'table'
        ? '使用工具栏插入表格,点击单元格编辑...'
        : format === 'list'
          ? '添加待办事项,可勾选完成状态...'
          : format === 'steps'
            ? '用标题划分步骤,标题下填写说明...'
            : '定义模板内容,使用标题组织章节结构...';

    return `
      <div class="ctm-tpl-rich-body">
        ${metaBar}
        <div id="ctm-tpl-toolbar-mount"></div>
        <div class="ctm-rich-editor-area" id="ctm-tpl-editor-mount" data-placeholder="${placeholder}"></div>
      </div>
    `;
  }

  renderFormatSidebar(t) {
    const format = t.format || 'word';
    const tips = {
      word: '使用工具栏的「段落样式」切换标题 1/2/3 来组织章节,标题下填写该章节的写作引导或示例内容。',
      table: '点击工具栏「插入表格」按钮创建表格,可拖动列宽、合并单元格、增删行列。',
      email: '在左侧填写主题/称呼/结尾,正文中可使用 {{变量名}} 占位符,使用时自动替换。',
      list: '使用工具栏「待办列表」创建可勾选的清单项,适合任务/检查清单模板。',
      steps: '使用标题 2/3 划分步骤,标题下填写步骤说明,适合流程/SOP 模板。',
    };
    const tip = tips[format] || tips.word;

    let extra = '';
    if (format === 'email') {
      extra = `
        <div class="ctm-fusion-field">
          <label class="ctm-fusion-field-label">快捷插入变量</label>
          <div class="ctm-fusion-quick-tags">
            ${['{{customer}}', '{{date}}', '{{topic}}', '{{sender}}', '{{company}}']
              .map((tag) => `<button class="ctm-fusion-quick-tag" data-insert-var="${tag}">${tag}</button>`)
              .join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="ctm-fusion-sidebar-section">
        <div class="ctm-fusion-sidebar-title">
          <i class="fa-solid fa-lightbulb"></i> 编写提示
        </div>
        <div class="ctm-fusion-sidebar-body">
          <div class="ctm-fusion-field">
            <p class="ctm-fusion-field-tip">${tip}</p>
          </div>
          ${extra}
        </div>
      </div>
    `;
  }

  renderWordCanvas(t) {
    const sections = t.content?.sections || [];
    if (sections.length === 0) {
      return this.renderEmptyCanvas('word');
    }
    return `
      <div class="ctm-fusion-doc">
        ${this.renderWordToolbar()}
        <div class="ctm-fusion-doc-title">${t.name || '模板名称'}</div>
        <div class="ctm-fusion-doc-sections">
          ${sections
            .map(
              (section, index) => `
            <div class="ctm-fusion-section" data-index="${index}" data-level="${section.level}">
              <div class="ctm-fusion-section-hover-bar">
                <button class="ctm-fusion-section-btn" data-action="add-below" title="在下方添加章节">
                  <i class="fa-solid fa-plus"></i>
                </button>
                <button class="ctm-fusion-section-btn" data-action="move-up" title="上移" ${index === 0 ? 'disabled' : ''}>
                  <i class="fa-solid fa-chevron-up"></i>
                </button>
                <button class="ctm-fusion-section-btn" data-action="move-down" title="下移" ${index === sections.length - 1 ? 'disabled' : ''}>
                  <i class="fa-solid fa-chevron-down"></i>
                </button>
                <button class="ctm-fusion-section-btn" data-action="level-up" title="提升层级" ${section.level <= 1 ? 'disabled' : ''}>
                  <i class="fa-solid fa-outdent"></i>
                </button>
                <button class="ctm-fusion-section-btn" data-action="level-down" title="降低层级" ${section.level >= 3 ? 'disabled' : ''}>
                  <i class="fa-solid fa-indent"></i>
                </button>
                <button class="ctm-fusion-section-btn ctm-fusion-section-delete" data-action="delete" title="删除">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
              <div class="ctm-fusion-section-content" style="padding-left: ${(section.level - 1) * 24}px">
                <div class="ctm-fusion-section-title" contenteditable="true" data-field="title">${this.escapeHtml(section.title || '')}</div>
                <div class="ctm-fusion-section-guide" contenteditable="true" data-field="guide">${section.guide || '💡 添加写作引导语...'}</div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      <button class="ctm-fusion-add-section-btn" id="ctm-fusion-add-bottom">
        <i class="fa-solid fa-plus"></i> 添加章节
      </button>
    `;
  }

  renderWordToolbar() {
    const buttons = [
      { icon: 'fa-bold', title: '加粗', cmd: 'bold' },
      { icon: 'fa-italic', title: '斜体', cmd: 'italic' },
      { icon: 'fa-underline', title: '下划线', cmd: 'underline' },
      { icon: 'fa-strikethrough', title: '删除线', cmd: 'strikeThrough' },
      null,
      { icon: 'fa-heading', title: '标题', cmd: 'formatBlock', val: 'H2' },
      { icon: 'fa-list-ul', title: '无序列表', cmd: 'insertUnorderedList' },
      { icon: 'fa-list-ol', title: '有序列表', cmd: 'insertOrderedList' },
      null,
      { icon: 'fa-align-left', title: '左对齐', cmd: 'justifyLeft' },
      { icon: 'fa-align-center', title: '居中', cmd: 'justifyCenter' },
      { icon: 'fa-align-right', title: '右对齐', cmd: 'justifyRight' },
      null,
      {
        icon: 'fa-quote-left',
        title: '引用',
        cmd: 'formatBlock',
        val: 'BLOCKQUOTE',
      },
      { icon: 'fa-code', title: '代码', cmd: 'formatBlock', val: 'PRE' },
    ];
    let html = '<div class="ctm-fusion-toolbar">';
    let group = '<div class="ctm-fusion-toolbar-group">';
    buttons.forEach((btn) => {
      if (!btn) {
        html += group + '</div>';
        group = '<div class="ctm-fusion-toolbar-group">';
        return;
      }
      group += `<button type="button" class="ctm-fusion-toolbar-btn" data-cmd="${btn.cmd}"${btn.val ? ` data-val="${btn.val}"` : ''} title="${btn.title}"><i class="fa-solid ${btn.icon}"></i></button>`;
    });
    html += group + '</div></div>';
    return html;
  }

  renderTableCanvas(t) {
    return this.renderSheetEditor(t.content, { title: t.name || '表格模板' });
  }

  renderSheetEditor(content, options = {}) {
    const columns = content?.columns || ['列1', '列2', '列3'];
    const rows = content?.rows || [Array(columns.length).fill('')];
    const title = options.title || '表格';
    const colLetter = (i) => {
      let s = '';
      let n = i;
      do {
        s = String.fromCharCode(65 + (n % 26)) + s;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      return s;
    };
    return `
      <div class="ctm-fusion-doc ctm-fusion-doc-table">
        <div class="ctm-fusion-doc-title">${title}</div>
        <div class="ctm-sheet-editor">
          <div class="ctm-sheet-toolbar">
            <div class="ctm-sheet-toolbar-group">
              <button type="button" class="ctm-sheet-toolbar-btn" data-sheet-cmd="bold" title="加粗"><i class="fa-solid fa-bold"></i></button>
              <button type="button" class="ctm-sheet-toolbar-btn" data-sheet-cmd="italic" title="斜体"><i class="fa-solid fa-italic"></i></button>
              <button type="button" class="ctm-sheet-toolbar-btn" data-sheet-cmd="underline" title="下划线"><i class="fa-solid fa-underline"></i></button>
            </div>
            <div class="ctm-sheet-toolbar-group">
              <button type="button" class="ctm-sheet-toolbar-btn" data-sheet-cmd="justifyLeft" title="左对齐"><i class="fa-solid fa-align-left"></i></button>
              <button type="button" class="ctm-sheet-toolbar-btn" data-sheet-cmd="justifyCenter" title="居中"><i class="fa-solid fa-align-center"></i></button>
              <button type="button" class="ctm-sheet-toolbar-btn" data-sheet-cmd="justifyRight" title="右对齐"><i class="fa-solid fa-align-right"></i></button>
            </div>
            <div class="ctm-sheet-toolbar-group">
              <button type="button" class="ctm-sheet-toolbar-btn" data-sheet-action="add-row" title="插入行"><i class="fa-solid fa-plus"></i> 插入行</button>
              <button type="button" class="ctm-sheet-toolbar-btn" data-sheet-action="add-col" title="插入列"><i class="fa-solid fa-plus"></i> 插入列</button>
              <button type="button" class="ctm-sheet-toolbar-btn" data-sheet-action="del-row" title="删除行"><i class="fa-solid fa-trash-can"></i> 删除行</button>
              <button type="button" class="ctm-sheet-toolbar-btn" data-sheet-action="del-col" title="删除列"><i class="fa-solid fa-trash-can"></i> 删除列</button>
            </div>
          </div>
          <div class="ctm-sheet-wrap">
            <table class="ctm-sheet-grid" id="ctm-sheet-editor">
              <thead>
                <tr>
                  <th></th>
                  ${columns
                    .map(
                      (c, ci) => `
                    <th data-sheet-col-header="${ci}">
                      <div class="ctm-sheet-header-cell" contenteditable="true" data-sheet-header="${ci}">${this.escapeHtml(c)}</div>
                      <div style="font-size:11px;color:#94a3b8;font-weight:400;">${colLetter(ci)}</div>
                    </th>
                  `
                    )
                    .join('')}
                  <th>
                    <button type="button" class="ctm-sheet-add-btn" data-sheet-action="add-col-end" title="添加列"><i class="fa-solid fa-plus"></i></button>
                  </th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map(
                    (row, ri) => `
                  <tr data-sheet-row="${ri}">
                    <th data-sheet-row-header="${ri}">
                      <div class="ctm-sheet-header-cell">${ri + 1}</div>
                    </th>
                    ${columns
                      .map(
                        (_, ci) => `
                      <td data-sheet-row="${ri}" data-sheet-col="${ci}">
                        <div class="ctm-sheet-cell" contenteditable="true">${this.escapeHtml(row[ci] || '')}</div>
                      </td>
                    `
                      )
                      .join('')}
                    <td></td>
                  </tr>
                `
                  )
                  .join('')}
                <tr>
                  <th>
                    <button type="button" class="ctm-sheet-add-btn" data-sheet-action="add-row-end" title="添加行"><i class="fa-solid fa-plus"></i></button>
                  </th>
                  ${columns.map(() => '<td></td>').join('')}
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="ctm-sheet-menu" id="ctm-sheet-menu">
          <div class="ctm-sheet-menu-item" data-sheet-menu="add-row"><i class="fa-solid fa-plus"></i> 上方插入行</div>
          <div class="ctm-sheet-menu-item" data-sheet-menu="add-row-below"><i class="fa-solid fa-plus"></i> 下方插入行</div>
          <div class="ctm-sheet-menu-divider"></div>
          <div class="ctm-sheet-menu-item" data-sheet-menu="add-col"><i class="fa-solid fa-plus"></i> 左侧插入列</div>
          <div class="ctm-sheet-menu-item" data-sheet-menu="add-col-right"><i class="fa-solid fa-plus"></i> 右侧插入列</div>
          <div class="ctm-sheet-menu-divider"></div>
          <div class="ctm-sheet-menu-item" data-sheet-menu="del-row"><i class="fa-solid fa-trash-can"></i> 删除行</div>
          <div class="ctm-sheet-menu-item" data-sheet-menu="del-col"><i class="fa-solid fa-trash-can"></i> 删除列</div>
        </div>
      </div>
    `;
  }

  renderEmailCanvas(t) {
    const content = t.content || {};
    const body = Array.isArray(content.body) ? content.body : [''];
    return `
      <div class="ctm-fusion-doc ctm-fusion-doc-email">
        <div class="ctm-fusion-doc-title">${t.name || '邮件模板'}</div>
        <div class="ctm-email-editor-fields">
          <div class="ctm-email-field">
            <label>主题</label>
            <input type="text" id="ctm-editor-email-subject" value="${this.escapeHtml(content.subject || '')}" placeholder="输入邮件主题" />
          </div>
          <div class="ctm-email-field">
            <label>称呼</label>
            <input type="text" id="ctm-editor-email-greeting" value="${this.escapeHtml(content.greeting || '')}" placeholder="例如：尊敬的客户" />
          </div>
          <div class="ctm-email-field">
            <label>正文段落</label>
            <div class="ctm-email-body-list">
              ${body
                .map(
                  (p, i) => `
                <div class="ctm-email-body-item" data-body-idx="${i}">
                  <textarea placeholder="邮件段落...">${this.escapeHtml(p)}</textarea>
                  <button class="ctm-fusion-section-btn ctm-fusion-section-delete" data-action="del-email-para" data-idx="${i}" title="删除段落">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              `
                )
                .join('')}
            </div>
            <button class="ctm-fusion-add-section-btn" id="ctm-editor-add-para">
              <i class="fa-solid fa-plus"></i> 添加段落
            </button>
          </div>
          <div class="ctm-email-field">
            <label>结尾</label>
            <input type="text" id="ctm-editor-email-closing" value="${this.escapeHtml(content.closing || '')}" placeholder="例如：此致" />
          </div>
          <div class="ctm-email-field">
            <label>签名</label>
            <textarea id="ctm-editor-email-signature" placeholder="签名">${this.escapeHtml(content.signature || '')}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  renderListCanvas(t) {
    const items = t.content?.items || [''];
    return `
      <div class="ctm-fusion-doc ctm-fusion-doc-list">
        <div class="ctm-fusion-doc-title">${t.name || '清单模板'}</div>
        <div class="ctm-list-editor">
          ${items
            .map(
              (item, i) => `
            <div class="ctm-list-editor-item" data-list-idx="${i}">
              <div class="ctm-list-check-placeholder"><i class="fa-regular fa-square"></i></div>
              <div class="ctm-list-text" contenteditable="true">${this.escapeHtml(typeof item === 'string' ? item : item.text || '')}</div>
              <button class="ctm-fusion-section-btn ctm-fusion-section-delete" data-action="del-list-item" data-idx="${i}" title="删除">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          `
            )
            .join('')}
        </div>
        <button class="ctm-fusion-add-section-btn" id="ctm-editor-add-list">
          <i class="fa-solid fa-plus"></i> 添加清单项
        </button>
      </div>
    `;
  }

  renderStepsCanvas(t) {
    const steps = t.content?.steps || [{ title: '', detail: '' }];
    return `
      <div class="ctm-fusion-doc ctm-fusion-doc-steps">
        <div class="ctm-fusion-doc-title">${t.name || '流程模板'}</div>
        <div class="ctm-steps-editor">
          ${steps
            .map(
              (step, i) => `
            <div class="ctm-step-editor-item" data-step-idx="${i}">
              <div class="ctm-step-editor-num">${i + 1}</div>
              <div class="ctm-step-editor-body">
                <div class="ctm-step-editor-title" contenteditable="true" placeholder="步骤标题">${this.escapeHtml(typeof step === 'string' ? step : step.title || '')}</div>
                <div class="ctm-step-editor-detail" contenteditable="true" placeholder="步骤说明">${this.escapeHtml(typeof step === 'string' ? '' : step.detail || '')}</div>
              </div>
              <button class="ctm-fusion-section-btn ctm-fusion-section-delete" data-action="del-step" data-idx="${i}" title="删除">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          `
            )
            .join('')}
        </div>
        <button class="ctm-fusion-add-section-btn" id="ctm-editor-add-step">
          <i class="fa-solid fa-plus"></i> 添加步骤
        </button>
      </div>
    `;
  }

  renderEmptyCanvas(format) {
    const hints = {
      word: {
        icon: 'fa-file-lines',
        title: '暂无章节',
        desc: '点击右侧「添加章节」开始创建模板结构',
      },
      table: {
        icon: 'fa-table-cells',
        title: '暂无表格',
        desc: '在右侧编辑列标题和数据行',
      },
      email: {
        icon: 'fa-envelope',
        title: '暂无邮件内容',
        desc: '在右侧填写邮件主题、称呼和正文',
      },
      list: {
        icon: 'fa-list-check',
        title: '暂无清单项',
        desc: '在右侧添加清单项目',
      },
      steps: {
        icon: 'fa-list-ol',
        title: '暂无步骤',
        desc: '在右侧添加流程步骤',
      },
    };
    const hint = hints[format] || hints.word;
    return `
      <div class="ctm-fusion-doc">
        <div class="ctm-fusion-empty">
          <i class="fa-regular ${hint.icon}"></i>
          <div class="ctm-fusion-empty-title">${hint.title}</div>
          <div class="ctm-fusion-empty-desc">${hint.desc}</div>
        </div>
      </div>
    `;
  }

  renderWordSidebar(t) {
    const sections = t.content?.sections || [];
    return `
      <div class="ctm-fusion-sidebar-section">
        <div class="ctm-fusion-sidebar-title">
          <i class="fa-solid fa-list"></i> 章节大纲
          <button class="ctm-fusion-add-btn" id="ctm-fusion-add-sidebar">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <div class="ctm-fusion-outline" id="ctm-fusion-outline">
          ${
            sections.length === 0
              ? `
            <div class="ctm-fusion-outline-empty">暂无章节</div>
          `
              : sections
                  .map(
                    (section, index) => `
            <div class="ctm-fusion-outline-item" data-outline-index="${index}" style="padding-left: ${(section.level - 1) * 12 + 8}px">
              <i class="fa-solid fa-hashtag ctm-fusion-outline-icon"></i>
              <span class="ctm-fusion-outline-text">${section.title || '未命名章节'}</span>
            </div>
          `
                  )
                  .join('')
          }
        </div>
      </div>
    `;
  }

  renderTableSidebar(t) {
    const columns = t.content?.columns || ['列1', '列2', '列3'];
    return `
      <div class="ctm-fusion-sidebar-section">
        <div class="ctm-fusion-sidebar-title">
          <i class="fa-solid fa-table-cells"></i> 表格结构
        </div>
        <div class="ctm-fusion-sidebar-body">
          <div class="ctm-fusion-field">
            <label class="ctm-fusion-field-label">列标题（每行一个）</label>
            <textarea class="ctm-fusion-field-textarea" id="ctm-editor-table-columns" rows="6" placeholder="列1\n列2\n列3">${columns.map((c) => this.escapeHtml(c)).join('\n')}</textarea>
          </div>
          <div class="ctm-fusion-field">
            <label class="ctm-fusion-field-label">提示</label>
            <p class="ctm-fusion-field-tip">修改列标题后点击保存即可生效；数据行请在左侧画布中编辑。</p>
          </div>
        </div>
      </div>
    `;
  }

  renderEmailSidebar(t) {
    return `
      <div class="ctm-fusion-sidebar-section">
        <div class="ctm-fusion-sidebar-title">
          <i class="fa-solid fa-envelope"></i> 邮件结构
        </div>
        <div class="ctm-fusion-sidebar-body">
          <div class="ctm-fusion-field">
            <label class="ctm-fusion-field-label">可用变量</label>
            <p class="ctm-fusion-field-tip">使用 {{变量名}} 可在使用时替换为实际内容，例如 {{customer}}、{{date}}。</p>
          </div>
          <div class="ctm-fusion-field">
            <label class="ctm-fusion-field-label">快捷插入</label>
            <div class="ctm-fusion-quick-tags">
              ${[
                '{{customer}}',
                '{{date}}',
                '{{topic}}',
                '{{sender}}',
                '{{company}}',
              ]
                .map(
                  (tag) => `
                <button class="ctm-fusion-quick-tag" data-insert="${tag}">${tag}</button>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderListSidebar(t) {
    const items = t.content?.items || [''];
    return `
      <div class="ctm-fusion-sidebar-section">
        <div class="ctm-fusion-sidebar-title">
          <i class="fa-solid fa-list-check"></i> 清单项
          <button class="ctm-fusion-add-btn" id="ctm-fusion-add-list-sidebar">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <div class="ctm-fusion-sidebar-body">
          <div class="ctm-fusion-field">
            <label class="ctm-fusion-field-label">清单内容（每行一项）</label>
            <textarea class="ctm-fusion-field-textarea" id="ctm-editor-list-items" rows="10" placeholder="任务一\n任务二\n任务三">${items.map((item) => this.escapeHtml(typeof item === 'string' ? item : item.text || '')).join('\n')}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  renderStepsSidebar(t) {
    const steps = t.content?.steps || [{ title: '', detail: '' }];
    return `
      <div class="ctm-fusion-sidebar-section">
        <div class="ctm-fusion-sidebar-title">
          <i class="fa-solid fa-list-ol"></i> 流程步骤
          <button class="ctm-fusion-add-btn" id="ctm-fusion-add-step-sidebar">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <div class="ctm-fusion-sidebar-body">
          <div class="ctm-fusion-field">
            <label class="ctm-fusion-field-label">步骤标题（每行一个）</label>
            <textarea class="ctm-fusion-field-textarea" id="ctm-editor-step-titles" rows="8" placeholder="步骤一\n步骤二\n步骤三">${steps.map((s) => this.escapeHtml(typeof s === 'string' ? s : s.title || '')).join('\n')}</textarea>
          </div>
          <div class="ctm-fusion-field">
            <label class="ctm-fusion-field-label">提示</label>
            <p class="ctm-fusion-field-tip">步骤说明请在左侧画布中编辑。</p>
          </div>
        </div>
      </div>
    `;
  }

  renderAIModal() {
    const hasDraft =
      this.aiDraftTemplate?.content?.sections?.length > 0 &&
      this.aiDraftTemplate?.name;
    return `
      <div class="ctm-modal-overlay" id="ctm-ai-modal">
        <div class="ctm-modal ctm-ai-modal" onclick="event.stopPropagation()">
          <div class="ctm-modal-header">
            <h2 class="ctm-modal-title">
              <i class="fa-solid fa-wand-magic-sparkles" style="color:#8b5cf6"></i> AI 创建模板
            </h2>
            <button class="ctm-modal-close" data-action="close-ai">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="ctm-ai-chat" id="ctm-ai-chat">
            ${this.aiChatMessages
              .map(
                (msg) => `
              <div class="ctm-ai-msg ctm-ai-msg-${msg.role}">
                ${msg.role === 'ai' ? '<div class="ctm-ai-avatar"><i class="fa-solid fa-robot"></i></div>' : ''}
                <div class="ctm-ai-bubble">${msg.content}</div>
              </div>
            `
              )
              .join('')}
          </div>
          ${
            hasDraft
              ? `
            <div class="ctm-ai-actions">
              <div class="ctm-ai-draft-info">
                <i class="fa-solid fa-file-lines" style="color:#8b5cf6"></i>
                <span>已生成：${this.aiDraftTemplate.name}</span>
                <span class="ctm-ai-draft-count">${this.aiDraftTemplate.content.sections.length} 个章节</span>
              </div>
              <div class="ctm-ai-draft-btns">
                <button class="btn btn-secondary" id="ctm-ai-edit">
                  <i class="fa-regular fa-pen-to-square"></i> 编辑调整
                </button>
                <button class="btn btn-primary" id="ctm-ai-save">
                  <i class="fa-solid fa-check"></i> 保存模板
                </button>
              </div>
            </div>
          `
              : ''
          }
          <div class="ctm-ai-input-area">
            <textarea class="ctm-ai-input" id="ctm-ai-input" placeholder="描述你想创建的模板..."></textarea>
            <button class="btn btn-primary ctm-ai-send-btn" id="ctm-ai-send">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const container = this.container;

    const backBtn = container.querySelector('[data-action="ctm-back"]');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.onBack) this.onBack();
      });
    }

    container.querySelectorAll('.ctm-lib-cat-item').forEach((el) => {
      el.addEventListener('click', () => {
        this.currentCategory = el.dataset.category;
        this.refreshList();
      });
    });

    container.querySelectorAll('.ctm-lib-format-tab').forEach((el) => {
      el.addEventListener('click', () => {
        this.currentFormat = el.dataset.format;
        this.refreshList();
      });
    });

    container.querySelectorAll('.ctm-view-btn').forEach((el) => {
      el.addEventListener('click', () => {
        this.viewMode = el.dataset.view;
        this.refreshList();
      });
    });

    container.querySelectorAll('.ctm-lib-source-tab').forEach((el) => {
      el.addEventListener('click', () => {
        this.currentSource = el.dataset.source;
        this.refreshList();
      });
    });

    const searchInput = container.querySelector('.ctm-lib-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchKeyword = e.target.value;
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
          this.refreshList();
        }, 300);
      });
    }

    const newBtn = container.querySelector('#ctm-lib-new');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        this.showNewModal = true;
        this.refreshList();
      });
    }

    container.querySelectorAll('[data-action="close-new"]').forEach((el) => {
      el.addEventListener('click', () => {
        this.showNewModal = false;
        this.refreshList();
      });
    });

    container.querySelectorAll('.ctm-create-option').forEach((el) => {
      el.addEventListener('click', () => {
        const type = el.dataset.create;
        this.showNewModal = false;
        if (type === 'ai') {
          this.openAICreator();
        } else if (type === 'blank') {
          this.openBlankEditor();
        } else if (type === 'upload') {
          this.showUploadModal = true;
          this.uploadFile = null;
          this.refreshList();
        } else if (type === 'extract') {
          this.showExtractModal = true;
          this.extractText = '';
          this.refreshList();
        } else {
          this.refreshList();
        }
      });
    });

    container.querySelectorAll('.ctm-lib-section-more').forEach((el) => {
      el.addEventListener('click', () => {
        const cat = el.dataset.category;
        if (cat) {
          this.currentCategory = cat;
          this.refreshList();
        }
      });
    });

    container
      .querySelectorAll('.ctm-template-card, .ctm-featured-card')
      .forEach((card) => {
        const id = card.dataset.id;
        card.addEventListener('click', (e) => {
          const actionEl = e.target.closest('[data-action]');
          if (actionEl) {
            const action = actionEl.dataset.action;
            const actionId = actionEl.dataset.id || id;
            this.handleCardAction(action, actionId);
            e.stopPropagation();
          } else {
            this.openPreview(id);
          }
        });
      });

    container
      .querySelectorAll('[data-action="close-preview"]')
      .forEach((el) => {
        el.addEventListener('click', () => {
          this.previewTemplate = null;
          this.refreshList();
        });
      });

    container
      .querySelectorAll(
        '[data-action="use-preview"], [data-action="edit-preview"], [data-action="export-preview"], [data-action="clone-preview"], [data-action="delete-preview"]'
      )
      .forEach((el) => {
        el.addEventListener('click', () => {
          const action = el.dataset.action.replace('-preview', '');
          this.handleCardAction(action, this.previewTemplate?.id);
        });
      });

    container.querySelectorAll('[data-action="close-editor"]').forEach((el) => {
      el.addEventListener('click', () => {
        this.editorTemplate = null;
        this.editorMode = 'create';
        this.refreshList();
      });
    });

    const saveBtn = container.querySelector('[data-action="save-template"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveEditorTemplate();
      });
    }

    const previewBtn = container.querySelector(
      '[data-action="preview-editor"]'
    );
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        this.previewTemplate = JSON.parse(JSON.stringify(this.editorTemplate));
        this.refreshList();
      });
    }

    const formatSelect = container.querySelector('#ctm-editor-format');
    if (formatSelect) {
      formatSelect.addEventListener('change', (e) => {
        const newFormat = e.target.value;
        this.migrateTemplateFormat(newFormat);
      });
    }

    // 邮件变量快捷插入:点击后在模板编辑器光标处插入 {{变量名}}
    container.querySelectorAll('[data-insert-var]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tag = btn.dataset.insertVar;
        if (this.tplRichEditor) {
          this.tplRichEditor.setFocus();
          this.tplRichEditor
            .getInstance()
            .chain()
            .focus()
            .insertContent(tag)
            .run();
        }
      });
    });

    const addSectionBtn = container.querySelector(
      '#ctm-fusion-add-bottom, #ctm-fusion-add-sidebar'
    );
    if (addSectionBtn) {
      addSectionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.addSection();
      });
    }

    container.querySelectorAll('.ctm-fusion-section').forEach((section) => {
      const index = parseInt(section.dataset.index);

      section.querySelectorAll('[data-field]').forEach((el) => {
        el.addEventListener('blur', () => {
          const field = el.dataset.field;
          let value;
          if (field === 'guide') {
            const text = el.innerText.trim();
            if (text === '💡 添加写作引导语...' || text === '') {
              value = '';
              el.innerHTML = '💡 添加写作引导语...';
            } else {
              value = el.innerHTML.trim();
            }
          } else {
            value = el.innerText.trim();
          }
          this.updateSection(index, field, value);
          this.updateOutline();
        });

        if (el.dataset.field === 'guide') {
          el.addEventListener('focus', () => {
            if (el.innerText.trim() === '💡 添加写作引导语...') {
              el.innerHTML = '';
            }
          });
        }
      });

      section
        .querySelectorAll('.ctm-fusion-section-btn[data-action]')
        .forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (btn.disabled) return;
            const action = btn.dataset.action;
            switch (action) {
              case 'add-below':
                this.addSection(index + 1);
                break;
              case 'move-up':
                this.moveSection(index, -1);
                break;
              case 'move-down':
                this.moveSection(index, 1);
                break;
              case 'level-up':
                this.changeSectionLevel(index, -1);
                break;
              case 'level-down':
                this.changeSectionLevel(index, 1);
                break;
              case 'delete':
                this.deleteSection(index);
                break;
            }
          });
        });
    });

    // 富文本工具栏
    container.querySelectorAll('.ctm-fusion-toolbar-btn').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const active = document.activeElement;
        if (!active || !active.isContentEditable) return;
        active.focus();
        const cmd = btn.dataset.cmd;
        const val = btn.dataset.val || null;
        document.execCommand(cmd, false, val);
        active.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    container.querySelectorAll('.ctm-fusion-outline-item').forEach((item) => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.outlineIndex);
        const sectionEl = container.querySelector(
          `.ctm-fusion-section[data-index="${index}"]`
        );
        if (sectionEl) {
          sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sectionEl.classList.add('ctm-fusion-section-highlight');
          setTimeout(
            () => sectionEl.classList.remove('ctm-fusion-section-highlight'),
            1500
          );
        }
      });
    });

    // 表格编辑器事件
    if (this.editorTemplate?.format === 'table') {
      const sheet = container.querySelector('#ctm-sheet-editor');
      const menu = container.querySelector('#ctm-sheet-menu');
      let menuContext = null;

      const hideSheetMenu = () => {
        if (menu) menu.style.display = 'none';
        menuContext = null;
      };

      const getSheetFocus = () => {
        const active = document.activeElement;
        if (!active || !sheet?.contains(active)) return null;
        const td = active.closest('td[data-sheet-row]');
        if (td) {
          return {
            row: parseInt(td.dataset.sheetRow),
            col: parseInt(td.dataset.sheetCol),
          };
        }
        const th = active.closest('th[data-sheet-col-header]');
        if (th) {
          return { row: -1, col: parseInt(th.dataset.sheetColHeader) };
        }
        const rh = active.closest('th[data-sheet-row-header]');
        if (rh) {
          return { row: parseInt(rh.dataset.sheetRowHeader), col: -1 };
        }
        return null;
      };

      container
        .querySelectorAll('#ctm-sheet-editor .ctm-sheet-cell')
        .forEach((cell) => {
          cell.addEventListener('blur', () => {
            const td = cell.closest('td');
            const ri = parseInt(td.dataset.sheetRow);
            const ci = parseInt(td.dataset.sheetCol);
            this.editorTemplate.content.rows[ri][ci] = cell.innerText.trim();
          });
          cell.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab' && e.key !== 'Enter') return;
            e.preventDefault();
            const td = cell.closest('td');
            const ri = parseInt(td.dataset.sheetRow);
            const ci = parseInt(td.dataset.sheetCol);
            const cols = this.editorTemplate.content.columns.length;
            const rows = this.editorTemplate.content.rows.length;
            let ni = ri;
            let nj = ci;
            if (e.key === 'Tab') {
              if (e.shiftKey) {
                nj = ci - 1;
                if (nj < 0) {
                  ni = ri - 1;
                  nj = cols - 1;
                }
              } else {
                nj = ci + 1;
                if (nj >= cols) {
                  ni = ri + 1;
                  nj = 0;
                }
              }
            } else if (e.key === 'Enter') {
              ni = ri + 1;
            }
            if (ni >= rows) {
              this.addTableRow();
              setTimeout(() => this.focusSheetCell(ni, nj), 0);
            } else if (ni >= 0 && nj >= 0) {
              this.focusSheetCell(ni, nj);
            }
          });
        });

      container
        .querySelectorAll('#ctm-sheet-editor [data-sheet-header]')
        .forEach((header) => {
          header.addEventListener('blur', () => {
            const ci = parseInt(header.dataset.sheetHeader);
            this.editorTemplate.content.columns[ci] = header.innerText.trim();
          });
        });

      container
        .querySelectorAll('.ctm-sheet-toolbar-btn[data-sheet-action]')
        .forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const focus = getSheetFocus();
            const action = btn.dataset.sheetAction;
            const cols = this.editorTemplate.content.columns.length;
            const rows = this.editorTemplate.content.rows.length;
            switch (action) {
              case 'add-row':
                this.insertTableRow(focus && focus.row >= 0 ? focus.row : rows);
                break;
              case 'add-col':
                this.insertTableColumn(
                  focus && focus.col >= 0 ? focus.col : cols
                );
                break;
              case 'del-row':
                this.deleteTableRow(
                  focus && focus.row >= 0 ? focus.row : rows - 1
                );
                break;
              case 'del-col':
                this.deleteTableColumn(
                  focus && focus.col >= 0 ? focus.col : cols - 1
                );
                break;
              case 'add-row-end':
                this.addTableRow();
                break;
              case 'add-col-end':
                this.addTableColumn();
                break;
            }
          });
        });

      container
        .querySelectorAll('.ctm-sheet-toolbar-btn[data-sheet-cmd]')
        .forEach((btn) => {
          btn.addEventListener('mousedown', (e) => e.preventDefault());
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const active = document.activeElement;
            if (!active || !sheet?.contains(active)) return;
            active.focus();
            document.execCommand(btn.dataset.sheetCmd, false, null);
          });
        });

      container
        .querySelectorAll('.ctm-sheet-add-btn[data-sheet-action]')
        .forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const action = btn.dataset.sheetAction;
            if (action === 'add-row-end') this.addTableRow();
            if (action === 'add-col-end') this.addTableColumn();
          });
        });

      const openMenu = (x, y, context) => {
        if (!menu) return;
        menuContext = context;
        menu.style.display = 'block';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
      };

      container.querySelectorAll('#ctm-sheet-editor td').forEach((td) => {
        td.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY, {
            row: parseInt(td.dataset.sheetRow),
            col: parseInt(td.dataset.sheetCol),
          });
        });
      });
      container
        .querySelectorAll('#ctm-sheet-editor th[data-sheet-col-header]')
        .forEach((th) => {
          th.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openMenu(e.clientX, e.clientY, {
              row: -1,
              col: parseInt(th.dataset.sheetColHeader),
            });
          });
        });
      container
        .querySelectorAll('#ctm-sheet-editor th[data-sheet-row-header]')
        .forEach((th) => {
          th.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openMenu(e.clientX, e.clientY, {
              row: parseInt(th.dataset.sheetRowHeader),
              col: -1,
            });
          });
        });

      container.querySelectorAll('.ctm-sheet-menu-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!menuContext) return;
          const action = item.dataset.sheetMenu;
          switch (action) {
            case 'add-row':
              this.insertTableRow(menuContext.row);
              break;
            case 'add-row-below':
              this.insertTableRow(menuContext.row + 1);
              break;
            case 'add-col':
              this.insertTableColumn(menuContext.col);
              break;
            case 'add-col-right':
              this.insertTableColumn(menuContext.col + 1);
              break;
            case 'del-row':
              if (menuContext.row >= 0) this.deleteTableRow(menuContext.row);
              break;
            case 'del-col':
              if (menuContext.col >= 0) this.deleteTableColumn(menuContext.col);
              break;
          }
          hideSheetMenu();
        });
      });

      container.addEventListener('click', (e) => {
        if (!e.target.closest('#ctm-sheet-menu')) hideSheetMenu();
      });
    }

    // 邮件编辑器事件
    if (this.editorTemplate?.format === 'email') {
      container
        .querySelector('#ctm-editor-email-subject')
        ?.addEventListener('input', (e) => {
          this.editorTemplate.content.subject = e.target.value;
        });
      container
        .querySelector('#ctm-editor-email-greeting')
        ?.addEventListener('input', (e) => {
          this.editorTemplate.content.greeting = e.target.value;
        });
      container
        .querySelector('#ctm-editor-email-closing')
        ?.addEventListener('input', (e) => {
          this.editorTemplate.content.closing = e.target.value;
        });
      container
        .querySelector('#ctm-editor-email-signature')
        ?.addEventListener('input', (e) => {
          this.editorTemplate.content.signature = e.target.value;
        });
      container
        .querySelectorAll('.ctm-email-body-item textarea')
        .forEach((ta) => {
          ta.addEventListener('input', () => {
            const idx = parseInt(ta.parentElement.dataset.bodyIdx);
            this.editorTemplate.content.body[idx] = ta.value;
          });
        });
      container
        .querySelector('#ctm-editor-add-para')
        ?.addEventListener('click', (e) => {
          e.preventDefault();
          this.addEmailParagraph();
        });
      container
        .querySelectorAll('[data-action="del-email-para"]')
        .forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.deleteEmailParagraph(parseInt(btn.dataset.idx));
          });
        });
      container.querySelectorAll('[data-insert]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.insertEmailVariable(btn.dataset.insert);
        });
      });
    }

    // 清单编辑器事件
    if (this.editorTemplate?.format === 'list') {
      container
        .querySelectorAll('.ctm-list-editor-item .ctm-list-text')
        .forEach((el) => {
          el.addEventListener('blur', () => {
            const idx = parseInt(el.parentElement.dataset.listIdx);
            this.editorTemplate.content.items[idx] = el.innerText.trim();
          });
        });
      container
        .querySelector('#ctm-editor-add-list')
        ?.addEventListener('click', (e) => {
          e.preventDefault();
          this.addListItem();
        });
      container
        .querySelector('#ctm-fusion-add-list-sidebar')
        ?.addEventListener('click', (e) => {
          e.preventDefault();
          this.addListItem();
        });
      container
        .querySelector('#ctm-editor-list-items')
        ?.addEventListener('input', (e) => {
          const items = e.target.value
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
          this.editorTemplate.content.items = items;
          this.refreshList();
        });
      container
        .querySelectorAll('[data-action="del-list-item"]')
        .forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.deleteListItem(parseInt(btn.dataset.idx));
          });
        });
    }

    // 流程编辑器事件
    if (this.editorTemplate?.format === 'steps') {
      container.querySelectorAll('.ctm-step-editor-item').forEach((item) => {
        const idx = parseInt(item.dataset.stepIdx);
        const titleEl = item.querySelector('.ctm-step-editor-title');
        const detailEl = item.querySelector('.ctm-step-editor-detail');
        titleEl?.addEventListener('blur', () => {
          this.editorTemplate.content.steps[idx].title =
            titleEl.innerText.trim();
        });
        detailEl?.addEventListener('blur', () => {
          this.editorTemplate.content.steps[idx].detail =
            detailEl.innerText.trim();
        });
      });
      container
        .querySelector('#ctm-editor-add-step')
        ?.addEventListener('click', (e) => {
          e.preventDefault();
          this.addStep();
        });
      container
        .querySelector('#ctm-fusion-add-step-sidebar')
        ?.addEventListener('click', (e) => {
          e.preventDefault();
          this.addStep();
        });
      container
        .querySelector('#ctm-editor-step-titles')
        ?.addEventListener('input', (e) => {
          const titles = e.target.value
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
          this.syncStepTitles(titles);
        });
      container.querySelectorAll('[data-action="del-step"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.deleteStep(parseInt(btn.dataset.idx));
        });
      });
    }

    // 上传弹窗事件
    if (this.showUploadModal) {
      container
        .querySelectorAll('[data-action="close-upload"]')
        .forEach((el) => {
          el.addEventListener('click', () => {
            this.showUploadModal = false;
            this.uploadFile = null;
            this.refreshList();
          });
        });
      const uploadInput = container.querySelector('#ctm-upload-input');
      const uploadZone = container.querySelector('#ctm-upload-zone');
      if (uploadInput) {
        uploadInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) this.handleUploadFile(file);
        });
      }
      if (uploadZone) {
        uploadZone.addEventListener('click', (e) => {
          if (e.target !== uploadInput) uploadInput?.click();
        });
        uploadZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => {
          uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadZone.classList.remove('dragover');
          const file = e.dataTransfer.files[0];
          if (file) this.handleUploadFile(file);
        });
      }
      container
        .querySelector('[data-action="start-upload"]')
        ?.addEventListener('click', () => {
          this.startUploadTemplate();
        });
    }

    // 提取弹窗事件
    if (this.showExtractModal) {
      container
        .querySelectorAll('[data-action="close-extract"]')
        .forEach((el) => {
          el.addEventListener('click', () => {
            this.showExtractModal = false;
            this.extractText = '';
            this.refreshList();
          });
        });
      const extractText = container.querySelector('#ctm-extract-text');
      if (extractText) {
        extractText.addEventListener('input', (e) => {
          this.extractText = e.target.value;
          const btn = container.querySelector('[data-action="start-extract"]');
          if (btn)
            btn.disabled = !this.extractText.trim() || this.extractParsing;
        });
      }
      container
        .querySelector('[data-action="start-extract"]')
        ?.addEventListener('click', () => {
          this.startExtractTemplate();
        });
    }

    container.querySelectorAll('[data-action="close-ai"]').forEach((el) => {
      el.addEventListener('click', () => {
        this.aiDraftTemplate = null;
        this.aiChatMessages = [];
        this.refreshList();
      });
    });

    const aiSendBtn = container.querySelector('#ctm-ai-send');
    if (aiSendBtn) {
      aiSendBtn.addEventListener('click', () => {
        this.sendAIMessage();
      });
    }

    const aiInput = container.querySelector('#ctm-ai-input');
    if (aiInput) {
      aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendAIMessage();
        }
      });
    }

    const aiSaveBtn = container.querySelector('#ctm-ai-save');
    if (aiSaveBtn) {
      aiSaveBtn.addEventListener('click', () => {
        this.saveAITemplate();
      });
    }

    const aiEditBtn = container.querySelector('#ctm-ai-edit');
    if (aiEditBtn) {
      aiEditBtn.addEventListener('click', () => {
        this.editAIDraft();
      });
    }

    // 内容文档编辑器事件
    if (this.contentDoc) {
      container
        .querySelector('[data-action="close-doc-editor"]')
        ?.addEventListener('click', () => {
          this.closeContentEditor();
        });
      container
        .querySelector('[data-action="save-doc"]')
        ?.addEventListener('click', () => {
          this.saveContentDocument();
        });
      container
        .querySelector('[data-action="export-doc"]')
        ?.addEventListener('click', () => {
          this.exportContentDocument();
        });
      container
        .querySelector('[data-action="share-doc"]')
        ?.addEventListener('click', () => {
          this.shareContentDocument();
        });

      container
        .querySelectorAll(
          '.ctm-doc-editor-body input, .ctm-doc-editor-body textarea'
        )
        .forEach((el) => {
          el.addEventListener('input', () => this.syncContentDocFromDOM());
        });
      container
        .querySelectorAll('.ctm-doc-editor-body [type="checkbox"]')
        .forEach((el) => {
          el.addEventListener('change', () => this.syncContentDocFromDOM());
        });

      const docEditorEl = container.querySelector('.ctm-doc-editor');
      if (docEditorEl) {
        docEditorEl.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          const action = btn.dataset.action;
          if (
            [
              'add-row',
              'del-row',
              'add-list-item',
              'del-list-item',
              'add-step',
              'del-step',
            ].includes(action)
          ) {
            e.preventDefault();
            e.stopPropagation();
            this.handleDocStructureAction(action, btn);
          }
        });
      }
    }

    const overlay = container.querySelector('.ctm-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        if (this.showNewModal) this.showNewModal = false;
        if (this.showUploadModal) {
          this.showUploadModal = false;
          this.uploadFile = null;
        }
        if (this.showExtractModal) {
          this.showExtractModal = false;
          this.extractText = '';
        }
        if (this.previewTemplate) this.previewTemplate = null;
        if (this.editorTemplate) {
          this.editorTemplate = null;
          this.editorMode = 'create';
        }
        if (this.aiDraftTemplate) {
          this.aiDraftTemplate = null;
          this.aiChatMessages = [];
        }
        this.refreshList();
      });
    }
  }

  handleCardAction(action, id) {
    const template = this.templates.find((t) => t.id === id);
    if (!template) return;

    switch (action) {
      case 'preview':
        this.openPreview(id);
        break;
      case 'use':
        this.useTemplate(template);
        break;
      case 'edit':
        this.openEditor(template, 'edit');
        break;
      case 'export':
        this.exportTemplate(template);
        break;
      case 'clone':
        this.cloneTemplate(template);
        break;
      case 'delete':
        this.deleteTemplate(id);
        break;
    }
  }

  /**
   * 基于模板创建个人副本（二次创作）
   * @param {Object} template 原模板
   * @param {boolean} rename 是否重命名为「xxx 副本」
   * @returns {Object|null} 创建的副本
   */
  createDerivative(template, rename = true) {
    if (!template) return null;
    const derivative = JSON.parse(JSON.stringify(template));
    derivative.id = 'template_' + Date.now();
    derivative.name = rename ? `${template.name} 副本` : template.name;
    derivative.level = 'personal';
    derivative.usedCount = 0;
    derivative.createdAt = new Date().toISOString().split('T')[0];
    derivative.sourceId = template.id;
    derivative.sourceName = template.name;
    this.templates.unshift(derivative);
    this.saveTemplates();
    return derivative;
  }

  useTemplate(template) {
    if (!template) return;
    // 使用模板时不编辑模板本身，而是进入一个独立的内容编辑页，
    // 用户可以在这里基于模板结构填写自己的文档内容。
    this.previewTemplate = null;
    this.contentDoc = this.buildDocument(template);
    incrementTemplateUsage(template.id);
    this.render();
    this.bindEvents();
  }

  buildDocument(template) {
    const base = {
      id: null,
      title: `基于《${template.name || '未命名模板'}》的文档`,
      templateId: template.id,
      templateName: template.name || '未命名模板',
      format: template.format || 'word',
      data: {},
    };

    switch (base.format) {
      case 'word': {
        const sections = (template.content?.sections || []).map((s) => ({
          title: s.title || '',
          guide: s.guide || '',
          text: '',
        }));
        if (sections.length === 0) {
          sections.push({ title: '第一章', guide: '', text: '' });
        }
        base.data = {
          meta: { 主题: '', 时间: '', 部门: '', 撰稿人: '' },
          sections,
        };
        break;
      }
      case 'table': {
        const columns = template.content?.columns || ['列1', '列2', '列3'];
        const rows = (
          template.content?.rows || [Array(columns.length).fill('')]
        ).map((r) =>
          Array.isArray(r) ? [...r] : columns.map((c) => r[c] || '')
        );
        base.data = { columns, rows };
        break;
      }
      case 'email': {
        const body = Array.isArray(template.content?.body)
          ? template.content.body.map(() => '')
          : [''];
        base.data = {
          subject: template.content?.subject || '',
          greeting: template.content?.greeting || '',
          body,
          closing: template.content?.closing || '',
          signature: template.content?.signature || '',
        };
        break;
      }
      case 'list': {
        const items = (template.content?.items || ['']).map((text) => ({
          text: typeof text === 'string' ? text : text.text || '',
          checked: false,
        }));
        base.data = { items };
        break;
      }
      case 'steps': {
        const steps = (template.content?.steps || ['']).map((s) => ({
          title: typeof s === 'string' ? s : s.title || '',
          detail: '',
        }));
        base.data = { steps };
        break;
      }
      default:
        base.data = { sections: [{ title: '内容', guide: '', text: '' }] };
    }

    return base;
  }

  closeContentEditor() {
    this.contentDoc = null;
    this.initialDocumentId = null;
    if (this.onClose) {
      this.onClose();
      return;
    }
    this.render();
    this.bindEvents();
  }

  saveContentDocument() {
    if (!this.contentDoc) return;
    this.syncContentDocFromDOM();
    const saved = saveMyDocument({ ...this.contentDoc });
    this.contentDoc.id = saved.id;
    this.showToast('文档已保存到我的文档');
  }

  showToast(message) {
    try {
      document.querySelectorAll('.ctm-toast').forEach((el) => el.remove());
      const toast = document.createElement('div');
      toast.className = 'ctm-toast show';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
      }, 3000);
    } catch (err) {
      console.error('[showToast] error:', err);
    }
  }

  syncContentDocFromDOM() {
    if (!this.contentDoc) return;
    const container = this.container;

    // 标题
    const titleInput = container.querySelector('[data-field="doc-title"]');
    if (titleInput) this.contentDoc.title = titleInput.value;

    // 元数据栏(word: meta; email: subject/greeting/closing)
    // 编辑器正文已通过 onUpdate 实时同步到 data,此处仅同步元数据栏输入
    const format = this.contentDoc.format;
    container.querySelectorAll('[data-field^="meta-"]').forEach((el) => {
      const key = el.dataset.field?.replace(/^meta-/, '');
      if (!key) return;
      const val = el.value;
      if (format === 'word') {
        this.contentDoc.data.meta = this.contentDoc.data.meta || {};
        this.contentDoc.data.meta[key] = val;
      } else if (format === 'email') {
        if (key === '主题') this.contentDoc.data.subject = val;
        else if (key === '称呼') this.contentDoc.data.greeting = val;
        else if (key === '结尾') this.contentDoc.data.closing = val;
      }
    });
  }

  handleDocStructureAction(action, btn) {
    if (!this.contentDoc) return;
    this.syncContentDocFromDOM();

    switch (action) {
      case 'add-row':
        this.contentDoc.data.rows.push(
          Array(this.contentDoc.data.columns.length).fill('')
        );
        break;
      case 'del-row': {
        const ri = parseInt(btn.dataset.rowIdx);
        this.contentDoc.data.rows.splice(ri, 1);
        if (this.contentDoc.data.rows.length === 0) {
          this.contentDoc.data.rows.push(
            Array(this.contentDoc.data.columns.length).fill('')
          );
        }
        break;
      }
      case 'add-list-item':
        this.contentDoc.data.items.push({ text: '', checked: false });
        break;
      case 'del-list-item': {
        const li = parseInt(btn.dataset.idx);
        this.contentDoc.data.items.splice(li, 1);
        if (this.contentDoc.data.items.length === 0) {
          this.contentDoc.data.items.push({ text: '', checked: false });
        }
        break;
      }
      case 'add-step':
        this.contentDoc.data.steps.push({ title: '', detail: '' });
        break;
      case 'del-step': {
        const si = parseInt(btn.dataset.idx);
        this.contentDoc.data.steps.splice(si, 1);
        if (this.contentDoc.data.steps.length === 0) {
          this.contentDoc.data.steps.push({ title: '', detail: '' });
        }
        break;
      }
    }

    this.render();
    this.bindEvents();
  }

  shareContentDocument() {
    if (!this.contentDoc) return;
    const shareText = `${this.contentDoc.title}\n基于模板：${this.contentDoc.templateName}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(
        () => {
          this.showToast('文档信息已复制到剪贴板');
        },
        () => {
          this.showToast('分享内容：' + shareText);
        }
      );
    } else {
      this.showToast('分享内容：' + shareText);
    }
  }

  exportContentDocument() {
    if (!this.contentDoc) return;
    const doc = this.contentDoc;
    let content = '';
    let filename = `${doc.title || '未命名文档'}.md`;
    let mimeType = 'text/markdown;charset=utf-8';

    if (doc.format === 'word' && doc.data.sections) {
      content = `# ${doc.title}\n\n`;
      const meta = doc.data.meta || {};
      if (Object.values(meta).some((v) => v)) {
        content += `| 字段 | 内容 |\n| --- | --- |\n`;
        Object.entries(meta).forEach(([k, v]) => {
          if (v) content += `| ${k} | ${v} |\n`;
        });
        content += '\n';
      }
      doc.data.sections.forEach((s) => {
        content += `## ${s.title}\n\n${s.text || ''}\n\n`;
      });
    } else if (doc.format === 'table' && doc.data.columns) {
      content = doc.data.columns.join(',') + '\n';
      doc.data.rows.forEach((row) => {
        content +=
          row.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',') +
          '\n';
      });
      filename = `${doc.title || '未命名文档'}.csv`;
      mimeType = 'text/csv;charset=utf-8';
    } else if (doc.format === 'email') {
      content = `主题：${doc.data.subject || ''}\n称呼：${doc.data.greeting || ''}\n\n${(doc.data.body || []).join('\n')}\n\n${doc.data.closing || ''}\n\n${doc.data.signature || ''}`;
      filename = `${doc.title || '未命名文档'}.eml`;
    } else if (doc.format === 'list') {
      content = `# ${doc.title}\n\n`;
      doc.data.items.forEach((item) => {
        content += `- [${item.checked ? 'x' : ' '}] ${item.text}\n`;
      });
    } else if (doc.format === 'steps') {
      content = `# ${doc.title}\n\n`;
      doc.data.steps.forEach((s, i) => {
        content += `${i + 1}. ${s.title}\n${s.detail ? s.detail + '\n' : ''}\n`;
      });
    } else {
      content = `# ${doc.title}\n\n`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`文档已导出：${filename}`);
  }

  cloneTemplate(template) {
    this.createDerivative(template, true);
    this.previewTemplate = null;
    this.refreshList();
  }

  deleteTemplate(id) {
    if (!id) return;
    if (!confirm('确定要删除这个模板吗？')) return;
    const idx = this.templates.findIndex((t) => t.id === id);
    if (idx >= 0) {
      this.templates.splice(idx, 1);
      this.saveTemplates();
    }
    this.previewTemplate = null;
    this.refreshList();
  }

  saveTemplates() {
    // 持久化个人模板到 localStorage（仅保存 level 为 personal 的模板）
    const personal = this.templates.filter((t) => t.level === 'personal');
    localStorage.setItem('dmtplat_content_templates', JSON.stringify(personal));
  }

  exportTemplate(template) {
    if (!template) return;
    const format = template.format || 'word';
    let content = '';
    let filename = `${template.name || '未命名模板'}.${format === 'table' ? 'csv' : format === 'email' ? 'eml' : 'md'}`;
    let mimeType = 'text/markdown;charset=utf-8';

    if (format === 'word' && template.content?.sections) {
      content = `# ${template.name}\n\n`;
      template.content.sections.forEach((s) => {
        const indent = '  '.repeat((s.level || 1) - 1);
        content += `${indent}- ${s.title}\n`;
        if (s.guide) content += `${indent}  💡 ${s.guide}\n`;
      });
    } else if (format === 'table' && template.content?.columns) {
      content = template.content.columns.join(',') + '\n';
      (template.content.rows || []).forEach((row) => {
        const values = Array.isArray(row) ? row : Object.values(row);
        content +=
          values
            .map((v) => `"${String(v || '').replace(/"/g, '""')}"`)
            .join(',') + '\n';
      });
      mimeType = 'text/csv;charset=utf-8';
    } else if (format === 'email') {
      content = `主题：${template.content?.subject || ''}\n称呼：${template.content?.greeting || ''}\n\n${template.content?.body || ''}\n\n结尾：${template.content?.closing || ''}`;
    } else if (format === 'ppt') {
      content = `# ${template.name}\n\n${(template.content?.sections || []).map((s) => `- ${s.title}`).join('\n')}`;
    } else {
      content = `# ${template.name}\n\n${template.description || ''}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  openPreview(id) {
    const template = this.templates.find((t) => t.id === id);
    if (template) {
      this.previewTemplate = template;
      this.showNewModal = false;
      this.refreshList();
    }
  }

  openEditor(template, mode = 'create') {
    this.editorTemplate = JSON.parse(JSON.stringify(template));
    this.editorMode = mode;
    this.previewTemplate = null;
    this.refreshList();
  }

  openBlankEditor() {
    const blank = {
      name: '',
      description: '',
      format: 'word',
      category: ['personal'],
      tags: [],
      level: 'personal',
      style: { tone: 'professional', length: 'medium' },
      content: {
        sections: [
          { title: '第一章', level: 1, guide: '' },
          { title: '第二章', level: 1, guide: '' },
          { title: '第三章', level: 1, guide: '' },
        ],
      },
    };
    this.openEditor(blank, 'create');
  }

  addSection(insertIndex) {
    if (!this.editorTemplate) return;
    const sections = this.editorTemplate.content?.sections || [];
    const newSection = {
      title: `第${sections.length + 1}章`,
      level: 1,
      guide: '',
    };
    if (
      insertIndex !== undefined &&
      insertIndex >= 0 &&
      insertIndex <= sections.length
    ) {
      sections.splice(insertIndex, 0, newSection);
    } else {
      sections.push(newSection);
    }
    this.editorTemplate.content = { ...this.editorTemplate.content, sections };
    this.refreshEditor();
  }

  updateSection(index, field, value) {
    if (!this.editorTemplate) return;
    const sections = this.editorTemplate.content?.sections || [];
    if (index >= 0 && index < sections.length) {
      sections[index][field] = value;
    }
  }

  moveSection(index, direction) {
    if (!this.editorTemplate) return;
    const sections = this.editorTemplate.content?.sections || [];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const temp = sections[index];
    sections[index] = sections[newIndex];
    sections[newIndex] = temp;
    this.editorTemplate.content = { ...this.editorTemplate.content, sections };
    this.refreshEditor();
  }

  changeSectionLevel(index, delta) {
    if (!this.editorTemplate) return;
    const sections = this.editorTemplate.content?.sections || [];
    if (index >= 0 && index < sections.length) {
      const newLevel = sections[index].level + delta;
      if (newLevel >= 1 && newLevel <= 3) {
        sections[index].level = newLevel;
        this.editorTemplate.content = {
          ...this.editorTemplate.content,
          sections,
        };
        this.refreshEditor();
      }
    }
  }

  deleteSection(index) {
    if (!this.editorTemplate) return;
    const sections = this.editorTemplate.content?.sections || [];
    if (index >= 0 && index < sections.length) {
      sections.splice(index, 1);
      this.editorTemplate.content = {
        ...this.editorTemplate.content,
        sections,
      };
      this.refreshEditor();
    }
  }

  refreshEditor() {
    const modal = this.container.querySelector('#ctm-editor-modal');
    if (modal) {
      this.refreshList();
    }
  }

  updateOutline() {
    const outlineEl = this.container.querySelector('.ctm-fusion-outline');
    if (!outlineEl || !this.editorTemplate) return;
    const sections = this.editorTemplate.content?.sections || [];
    if (sections.length === 0) {
      outlineEl.innerHTML =
        '<div class="ctm-fusion-outline-empty">暂无章节</div>';
      return;
    }
    outlineEl.innerHTML = sections
      .map(
        (section, index) => `
      <div class="ctm-fusion-outline-item" data-outline-index="${index}" style="padding-left: ${(section.level - 1) * 12 + 8}px">
        <i class="fa-solid fa-hashtag ctm-fusion-outline-icon"></i>
        <span class="ctm-fusion-outline-text">${section.title || '未命名章节'}</span>
      </div>
    `
      )
      .join('');

    outlineEl.querySelectorAll('.ctm-fusion-outline-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.outlineIndex);
        const sectionEl = this.container.querySelector(
          `.ctm-fusion-section[data-index="${idx}"]`
        );
        if (sectionEl) {
          sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sectionEl.classList.add('ctm-fusion-section-highlight');
          setTimeout(
            () => sectionEl.classList.remove('ctm-fusion-section-highlight'),
            1500
          );
        }
      });
    });
  }

  saveEditorTemplate() {
    const nameEl = this.container.querySelector('#ctm-editor-name');
    const descEl = this.container.querySelector('#ctm-editor-desc');
    const formatEl = this.container.querySelector('#ctm-editor-format');
    const categoryEl = this.container.querySelector('#ctm-editor-category');
    const tagsEl = this.container.querySelector('#ctm-editor-tags');

    if (!nameEl?.value.trim()) {
      alert('请输入模板名称');
      return;
    }

    const format = formatEl?.value || 'word';
    const content = this.collectEditorContent(format);

    if (!this.validateEditorContent(format, content)) {
      return;
    }

    const template = {
      ...this.editorTemplate,
      name: nameEl.value.trim(),
      description: descEl?.value.trim() || '',
      format,
      category: [categoryEl?.value || 'personal'],
      tags: tagsEl?.value
        ? tagsEl.value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      content,
    };

    saveMyContentTemplate(template);
    this.editorTemplate = null;
    this.editorMode = 'create';
    this.refreshList();
  }

  collectEditorContent(format) {
    // 先同步富文本编辑器最新内容到 content(writeHtmlToData 会写入格式对应字段)
    if (this.tplRichEditor && this.editorTemplate?.content) {
      const html = this.tplRichEditor.getHTML();
      writeHtmlToData(this.editorTemplate.content, format, html);
    }
    const content = { ...this.editorTemplate.content };

    // 同步元数据栏输入(word: meta; email: subject/greeting/closing)
    this.container.querySelectorAll('[data-field^="meta-"]').forEach((el) => {
      const key = el.dataset.field?.replace(/^meta-/, '');
      if (!key) return;
      const val = el.value.trim();
      if (format === 'word') {
        content.meta = content.meta || {};
        content.meta[key] = val;
      } else if (format === 'email') {
        if (key === '主题') content.subject = val;
        else if (key === '称呼') content.greeting = val;
        else if (key === '结尾') content.closing = val;
      }
    });

    // table 格式:从 HTML 解析 columns/rows 以保持向后兼容(buildDocument 依赖)
    if (format === 'table' && content.html) {
      const parsed = htmlToLegacyTable(content.html);
      content.columns = parsed.columns;
      content.rows = parsed.rows;
    }

    // 清理其他格式的字段
    const keepByFormat = {
      word: ['sections', 'meta'],
      table: ['html', 'columns', 'rows'],
      email: ['subject', 'greeting', 'body', 'closing', 'signature'],
      list: ['items'],
      steps: ['steps'],
    };
    const keep = keepByFormat[format] || [];
    Object.keys(content).forEach((k) => {
      if (k !== '_v' && !keep.includes(k)) delete content[k];
    });

    return content;
  }

  validateEditorContent(format, content) {
    switch (format) {
      case 'word':
        if (!content.sections || content.sections.length === 0) {
          alert('请至少添加一个章节');
          return false;
        }
        break;
      case 'table':
        if (!content.columns || content.columns.length === 0) {
          alert('请至少设置一列表头');
          return false;
        }
        break;
      case 'email':
        if (!content.subject?.trim()) {
          alert('请输入邮件主题');
          return false;
        }
        break;
      case 'list':
        if (!content.items || content.items.length === 0) {
          alert('请至少添加一个清单项');
          return false;
        }
        break;
      case 'steps':
        if (!content.steps || content.steps.length === 0) {
          alert('请至少添加一个步骤');
          return false;
        }
        break;
    }
    return true;
  }

  migrateTemplateFormat(newFormat) {
    if (!this.editorTemplate || this.editorTemplate.format === newFormat)
      return;
    // 先同步富文本编辑器最新内容 + 元数据栏,避免迁移时丢失未保存的编辑
    if (this.tplRichEditor && this.editorTemplate.content) {
      const html = this.tplRichEditor.getHTML();
      writeHtmlToData(this.editorTemplate.content, this.editorTemplate.format, html);
    }
    this.syncTemplateMetaToContent();
    const oldFormat = this.editorTemplate.format || 'word';
    const oldContent = JSON.parse(
      JSON.stringify(this.editorTemplate.content || {})
    );
    const migrated = this.convertContentBetweenFormats(
      oldContent,
      oldFormat,
      newFormat
    );
    this.editorTemplate.format = newFormat;
    this.editorTemplate.content = migrated;
    this.editorTemplate._legacyContent = oldContent;
    this.refreshList();
  }

  /** 将模板编辑器元数据栏输入同步到 content */
  syncTemplateMetaToContent() {
    if (!this.editorTemplate) return;
    const format = this.editorTemplate.format || 'word';
    const content = this.editorTemplate.content || {};
    this.container.querySelectorAll('[data-field^="meta-"]').forEach((el) => {
      const key = el.dataset.field?.replace(/^meta-/, '');
      if (!key) return;
      const val = el.value;
      if (format === 'word') {
        content.meta = content.meta || {};
        content.meta[key] = val;
      } else if (format === 'email') {
        if (key === '主题') content.subject = val;
        else if (key === '称呼') content.greeting = val;
        else if (key === '结尾') content.closing = val;
      }
    });
  }

  convertContentBetweenFormats(content, oldFormat, newFormat) {
    if (oldFormat === newFormat) return content;

    const sectionsToText = (sections) =>
      (sections || [])
        .map((s) => `${s.title || ''}\n${s.guide || ''}`)
        .join('\n\n');

    const textToSections = (text) => {
      const lines = String(text || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      return lines.map((l) => ({ title: l, level: 1, guide: '' }));
    };

    const normalizeItems = (items) =>
      (items || [])
        .map((item) => (typeof item === 'string' ? item : item.text || ''))
        .filter(Boolean);

    const normalizeSteps = (steps) =>
      (steps || []).map((s) =>
        typeof s === 'string'
          ? { title: s, detail: '' }
          : { title: s.title || '', detail: s.detail || '' }
      );

    const detectColumns = (text) => {
      const lines = String(text || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        const parts = line
          .split(/[|,，\t]/)
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length >= 2) return parts;
      }
      return ['项目', '内容', '备注'];
    };

    switch (newFormat) {
      case 'word':
        if (oldFormat === 'table') {
          return {
            sections: [
              { title: '表格说明', level: 1, guide: '' },
              {
                title: '数据内容',
                level: 1,
                guide: (content.columns || []).join('、'),
              },
            ],
          };
        }
        if (oldFormat === 'email') {
          return {
            sections: textToSections(
              `${content.subject || ''}\n${(content.body || []).join('\n')}`
            ),
          };
        }
        if (oldFormat === 'list') {
          return {
            sections: textToSections(normalizeItems(content.items).join('\n')),
          };
        }
        if (oldFormat === 'steps') {
          return {
            sections: normalizeSteps(content.steps).map((s) => ({
              title: s.title,
              level: 1,
              guide: s.detail,
            })),
          };
        }
        return { sections: [] };
      case 'table':
        if (oldFormat === 'word') {
          const cols = detectColumns(sectionsToText(content.sections));
          return { columns: cols, rows: [Array(cols.length).fill('')] };
        }
        if (oldFormat === 'list') {
          const items = normalizeItems(content.items);
          return {
            columns: ['项目', '说明', '状态'],
            rows: items.map((i) => [i, '', '']),
          };
        }
        if (oldFormat === 'steps') {
          const steps = normalizeSteps(content.steps);
          return {
            columns: ['步骤', '标题', '说明'],
            rows: steps.map((s, i) => [String(i + 1), s.title, s.detail]),
          };
        }
        return { columns: ['列1', '列2', '列3'], rows: [Array(3).fill('')] };
      case 'email':
        if (oldFormat === 'word') {
          return {
            subject: '',
            greeting: '您好：',
            body: [sectionsToText(content.sections)],
            closing: '此致',
            signature: '',
          };
        }
        if (oldFormat === 'list') {
          const items = normalizeItems(content.items);
          return {
            subject: '',
            greeting: '您好：',
            body: ['本次需要您关注以下事项：', ...items.map((i) => `• ${i}`)],
            closing: '此致',
            signature: '',
          };
        }
        if (oldFormat === 'steps') {
          const steps = normalizeSteps(content.steps);
          return {
            subject: '',
            greeting: '您好：',
            body: [
              '请参考以下流程：',
              ...steps.map((s, i) => `${i + 1}. ${s.title}`),
            ],
            closing: '此致',
            signature: '',
          };
        }
        return {
          subject: '',
          greeting: '您好：',
          body: [''],
          closing: '此致',
          signature: '',
        };
      case 'list':
        if (oldFormat === 'word') {
          return {
            items: normalizeItems(content.sections?.map((s) => s.title)),
          };
        }
        if (oldFormat === 'table') {
          return {
            items: (content.rows || [])
              .map((r) => (Array.isArray(r) ? r[0] : Object.values(r)[0]))
              .filter(Boolean),
          };
        }
        if (oldFormat === 'email') {
          return { items: (content.body || []).filter(Boolean) };
        }
        if (oldFormat === 'steps') {
          return { items: normalizeSteps(content.steps).map((s) => s.title) };
        }
        return { items: [''] };
      case 'steps':
        if (oldFormat === 'word') {
          return {
            steps: normalizeSteps((content.sections || []).map((s) => s.title)),
          };
        }
        if (oldFormat === 'table') {
          return {
            steps: (content.rows || [])
              .map((r) => ({
                title: Array.isArray(r) ? r[0] : Object.values(r)[0],
                detail: '',
              }))
              .filter((s) => s.title),
          };
        }
        if (oldFormat === 'email') {
          return {
            steps: (content.body || [])
              .filter(Boolean)
              .map((b) => ({ title: b, detail: '' })),
          };
        }
        if (oldFormat === 'list') {
          return {
            steps: normalizeItems(content.items).map((i) => ({
              title: i,
              detail: '',
            })),
          };
        }
        return { steps: [{ title: '', detail: '' }] };
      default:
        return content;
    }
  }

  addTableRow() {
    if (!this.editorTemplate || this.editorTemplate.format !== 'table') return;
    const columns = this.editorTemplate.content.columns || [];
    this.editorTemplate.content.rows.push(Array(columns.length).fill(''));
    this.refreshList();
  }

  insertTableRow(atIdx) {
    if (!this.editorTemplate || this.editorTemplate.format !== 'table') return;
    const columns = this.editorTemplate.content.columns || [];
    const idx = Math.max(
      0,
      Math.min(atIdx, this.editorTemplate.content.rows.length)
    );
    this.editorTemplate.content.rows.splice(
      idx,
      0,
      Array(columns.length).fill('')
    );
    this.refreshList();
  }

  deleteTableRow(idx) {
    if (!this.editorTemplate || this.editorTemplate.format !== 'table') return;
    if (idx < 0 || idx >= this.editorTemplate.content.rows.length) return;
    this.editorTemplate.content.rows.splice(idx, 1);
    if (this.editorTemplate.content.rows.length === 0) {
      this.editorTemplate.content.rows.push(
        Array(this.editorTemplate.content.columns.length).fill('')
      );
    }
    this.refreshList();
  }

  addTableColumn() {
    if (!this.editorTemplate || this.editorTemplate.format !== 'table') return;
    const columns = this.editorTemplate.content.columns || [];
    columns.push(`列${columns.length + 1}`);
    this.editorTemplate.content.rows.forEach((row) => row.push(''));
    this.refreshList();
  }

  insertTableColumn(atIdx) {
    if (!this.editorTemplate || this.editorTemplate.format !== 'table') return;
    const columns = this.editorTemplate.content.columns || [];
    const idx = Math.max(0, Math.min(atIdx, columns.length));
    columns.splice(idx, 0, `列${columns.length + 1}`);
    this.editorTemplate.content.rows.forEach((row) => row.splice(idx, 0, ''));
    this.refreshList();
  }

  deleteTableColumn(idx) {
    if (!this.editorTemplate || this.editorTemplate.format !== 'table') return;
    const columns = this.editorTemplate.content.columns || [];
    if (idx < 0 || idx >= columns.length) return;
    columns.splice(idx, 1);
    if (columns.length === 0) {
      this.editorTemplate.content.columns = ['列1'];
      this.editorTemplate.content.rows = [Array(1).fill('')];
    } else {
      this.editorTemplate.content.rows.forEach((row) => row.splice(idx, 1));
    }
    this.refreshList();
  }

  focusSheetCell(row, col) {
    const cell = this.container.querySelector(
      `#ctm-sheet-editor td[data-sheet-row="${row}"][data-sheet-col="${col}"] .ctm-sheet-cell`
    );
    if (cell) {
      cell.focus();
      const range = document.createRange();
      range.selectNodeContents(cell);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  syncTableColumns(cols) {
    if (!this.editorTemplate || this.editorTemplate.format !== 'table') return;
    const oldColumns = this.editorTemplate.content.columns || [];
    const newColumns = cols.length ? cols : ['列1', '列2', '列3'];
    this.editorTemplate.content.columns = newColumns;
    this.editorTemplate.content.rows = (
      this.editorTemplate.content.rows || []
    ).map((row) => {
      const newRow = newColumns.map((_, i) =>
        i < oldColumns.length ? row[i] || '' : ''
      );
      return newRow;
    });
    if (this.editorTemplate.content.rows.length === 0) {
      this.editorTemplate.content.rows.push(Array(newColumns.length).fill(''));
    }
    this.refreshList();
  }

  addEmailParagraph() {
    if (!this.editorTemplate || this.editorTemplate.format !== 'email') return;
    if (!Array.isArray(this.editorTemplate.content.body)) {
      this.editorTemplate.content.body = [''];
    }
    this.editorTemplate.content.body.push('');
    this.refreshList();
  }

  deleteEmailParagraph(idx) {
    if (!this.editorTemplate || this.editorTemplate.format !== 'email') return;
    this.editorTemplate.content.body.splice(idx, 1);
    if (this.editorTemplate.content.body.length === 0) {
      this.editorTemplate.content.body = [''];
    }
    this.refreshList();
  }

  insertEmailVariable(variable) {
    if (!this.editorTemplate || this.editorTemplate.format !== 'email') return;
    const active = document.activeElement;
    if (
      active &&
      (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
    ) {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      const value = active.value;
      active.value = value.slice(0, start) + variable + value.slice(end);
      active.selectionStart = active.selectionEnd = start + variable.length;
      active.dispatchEvent(new Event('input', { bubbles: true }));
      active.focus();
    } else {
      this.editorTemplate.content.body[0] =
        (this.editorTemplate.content.body[0] || '') + variable;
      this.refreshList();
    }
  }

  addListItem() {
    if (!this.editorTemplate || this.editorTemplate.format !== 'list') return;
    if (!Array.isArray(this.editorTemplate.content.items)) {
      this.editorTemplate.content.items = [];
    }
    this.editorTemplate.content.items.push('');
    this.refreshList();
  }

  deleteListItem(idx) {
    if (!this.editorTemplate || this.editorTemplate.format !== 'list') return;
    this.editorTemplate.content.items.splice(idx, 1);
    if (this.editorTemplate.content.items.length === 0) {
      this.editorTemplate.content.items = [''];
    }
    this.refreshList();
  }

  addStep() {
    if (!this.editorTemplate || this.editorTemplate.format !== 'steps') return;
    if (!Array.isArray(this.editorTemplate.content.steps)) {
      this.editorTemplate.content.steps = [];
    }
    this.editorTemplate.content.steps.push({ title: '', detail: '' });
    this.refreshList();
  }

  deleteStep(idx) {
    if (!this.editorTemplate || this.editorTemplate.format !== 'steps') return;
    this.editorTemplate.content.steps.splice(idx, 1);
    if (this.editorTemplate.content.steps.length === 0) {
      this.editorTemplate.content.steps = [{ title: '', detail: '' }];
    }
    this.refreshList();
  }

  syncStepTitles(titles) {
    if (!this.editorTemplate || this.editorTemplate.format !== 'steps') return;
    const oldSteps = this.editorTemplate.content.steps || [];
    this.editorTemplate.content.steps = titles.map((title, i) => ({
      title,
      detail: oldSteps[i]?.detail || '',
    }));
    if (this.editorTemplate.content.steps.length === 0) {
      this.editorTemplate.content.steps = [{ title: '', detail: '' }];
    }
    this.refreshList();
  }

  handleUploadFile(file) {
    const allowed = /\.(docx|xlsx|txt|md)$/i;
    if (!allowed.test(file.name)) {
      this.showToast('仅支持 Word、Excel、TXT、Markdown 文件');
      return;
    }
    this.uploadFile = { fileObj: file, name: file.name, size: file.size };
    this.refreshList();
  }

  async startUploadTemplate() {
    if (!this.uploadFile) return;
    this.extractParsing = true;
    this.refreshList();

    try {
      const formData = new FormData();
      formData.append('file', this.uploadFile.fileObj);
      const res = await fetch('http://localhost:3001/api/parse-template', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || data.message || '文件解析失败');
      }

      const draft = this.convertParsedResultToTemplate(data);
      this.showUploadModal = false;
      this.uploadFile = null;
      this.extractParsing = false;
      this.openEditor(draft, 'create');
    } catch (err) {
      console.error('[startUploadTemplate]', err);
      this.extractParsing = false;
      this.showToast(err.message || '文件解析失败，请检查文件格式');
      this.refreshList();
    }
  }

  convertParsedResultToTemplate(data) {
    const base = {
      name: data.fileName?.replace(/\.[^.]+$/, '') || '导入模板',
      description: `从 ${data.fileName || '文件'} 提取的模板`,
      format: 'word',
      category: ['personal'],
      tags: ['导入'],
      level: 'personal',
      style: { tone: 'professional', length: 'medium' },
      content: { sections: [] },
    };

    if (data.fileType === 'xlsx' || (data.sheets && data.sheets.length > 0)) {
      base.format = 'table';
      const sheet = data.sheets?.[0];
      const headers = sheet?.headers || ['列1', '列2', '列3'];
      const rows = (sheet?.sampleRows || []).map((r) =>
        Array.isArray(r) ? r : headers.map(() => '')
      );
      base.content = { columns: headers, rows };
      base.description = `从 ${data.fileName || 'Excel'} 提取的表格模板`;
      return base;
    }

    if (data.fileType === 'docx' || data.headings) {
      base.format = 'word';
      const headings = (data.headings || []).filter((h) => h.text);
      if (headings.length > 0) {
        base.content.sections = headings.map((h) => ({
          title: h.text,
          level: Math.min(Math.max(h.level || 1, 1), 3),
          guide: '',
        }));
      } else {
        const paras = (data.paragraphs || [])
          .filter((p) => p.length > 5)
          .slice(0, 8);
        base.content.sections = paras.length
          ? paras.map((p) => ({ title: p.slice(0, 30), level: 1, guide: '' }))
          : [{ title: '第一章', level: 1, guide: '' }];
      }
      return base;
    }

    if (data.fileType === 'txt' || data.fileType === 'md' || data.text) {
      base.format = 'word';
      const extracted = this.extractTemplateFromText(data.text || '');
      base.format = extracted.format;
      base.content = extracted.content;
      return base;
    }

    return base;
  }

  async startExtractTemplate() {
    const text = this.extractText.trim();
    if (!text) return;
    this.extractParsing = true;
    this.refreshList();

    setTimeout(() => {
      try {
        const result = this.extractTemplateFromText(text);
        const draft = {
          name: result.name || '范文提取模板',
          description: '从范文提取的模板',
          format: result.format,
          category: ['personal'],
          tags: ['提取'],
          level: 'personal',
          style: { tone: 'professional', length: 'medium' },
          content: result.content,
        };
        this.showExtractModal = false;
        this.extractText = '';
        this.extractParsing = false;
        this.openEditor(draft, 'create');
      } catch (err) {
        console.error('[startExtractTemplate]', err);
        this.extractParsing = false;
        this.showToast('范文解析失败，请重试');
        this.refreshList();
      }
    }, 600);
  }

  extractTemplateFromText(text) {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // 检测表格：存在连续多行的逗号/制表符分隔
    const tableLines = lines.filter((l) => l.split(/[|,，\t]/).length >= 3);
    if (tableLines.length >= 3) {
      const header = tableLines[0]
        .split(/[|,，\t]/)
        .map((c) => c.trim())
        .filter(Boolean);
      const rows = tableLines.slice(1).map((l) =>
        l
          .split(/[|,，\t]/)
          .map((c) => c.trim())
          .filter((_, i) => i < header.length)
      );
      return {
        name: '表格模板',
        format: 'table',
        content: { columns: header, rows },
      };
    }

    // 检测步骤：连续以数字、中文数字或"第x步"开头
    const stepRegex =
      /^(\d+[.、)）]|第[一二三四五六七八九十\d]+步|Step\s*\d+)/i;
    const stepLines = lines.filter((l) => stepRegex.test(l));
    if (stepLines.length >= 3) {
      const steps = stepLines.map((l) => {
        const cleaned = l.replace(stepRegex, '').trim();
        const [title, ...rest] = cleaned.split(/[:：]/);
        return { title: title || cleaned, detail: rest.join('：') || '' };
      });
      return { name: '流程模板', format: 'steps', content: { steps } };
    }

    // 检测清单：连续多行以项目符号或复选框开头
    const listRegex = /^[-•*·☑☐✓✔✗[\]x ]+/;
    const listLines = lines.filter((l) => listRegex.test(l));
    if (listLines.length >= 3) {
      const items = listLines.map((l) => l.replace(listRegex, '').trim());
      return { name: '清单模板', format: 'list', content: { items } };
    }

    // 检测邮件
    const hasEmailMarkers = /(主题|收件人|抄送|尊敬的|您好|此致|敬礼)/.test(
      text
    );
    const hasGreeting =
      text.includes('您好') || text.includes('你好') || text.includes('尊敬的');
    if (hasEmailMarkers && hasGreeting) {
      const subjectMatch = text.match(/(?:主题|标题)[:：]\s*(.+)/);
      const subject = subjectMatch ? subjectMatch[1].trim() : '';
      const greetingMatch = text.match(/(?:尊敬的[^：\n]+|您好[，,]?[^\n]*)/);
      const greeting = greetingMatch ? greetingMatch[0].trim() : '您好：';
      const closingIdx = text.search(/(此致|顺祝|祝)/);
      const bodyText =
        closingIdx > 0
          ? text.slice(text.indexOf(greeting) + greeting.length, closingIdx)
          : text.slice(text.indexOf(greeting) + greeting.length);
      const body = bodyText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && l !== subject);
      const closing =
        closingIdx > 0 ? text.slice(closingIdx).split('\n')[0].trim() : '此致';
      return {
        name: subject || '邮件模板',
        format: 'email',
        content: {
          subject,
          greeting,
          body: body.length ? body : [''],
          closing,
          signature: '',
        },
      };
    }

    // 默认按文档处理：提取标题行
    const headingRegex =
      /^(#+\s*|\d+[.、)）]|第[一二三四五六七八九十\d]+[章节]|[一二三四五六七八九十]+[.、)）])/;
    const headings = lines.filter((l) => headingRegex.test(l)).slice(0, 15);
    if (headings.length >= 2) {
      const sections = headings.map((h) => {
        const title = h.replace(/^#+\s*/, '').trim();
        const level = h.match(/^#+/)?.[0].length || 1;
        return { title, level: Math.min(Math.max(level, 1), 3), guide: '' };
      });
      return { name: '文档模板', format: 'word', content: { sections } };
    }

    // 兜底：按段落生成章节
    const paragraphs = lines.filter((l) => l.length > 8).slice(0, 8);
    return {
      name: '文档模板',
      format: 'word',
      content: {
        sections: paragraphs.length
          ? paragraphs.map((p) => ({
              title: p.slice(0, 30),
              level: 1,
              guide: '',
            }))
          : [{ title: '第一章', level: 1, guide: '' }],
      },
    };
  }

  openAICreator() {
    this.aiChatMessages = [
      {
        role: 'ai',
        content:
          '你好！我来帮你创建内容模板。请告诉我，你想创建什么类型的模板？比如项目报告、客户邮件、工作清单等。',
      },
    ];
    this.aiChatStep = 0;
    this.aiDraftTemplate = {
      name: '',
      description: '',
      format: 'word',
      category: ['personal'],
      style: { tone: 'professional', length: 'medium' },
      content: {},
    };
    this.refreshList();
  }

  sendAIMessage() {
    const input = this.container.querySelector('#ctm-ai-input');
    const text = input?.value?.trim();
    if (!text) return;

    this.aiChatMessages.push({ role: 'user', content: text });
    input.value = '';

    setTimeout(() => {
      const mockSections = [
        '一、项目背景',
        '二、目标与范围',
        '三、核心内容',
        '四、实施计划',
        '五、预期效果',
      ];
      this.aiDraftTemplate.name = text + '模板';
      this.aiDraftTemplate.description = 'AI 生成的模板：' + text;
      this.aiDraftTemplate.content.sections = mockSections.map((s) => ({
        title: s,
        level: 1,
        guide: '',
      }));

      this.aiChatMessages.push({
        role: 'ai',
        content: `好的！我为你生成了「${text}模板」，包含以下章节：\n\n${mockSections.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n如果满意，点击下方按钮保存并使用模板。如果需要调整，可以继续告诉我。`,
      });

      this.refreshList();

      const chatEl = this.container.querySelector('#ctm-ai-chat');
      if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    }, 500);

    this.refreshList();
    setTimeout(() => {
      const chatEl = this.container.querySelector('#ctm-ai-chat');
      if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    }, 10);
  }

  saveAITemplate() {
    if (!this.aiDraftTemplate || !this.aiDraftTemplate.name) {
      alert('请先生成模板内容');
      return;
    }

    const template = {
      ...this.aiDraftTemplate,
      id: 'ctm_' + Date.now(),
      usedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveMyContentTemplate(template);
    this.aiDraftTemplate = null;
    this.aiChatMessages = [];
    this.refreshList();
  }

  editAIDraft() {
    if (!this.aiDraftTemplate) return;

    const template = {
      ...this.aiDraftTemplate,
      id: 'ctm_draft_' + Date.now(),
    };

    this.editorTemplate = template;
    this.editorMode = 'create';
    this.aiDraftTemplate = null;
    this.aiChatMessages = [];
    this.refreshList();
  }

  renderUploadModal() {
    const hasFile = this.uploadFile;
    const parsing = this.extractParsing;
    return `
      <div class="ctm-modal-overlay" id="ctm-upload-modal">
        <div class="ctm-modal ctm-upload-modal" onclick="event.stopPropagation()">
          <div class="ctm-modal-header">
            <h2 class="ctm-modal-title">
              <i class="fa-solid fa-cloud-arrow-up" style="color:#10b981"></i> 上传模板文件
            </h2>
            <button class="ctm-modal-close" data-action="close-upload">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="ctm-modal-body">
            <div class="ctm-upload-zone" id="ctm-upload-zone">
              <input type="file" id="ctm-upload-input" class="ctm-upload-input" accept=".docx,.xlsx,.txt,.md" />
              ${
                hasFile
                  ? `
                <div class="ctm-upload-file">
                  <i class="fa-solid fa-file-lines"></i>
                  <span class="ctm-upload-file-name">${this.escapeHtml(this.uploadFile.name)}</span>
                  <span class="ctm-upload-file-size">${this.formatFileSize(this.uploadFile.size)}</span>
                </div>
                <p class="ctm-upload-hint">已选择文件，点击「开始解析」自动提取模板结构</p>
              `
                  : `
                <div class="ctm-upload-icon">
                  <i class="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <div class="ctm-upload-title">点击或拖拽文件到此处</div>
                <div class="ctm-upload-desc">支持 Word、Excel、TXT、Markdown 文件</div>
              `
              }
            </div>
            ${
              parsing
                ? `
              <div class="ctm-upload-loading">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <span>正在解析文件，请稍候...</span>
              </div>
            `
                : ''
            }
          </div>
          <div class="ctm-modal-footer">
            <button class="btn btn-outline" data-action="close-upload">取消</button>
            <button class="btn btn-primary" data-action="start-upload" ${!hasFile || parsing ? 'disabled' : ''}>
              <i class="fa-solid fa-wand-magic-sparkles"></i> 开始解析
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderExtractModal() {
    const parsing = this.extractParsing;
    return `
      <div class="ctm-modal-overlay" id="ctm-extract-modal">
        <div class="ctm-modal ctm-extract-modal" onclick="event.stopPropagation()">
          <div class="ctm-modal-header">
            <h2 class="ctm-modal-title">
              <i class="fa-solid fa-magnifying-glass-chart" style="color:#8b5cf6"></i> 从范文提取
            </h2>
            <button class="ctm-modal-close" data-action="close-extract">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="ctm-modal-body">
            <div class="ctm-fusion-field" style="margin-bottom:0;">
              <label class="ctm-fusion-field-label">粘贴范文内容</label>
              <textarea class="ctm-fusion-field-textarea" id="ctm-extract-text" rows="12" placeholder="将已有的文档、邮件、清单或流程内容粘贴到这里，AI 会分析结构并生成模板...">${this.escapeHtml(this.extractText)}</textarea>
            </div>
            ${
              parsing
                ? `
              <div class="ctm-upload-loading">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <span>正在分析范文结构，请稍候...</span>
              </div>
            `
                : ''
            }
          </div>
          <div class="ctm-modal-footer">
            <button class="btn btn-outline" data-action="close-extract">取消</button>
            <button class="btn btn-primary" data-action="start-extract" ${!this.extractText.trim() || parsing ? 'disabled' : ''}>
              <i class="fa-solid fa-wand-magic-sparkles"></i> 提取模板
            </button>
          </div>
        </div>
      </div>
    `;
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
