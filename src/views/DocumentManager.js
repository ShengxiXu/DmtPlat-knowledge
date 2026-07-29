import { getMyDocuments, deleteMyDocument, formatLabels } from '../data/contentTemplates.js';
import { getWorkHistory, saveWorkHistory } from '../data/workAssistantData.js';

const SOURCE_LABELS = {
  content: '文档模板',
  scene: '场景生成',
};

const SOURCE_ICONS = {
  content: 'fa-file-lines',
  scene: 'fa-wand-magic-sparkles',
};

const SOURCE_COLORS = {
  content: '#2563eb',
  scene: '#10b981',
};

const SCENE_OUTPUT_LABELS = {
  ppt: 'PPT',
  table: '表格',
  text: '文本',
  markdown: 'Markdown',
  list: '清单',
  email: '邮件',
  steps: '流程',
  report: '报告',
  qa: '问答',
};

const SCENE_OUTPUT_ICONS = {
  ppt: 'fa-file-powerpoint',
  table: 'fa-table-cells',
  text: 'fa-align-left',
  markdown: 'fa-markdown',
  list: 'fa-list-check',
  email: 'fa-envelope',
  steps: 'fa-list-ol',
  report: 'fa-file-contract',
  qa: 'fa-circle-question',
};

function inferSceneOutputType(record) {
  const result = record.result;
  if (!result) return record.template?.outputType || 'text';
  if (result.pages || result.slides) return 'ppt';
  if (result.columns && result.rows) return 'table';
  if (Array.isArray(result.items)) return 'list';
  if (Array.isArray(result.steps)) return 'steps';
  if (result.subject || result.greeting) return 'email';
  if (result.sections && result.sections.length > 0) return 'report';
  if (result.qaPairs || result.questions) return 'qa';
  return record.template?.outputType || 'text';
}

function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export class DocumentManager {
  constructor(container, options = {}) {
    this.container = container;
    this.onOpenContentDoc = options.onOpenContentDoc || (() => {});
    this.onOpenSceneRecord = options.onOpenSceneRecord || (() => {});
    this.onGotoContent = options.onGotoContent || (() => {});
    this.onGotoWork = options.onGotoWork || (() => {});
    this.searchQuery = '';
    this.sourceFilter = 'all';
    this.outputTypeFilter = 'all';
    this.sortBy = 'updatedAt';
    this.sortOrder = 'desc';
    this.currentPage = 1;
    this.pageSize = 10;
    this.viewMode = 'list';
    this.activeMenuId = null;
    this.newDropdownOpen = false;
    this.documents = [];
    this.init();
  }

  init() {
    this.loadDocuments();
    this.render();
    this.bindEvents();
  }

  normalizeDocuments() {
    const contentDocs = getMyDocuments().map((doc) => {
      const format = doc.format || 'word';
      const labelInfo = formatLabels[format] || { label: format, icon: 'fa-file', color: '#6b7280' };
      return {
        id: doc.id,
        sourceType: 'content',
        title: doc.title || '未命名文档',
        templateId: doc.templateId || '',
        templateName: doc.templateName || '未知模板',
        outputType: format,
        outputTypeLabel: labelInfo.label,
        outputIcon: labelInfo.icon,
        outputColor: labelInfo.color,
        roleName: '',
        abilityName: '',
        mode: '',
        createdAt: doc.createdAt || doc.updatedAt,
        updatedAt: doc.updatedAt,
        raw: doc,
      };
    });

    const sceneRecords = getWorkHistory().map((record) => {
      const outputType = inferSceneOutputType(record);
      return {
        id: record.id,
        sourceType: 'scene',
        title: this.getSceneRecordTitle(record),
        templateId: record.templateId || '',
        templateName: record.templateName || '未知模板',
        outputType,
        outputTypeLabel: SCENE_OUTPUT_LABELS[outputType] || outputType,
        outputIcon: SCENE_OUTPUT_ICONS[outputType] || 'fa-file',
        outputColor: '#7c3aed',
        roleName: record.roleName || '',
        abilityName: record.abilityName || '',
        mode: record.mode || '',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        raw: record,
      };
    });

    return [...contentDocs, ...sceneRecords];
  }

  getSceneRecordTitle(record) {
    if (record.result) {
      if (record.result.title) return record.result.title;
      if (record.result.subject) return record.result.subject;
      if (record.result.name) return record.result.name;
    }
    const templateName = record.templateName || '未命名场景';
    return `基于《${templateName}》的创作`;
  }

  loadDocuments() {
    this.documents = this.normalizeDocuments();
  }

  getFilteredDocuments() {
    let list = [...this.documents];

    if (this.sourceFilter !== 'all') {
      list = list.filter((d) => d.sourceType === this.sourceFilter);
    }

    if (this.outputTypeFilter !== 'all') {
      list = list.filter((d) => d.outputType === this.outputTypeFilter);
    }

    if (this.searchQuery.trim()) {
      const kw = this.searchQuery.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(kw) ||
          d.templateName.toLowerCase().includes(kw) ||
          d.outputTypeLabel.toLowerCase().includes(kw)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (this.sortBy === 'updatedAt' || this.sortBy === 'createdAt') {
        const ta = new Date(a[this.sortBy] || 0).getTime();
        const tb = new Date(b[this.sortBy] || 0).getTime();
        cmp = ta - tb;
      } else if (this.sortBy === 'title') {
        cmp = a.title.localeCompare(b.title, 'zh-CN');
      }
      return this.sortOrder === 'asc' ? cmp : -cmp;
    });

    return list;
  }

  getPaginatedDocuments() {
    const filtered = this.getFilteredDocuments();
    const start = (this.currentPage - 1) * this.pageSize;
    return {
      list: filtered.slice(start, start + this.pageSize),
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / this.pageSize),
    };
  }

  getOutputTypeOptions() {
    const counts = { all: this.documents.length };
    this.documents.forEach((d) => {
      counts[d.outputType] = (counts[d.outputType] || 0) + 1;
    });

    const seen = new Set();
    const options = [{ value: 'all', label: '全部类型', count: counts.all }];

    this.documents.forEach((d) => {
      if (seen.has(d.outputType)) return;
      seen.add(d.outputType);
      options.push({
        value: d.outputType,
        label: d.outputTypeLabel,
        count: counts[d.outputType] || 0,
      });
    });

    return options;
  }

  render() {
    const { list, total, totalPages } = this.getPaginatedDocuments();
    const outputOptions = this.getOutputTypeOptions();

    this.container.innerHTML = `
      <header class="header doc-manager-header">
        <div class="doc-manager-header-left">
          <h1 class="header-title">我的文档</h1>
          <span class="doc-manager-count">${total} 个文档</span>
        </div>
        <div class="header-actions">
          <div class="search-box doc-manager-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="doc-search-input" class="input" placeholder="搜索文档标题、模板名称..." value="${this.escapeHtml(this.searchQuery)}">
          </div>
          ${this.renderNewButton()}
        </div>
      </header>

      <div class="content doc-manager-content">
        <div class="doc-manager-panel">
          <div class="doc-manager-panel-header">
            <div class="doc-manager-tabs" id="doc-source-filter">
              <button class="doc-manager-tab ${this.sourceFilter === 'all' ? 'active' : ''}" data-source="all">
                全部
              </button>
              <button class="doc-manager-tab ${this.sourceFilter === 'content' ? 'active' : ''}" data-source="content">
                文档模板
              </button>
              <button class="doc-manager-tab ${this.sourceFilter === 'scene' ? 'active' : ''}" data-source="scene">
                场景生成
              </button>
            </div>

            <div class="doc-manager-controls">
              <select class="doc-manager-select" id="doc-output-filter">
                ${outputOptions
                  .map(
                    (opt) =>
                      `<option value="${opt.value}" ${this.outputTypeFilter === opt.value ? 'selected' : ''}>${opt.label} (${opt.count})</option>`
                  )
                  .join('')}
              </select>

              <select class="doc-manager-select" id="doc-sort">
                <option value="updatedAt-desc" ${this.sortBy === 'updatedAt' && this.sortOrder === 'desc' ? 'selected' : ''}>最近更新</option>
                <option value="updatedAt-asc" ${this.sortBy === 'updatedAt' && this.sortOrder === 'asc' ? 'selected' : ''}>最早更新</option>
                <option value="createdAt-desc" ${this.sortBy === 'createdAt' && this.sortOrder === 'desc' ? 'selected' : ''}>最近创建</option>
                <option value="createdAt-asc" ${this.sortBy === 'createdAt' && this.sortOrder === 'asc' ? 'selected' : ''}>最早创建</option>
                <option value="title-asc" ${this.sortBy === 'title' && this.sortOrder === 'asc' ? 'selected' : ''}>名称升序</option>
                <option value="title-desc" ${this.sortBy === 'title' && this.sortOrder === 'desc' ? 'selected' : ''}>名称降序</option>
              </select>

              <div class="doc-manager-view-toggle" id="doc-view-toggle">
                <button class="doc-manager-view-btn ${this.viewMode === 'list' ? 'active' : ''}" data-mode="list" title="列表视图">
                  <i class="fa-solid fa-list"></i>
                </button>
                <button class="doc-manager-view-btn ${this.viewMode === 'grid' ? 'active' : ''}" data-mode="grid" title="网格视图">
                  <i class="fa-solid fa-border-all"></i>
                </button>
              </div>
            </div>
          </div>

          ${list.length === 0 ? this.renderEmpty() : this.viewMode === 'list' ? this.renderListView(list) : this.renderGridView(list)}

          ${this.renderPagination(totalPages)}
        </div>
      </div>

      ${this.activeMenuId ? this.renderActionMenu() : ''}
    `;
  }

  renderNewButton() {
    return `
      <div class="doc-manager-new-wrap ${this.newDropdownOpen ? 'dropdown-open' : ''}" id="doc-manager-new-wrap">
        <button class="doc-manager-new-btn" id="doc-manager-new-btn" type="button">
          <i class="fa-solid fa-plus"></i>
          <span>新建</span>
          <i class="fa-solid ${this.newDropdownOpen ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
        </button>
        ${this.newDropdownOpen ? `
          <div class="doc-manager-new-dropdown">
            <div class="doc-manager-new-dropdown-item" data-action="goto-content">
              <div class="doc-manager-new-dropdown-icon" style="background:#2563eb15;color:#2563eb">
                <i class="fa-solid fa-file-lines"></i>
              </div>
              <div class="doc-manager-new-dropdown-info">
                <div class="doc-manager-new-dropdown-title">从文档模板新建</div>
                <div class="doc-manager-new-dropdown-desc">选择现成文档模板，直接编辑内容</div>
              </div>
            </div>
            <div class="doc-manager-new-dropdown-item" data-action="goto-work">
              <div class="doc-manager-new-dropdown-icon" style="background:#10b98115;color:#10b981">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
              </div>
              <div class="doc-manager-new-dropdown-info">
                <div class="doc-manager-new-dropdown-title">按场景生成</div>
                <div class="doc-manager-new-dropdown-desc">按场景填写字段，AI 生成内容</div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderListView(list) {
    return `
      <div class="doc-manager-list">
        <div class="doc-manager-list-header">
          <div class="doc-manager-cell doc-manager-cell-title">文档</div>
          <div class="doc-manager-cell doc-manager-cell-source">来源</div>
          <div class="doc-manager-cell doc-manager-cell-template">模板</div>
          <div class="doc-manager-cell doc-manager-cell-time">更新时间</div>
          <div class="doc-manager-cell doc-manager-cell-actions"></div>
        </div>
        ${list.map((doc) => this.renderListRow(doc)).join('')}
      </div>
    `;
  }

  renderListRow(doc) {
    const sourceColor = SOURCE_COLORS[doc.sourceType];
    const sourceBg = `${sourceColor}15`;
    const initial = this.getDocInitial(doc);
    const subtitle = this.getDocSubtitle(doc);
    return `
      <div class="doc-manager-list-row" data-id="${doc.id}" data-source="${doc.sourceType}">
        <div class="doc-manager-cell doc-manager-cell-title">
          <div class="doc-manager-file-icon" style="color:${doc.outputColor};background:${doc.outputColor}12">
            <i class="fa-solid ${doc.outputIcon}"></i>
          </div>
          <div class="doc-manager-title-info">
            <div class="doc-manager-title-text" title="${this.escapeHtml(doc.title)}">${this.escapeHtml(doc.title)}</div>
            ${subtitle ? `<div class="doc-manager-title-sub">${subtitle}</div>` : ''}
          </div>
        </div>
        <div class="doc-manager-cell doc-manager-cell-source">
          <span class="doc-manager-source-badge" style="color:${sourceColor};background:${sourceBg}">
            <i class="fa-solid ${SOURCE_ICONS[doc.sourceType]}"></i>
            ${SOURCE_LABELS[doc.sourceType]}
          </span>
        </div>
        <div class="doc-manager-cell doc-manager-cell-template" title="${this.escapeHtml(doc.templateName)}">
          ${this.escapeHtml(doc.templateName)}
        </div>
        <div class="doc-manager-cell doc-manager-cell-time">${formatDateTime(doc.updatedAt)}</div>
        <div class="doc-manager-cell doc-manager-cell-actions">
          <button class="doc-manager-menu-btn" data-id="${doc.id}" data-source="${doc.sourceType}" data-title="${this.escapeHtml(doc.title)}" aria-label="更多操作">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
        </div>
      </div>
    `;
  }

  getDocInitial(doc) {
    if (!doc.title) return '?';
    return doc.title.trim().charAt(0).toUpperCase();
  }

  getDocSubtitle(doc) {
    const parts = [];
    if (doc.roleName) parts.push(doc.roleName);
    if (doc.abilityName) parts.push(doc.abilityName);
    if (doc.outputTypeLabel) parts.push(doc.outputTypeLabel);
    return parts.join(' · ');
  }

  renderGridView(list) {
    return `
      <div class="doc-manager-grid">
        ${list.map((doc) => this.renderGridCard(doc)).join('')}
      </div>
    `;
  }

  renderGridCard(doc) {
    const sourceColor = SOURCE_COLORS[doc.sourceType];
    const sourceBg = `${sourceColor}15`;
    const subtitle = this.getDocSubtitle(doc);
    return `
      <div class="doc-manager-card" data-id="${doc.id}" data-source="${doc.sourceType}">
        <div class="doc-manager-card-top">
          <div class="doc-manager-card-icon" style="color:${doc.outputColor};background:${doc.outputColor}12">
            <i class="fa-solid ${doc.outputIcon}"></i>
          </div>
          <button class="doc-manager-menu-btn" data-id="${doc.id}" data-source="${doc.sourceType}" data-title="${this.escapeHtml(doc.title)}" aria-label="更多操作">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
        </div>
        <div class="doc-manager-card-title" title="${this.escapeHtml(doc.title)}">${this.escapeHtml(doc.title)}</div>
        ${subtitle ? `<div class="doc-manager-card-subtitle">${subtitle}</div>` : ''}
        <div class="doc-manager-card-meta">
          <span class="doc-manager-source-badge" style="color:${sourceColor};background:${sourceBg}">
            ${SOURCE_LABELS[doc.sourceType]}
          </span>
          <span class="doc-manager-card-template" title="${this.escapeHtml(doc.templateName)}">
            ${this.escapeHtml(doc.templateName)}
          </span>
        </div>
        <div class="doc-manager-card-footer">
          <span class="doc-manager-card-time">${formatDateTime(doc.updatedAt)}</span>
        </div>
      </div>
    `;
  }

  renderActionMenu() {
    const doc = this.documents.find((d) => d.id === this.activeMenuId);
    if (!doc) return '';
    const rect = this.activeMenuRect || { left: 0, top: 0 };

    return `
      <div class="doc-manager-menu-overlay" id="doc-menu-overlay">
        <div class="doc-manager-dropdown" style="left:${rect.left}px;top:${rect.top}px">
          <div class="doc-manager-dropdown-item doc-manager-dropdown-open" data-id="${doc.id}" data-source="${doc.sourceType}">
            <i class="fa-solid fa-eye"></i> 打开
          </div>
          <div class="doc-manager-dropdown-item doc-manager-dropdown-delete" data-id="${doc.id}" data-source="${doc.sourceType}" data-title="${this.escapeHtml(doc.title)}">
            <i class="fa-solid fa-trash"></i> 删除
          </div>
        </div>
      </div>
    `;
  }

  renderPagination(totalPages) {
    if (totalPages <= 1) return '';
    let html = `<button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} id="doc-prev-page">←</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn ${this.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} id="doc-next-page">→</button>`;
    html += `<div class="page-info">第 ${this.currentPage} / ${totalPages} 页</div>`;
    return `<div class="pagination doc-manager-pagination" id="doc-pagination">${html}</div>`;
  }

  renderEmpty() {
    return `
      <div class="doc-manager-empty">
        <div class="doc-manager-empty-icon">
          <i class="fa-solid fa-folder-open"></i>
        </div>
        <div class="doc-manager-empty-title">暂无文档</div>
        <div class="doc-manager-empty-desc">通过「智能工作助手」或「内容模板」创建文档后，会在这里统一管理。</div>
        <div class="doc-manager-empty-actions">
          <button class="btn btn-primary doc-manager-goto-content">新建文档</button>
          <button class="btn btn-secondary doc-manager-goto-work">场景创作</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const searchInput = document.getElementById('doc-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.render();
        this.bindEvents();
      });
    }

    this.container.querySelectorAll('.doc-manager-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.sourceFilter = btn.dataset.source;
        this.outputTypeFilter = 'all';
        this.currentPage = 1;
        this.render();
        this.bindEvents();
      });
    });

    const outputFilter = document.getElementById('doc-output-filter');
    if (outputFilter) {
      outputFilter.addEventListener('change', (e) => {
        this.outputTypeFilter = e.target.value;
        this.currentPage = 1;
        this.render();
        this.bindEvents();
      });
    }

    const sortSelect = document.getElementById('doc-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [field, order] = e.target.value.split('-');
        this.sortBy = field;
        this.sortOrder = order;
        this.currentPage = 1;
        this.render();
        this.bindEvents();
      });
    }

    const viewToggle = document.getElementById('doc-view-toggle');
    if (viewToggle) {
      viewToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.doc-manager-view-btn');
        if (!btn) return;
        this.viewMode = btn.dataset.mode;
        this.render();
        this.bindEvents();
      });
    }

    this.container.querySelectorAll('.doc-manager-list-row, .doc-manager-card').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.doc-manager-menu-btn')) return;
        const id = row.dataset.id;
        const source = row.dataset.source;
        this.handleOpen(id, source);
      });
    });

    this.container.querySelectorAll('.doc-manager-menu-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = btn.getBoundingClientRect();
        this.activeMenuRect = {
          left: rect.left + rect.width - 120,
          top: rect.bottom + 6,
        };
        this.activeMenuId = btn.dataset.id;
        this.render();
        this.bindEvents();
      });
    });

    const menuOverlay = document.getElementById('doc-menu-overlay');
    if (menuOverlay) {
      menuOverlay.addEventListener('click', (e) => {
        if (e.target === menuOverlay) {
          this.closeMenu();
        }
      });

      menuOverlay.querySelector('.doc-manager-dropdown-open')?.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const source = e.currentTarget.dataset.source;
        this.closeMenu();
        this.handleOpen(id, source);
      });

      menuOverlay.querySelector('.doc-manager-dropdown-delete')?.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const source = e.currentTarget.dataset.source;
        const title = e.currentTarget.dataset.title;
        this.closeMenu();
        this.handleDelete(id, source, title);
      });
    }

    const pagination = document.getElementById('doc-pagination');
    if (pagination) {
      pagination.addEventListener('click', (e) => {
        const target = e.target.closest('.page-btn');
        if (!target) return;
        const { totalPages } = this.getPaginatedDocuments();
        if (target.id === 'doc-prev-page' && this.currentPage > 1) {
          this.currentPage--;
        } else if (target.id === 'doc-next-page') {
          if (this.currentPage < totalPages) this.currentPage++;
        } else if (target.dataset.page) {
          this.currentPage = parseInt(target.dataset.page, 10);
        }
        this.render();
        this.bindEvents();
      });
    }

    // 新建按钮下拉菜单
    const newBtn = document.getElementById('doc-manager-new-btn');
    if (newBtn) {
      newBtn.addEventListener('click', (e) => {
        // 如果点击的是下拉项，不切换下拉状态（由下拉项自己的事件处理）
        if (e.target.closest('.doc-manager-new-dropdown-item')) return;
        this.newDropdownOpen = !this.newDropdownOpen;
        this.render();
        this.bindEvents();
      });
    }

    this.container.querySelectorAll('.doc-manager-new-dropdown-item[data-action="goto-content"]').forEach((el) => {
      el.addEventListener('click', () => {
        this.newDropdownOpen = false;
        if (this.onGotoContent) this.onGotoContent();
      });
    });

    this.container.querySelectorAll('.doc-manager-new-dropdown-item[data-action="goto-work"]').forEach((el) => {
      el.addEventListener('click', () => {
        this.newDropdownOpen = false;
        if (this.onGotoWork) this.onGotoWork();
      });
    });

    this.container.querySelectorAll('.doc-manager-goto-content').forEach((el) => {
      el.addEventListener('click', () => {
        if (this.onGotoContent) this.onGotoContent();
      });
    });

    this.container.querySelectorAll('.doc-manager-goto-work').forEach((el) => {
      el.addEventListener('click', () => {
        if (this.onGotoWork) this.onGotoWork();
      });
    });

    // 点击页面其他区域关闭新建下拉菜单
    if (this.newDropdownOpen) {
      const closeDropdown = (e) => {
        if (!e.target.closest('#doc-manager-new-wrap')) {
          this.newDropdownOpen = false;
          this.render();
          this.bindEvents();
          document.removeEventListener('click', closeDropdown);
        }
      };
      setTimeout(() => document.addEventListener('click', closeDropdown), 0);
    }
  }

  closeMenu() {
    this.activeMenuId = null;
    this.activeMenuRect = null;
    this.render();
    this.bindEvents();
  }

  handleOpen(id, source) {
    if (source === 'content') {
      this.onOpenContentDoc(id);
    } else if (source === 'scene') {
      this.onOpenSceneRecord(id);
    }
  }

  handleDelete(id, source, title) {
    if (!confirm(`确定要删除文档「${title}」吗？删除后无法恢复。`)) return;

    if (source === 'content') {
      deleteMyDocument(id);
    } else if (source === 'scene') {
      const history = getWorkHistory().filter((r) => r.id !== id);
      saveWorkHistory(history);
    }

    this.loadDocuments();
    this.currentPage = 1;
    this.render();
    this.bindEvents();
    this.showToast('文档已删除');
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-info';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
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

  setOnOpenContentDoc(callback) {
    this.onOpenContentDoc = callback;
  }

  setOnOpenSceneRecord(callback) {
    this.onOpenSceneRecord = callback;
  }

  setOnGotoContent(callback) {
    this.onGotoContent = callback;
  }

  setOnGotoWork(callback) {
    this.onGotoWork = callback;
  }
}
