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

const SCENE_TO_ROLES = {
  project: ['product'],
  office: ['customer_service', 'marketing', 'sales', 'hr', 'product'],
  sales: ['sales'],
  strategy: ['product', 'marketing'],
  marketing: ['marketing'],
  hr: ['hr'],
  product: ['product'],
  personal: ['sales', 'marketing', 'hr', 'product', 'customer_service', 'tech_support'],
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
    this.onClose = options.onClose || (() => {});
    this.initialDocumentId = options.initialDocumentId || null;
    this.currentCategory = options.initialCategory || 'all';
    this.currentFormat = 'all';
    this.currentSource = 'all';
    this.searchKeyword = '';
    this.viewMode = 'grid';
    this.categoryMode = options.initialCategoryMode || 'scene';
    this.currentRole = options.initialRole || 'all';
    this.templates = [];
    this.previewTemplate = null;
    this.editorTemplate = null;
    this.editorMode = 'create';
    this.aiChatMessages = [];
    this.aiChatStep = 0;
    this.aiDraftTemplate = null;
    this.extractText = '';
    this.showNewModal = false;
    this.init();
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
    if (this.categoryMode === 'role') {
      if (this.currentRole !== 'all') {
        list = list.filter((t) => getTemplateRoleIds(t).includes(this.currentRole));
      }
    } else {
      if (this.currentCategory === 'featured') {
        list = list.filter((t) => t.featured);
      } else if (this.currentCategory !== 'all') {
        list = list.filter((t) => t.category && t.category.includes(this.currentCategory));
      }
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

  getRoleCounts() {
    const counts = { all: this.templates.length };
    this.templates.forEach((t) => {
      getTemplateRoleIds(t).forEach((roleId) => {
        counts[roleId] = (counts[roleId] || 0) + 1;
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
    if (this.contentDoc) {
      this.container.innerHTML = this.renderContentEditor();
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
              <h1 class="ctm-lib-title">模板中心</h1>
              <p class="ctm-lib-subtitle">精选模板，助你高效完成工作</p>
            </div>
            <div class="ctm-lib-search-row">
              <div class="ctm-lib-search-box">
                <i class="fa-solid fa-magnifying-glass ctm-lib-search-icon"></i>
                <input type="text" class="ctm-lib-search-input" placeholder="搜索模板名称、描述、标签..." value="${this.searchKeyword}" />
              </div>
              <div class="ctm-lib-source-tabs">
                <div class="ctm-lib-source-tab ${this.currentSource === 'all' ? 'active' : ''}" data-source="all">全部</div>
                <div class="ctm-lib-source-tab ${this.currentSource === 'official' ? 'active' : ''}" data-source="official">官方</div>
                <div class="ctm-lib-source-tab ${this.currentSource === 'personal' ? 'active' : ''}" data-source="personal">我的</div>
              </div>
              <button class="btn btn-primary ctm-lib-new-btn" id="ctm-lib-new">
                <i class="fa-solid fa-plus"></i> 新建模板
              </button>
            </div>
          </div>
        </div>

        <div class="ctm-lib-body">
          <div class="ctm-lib-categories">
            ${this.renderCategoryModeTabs()}
            ${this.renderCategories()}
          </div>

          <div class="ctm-lib-content">
            ${this.categoryMode === 'scene' && (this.currentCategory === 'all' || this.currentCategory === 'featured') ? this.renderFeaturedSection(featured.slice(0, 6)) : ''}

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

              ${filtered.length === 0 ? this.renderEmpty() : this.viewMode === 'grid' ? `
                <div class="ctm-lib-grid">
                  ${filtered.map((t) => this.renderTemplateCard(t)).join('')}
                </div>
              ` : `
                <div class="ctm-template-list">
                  ${filtered.map((t) => this.renderTemplateListItem(t)).join('')}
                </div>
              `}
            </div>
          </div>
        </div>
      </div>

      ${this.showNewModal ? this.renderNewModal() : ''}
      ${this.previewTemplate ? this.renderPreviewModal() : ''}
      ${this.editorTemplate ? this.renderEditorModal() : ''}
      ${this.aiDraftTemplate ? this.renderAIModal() : ''}
    `;
  }

  renderCategoryModeTabs() {
    return `
      <div class="ctm-category-mode-tabs">
        <div class="ctm-category-mode-tab ${this.categoryMode === 'scene' ? 'active' : ''}" data-mode="scene">场景</div>
        <div class="ctm-category-mode-tab ${this.categoryMode === 'role' ? 'active' : ''}" data-mode="role">岗位</div>
      </div>
    `;
  }

  renderCategories() {
    if (this.categoryMode === 'role') {
      const roleCounts = this.getRoleCounts();
      return `
        <div class="ctm-lib-cat-list">
          <div class="ctm-lib-cat-item ${this.currentRole === 'all' ? 'active' : ''}" data-role="all">
            <div class="ctm-lib-cat-icon"><i class="fa-solid fa-layer-group"></i></div>
            <span class="ctm-lib-cat-name">全部岗位</span>
            <span class="ctm-lib-cat-count">${roleCounts.all}</span>
          </div>
          ${workRoles
            .map((role) => {
              const count = roleCounts[role.id] || 0;
              const isActive = this.currentRole === role.id;
              return `
                <div class="ctm-lib-cat-item ${isActive ? 'active' : ''}" data-role="${role.id}">
                  <div class="ctm-lib-cat-icon" style="${isActive ? '' : 'color:' + role.color + ';background:' + role.color + '12'}">
                    <i class="fa-solid fa-${role.icon}"></i>
                  </div>
                  <span class="ctm-lib-cat-name">${role.name}</span>
                  <span class="ctm-lib-cat-count">${count}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    }

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
    if (this.categoryMode === 'role') {
      if (this.currentRole === 'all') return '全部模板';
      const role = workRoles.find((r) => r.id === this.currentRole);
      return role ? role.name + '模板' : '模板';
    }
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
              ${(template.tags || []).slice(0, 3).map((tag) => `<span class="ctm-list-tag">${this.escapeHtml(tag)}</span>`).join('')}
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
          ${featured.slice(0, 8).map((t) => this.renderTemplateCard(t)).join('')}
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
            ${sections.map((s) => `
              <div class="pv-real-section">
                <div class="pv-real-h">${truncate(s.title, 16)}</div>
                ${s.guide ? `<div class="pv-real-p">${truncate(s.guide, 22)}</div>` : ''}
              </div>
            `).join('')}
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
            ${sampleRows.map(() => `
              <div class="pv-real-tr">
                ${columns.map(() => `<div class="pv-real-td"><span></span></div>`).join('')}
              </div>
            `).join('')}
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
            ${items.map((item) => `
              <div class="pv-real-list-item">
                <div class="pv-real-list-check" style="border-color:${themeColor}"></div>
                <div class="pv-real-list-text">${truncate(item, 14)}</div>
              </div>
            `).join('')}
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
            ${steps.map((s, i) => `
              <div class="pv-real-step-item">
                <div class="pv-real-step-num" style="background:${themeColor}">${i + 1}</div>
                <div class="pv-real-step-text">${truncate(typeof s === 'string' ? s : s.title, 14)}</div>
              </div>
            `).join('')}
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
            ${roles.slice(0, 2).map((r) => `<span class="ctm-card-tag role">${r.name}</span>`).join('')}
            ${(template.tags || []).slice(0, 2).map((tag) => `<span class="ctm-card-tag">${this.escapeHtml(tag)}</span>`).join('')}
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
    switch (doc.format) {
      case 'word':
        return this.renderWordEditor(data);
      case 'table':
        return this.renderTableEditor(data);
      case 'email':
        return this.renderEmailEditor(data);
      case 'list':
        return this.renderListEditor(data);
      case 'steps':
        return this.renderStepsEditor(data);
      default:
        return this.renderWordEditor(data);
    }
  }

  renderWordEditor(data) {
    const meta = data.meta || {};
    return `
      <div class="ctm-doc-word">
        <div class="ctm-doc-meta">
          <div class="ctm-doc-meta-row">
            <span class="ctm-doc-meta-label">主题</span>
            <input type="text" class="ctm-doc-meta-input" data-field="meta-主题" value="${this.escapeHtml(
              meta['主题'] || ''
            )}" placeholder="输入主题" />
          </div>
          <div class="ctm-doc-meta-row">
            <span class="ctm-doc-meta-label">时间</span>
            <input type="text" class="ctm-doc-meta-input" data-field="meta-时间" value="${this.escapeHtml(
              meta['时间'] || ''
            )}" placeholder="例如：2026 年第 x 季度" />
          </div>
          <div class="ctm-doc-meta-row">
            <span class="ctm-doc-meta-label">部门</span>
            <input type="text" class="ctm-doc-meta-input" data-field="meta-部门" value="${this.escapeHtml(
              meta['部门'] || ''
            )}" placeholder="输入部门" />
          </div>
          <div class="ctm-doc-meta-row">
            <span class="ctm-doc-meta-label">撰稿人</span>
            <input type="text" class="ctm-doc-meta-input" data-field="meta-撰稿人" value="${this.escapeHtml(
              meta['撰稿人'] || ''
            )}" placeholder="输入撰稿人" />
          </div>
        </div>
        <div class="ctm-doc-sections">
          ${data.sections
            .map(
              (s, i) => `
            <div class="ctm-doc-section" data-section-idx="${i}">
              <input type="text" class="ctm-doc-section-title" value="${this.escapeHtml(
                s.title
              )}" data-field="section-title" placeholder="章节标题" />
              ${s.guide ? `<div class="ctm-doc-section-guide">${this.escapeHtml(s.guide)}</div>` : ''}
              <textarea class="ctm-doc-section-text" data-field="section-text" placeholder="在此输入本章内容，支持 - 项目符号">${this.escapeHtml(
                s.text
              )}</textarea>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  renderTableEditor(data) {
    const cols = data.columns;
    return `
      <div class="ctm-doc-table-wrap">
        <table class="ctm-doc-table">
          <thead>
            <tr>
              ${cols.map((c) => `<th>${this.escapeHtml(c)}</th>`).join('')}
              <th class="ctm-doc-table-actions"></th>
            </tr>
          </thead>
          <tbody>
            ${data.rows
              .map(
                (row, ri) => `
              <tr data-row-idx="${ri}">
                ${cols.map((_, ci) => `<td><input type="text" value="${this.escapeHtml(row[ci] || '')}" data-col="${ci}" /></td>`).join('')}
                <td class="ctm-doc-table-actions">
                  <button class="ctm-doc-row-del" data-action="del-row" data-row-idx="${ri}"><i class="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <button class="ctm-doc-add-row" data-action="add-row"><i class="fa-solid fa-plus"></i> 添加行</button>
      </div>
    `;
  }

  renderEmailEditor(data) {
    return `
      <div class="ctm-doc-email">
        <div class="ctm-doc-field">
          <label>主题</label>
          <input type="text" data-field="email-subject" value="${this.escapeHtml(data.subject)}" />
        </div>
        <div class="ctm-doc-field">
          <label>称呼</label>
          <input type="text" data-field="email-greeting" value="${this.escapeHtml(data.greeting)}" />
        </div>
        <div class="ctm-doc-field">
          <label>正文</label>
          ${data.body
            .map(
              (_, i) => `
            <textarea data-field="email-body" data-body-idx="${i}" placeholder="邮件段落...">${this.escapeHtml(
              data.body[i]
            )}</textarea>
          `
            )
            .join('')}
        </div>
        <div class="ctm-doc-field">
          <label>结尾</label>
          <input type="text" data-field="email-closing" value="${this.escapeHtml(data.closing)}" />
        </div>
        <div class="ctm-doc-field">
          <label>签名</label>
          <textarea data-field="email-signature" placeholder="签名">${this.escapeHtml(
            data.signature
          )}</textarea>
        </div>
      </div>
    `;
  }

  renderListEditor(data) {
    return `
      <div class="ctm-doc-list">
        ${data.items
          .map(
            (item, i) => `
          <div class="ctm-doc-list-item" data-list-idx="${i}">
            <input type="checkbox" ${item.checked ? 'checked' : ''} data-field="list-check" />
            <input type="text" value="${this.escapeHtml(item.text)}" data-field="list-text" placeholder="清单项" />
            <button class="ctm-doc-item-del" data-action="del-list-item" data-idx="${i}"><i class="fa-solid fa-xmark"></i></button>
          </div>
        `
          )
          .join('')}
        <button class="ctm-doc-add-row" data-action="add-list-item"><i class="fa-solid fa-plus"></i> 添加项</button>
      </div>
    `;
  }

  renderStepsEditor(data) {
    return `
      <div class="ctm-doc-steps">
        ${data.steps
          .map(
            (step, i) => `
          <div class="ctm-doc-step" data-step-idx="${i}">
            <div class="ctm-doc-step-num">${i + 1}</div>
            <div class="ctm-doc-step-body">
              <input type="text" value="${this.escapeHtml(step.title)}" data-field="step-title" placeholder="步骤标题" />
              <textarea data-field="step-detail" placeholder="步骤说明">${this.escapeHtml(
                step.detail
              )}</textarea>
            </div>
            <button class="ctm-doc-item-del" data-action="del-step" data-idx="${i}"><i class="fa-solid fa-xmark"></i></button>
          </div>
        `
          )
          .join('')}
        <button class="ctm-doc-add-row" data-action="add-step"><i class="fa-solid fa-plus"></i> 添加步骤</button>
      </div>
    `;
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
              if (!item.trim()) return '<div class="ctm-preview-list-gap"></div>';
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

    const sections = t.content?.sections || [];
    const saveLabel = this.editorMode === 'use' ? '保存并使用' : this.editorMode === 'edit' ? '保存修改' : '保存模板';
    const sourceHint = this.editorMode === 'use' && t.sourceName
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
              <button class="btn btn-ghost ctm-fusion-preview-btn">
                <i class="fa-regular fa-eye"></i> 预览
              </button>
              <button class="btn btn-primary" data-action="save-template">
                <i class="fa-solid fa-check"></i> ${saveLabel}
              </button>
            </div>
          </div>

          <div class="ctm-fusion-body">
            <div class="ctm-fusion-canvas">
              <div class="ctm-fusion-doc">
                ${sections.length === 0 ? `
                  <div class="ctm-fusion-empty">
                    <i class="fa-regular fa-file-lines"></i>
                    <div class="ctm-fusion-empty-title">暂无章节</div>
                    <div class="ctm-fusion-empty-desc">点击右侧「添加章节」开始创建模板结构</div>
                  </div>
                ` : `
                  <div class="ctm-fusion-doc-title">${t.name || '模板名称'}</div>
                  <div class="ctm-fusion-doc-sections">
                    ${sections.map((section, index) => `
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
                          <div class="ctm-fusion-section-title" contenteditable="true" data-field="title">${section.title || ''}</div>
                          <div class="ctm-fusion-section-guide" contenteditable="true" data-field="guide">${section.guide || '💡 添加写作引导语...'}</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>

              ${sections.length > 0 ? `
                <button class="ctm-fusion-add-section-btn" id="ctm-fusion-add-bottom">
                  <i class="fa-solid fa-plus"></i> 添加章节
                </button>
              ` : ''}
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
                          <option value="${key}" ${t.format === key ? 'selected' : ''}>${val.label}</option>
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

              <div class="ctm-fusion-sidebar-section">
                <div class="ctm-fusion-sidebar-title">
                  <i class="fa-solid fa-list"></i> 章节大纲
                  <button class="ctm-fusion-add-btn" id="ctm-fusion-add-sidebar">
                    <i class="fa-solid fa-plus"></i>
                  </button>
                </div>
                <div class="ctm-fusion-outline">
                  ${sections.length === 0 ? `
                    <div class="ctm-fusion-outline-empty">暂无章节</div>
                  ` : sections.map((section, index) => `
                    <div class="ctm-fusion-outline-item" data-outline-index="${index}" style="padding-left: ${(section.level - 1) * 12 + 8}px">
                      <i class="fa-solid fa-hashtag ctm-fusion-outline-icon"></i>
                      <span class="ctm-fusion-outline-text">${section.title || '未命名章节'}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderAIModal() {
    const hasDraft = this.aiDraftTemplate?.content?.sections?.length > 0 && this.aiDraftTemplate?.name;
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
          ${hasDraft ? `
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
          ` : ''}
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

    container.querySelectorAll('.ctm-template-card, .ctm-featured-card').forEach((card) => {
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

    container.querySelectorAll('[data-action="close-preview"]').forEach((el) => {
      el.addEventListener('click', () => {
        this.previewTemplate = null;
        this.refreshList();
      });
    });

    container.querySelectorAll('[data-action="use-preview"], [data-action="edit-preview"], [data-action="export-preview"], [data-action="clone-preview"], [data-action="delete-preview"]').forEach((el) => {
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

    const addSectionBtn = container.querySelector('#ctm-fusion-add-bottom, #ctm-fusion-add-sidebar');
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
          let value = el.innerText.trim();
          if (field === 'guide' && (value === '💡 添加写作引导语...' || value === '')) {
            value = '';
            if (!el.innerText) el.innerText = '💡 添加写作引导语...';
          }
          this.updateSection(index, field, value);
          this.updateOutline();
        });

        if (el.dataset.field === 'guide') {
          el.addEventListener('focus', () => {
            if (el.innerText === '💡 添加写作引导语...') {
              el.innerText = '';
            }
          });
        }
      });

      section.querySelectorAll('.ctm-fusion-section-btn[data-action]').forEach((btn) => {
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

    container.querySelectorAll('.ctm-fusion-outline-item').forEach((item) => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.outlineIndex);
        const sectionEl = container.querySelector(`.ctm-fusion-section[data-index="${index}"]`);
        if (sectionEl) {
          sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sectionEl.classList.add('ctm-fusion-section-highlight');
          setTimeout(() => sectionEl.classList.remove('ctm-fusion-section-highlight'), 1500);
        }
      });
    });

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
      container.querySelector('[data-action="close-doc-editor"]')?.addEventListener('click', () => {
        this.closeContentEditor();
      });
      container.querySelector('[data-action="save-doc"]')?.addEventListener('click', () => {
        this.saveContentDocument();
      });
      container.querySelector('[data-action="export-doc"]')?.addEventListener('click', () => {
        this.exportContentDocument();
      });
      container.querySelector('[data-action="share-doc"]')?.addEventListener('click', () => {
        this.shareContentDocument();
      });

      container.querySelectorAll('.ctm-doc-editor-body input, .ctm-doc-editor-body textarea').forEach((el) => {
        el.addEventListener('input', () => this.syncContentDocFromDOM());
      });
      container.querySelectorAll('.ctm-doc-editor-body [type="checkbox"]').forEach((el) => {
        el.addEventListener('change', () => this.syncContentDocFromDOM());
      });

      const docEditorEl = container.querySelector('.ctm-doc-editor');
      if (docEditorEl) {
        docEditorEl.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          const action = btn.dataset.action;
          if (['add-row', 'del-row', 'add-list-item', 'del-list-item', 'add-step', 'del-step'].includes(action)) {
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
        const rows = (template.content?.rows || [Array(columns.length).fill('')]).map((r) =>
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
    const saved = saveMyDocument({ ...this.contentDoc });
    this.contentDoc.id = saved.id;
    this.showToast('文档已保存到我的文档');
  }

  showToast(message) {
    const existing = this.container.querySelector('.ctm-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'ctm-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }

  syncContentDocFromDOM() {
    if (!this.contentDoc) return;
    const container = this.container;

    const titleInput = container.querySelector('[data-field="doc-title"]');
    if (titleInput) this.contentDoc.title = titleInput.value;

    if (this.contentDoc.format === 'word') {
      container.querySelectorAll('.ctm-doc-meta-input').forEach((el) => {
        const key = el.dataset.field?.replace('meta-', '');
        if (key) this.contentDoc.data.meta[key] = el.value;
      });
      container.querySelectorAll('.ctm-doc-section').forEach((section) => {
        const idx = parseInt(section.dataset.sectionIdx);
        const title = section.querySelector('[data-field="section-title"]')?.value || '';
        const text = section.querySelector('[data-field="section-text"]')?.value || '';
        if (this.contentDoc.data.sections[idx]) {
          this.contentDoc.data.sections[idx].title = title;
          this.contentDoc.data.sections[idx].text = text;
        }
      });
    } else if (this.contentDoc.format === 'table') {
      container.querySelectorAll('.ctm-doc-table tbody tr').forEach((row) => {
        const ri = parseInt(row.dataset.rowIdx);
        row.querySelectorAll('input[data-col]').forEach((input) => {
          const ci = parseInt(input.dataset.col);
          if (this.contentDoc.data.rows[ri]) {
            this.contentDoc.data.rows[ri][ci] = input.value;
          }
        });
      });
    } else if (this.contentDoc.format === 'email') {
      this.contentDoc.data.subject = container.querySelector('[data-field="email-subject"]')?.value || '';
      this.contentDoc.data.greeting = container.querySelector('[data-field="email-greeting"]')?.value || '';
      this.contentDoc.data.closing = container.querySelector('[data-field="email-closing"]')?.value || '';
      this.contentDoc.data.signature = container.querySelector('[data-field="email-signature"]')?.value || '';
      container.querySelectorAll('[data-field="email-body"]').forEach((el) => {
        const idx = parseInt(el.dataset.bodyIdx);
        this.contentDoc.data.body[idx] = el.value;
      });
    } else if (this.contentDoc.format === 'list') {
      container.querySelectorAll('.ctm-doc-list-item').forEach((item) => {
        const idx = parseInt(item.dataset.listIdx);
        const checked = item.querySelector('[data-field="list-check"]')?.checked || false;
        const text = item.querySelector('[data-field="list-text"]')?.value || '';
        if (this.contentDoc.data.items[idx]) {
          this.contentDoc.data.items[idx].checked = checked;
          this.contentDoc.data.items[idx].text = text;
        }
      });
    } else if (this.contentDoc.format === 'steps') {
      container.querySelectorAll('.ctm-doc-step').forEach((step) => {
        const idx = parseInt(step.dataset.stepIdx);
        const title = step.querySelector('[data-field="step-title"]')?.value || '';
        const detail = step.querySelector('[data-field="step-detail"]')?.value || '';
        if (this.contentDoc.data.steps[idx]) {
          this.contentDoc.data.steps[idx].title = title;
          this.contentDoc.data.steps[idx].detail = detail;
        }
      });
    }
  }

  handleDocStructureAction(action, btn) {
    if (!this.contentDoc) return;
    this.syncContentDocFromDOM();

    switch (action) {
      case 'add-row':
        this.contentDoc.data.rows.push(Array(this.contentDoc.data.columns.length).fill(''));
        break;
      case 'del-row': {
        const ri = parseInt(btn.dataset.rowIdx);
        this.contentDoc.data.rows.splice(ri, 1);
        if (this.contentDoc.data.rows.length === 0) {
          this.contentDoc.data.rows.push(Array(this.contentDoc.data.columns.length).fill(''));
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
      navigator.clipboard.writeText(shareText).then(() => {
        this.showToast('文档信息已复制到剪贴板');
      });
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
        content += row.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',') + '\n';
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
        content += values.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',') + '\n';
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
    const newSection = { title: `第${sections.length + 1}章`, level: 1, guide: '' };
    if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= sections.length) {
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
        this.editorTemplate.content = { ...this.editorTemplate.content, sections };
        this.refreshEditor();
      }
    }
  }

  deleteSection(index) {
    if (!this.editorTemplate) return;
    const sections = this.editorTemplate.content?.sections || [];
    if (index >= 0 && index < sections.length) {
      sections.splice(index, 1);
      this.editorTemplate.content = { ...this.editorTemplate.content, sections };
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
      outlineEl.innerHTML = '<div class="ctm-fusion-outline-empty">暂无章节</div>';
      return;
    }
    outlineEl.innerHTML = sections.map((section, index) => `
      <div class="ctm-fusion-outline-item" data-outline-index="${index}" style="padding-left: ${(section.level - 1) * 12 + 8}px">
        <i class="fa-solid fa-hashtag ctm-fusion-outline-icon"></i>
        <span class="ctm-fusion-outline-text">${section.title || '未命名章节'}</span>
      </div>
    `).join('');

    outlineEl.querySelectorAll('.ctm-fusion-outline-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.outlineIndex);
        const sectionEl = this.container.querySelector(`.ctm-fusion-section[data-index="${idx}"]`);
        if (sectionEl) {
          sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sectionEl.classList.add('ctm-fusion-section-highlight');
          setTimeout(() => sectionEl.classList.remove('ctm-fusion-section-highlight'), 1500);
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

    const sections = [];
    this.container.querySelectorAll('.ctm-fusion-section').forEach((item) => {
      const title = item.querySelector('[data-field="title"]')?.innerText?.trim() || '';
      const level = parseInt(item.dataset.level) || 1;
      const guideText = item.querySelector('[data-field="guide"]')?.innerText?.trim() || '';
      const guide = guideText === '💡 添加写作引导语...' ? '' : guideText;
      if (title.trim()) {
        sections.push({ title: title.trim(), level, guide: guide.trim() });
      }
    });

    const template = {
      ...this.editorTemplate,
      name: nameEl.value.trim(),
      description: descEl?.value.trim() || '',
      format: formatEl?.value || 'word',
      category: [categoryEl?.value || 'personal'],
      tags: tagsEl?.value
        ? tagsEl.value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      content: {
        ...this.editorTemplate.content,
        sections,
      },
    };

    saveMyContentTemplate(template);
    this.editorTemplate = null;
    this.editorMode = 'create';
    this.refreshList();
  }

  openAICreator() {
    this.aiChatMessages = [
      {
        role: 'ai',
        content: '你好！我来帮你创建内容模板。请告诉我，你想创建什么类型的模板？比如项目报告、客户邮件、工作清单等。',
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
      this.aiDraftTemplate.content.sections = mockSections.map((s) => ({ title: s, level: 1, guide: '' }));

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
}
