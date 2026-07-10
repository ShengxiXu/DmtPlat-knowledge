import {
  workRoles,
  workAbilities,
  workTemplates,
  outputTypes,
  fieldTypes,
  getAbilityById,
  getRoleById,
  getTemplatesByAbility,
  getRecommendedTemplates,
  getAllTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  getCustomTemplates,
  getTeamTemplates,
  publishTeamTemplate,
  approveTeamTemplate,
  rejectTeamTemplate,
  extractTemplateFromExample,
  getWorkHistory,
  getLastRole,
  setLastRole,
  getDraft,
  saveDraft,
  createWorkRecord,
  addWorkHistory,
  mockGenerateContent,
  generatePPTContentFromOutline,
} from '../data/workAssistantData.js';
import { knowledgeBases } from '../data/mockData.js';
import { formatDate, generateId } from '../utils/helpers.js';

export class WorkAssistant {
  constructor(container) {
    this.container = container;
    this.activeRole = getLastRole();
    this.activeTab = 'home';
    this.selectedTemplate = null;
    this.currentResult = null;
    this.currentFormData = null;
    this.currentMode = null;
    this.currentKBs = [];
    this.pptViewMode = 'outline'; // 'outline' | 'slide'
    this.pptCurrentPage = 0;
    this.dragSrcIndex = null;
    this.pptStage = 'outline'; // 'outline' | 'content'

    // 母版生成状态
    this.useMaster = true;
    this.currentMasterData = null;

    // 自由生成附件
    this.freeAttachments = [];
    this.currentAttachments = [];

    // 模板创建器状态
    this.creatorTab = 'chat'; // 'chat' | 'form' | 'extract'
    this.creatorForm = this.getDefaultCreatorForm();
    this.extractForm = { name: '', roleId: 'sales', abilityId: 'writing', outputType: outputTypes.TEXT, exampleText: '' };
    this.extractPreview = null;
    this.extractFile = null;
    this.extractParsing = false;

    // 对话式创建模板状态
    this.conversationState = this.getDefaultConversationState();

    // 模板市场状态
    this.marketTab = 'all'; // 'all' | 'mine' | 'pending'

    this.render();
  }

  getRecentHistory() {
    const history = getWorkHistory();
    return history.slice(0, 5);
  }

  formatTime(isoString) {
    if (!isoString) return '';
    return formatDate(isoString);
  }

  render() {
    if (this.activeTab === 'editor' && this.selectedTemplate) {
      this.renderEditor();
      return;
    }
    if (this.activeTab === 'history') {
      this.renderHistory();
      return;
    }
    if (this.activeTab === 'templateCreator') {
      this.renderTemplateCreator();
      return;
    }
    if (this.activeTab === 'templateMarket') {
      this.renderTemplateMarket();
      return;
    }
    this.renderHome();
  }

  // ===================== 首页 =====================

  renderHome() {
    const recentHistory = this.getRecentHistory();
    const role = getRoleById(this.activeRole);
    const recommendedTemplates = getRecommendedTemplates(this.activeRole);
    const quickStarts = this.getQuickStartPrompts();

    this.container.innerHTML = `
      <header class="header">
        <div>
          <h1 class="header-title">智能工作助手</h1>
          <div style="font-size:13px;color:var(--kb-text-muted);margin-top:4px;">基于知识库或大模型能力，快速生成岗位工作所需内容</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-ghost" id="wa-template-market-btn">
            <i class="fa-solid fa-store"></i> 模板市场
          </button>
          <button class="btn btn-secondary" id="wa-history-btn">
            <i class="fa-solid fa-clock-rotate-left"></i> 我的内容
          </button>
        </div>
      </header>

      <div class="content wa-home wa-home-v2">
        <div class="wa-hero">
          <div class="wa-hero-greeting">Hello伙伴！有什么能帮到你的吗？</div>
          <div class="wa-hero-sub">描述你的创作需求，或直接选择下方的常用场景开始</div>
          <div class="wa-hero-input-wrap">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <input type="text" class="wa-hero-input" id="wa-hero-input" placeholder="例如：给客户写一份产品方案 PPT、生成销售周报..." autocomplete="off">
            <button class="btn btn-primary" id="wa-hero-create"><i class="fa-solid fa-paper-plane"></i> 开始创作</button>
          </div>
          <div class="wa-hero-chips">
            ${quickStarts.map((q) => `<button class="wa-hero-chip" data-prompt="${this.escapeHtml(q.prompt)}">${q.label}</button>`).join('')}
          </div>
        </div>

        ${recentHistory.length > 0 ? `
          <div class="wa-section">
            <div class="wa-section-header">
              <div class="wa-section-title">最近创作</div>
              <button class="btn btn-sm btn-ghost" id="wa-view-all-history">查看全部</button>
            </div>
            <div class="wa-recent-list">
              ${recentHistory.map((item) => this.renderRecentItem(item)).join('')}
            </div>
          </div>
        ` : ''}

        <div class="wa-section">
          <div class="wa-section-header">
            <div class="wa-section-title">选择岗位</div>
            <span style="font-size:12px;color:var(--kb-text-muted);">切换岗位可查看对应推荐场景</span>
          </div>
          <div class="wa-role-pills">
            ${workRoles.map((r) => this.renderRolePill(r)).join('')}
          </div>
        </div>

        <div class="wa-section">
          <div class="wa-section-header">
            <div class="wa-section-title">${role?.name || ''}推荐场景</div>
            <button class="btn btn-sm btn-ghost" id="wa-template-creator-btn">
              <i class="fa-solid fa-plus"></i> 创建模板
            </button>
          </div>
          <div class="wa-template-grid">
            ${recommendedTemplates.map((template) => this.renderTemplateShortcut(template)).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindHomeEvents();
  }

  getQuickStartPrompts() {
    return [
      { label: '客户方案 PPT', prompt: '给客户写一份产品方案 PPT' },
      { label: '销售周报', prompt: '生成销售周报' },
      { label: '竞品对比表', prompt: '生成竞品对比表' },
      { label: '客服回复', prompt: '生成一段客服标准回复' },
      { label: '营销文案', prompt: '写一段产品营销文案' },
    ];
  }

  renderRolePill(role) {
    const active = role.id === this.activeRole;
    return `
      <button class="wa-role-pill ${active ? 'active' : ''}" data-role="${role.id}" style="--role-color:${role.color}">
        <i class="fa-solid fa-${role.icon}"></i>
        <span>${role.name}</span>
      </button>
    `;
  }

  renderTemplateShortcut(template) {
    const role = getRoleById(template.roleId);
    const ability = getAbilityById(template.abilityId);
    return `
      <div class="wa-template-shortcut" data-template="${template.id}">
        <div class="wa-template-shortcut-icon"><i class="fa-solid fa-${template.icon || 'file-lines'}"></i></div>
        <div class="wa-template-shortcut-info">
          <div class="wa-template-shortcut-name">${template.name}</div>
          <div class="wa-template-shortcut-desc">${template.description || ''}</div>
          <div class="wa-template-shortcut-meta">
            <span style="color:${role?.color || 'var(--kb-text-muted)'}">${role?.name || ''}</span>
            <span>·</span>
            <span>${ability?.name || ''}</span>
          </div>
        </div>
        <div class="wa-template-shortcut-arrow"><i class="fa-solid fa-chevron-right"></i></div>
      </div>
    `;
  }

  renderRecentItem(item) {
    return `
      <div class="wa-recent-item" data-id="${item.id}">
        <div class="wa-recent-icon">
          <i class="fa-solid fa-${this.getTemplateIcon(item.templateId)}"></i>
        </div>
        <div class="wa-recent-content">
          <div class="wa-recent-title">${item.templateName}</div>
          <div class="wa-recent-desc">${this.getResultPreview(item.result)}</div>
          <div class="wa-recent-meta">
            <span>${item.roleName || getRoleById(item.roleId)?.name || ''}</span>
            <span>·</span>
            <span>${item.abilityName || getAbilityById(item.abilityId)?.name || ''}</span>
            <span>·</span>
            <span>${this.getModeLabel(item.mode)}</span>
            ${item.kbNames.length > 0 ? `<span>·</span><span>${item.kbNames.join('、')}</span>` : ''}
            <span>·</span>
            <span>${this.formatTime(item.updatedAt)}</span>
          </div>
        </div>
        <div class="wa-recent-arrow">
          <i class="fa-solid fa-chevron-right"></i>
        </div>
      </div>
    `;
  }

  handleNaturalLanguageCreate(value) {
    // 优先尝试匹配现有模板
    const matchedRole = this.matchRoleByText(value) || this.activeRole;
    const { abilityId, outputType } = this.inferAbilityAndOutput(value);
    const candidates = getAllTemplates().filter(
      (t) => t.roleId === matchedRole && t.abilityId === abilityId && t.outputType === outputType
    );

    if (candidates.length > 0) {
      this.selectedTemplate = candidates[0];
      this.activeTab = 'editor';
      this.render();
      return;
    }

    // 未匹配到，进入对话式创建流程，并把用户输入作为首条消息
    this.activeTab = 'templateCreator';
    this.creatorTab = 'chat';
    this.conversationState = this.getDefaultConversationState();
    this.conversationState.messages.push({ role: 'user', content: value, timestamp: Date.now() });
    this.advanceConversationStep(value);
    const reply = this.generateNextQuestion();
    this.conversationState.messages.push({ role: 'ai', content: reply, timestamp: Date.now() });
    this.conversationState.started = true;
    this.render();
  }

  // ===================== 能力选择弹窗 =====================

  renderAbilityModal(abilityId) {
    const ability = getAbilityById(abilityId);
    const templates = getTemplatesByAbility(this.activeRole, abilityId);

    return `
      <div class="wa-modal-overlay" id="wa-ability-modal">
        <div class="wa-modal wa-modal-lg">
          <div class="wa-modal-header">
            <div class="wa-modal-title">
              <i class="fa-solid fa-${ability.icon}"></i>
              ${ability.name}
            </div>
            <button class="wa-modal-close" id="wa-ability-modal-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="wa-modal-body">
            <div class="wa-ability-modal-desc">${ability.description}</div>
            ${templates.length > 0 ? `
              <div class="wa-template-list">
                ${templates.map((template) => `
                  <div class="wa-template-list-item" data-template="${template.id}">
                    <div class="wa-template-list-icon"><i class="fa-solid fa-${template.icon}"></i></div>
                    <div class="wa-template-list-info">
                      <div class="wa-template-list-name">${template.name}</div>
                      <div class="wa-template-list-desc">${template.description}</div>
                    </div>
                    <button class="btn btn-sm btn-primary">使用</button>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="wa-empty-state" style="padding:40px 0;">
                <div class="wa-empty-title">该岗位暂无可用的${ability.name}模板</div>
                <div class="wa-empty-desc">试试切换其他岗位，或使用通用任务</div>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  openAbilityModal(abilityId) {
    const modalHTML = this.renderAbilityModal(abilityId);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.bindAbilityModalEvents(abilityId);
  }

  bindAbilityModalEvents(abilityId) {
    const modal = document.getElementById('wa-ability-modal');
    if (!modal) return;

    const close = () => modal.remove();

    document.getElementById('wa-ability-modal-close')?.addEventListener('click', close);

    modal.querySelectorAll('.wa-template-list-item').forEach((item) => {
      item.addEventListener('click', () => {
        const templateId = item.dataset.template;
        this.selectedTemplate = getAllTemplates().find((t) => t.id === templateId);
        this.activeTab = 'editor';
        modal.remove();
        this.render();
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  // ===================== 历史记录 =====================

  renderHistory() {
    const history = getWorkHistory();

    this.container.innerHTML = `
      <header class="header">
        <div style="display:flex;align-items:center;gap:16px;">
          <button class="btn btn-ghost" id="wa-back-home">← 返回</button>
          <h1 class="header-title">我的内容</h1>
        </div>
      </header>

      <div class="content wa-history">
        ${history.length === 0 ? `
          <div class="wa-empty-state">
            <div class="wa-empty-icon"><i class="fa-solid fa-folder-open"></i></div>
            <div class="wa-empty-title">还没有创作记录</div>
            <div class="wa-empty-desc">从首页选择一个模板开始生成内容</div>
            <button class="btn btn-primary" id="wa-back-home-empty">去创作</button>
          </div>
        ` : `
          <div class="wa-history-list">
            ${history.map((item) => this.renderHistoryItem(item)).join('')}
          </div>
        `}
      </div>
    `;

    this.bindHistoryEvents();
  }

  renderHistoryItem(item) {
    return `
      <div class="wa-history-item" data-id="${item.id}">
        <div class="wa-history-main">
          <div class="wa-history-title">${item.templateName}</div>
          <div class="wa-history-preview">${this.getResultPreview(item.result)}</div>
          <div class="wa-history-meta">
            <span class="wa-history-role">${item.roleName}</span>
            <span>${item.abilityName}</span>
            <span>${this.getModeLabel(item.mode)}</span>
            <span>${this.formatTime(item.updatedAt)}</span>
          </div>
        </div>
        <div class="wa-history-actions">
          <button class="btn btn-sm btn-ghost wa-history-open" data-id="${item.id}">打开</button>
          <button class="btn btn-sm btn-ghost wa-history-copy" data-id="${item.id}">复制</button>
          <button class="btn btn-sm btn-ghost wa-history-delete" data-id="${item.id}">删除</button>
        </div>
      </div>
    `;
  }

  // ===================== 工作台 =====================

  renderEditor() {
    const template = this.selectedTemplate;
    const ability = getAbilityById(template.abilityId);
    const role = getRoleById(template.roleId);
    this.pptStage = 'outline';
    const draft = getDraft(template.id);
    const initialFormData = draft ? draft.formData : {};
    const initialMode = draft ? draft.mode : template.defaultMode;

    this.container.innerHTML = `
      <div class="wa-editor">
        <header class="wa-editor-header">
          <div style="display:flex;align-items:center;gap:16px;">
            <button class="btn btn-ghost" id="wa-editor-back">← 返回</button>
            <div class="wa-editor-title-group">
              <div class="wa-editor-title">${template.name}</div>
              <div class="wa-editor-subtitle">
                <span class="wa-editor-tag" style="background:${role?.color}15;color:${role?.color}">${role?.name}</span>
                <span class="wa-editor-tag"><i class="fa-solid fa-${ability.icon}"></i> ${ability.name}</span>
                <button class="wa-editor-switch" id="wa-switch-ability">切换能力</button>
              </div>
            </div>
          </div>
          <div class="wa-editor-header-actions">
            <button class="btn btn-secondary" id="wa-load-example">
              <i class="fa-solid fa-wand-magic-sparkles"></i> 体验示例
            </button>
            <button class="btn btn-primary" id="wa-start-generate">
              <i class="fa-solid fa-play"></i> 开始生成
            </button>
          </div>
        </header>

        <div class="wa-editor-body">
          <aside class="wa-editor-left">
            ${this.renderModeSelector(initialMode, ability)}
            ${this.renderAttachmentPanel(initialMode, ability)}
            ${this.renderKBSelector(initialMode, ability)}
            ${template.outputType === outputTypes.PPT ? this.renderMasterPanel(template) : ''}
            ${this.renderForm(template, initialFormData)}
          </aside>

          <main class="wa-editor-main">
            <div class="wa-result-empty" id="wa-result-empty">
              <div class="wa-result-empty-icon"><i class="fa-solid fa-${ability.icon}"></i></div>
              <div class="wa-result-empty-title">准备生成</div>
              <div class="wa-result-empty-desc">填写左侧信息后，点击「开始生成」查看结果</div>
            </div>
            <div class="wa-result-container" id="wa-result-container" style="display:none;"></div>
          </main>

          <aside class="wa-editor-right" id="wa-editor-right">
            <div class="wa-citations-empty">
              <i class="fa-solid fa-book-open"></i>
              <div>生成结果将在此展示引用来源</div>
            </div>
          </aside>
        </div>
      </div>
    `;

    this.bindEditorEvents(template);
  }

  renderModeSelector(selectedMode, ability) {
    const modes = [];
    if (ability.supportsKB) {
      modes.push({ id: 'kb', icon: 'book-open', label: '基于知识库', desc: '从知识库检索资料后生成，结果可追溯' });
    }
    if (ability.supportsFree) {
      modes.push({ id: 'free', icon: 'sparkles', label: '自由生成', desc: '调用大模型能力，适合创意与发散' });
    }

    if (modes.length === 1) {
      return `
        <div class="wa-panel">
          <div class="wa-panel-title">生成模式</div>
          <div class="wa-mode-single">
            <div class="wa-mode-icon"><i class="fa-solid fa-${modes[0].icon}"></i></div>
            <div class="wa-mode-info">
              <div class="wa-mode-label">${modes[0].label}</div>
              <div class="wa-mode-desc">${modes[0].desc}</div>
            </div>
          </div>
          <input type="hidden" id="wa-mode-value" value="${modes[0].id}">
        </div>
      `;
    }

    return `
      <div class="wa-panel">
        <div class="wa-panel-title">生成模式</div>
        <div class="wa-mode-list">
          ${modes.map((mode) => `
            <div class="wa-mode-item ${selectedMode === mode.id ? 'active' : ''}" data-mode="${mode.id}">
              <div class="wa-mode-icon"><i class="fa-solid fa-${mode.icon}"></i></div>
              <div class="wa-mode-info">
                <div class="wa-mode-label">${mode.label}</div>
                <div class="wa-mode-desc">${mode.desc}</div>
              </div>
              <div class="wa-mode-check"><i class="fa-solid fa-check"></i></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderAttachmentPanel(mode, ability) {
    if (mode !== 'free' || !ability.supportsFree) return '';

    const attachments = this.freeAttachments || [];
    return `
      <div class="wa-panel" id="wa-attachment-panel">
        <div class="wa-panel-title">
          <span>参考附件</span>
          <span class="wa-panel-subtitle">${attachments.length} 个已传</span>
        </div>
        <div class="wa-attachment-description">上传文件后，生成内容将结合附件中的信息进行创作。</div>
        <div class="wa-attachment-list">
          ${attachments.map((file, index) => `
            <div class="wa-attachment-tag" data-index="${index}">
              <i class="fa-solid fa-${this.getFileIcon(file.fileType)}"></i>
              <span>${this.escapeHtml(file.fileName)}</span>
              <button class="wa-attachment-remove" data-index="${index}"><i class="fa-solid fa-xmark"></i></button>
            </div>
          `).join('')}
        </div>
        <div class="wa-attachment-upload" id="wa-attachment-upload-zone">
          <input type="file" id="wa-attachment-file" accept=".pptx,.ppt,.docx,.doc,.xlsx,.xls,.pdf,.txt,.md" style="display:none;">
          <button class="btn btn-sm btn-secondary" id="wa-attachment-upload-btn"><i class="fa-solid fa-paperclip"></i> 上传附件</button>
        </div>
      </div>
    `;
  }

  renderKBSelector(mode, ability) {
    if (mode === 'free' || !ability.supportsKB) return '';

    const template = this.selectedTemplate;
    const selectedKBs = this.getSelectedKBs();

    return `
      <div class="wa-panel" id="wa-kb-panel">
        <div class="wa-panel-title">
          <span>知识库选择</span>
          <span class="wa-panel-subtitle">${selectedKBs.length} 个已选</span>
        </div>
        <div class="wa-kb-description">选择后，生成内容将基于这些知识库中的资料。</div>
        <div class="wa-kb-list">
          ${selectedKBs.map((kb) => `
            <div class="wa-kb-tag" data-id="${kb.id}">
              <i class="fa-solid fa-${this.getKBTypeIcon(kb.type)}"></i>
              <span>${kb.name}</span>
              <button class="wa-kb-remove" data-id="${kb.id}"><i class="fa-solid fa-xmark"></i></button>
            </div>
          `).join('')}
        </div>
        <button class="wa-kb-add-btn" id="wa-add-kb">
          <i class="fa-solid fa-plus"></i> 添加知识库
        </button>
      </div>
    `;
  }

  renderMasterPanel(template) {
    const master = template.masterData || this.currentMasterData;
    if (!master && !template.parsedFromFile) {
      return `
        <div class="wa-panel" id="wa-master-panel">
          <div class="wa-panel-title">母版生成</div>
          <div class="wa-master-empty">
            <i class="fa-solid fa-file-import"></i>
            <div>当前模板未关联文件母版</div>
            <div style="font-size:12px;color:var(--kb-text-muted);">上传文件后可基于原文件母版生成内容</div>
          </div>
          <div class="wa-master-upload" id="wa-master-upload-zone">
            <input type="file" id="wa-master-file" accept=".pptx,.ppt,.docx,.doc,.xlsx,.xls,.pdf" style="display:none;">
            <button class="btn btn-sm btn-secondary" id="wa-master-upload-btn"><i class="fa-solid fa-cloud-arrow-up"></i> 上传母版文件</button>
          </div>
          ${this.currentMasterData ? `<div class="wa-master-info">已加载：${this.currentMasterData.fileName}</div>` : ''}
        </div>
      `;
    }

    const fileTypeLabel = { pptx: 'PPT', docx: 'Word', xlsx: 'Excel', pdf: 'PDF' }[master?.fileType] || '文件';
    const themeHint = master?.theme ? `主题色 ${Object.values(master.theme.colors || {})[0] || ''}` : '';
    const structureHint = master?.slides?.length
      ? `${master.slides.length} 页 · ${Object.entries(master.typeDistribution || {}).map(([k, v]) => `${k} ${v}`).join('/')}`
      : master?.sheets?.length
        ? `${master.sheets.length} 张表`
        : master?.headings?.length
          ? `${master.headings.length} 个标题`
          : '';

    return `
      <div class="wa-panel" id="wa-master-panel">
        <div class="wa-panel-title">
          <span>原文件母版</span>
          <span class="wa-panel-subtitle">${fileTypeLabel}</span>
        </div>
        <div class="wa-master-info">
          <i class="fa-solid fa-file-${this.getFileIcon(master?.fileType)}"></i>
          <div>
            <div class="wa-master-file">${master?.fileName || template.name}</div>
            <div class="wa-master-meta">${structureHint} ${themeHint}</div>
          </div>
        </div>
        <label class="wa-master-toggle">
          <input type="checkbox" id="wa-use-master" ${this.useMaster ? 'checked' : ''}>
          <span>基于原文件母版生成</span>
        </label>
        <div class="wa-master-upload" id="wa-master-upload-zone" style="margin-top:10px;">
          <input type="file" id="wa-master-file" accept=".pptx,.ppt,.docx,.doc,.xlsx,.xls,.pdf" style="display:none;">
          <button class="btn btn-sm btn-ghost" id="wa-master-upload-btn"><i class="fa-solid fa-rotate"></i> 更换母版文件</button>
        </div>
      </div>
    `;
  }

  renderKBSelectorModal() {
    const template = this.selectedTemplate;
    const selectedIds = this.getSelectedKBs().map((kb) => kb.id);

    return `
      <div class="wa-modal-overlay" id="wa-kb-modal">
        <div class="wa-modal">
          <div class="wa-modal-header">
            <div class="wa-modal-title">选择知识库</div>
            <button class="wa-modal-close" id="wa-kb-modal-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="wa-modal-body">
            <div class="wa-kb-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="搜索知识库..." id="wa-kb-search-input">
            </div>
            <div class="wa-kb-options" id="wa-kb-options">
              ${knowledgeBases.map((kb) => `
                <div class="wa-kb-option ${selectedIds.includes(kb.id) ? 'selected' : ''}" data-id="${kb.id}">
                  <div class="wa-kb-option-check">
                    <i class="fa-solid ${selectedIds.includes(kb.id) ? 'fa-check-square' : 'fa-square'}"></i>
                  </div>
                  <div class="wa-kb-option-icon"><i class="fa-solid fa-${this.getKBTypeIcon(kb.type)}"></i></div>
                  <div class="wa-kb-option-info">
                    <div class="wa-kb-option-name">${kb.name}</div>
                    <div class="wa-kb-option-desc">${kb.documentCount} ${kb.type === '问答' ? '问答' : '文档'} · ${kb.description}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="wa-modal-footer">
            <button class="btn btn-ghost" id="wa-kb-modal-cancel">取消</button>
            <button class="btn btn-primary" id="wa-kb-modal-confirm">确认选择</button>
          </div>
        </div>
      </div>
    `;
  }

  renderForm(template, formData) {
    return `
      <div class="wa-panel">
        <div class="wa-panel-title">输入信息</div>
        <div class="wa-form">
          ${template.fields.map((field) => this.renderField(field, formData[field.id])).join('')}
        </div>
      </div>
    `;
  }

  renderField(field, value) {
    const val = value || '';
    const required = field.required ? '<span class="wa-required">*</span>' : '';

    let input = '';
    switch (field.type) {
      case 'textarea':
        input = `<textarea class="wa-input" id="field-${field.id}" rows="${field.rows || 3}" placeholder="${field.placeholder || ''}">${val}</textarea>`;
        break;
      case 'select':
        input = `
          <select class="wa-input" id="field-${field.id}">
            ${field.options.map((opt) => `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        `;
        break;
      default:
        input = `<input type="${field.type === 'number' ? 'number' : 'text'}" class="wa-input" id="field-${field.id}" value="${val}" placeholder="${field.placeholder || ''}">`;
    }

    return `
      <div class="wa-form-item">
        <label class="wa-form-label">${field.label}${required}</label>
        ${input}
      </div>
    `;
  }

  renderGenerating() {
    const container = document.getElementById('wa-result-container');
    const empty = document.getElementById('wa-result-empty');
    if (empty) empty.style.display = 'none';
    if (container) {
      container.style.display = 'flex';
      container.innerHTML = `
        <div class="wa-generating">
          <div class="wa-generating-icon"><i class="fa-solid fa-robot"></i></div>
          <div class="wa-generating-title">正在生成内容...</div>
          <div class="wa-generating-progress">
            <div class="wa-generating-bar"></div>
          </div>
          <div class="wa-generating-status">正在分析输入信息</div>
          <button class="btn btn-ghost btn-sm" id="wa-cancel-generate">取消生成</button>
        </div>
      `;
    }
  }

  renderResult(result, template) {
    const container = document.getElementById('wa-result-container');
    const rightPanel = document.getElementById('wa-editor-right');
    if (!container) return;

    const hasCitations = result.citations && result.citations.length > 0;
    const ability = getAbilityById(template.abilityId);
    const isPPT = template.outputType === outputTypes.PPT;
    const isPPTOutline = isPPT && result.isOutline;
    const isTable = template.outputType === outputTypes.TABLE;
    const isDocument = ['text', 'markdown', 'email', 'steps', 'report'].includes(template.outputType);

    container.style.display = 'flex';
    container.innerHTML = `
      <div class="wa-result-header">
        <div class="wa-result-title">${result.title}${isPPTOutline ? ' <span style="font-size:13px;font-weight:500;color:var(--kb-primary)">(大纲预览)</span>' : ''}</div>
        <div class="wa-result-actions">
          ${isPPTOutline ? `
            <button class="btn btn-sm btn-ghost" id="wa-result-regen"><i class="fa-solid fa-rotate-right"></i> 重新生成大纲</button>
            <button class="btn btn-sm btn-primary" id="wa-ppt-confirm-outline"><i class="fa-solid fa-wand-magic-sparkles"></i> 确认生成完整内容</button>
          ` : isPPT ? `
            <button class="btn btn-sm btn-ghost" id="wa-ppt-export-md"><i class="fa-solid fa-file-code"></i> 导出MD</button>
            <button class="btn btn-sm btn-ghost" id="wa-ppt-export-pptx"><i class="fa-solid fa-file-powerpoint"></i> 导出PPTX</button>
            <button class="btn btn-sm btn-ghost" id="wa-result-regen"><i class="fa-solid fa-rotate-right"></i> 重新生成</button>
            <button class="btn btn-sm btn-ghost" id="wa-result-save"><i class="fa-solid fa-floppy-disk"></i> 保存</button>
          ` : isTable ? `
            <button class="btn btn-sm btn-ghost" id="wa-result-copy"><i class="fa-solid fa-copy"></i> 复制</button>
            <button class="btn btn-sm btn-ghost" id="wa-export-xlsx"><i class="fa-solid fa-file-excel"></i> 导出XLSX</button>
          ` : isDocument ? `
            <button class="btn btn-sm btn-ghost" id="wa-result-copy"><i class="fa-solid fa-copy"></i> 复制</button>
            <button class="btn btn-sm btn-ghost" id="wa-export-docx"><i class="fa-solid fa-file-word"></i> 导出DOCX</button>
          ` : `
            <button class="btn btn-sm btn-ghost" id="wa-result-copy"><i class="fa-solid fa-copy"></i> 复制</button>
          `}
        </div>
      </div>
      <div class="wa-result-content" id="wa-result-content">
        ${this.renderOutputByType(result, template.outputType)}
      </div>
      ${hasCitations || isPPT ? '' : `<div class="wa-result-no-ref">${ability?.supportsKB ? '当前为自由生成，未引用知识库内容' : '当前能力不依赖知识库'}</div>`}
    `;

    if (rightPanel) {
      if (isPPT) {
        rightPanel.innerHTML = this.renderPPTSidePanel(result);
      } else {
        rightPanel.innerHTML = hasCitations ? this.renderCitationsPanel(result.citations) : this.renderEmptyCitations(ability);
      }
    }

    this.bindResultEvents(result, template);
    if (isPPT) this.bindPPTEvents(result, template);
  }

  renderOutputByType(result, outputType) {
    switch (outputType) {
      case outputTypes.TABLE:
        return this.renderTableOutput(result);
      case outputTypes.PPT:
        return this.renderPPTOutput(result);
      default:
        return this.renderContentWithCitations(result.content, result.citations);
    }
  }

  renderTableOutput(result) {
    if (!result.columns || !result.rows) return '<div class="wa-result-text">表格数据异常</div>';

    return `
      <div class="wa-table-wrapper">
        <table class="wa-result-table">
          <thead>
            <tr>
              ${result.columns.map((col) => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${result.rows.map((row) => `
              <tr>
                ${row.map((cell) => `<td>${this.renderCellWithCitations(cell)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderPPTOutput(result) {
    if (!result.pages) return '<div class="wa-result-text">PPT数据异常</div>';

    if (this.pptViewMode === 'slide') {
      return this.renderPPTSlideView(result);
    }
    return this.renderPPTOutlineView(result);
  }

  renderPPTOutlineView(result) {
    const isOutline = result.isOutline;
    return `
      <div class="wa-ppt-output">
        <div class="wa-ppt-toolbar">
          <div class="wa-ppt-view-tabs">
            <button class="wa-ppt-view-tab active" data-view="outline"><i class="fa-solid fa-list"></i> 大纲</button>
            ${isOutline ? '' : `<button class="wa-ppt-view-tab" data-view="slide"><i class="fa-solid fa-image"></i> 幻灯片</button>`}
          </div>
          <div class="wa-ppt-meta">
            <span class="wa-ppt-style-badge" style="background:#${result.colorHex}15;color:#${result.colorHex}">${result.style}</span>
            <span>${result.pages.length} 页</span>
          </div>
        </div>
        <div class="wa-ppt-pages">
          ${result.pages.map((page, index) => `
            <div class="wa-ppt-page" draggable="true" data-index="${index}">
              <div class="wa-ppt-page-num">${index + 1}</div>
              <div class="wa-ppt-page-content">
                <div class="wa-ppt-page-header">
                  <div class="wa-ppt-page-type">${this.getPPTPageTypeLabel(page.type)}</div>
                  <div class="wa-ppt-page-actions">
                    ${isOutline ? '' : `<button class="wa-ppt-page-btn wa-ppt-regen-page" data-index="${index}" title="重新生成当前页"><i class="fa-solid fa-rotate-right"></i></button>`}
                    <button class="wa-ppt-page-btn wa-ppt-delete-page" data-index="${index}" title="删除当前页"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </div>
                <div class="wa-ppt-page-title" contenteditable="true" data-index="${index}" data-field="title">${this.formatContent(page.title)}</div>
                ${page.subtitle ? `<div class="wa-ppt-page-subtitle" contenteditable="true" data-index="${index}" data-field="subtitle">${this.formatContent(page.subtitle)}</div>` : ''}
                ${isOutline ? '' : `
                  <ul class="wa-ppt-page-bullets">
                    ${page.bullets.map((bullet, bidx) => `<li contenteditable="true" data-index="${index}" data-field="bullet" data-bidx="${bidx}">${this.renderCellWithCitations(bullet)}</li>`).join('')}
                  </ul>
                  <div class="wa-ppt-page-note">
                    <i class="fa-solid fa-microphone"></i>
                    <span contenteditable="true" data-index="${index}" data-field="note">${this.formatContent(page.note)}</span>
                  </div>
                  <div class="wa-ppt-page-visual">
                    <i class="fa-solid fa-image"></i>
                    <span contenteditable="true" data-index="${index}" data-field="visual">${this.formatContent(page.visual)}</span>
                  </div>
                `}
              </div>
            </div>
          `).join('')}
        </div>
        <button class="wa-ppt-add-page" id="wa-ppt-add-page"><i class="fa-solid fa-plus"></i> 新增一页</button>
        ${isOutline ? `
          <div class="wa-ppt-outline-actions">
            <button class="btn btn-primary" id="wa-ppt-confirm-outline"><i class="fa-solid fa-wand-magic-sparkles"></i> 确认生成完整内容</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderPPTSlideView(result) {
    const page = result.pages[this.pptCurrentPage] || result.pages[0];
    const color = result.colorHex || '0E9F6E';
    return `
      <div class="wa-ppt-output">
        <div class="wa-ppt-toolbar">
          <div class="wa-ppt-view-tabs">
            <button class="wa-ppt-view-tab" data-view="outline"><i class="fa-solid fa-list"></i> 大纲</button>
            <button class="wa-ppt-view-tab active" data-view="slide"><i class="fa-solid fa-image"></i> 幻灯片</button>
          </div>
          <div class="wa-ppt-meta">
            <span class="wa-ppt-style-badge" style="background:#${color}15;color:#${color}">${result.style}</span>
            <span>${this.pptCurrentPage + 1} / ${result.pages.length}</span>
          </div>
        </div>
        <div class="wa-ppt-slide-stage">
          <button class="wa-ppt-slide-nav prev" id="wa-ppt-slide-prev"><i class="fa-solid fa-chevron-left"></i></button>
          <div class="wa-ppt-slide" style="border-color:#${color}40">
            <div class="wa-ppt-slide-header" style="background:linear-gradient(135deg,#${color}20,#${color}05)">
              <div class="wa-ppt-slide-type">${this.getPPTPageTypeLabel(page.type)}</div>
              <div class="wa-ppt-slide-title">${this.formatContent(page.title)}</div>
              ${page.subtitle ? `<div class="wa-ppt-slide-subtitle">${this.formatContent(page.subtitle)}</div>` : ''}
            </div>
            <div class="wa-ppt-slide-body">
              <ul class="wa-ppt-slide-bullets">
                ${page.bullets.map((bullet) => `<li>${this.renderCellWithCitations(bullet)}</li>`).join('')}
              </ul>
            </div>
            <div class="wa-ppt-slide-footer" style="color:#${color}">
              <span>${result.title}</span>
              <span>${this.pptCurrentPage + 1}</span>
            </div>
          </div>
          <button class="wa-ppt-slide-nav next" id="wa-ppt-slide-next"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <div class="wa-ppt-slide-thumbs">
          ${result.pages.map((p, index) => `
            <div class="wa-ppt-slide-thumb ${index === this.pptCurrentPage ? 'active' : ''}" data-index="${index}">
              <div class="wa-ppt-thumb-num">${index + 1}</div>
              <div class="wa-ppt-thumb-title">${p.title}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderPPTSidePanel(result) {
    const page = result.pages[this.pptCurrentPage] || result.pages[0];
    const hasCitations = result.citations && result.citations.length > 0;
    const isOutline = result.isOutline;

    let html = `
      <div class="wa-panel wa-ppt-info-panel">
        <div class="wa-panel-title">PPT 信息</div>
        <div class="wa-ppt-info-row"><span>风格</span><span>${result.style}</span></div>
        <div class="wa-ppt-info-row"><span>配色</span><span style="color:#${result.colorHex}">● ${result.color}</span></div>
        <div class="wa-ppt-info-row"><span>页数</span><span>${result.pages.length} 页</span></div>
        <div class="wa-ppt-info-row"><span>基调</span><span>${result.styleTone}</span></div>
      </div>
    `;

    if (isOutline) {
      html += `
        <div class="wa-panel wa-ppt-note-panel">
          <div class="wa-panel-title">大纲确认</div>
          <div class="wa-ppt-note-tip"><i class="fa-solid fa-circle-info"></i> 当前为 PPT 大纲，可编辑标题、副标题，增删或调整页面顺序。</div>
          <div class="wa-ppt-note-tip" style="margin-top:8px;"><i class="fa-solid fa-check-double"></i> 确认无误后，点击「确认生成完整内容」生成详细 PPT。</div>
        </div>
      `;
    } else {
      html += `
        <div class="wa-panel wa-ppt-note-panel">
          <div class="wa-panel-title">演讲备注</div>
          <div class="wa-ppt-note-current">${this.formatContent(page.note)}</div>
          <div class="wa-ppt-note-tip"><i class="fa-solid fa-lightbulb"></i> 在大纲视图中可编辑每页备注</div>
        </div>
      `;
    }

    if (hasCitations) {
      html += this.renderCitationsPanel(result.citations);
    }

    return html;
  }

  getPPTPageTypeLabel(type) {
    const labels = {
      cover: '封面',
      catalog: '目录',
      content: '内容',
      compare: '对比',
      data: '数据',
      quote: '金句',
      end: '结束',
    };
    return labels[type] || '内容';
  }

  renderCellWithCitations(cell) {
    if (!cell) return '';
    const text = this.formatContent(cell);
    return text.replace(/\[(\d+)\]/g, '<span class="wa-citation-marker" data-id="$1">[$1]</span>');
  }

  renderContentWithCitations(content, citations) {
    if (!citations || citations.length === 0) {
      return `<div class="wa-result-text">${this.formatContent(content)}</div>`;
    }

    let html = this.formatContent(content);
    citations.forEach((citation) => {
      const marker = `[${citation.id}]`;
      html = html.replace(
        new RegExp(`\\${marker}`, 'g'),
        `<span class="wa-citation-marker" data-id="${citation.id}">${marker}</span>`
      );
    });

    return `<div class="wa-result-text">${html}</div>`;
  }

  renderCitationsPanel(citations) {
    return `
      <div class="wa-panel wa-citations-panel">
        <div class="wa-panel-title">引用来源 (${citations.length})</div>
        <div class="wa-citations-list">
          ${citations.map((c) => `
            <div class="wa-citation-item" data-id="${c.id}">
              <div class="wa-citation-header">
                <span class="wa-citation-num">[${c.id}]</span>
                <span class="wa-citation-kb">${c.kbName}</span>
              </div>
              <div class="wa-citation-doc">${c.docName} · ${c.section}</div>
              <div class="wa-citation-text">${c.text}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderEmptyCitations(ability) {
    return `
      <div class="wa-citations-empty">
        <i class="fa-solid fa-book-open"></i>
        <div>${ability?.supportsKB ? '当前为自由生成' : '当前能力不依赖知识库'}</div>
        <div style="font-size:12px;color:var(--kb-text-muted);">未展示引用来源</div>
      </div>
    `;
  }

  formatContent(content) {
    if (typeof content !== 'string') return '';
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  getModeLabel(mode) {
    const labels = { kb: '基于知识库', free: '自由生成', mix: '混合生成' };
    return labels[mode] || mode;
  }

  getKBTypeIcon(type) {
    const icons = { 文档: 'file-lines', 网页: 'globe', 数据库: 'database', 问答: 'message' };
    return icons[type] || 'file-lines';
  }

  getTemplateIcon(templateId) {
    const template = workTemplates.find((t) => t.id === templateId);
    return template ? template.icon : 'file-lines';
  }

  getResultPreview(result) {
    if (!result) return '无内容';
    if (result.content) {
      const text = result.content.replace(/\n/g, ' ').substring(0, 60);
      return text + (result.content.length > 60 ? '...' : '');
    }
    if (result.rows) return `表格 · ${result.rows.length} 行`;
    if (result.pages) return `PPT · ${result.pages.length} 页`;
    return '无内容';
  }

  getSelectedKBs() {
    if (!this.selectedTemplate) return [];
    const saved = localStorage.getItem(`wa_selected_kbs_${this.selectedTemplate.id}`);
    if (saved) {
      const ids = JSON.parse(saved);
      return knowledgeBases.filter((kb) => ids.includes(kb.id));
    }
    const recommendedKBs = this.selectedTemplate.recommendedKBs || [];
    return knowledgeBases.filter((kb) => recommendedKBs.includes(kb.id));
  }

  setSelectedKBs(kbIds) {
    if (!this.selectedTemplate) return;
    localStorage.setItem(`wa_selected_kbs_${this.selectedTemplate.id}`, JSON.stringify(kbIds));
  }

  getFormData() {
    if (!this.selectedTemplate) return {};
    const formData = {};
    this.selectedTemplate.fields.forEach((field) => {
      const el = document.getElementById(`field-${field.id}`);
      formData[field.id] = el ? el.value : '';
    });
    return formData;
  }

  getCurrentMode() {
    const hidden = document.getElementById('wa-mode-value');
    if (hidden) return hidden.value;
    const activeMode = this.container.querySelector('.wa-mode-item.active');
    return activeMode ? activeMode.dataset.mode : 'kb';
  }

  // ===================== 事件绑定 =====================

  bindHomeEvents() {
    this.container.querySelectorAll('.wa-role-pill').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.activeRole = tab.dataset.role;
        setLastRole(this.activeRole);
        this.renderHome();
      });
    });

    this.container.querySelectorAll('.wa-template-shortcut').forEach((card) => {
      card.addEventListener('click', () => {
        const templateId = card.dataset.template;
        this.selectedTemplate = getAllTemplates().find((t) => t.id === templateId);
        if (this.selectedTemplate) {
          this.activeTab = 'editor';
          this.render();
        }
      });
    });

    this.container.querySelectorAll('.wa-hero-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const input = this.container.querySelector('#wa-hero-input');
        if (input) input.value = chip.dataset.prompt;
        input?.focus();
      });
    });

    const heroInput = this.container.querySelector('#wa-hero-input');
    const heroCreate = this.container.querySelector('#wa-hero-create');

    const handleHeroCreate = () => {
      const value = heroInput?.value?.trim();
      if (!value) return;
      this.handleNaturalLanguageCreate(value);
    };

    heroCreate?.addEventListener('click', handleHeroCreate);
    heroInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleHeroCreate();
    });

    this.container.querySelectorAll('.wa-recent-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const history = getWorkHistory();
        const record = history.find((h) => h.id === id);
        if (record) {
          this.selectedTemplate = getAllTemplates().find((t) => t.id === record.templateId);
          this.activeTab = 'editor';
          this.render();
        }
      });
    });

    const historyBtn = this.container.querySelector('#wa-history-btn');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        this.activeTab = 'history';
        this.render();
      });
    }

    const viewAllBtn = this.container.querySelector('#wa-view-all-history');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        this.activeTab = 'history';
        this.render();
      });
    }

    const creatorBtn = this.container.querySelector('#wa-template-creator-btn');
    if (creatorBtn) {
      creatorBtn.addEventListener('click', () => {
        this.activeTab = 'templateCreator';
        this.creatorTab = 'chat';
        this.conversationState = this.getDefaultConversationState();
        this.render();
      });
    }

    const marketBtn = this.container.querySelector('#wa-template-market-btn');
    if (marketBtn) {
      marketBtn.addEventListener('click', () => {
        this.activeTab = 'templateMarket';
        this.marketTab = 'all';
        this.render();
      });
    }
  }

  bindHistoryEvents() {
    this.container.querySelectorAll('#wa-back-home, #wa-back-home-empty').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = 'home';
        this.render();
      });
    });

    this.container.querySelectorAll('.wa-history-open').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const history = getWorkHistory();
        const record = history.find((h) => h.id === id);
        if (record) {
          this.selectedTemplate = getAllTemplates().find((t) => t.id === record.templateId);
          this.activeTab = 'editor';
          this.render();
        }
      });
    });

    this.container.querySelectorAll('.wa-history-copy').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const history = getWorkHistory();
        const record = history.find((h) => h.id === id);
        if (record && record.result) {
          const text = record.result.content || this.tableToText(record.result) || this.pptToText(record.result);
          navigator.clipboard.writeText(text);
          this.showToast('已复制到剪贴板');
        }
      });
    });

    this.container.querySelectorAll('.wa-history-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const history = getWorkHistory().filter((h) => h.id !== id);
        saveWorkHistory(history);
        this.renderHistory();
        this.showToast('已删除');
      });
    });
  }

  bindEditorEvents(template) {
    document.getElementById('wa-editor-back')?.addEventListener('click', () => {
      this.activeTab = 'home';
      this.selectedTemplate = null;
      this.currentResult = null;
      this.render();
    });

    document.getElementById('wa-switch-ability')?.addEventListener('click', () => {
      this.openAbilityModal(template.abilityId);
    });

    this.container.querySelectorAll('.wa-mode-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.container.querySelectorAll('.wa-mode-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        this.updateKBPanel();
        this.updateAttachmentPanel();
      });
    });

    this.container.addEventListener('click', (e) => {
      const addBtn = e.target.closest('#wa-add-kb');
      if (addBtn) this.openKBModal();
    });

    this.container.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.wa-kb-remove');
      if (removeBtn) {
        const kbId = removeBtn.dataset.id;
        const selectedIds = this.getSelectedKBs().map((kb) => kb.id).filter((id) => id !== kbId);
        this.setSelectedKBs(selectedIds);
        this.updateKBPanel();
      }
    });

    document.getElementById('wa-load-example')?.addEventListener('click', () => {
      this.loadExample(template);
    });

    document.getElementById('wa-start-generate')?.addEventListener('click', () => {
      this.startGenerate(template);
    });

    // 母版相关事件
    document.getElementById('wa-use-master')?.addEventListener('change', (e) => {
      this.useMaster = e.target.checked;
    });

    const masterFileInput = document.getElementById('wa-master-file');
    const masterUploadZone = document.getElementById('wa-master-upload-zone');
    masterUploadZone?.addEventListener('click', () => masterFileInput?.click());
    masterUploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); masterUploadZone.classList.add('dragover'); });
    masterUploadZone?.addEventListener('dragleave', () => masterUploadZone.classList.remove('dragover'));
    masterUploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      masterUploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.handleMasterFileSelect(file);
    });
    masterFileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleMasterFileSelect(file);
    });

    // 自由生成附件事件
    const attachmentFileInput = document.getElementById('wa-attachment-file');
    const attachmentUploadZone = document.getElementById('wa-attachment-upload-zone');
    attachmentUploadZone?.addEventListener('click', () => attachmentFileInput?.click());
    attachmentUploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); attachmentUploadZone.classList.add('dragover'); });
    attachmentUploadZone?.addEventListener('dragleave', () => attachmentUploadZone.classList.remove('dragover'));
    attachmentUploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      attachmentUploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.handleAttachmentFileSelect(file);
    });
    attachmentFileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleAttachmentFileSelect(file);
    });

    this.container.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.wa-attachment-remove');
      if (removeBtn) {
        const index = parseInt(removeBtn.dataset.index, 10);
        this.removeAttachment(index);
      }
    });

    this.container.querySelectorAll('.wa-input').forEach((input) => {
      input.addEventListener('input', () => {
        this.autoSaveDraft(template);
      });
    });

    const savedDraft = getDraft(template.id);
    if (savedDraft) {
      this.showToast('已恢复上次草稿');
    }
  }

  bindResultEvents(result, template) {
    document.getElementById('wa-result-copy')?.addEventListener('click', () => {
      const text = result.content || this.tableToText(result) || this.pptToText(result);
      navigator.clipboard.writeText(text);
      this.showToast('已复制到剪贴板');
    });

    document.getElementById('wa-result-regen')?.addEventListener('click', () => {
      this.startGenerate(template);
    });

    document.getElementById('wa-result-save')?.addEventListener('click', () => {
      this.saveCurrentResult(result);
    });

    document.getElementById('wa-ppt-export-md')?.addEventListener('click', () => {
      this.exportPPTToMarkdown(result);
    });

    document.getElementById('wa-ppt-export-pptx')?.addEventListener('click', () => {
      this.exportPPTToPPTX(result);
    });

    document.getElementById('wa-ppt-confirm-outline')?.addEventListener('click', () => {
      this.confirmOutlineAndGenerate(template);
    });

    document.getElementById('wa-export-docx')?.addEventListener('click', () => {
      this.exportToDOCX(result, template);
    });

    document.getElementById('wa-export-xlsx')?.addEventListener('click', () => {
      this.exportToXLSX(result, template);
    });

    this.container.querySelectorAll('.wa-citation-marker').forEach((marker) => {
      marker.addEventListener('mouseenter', () => {
        const id = parseInt(marker.dataset.id);
        const item = this.container.querySelector(`.wa-citation-item[data-id="${id}"]`);
        if (item) {
          item.classList.add('highlight');
          item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
      marker.addEventListener('mouseleave', () => {
        const id = parseInt(marker.dataset.id);
        const item = this.container.querySelector(`.wa-citation-item[data-id="${id}"]`);
        if (item) item.classList.remove('highlight');
      });
    });

    this.container.querySelectorAll('.wa-citation-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const marker = this.container.querySelector(`.wa-citation-marker[data-id="${id}"]`);
        if (marker) {
          marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
          marker.classList.add('flash');
          setTimeout(() => marker.classList.remove('flash'), 1500);
        }
      });
    });

    // PPT 内容实时编辑
    if (template.outputType === outputTypes.PPT) {
      this.container.querySelectorAll('[contenteditable="true"]').forEach((el) => {
        el.addEventListener('blur', () => {
          this.updatePPTPageFromEditable(result, el);
        });
      });
    }
  }

  bindPPTEvents(result, template) {
    // 视图切换
    this.container.querySelectorAll('.wa-ppt-view-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.pptViewMode = tab.dataset.view;
        this.renderResult(result, template);
      });
    });

    // 确认大纲并生成完整内容
    document.getElementById('wa-ppt-confirm-outline')?.addEventListener('click', () => {
      this.confirmOutlineAndGenerate(template);
    });

    // 新增一页
    document.getElementById('wa-ppt-add-page')?.addEventListener('click', () => {
      result.pages.push({
        type: 'content',
        title: '新页面',
        subtitle: '',
        bullets: ['要点一', '要点二'],
        note: '请补充演讲备注。',
        visual: '建议配图：与主题相关的示意图',
        layout: 'left-title-right-content',
      });
      this.renderResult(result, template);
      this.showToast('已新增一页');
    });

    // 删除页面
    this.container.querySelectorAll('.wa-ppt-delete-page').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        result.pages.splice(index, 1);
        if (this.pptCurrentPage >= result.pages.length) {
          this.pptCurrentPage = Math.max(0, result.pages.length - 1);
        }
        this.renderResult(result, template);
        this.showToast('已删除页面');
      });
    });

    // 重新生成当前页
    this.container.querySelectorAll('.wa-ppt-regen-page').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const page = result.pages[index];
        page.title = `${page.title}（新版）`;
        page.bullets = page.bullets.map((b) => `${b} · 已优化`);
        page.note = '已根据上下文重新生成演讲备注。';
        this.renderResult(result, template);
        this.showToast('已重新生成当前页');
      });
    });

    // 幻灯片翻页
    document.getElementById('wa-ppt-slide-prev')?.addEventListener('click', () => {
      if (this.pptCurrentPage > 0) {
        this.pptCurrentPage--;
        this.renderResult(result, template);
      }
    });
    document.getElementById('wa-ppt-slide-next')?.addEventListener('click', () => {
      if (this.pptCurrentPage < result.pages.length - 1) {
        this.pptCurrentPage++;
        this.renderResult(result, template);
      }
    });

    // 缩略图点击
    this.container.querySelectorAll('.wa-ppt-slide-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        this.pptCurrentPage = parseInt(thumb.dataset.index);
        this.renderResult(result, template);
      });
    });

    // 拖拽排序
    this.container.querySelectorAll('.wa-ppt-page[draggable="true"]').forEach((page) => {
      page.addEventListener('dragstart', (e) => {
        this.dragSrcIndex = parseInt(page.dataset.index);
        page.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      page.addEventListener('dragend', () => {
        page.classList.remove('dragging');
        this.container.querySelectorAll('.wa-ppt-page').forEach((p) => p.classList.remove('drag-over'));
      });
      page.addEventListener('dragover', (e) => {
        e.preventDefault();
        page.classList.add('drag-over');
      });
      page.addEventListener('dragleave', () => {
        page.classList.remove('drag-over');
      });
      page.addEventListener('drop', (e) => {
        e.preventDefault();
        const srcIndex = this.dragSrcIndex;
        const targetIndex = parseInt(page.dataset.index);
        if (srcIndex === targetIndex) return;
        const [moved] = result.pages.splice(srcIndex, 1);
        result.pages.splice(targetIndex, 0, moved);
        this.pptCurrentPage = targetIndex;
        this.renderResult(result, template);
        this.showToast('已调整页面顺序');
      });
    });
  }

  updatePPTPageFromEditable(result, el) {
    const index = parseInt(el.dataset.index);
    const field = el.dataset.field;
    const page = result.pages[index];
    if (!page) return;

    const html = el.innerHTML;
    const text = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();

    if (field === 'title') page.title = text;
    if (field === 'subtitle') page.subtitle = text;
    if (field === 'note') page.note = text;
    if (field === 'visual') page.visual = text;
    if (field === 'bullet') {
      const bidx = parseInt(el.dataset.bidx);
      page.bullets[bidx] = text;
    }

    const rightPanel = document.getElementById('wa-editor-right');
    if (rightPanel) rightPanel.innerHTML = this.renderPPTSidePanel(result);
  }

  bindKBModalEvents() {
    const modal = document.getElementById('wa-kb-modal');
    if (!modal) return;

    const close = () => modal.remove();

    document.getElementById('wa-kb-modal-close')?.addEventListener('click', close);
    document.getElementById('wa-kb-modal-cancel')?.addEventListener('click', close);

    document.getElementById('wa-kb-modal-confirm')?.addEventListener('click', () => {
      const selected = modal.querySelectorAll('.wa-kb-option.selected');
      const ids = Array.from(selected).map((el) => el.dataset.id);
      this.setSelectedKBs(ids);
      this.updateKBPanel();
      close();
    });

    modal.querySelectorAll('.wa-kb-option').forEach((option) => {
      option.addEventListener('click', () => {
        option.classList.toggle('selected');
        const icon = option.querySelector('.wa-kb-option-check i');
        if (option.classList.contains('selected')) {
          icon.classList.remove('fa-square');
          icon.classList.add('fa-check-square');
        } else {
          icon.classList.remove('fa-check-square');
          icon.classList.add('fa-square');
        }
      });
    });

    const searchInput = document.getElementById('wa-kb-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        modal.querySelectorAll('.wa-kb-option').forEach((option) => {
          const name = option.querySelector('.wa-kb-option-name').textContent.toLowerCase();
          const desc = option.querySelector('.wa-kb-option-desc').textContent.toLowerCase();
          option.style.display = name.includes(query) || desc.includes(query) ? 'flex' : 'none';
        });
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ===================== 工具方法 =====================

  openKBModal() {
    document.getElementById('wa-kb-modal')?.remove();
    const modalHTML = this.renderKBSelectorModal();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.bindKBModalEvents();
  }

  updateKBPanel() {
    const mode = this.getCurrentMode();
    const ability = getAbilityById(this.selectedTemplate.abilityId);
    const panel = document.getElementById('wa-kb-panel');
    if (panel) {
      panel.outerHTML = this.renderKBSelector(mode, ability);
    } else if (mode === 'kb' && ability.supportsKB) {
      const leftPanel = this.container.querySelector('.wa-editor-left');
      const modeSelector = leftPanel.querySelector('.wa-panel');
      modeSelector.insertAdjacentHTML('afterend', this.renderKBSelector(mode, ability));
    }
  }

  updateAttachmentPanel() {
    const mode = this.getCurrentMode();
    const ability = getAbilityById(this.selectedTemplate.abilityId);
    const panel = document.getElementById('wa-attachment-panel');
    if (panel) {
      panel.outerHTML = this.renderAttachmentPanel(mode, ability);
    } else if (mode === 'free' && ability.supportsFree) {
      const leftPanel = this.container.querySelector('.wa-editor-left');
      const modeSelector = leftPanel.querySelector('.wa-panel');
      modeSelector.insertAdjacentHTML('afterend', this.renderAttachmentPanel(mode, ability));
    }
    this.bindAttachmentEvents();
  }

  bindAttachmentEvents() {
    const attachmentFileInput = document.getElementById('wa-attachment-file');
    const attachmentUploadZone = document.getElementById('wa-attachment-upload-zone');
    attachmentUploadZone?.addEventListener('click', () => attachmentFileInput?.click());
    attachmentUploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); attachmentUploadZone.classList.add('dragover'); });
    attachmentUploadZone?.addEventListener('dragleave', () => attachmentUploadZone.classList.remove('dragover'));
    attachmentUploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      attachmentUploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.handleAttachmentFileSelect(file);
    });
    attachmentFileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleAttachmentFileSelect(file);
    });
  }

  loadExample(template) {
    template.fields.forEach((field) => {
      const el = document.getElementById(`field-${field.id}`);
      if (el && template.example && template.example[field.id]) {
        el.value = template.example[field.id];
      }
    });
    this.autoSaveDraft(template);
    this.showToast('已填入示例，点击「开始生成」查看结果');
  }

  startGenerate(template) {
    const formData = this.getFormData();
    const requiredFields = template.fields.filter((f) => f.required);
    const missing = requiredFields.find((f) => !formData[f.id]?.trim());

    if (missing) {
      this.showToast(`请填写必填项：${missing.label}`, 'error');
      const el = document.getElementById(`field-${missing.id}`);
      if (el) {
        el.focus();
        el.classList.add('error');
        setTimeout(() => el.classList.remove('error'), 2000);
      }
      return;
    }

    const mode = this.getCurrentMode();
    const ability = getAbilityById(template.abilityId);
    const selectedKBs = mode === 'free' || !ability.supportsKB ? [] : this.getSelectedKBs();
    const attachments = mode === 'free' ? this.freeAttachments : [];

    if (mode === 'kb' && ability.supportsKB && selectedKBs.length === 0) {
      this.showToast('基于知识库生成需要至少选择一个知识库', 'error');
      return;
    }

    this.renderGenerating();

    const statusTexts = ['正在分析输入信息', '正在检索知识库...', '正在整理生成思路...', '正在生成内容...'];
    let step = 0;
    const statusEl = this.container.querySelector('.wa-generating-status');
    const interval = setInterval(() => {
      step = Math.min(step + 1, statusTexts.length - 1);
      if (statusEl) statusEl.textContent = statusTexts[step];
    }, 600);

    setTimeout(() => {
      clearInterval(interval);
      const useMaster = this.useMaster && !!(template.masterData || this.currentMasterData);
      const isPPT = template.outputType === outputTypes.PPT;
      const stage = isPPT ? this.pptStage : 'content';
      const options = { useMaster, stage, attachments };
      const result = mockGenerateContent(template, formData, mode, selectedKBs, options);
      if (result && (template.masterData || this.currentMasterData)) {
        result.masterData = template.masterData || this.currentMasterData;
      }
      this.renderResult(result, template);
      this.currentResult = result;
      this.currentFormData = formData;
      this.currentMode = mode;
      this.currentKBs = selectedKBs;
      this.currentAttachments = attachments;
    }, 2500);
  }

  confirmOutlineAndGenerate(template) {
    if (!this.currentResult || !this.currentResult.isOutline) return;

    this.pptStage = 'content';
    this.renderGenerating();

    const statusTexts = ['正在确认大纲结构', '正在生成每页详细内容', '正在完善演讲备注与配图建议...'];
    let step = 0;
    const statusEl = this.container.querySelector('.wa-generating-status');
    const interval = setInterval(() => {
      step = Math.min(step + 1, statusTexts.length - 1);
      if (statusEl) statusEl.textContent = statusTexts[step];
    }, 700);

    setTimeout(() => {
      clearInterval(interval);
      const mode = this.currentMode || this.getCurrentMode();
      const selectedKBs = this.currentKBs || this.getSelectedKBs();
      const useMaster = this.useMaster && !!(template.masterData || this.currentMasterData);
      const attachments = this.currentAttachments || [];
      const options = { useMaster, attachments };
      const result = generatePPTContentFromOutline(
        this.currentResult,
        template,
        this.currentFormData || this.getFormData(),
        mode,
        selectedKBs,
        options
      );
      if (result && (template.masterData || this.currentMasterData)) {
        result.masterData = template.masterData || this.currentMasterData;
      }
      this.pptViewMode = 'outline';
      this.renderResult(result, template);
      this.currentResult = result;
      this.showToast('完整 PPT 内容已生成');
    }, 2200);
  }

  saveCurrentResult(result) {
    if (!result || !this.selectedTemplate) return;
    const record = createWorkRecord(
      this.selectedTemplate,
      this.currentFormData || this.getFormData(),
      this.currentMode || this.getCurrentMode(),
      this.currentKBs || this.getSelectedKBs(),
      result
    );
    addWorkHistory(record);
    saveDraft(this.selectedTemplate.id, null);
    this.showToast('已保存到我的内容');
  }

  autoSaveDraft(template) {
    const formData = this.getFormData();
    const hasValue = Object.values(formData).some((v) => v && v.trim && v.trim());
    if (hasValue) {
      saveDraft(template.id, {
        templateId: template.id,
        formData,
        mode: this.getCurrentMode(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  tableToText(result) {
    if (!result.columns || !result.rows) return '';
    const header = result.columns.join('\t');
    const body = result.rows.map((row) => row.join('\t')).join('\n');
    return `${header}\n${body}`;
  }

  pptToText(result) {
    if (!result.pages) return '';
    return result.pages.map((p, i) => `${i + 1}. ${p.title}\n${p.bullets ? p.bullets.join('\n') : p.content}\n备注：${p.note || ''}`).join('\n\n');
  }

  exportPPTToMarkdown(result) {
    if (!result.pages) return;
    let md = `# ${result.title}\n\n`;
    md += `> 风格：${result.style} | 配色：${result.color} | 页数：${result.pages.length}\n\n`;
    md += `---\n\n`;
    result.pages.forEach((page, index) => {
      md += `## 第 ${index + 1} 页 · ${this.getPPTPageTypeLabel(page.type)}\n\n`;
      md += `### ${page.title}\n\n`;
      if (page.subtitle) md += `**${page.subtitle}**\n\n`;
      page.bullets.forEach((b) => {
        md += `- ${b}\n`;
      });
      md += `\n**配图建议**：${page.visual || '无'}\n\n`;
      md += `**演讲备注**：${page.note || '无'}\n\n`;
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title || 'PPT'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Markdown 大纲已导出');
  }

  async exportPPTToPPTX(result) {
    if (!result.pages) return;
    const pptxgen = (await import('pptxgenjs')).default;
    const pptx = new pptxgen();

    const master = result.masterData;
    const theme = master?.fileType === 'pptx' ? master.theme : null;
    const themeFonts = theme?.fonts || {};
    const majorFont = themeFonts.major || result.masterTheme?.fonts?.major;
    const minorFont = themeFonts.minor || result.masterTheme?.fonts?.minor || majorFont;

    const colorHex = result.colorHex || '0E9F6E';
    const titleColor = colorHex;
    const bgColor = 'FFFFFF';

    pptx.title = result.title;
    pptx.subject = result.title;
    pptx.author = 'DmtPlat 智能工作助手';

    result.pages.forEach((page) => {
      const slide = pptx.addSlide();
      slide.background = { color: bgColor };

      if (page.type === 'cover') {
        slide.addText(page.title, {
          x: 0.5, y: 2, w: 9, h: 1.5,
          fontSize: 36, bold: true, color: titleColor, align: 'center',
          fontFace: majorFont,
        });
        if (page.subtitle) {
          slide.addText(page.subtitle, {
            x: 0.5, y: 3.5, w: 9, h: 0.8,
            fontSize: 18, color: '666666', align: 'center',
            fontFace: minorFont,
          });
        }
      } else if (page.type === 'end') {
        slide.addText(page.title, {
          x: 0.5, y: 2.5, w: 9, h: 1,
          fontSize: 32, bold: true, color: titleColor, align: 'center',
          fontFace: majorFont,
        });
        if (page.subtitle) {
          slide.addText(page.subtitle, {
            x: 0.5, y: 3.5, w: 9, h: 0.8,
            fontSize: 16, color: '666666', align: 'center',
            fontFace: minorFont,
          });
        }
      } else {
        slide.addText(page.title, {
          x: 0.5, y: 0.4, w: 9, h: 0.8,
          fontSize: 24, bold: true, color: titleColor,
          fontFace: majorFont,
        });
        if (page.subtitle) {
          slide.addText(page.subtitle, {
            x: 0.5, y: 1.1, w: 9, h: 0.4,
            fontSize: 14, color: '888888',
            fontFace: minorFont,
          });
        }
        const bulletText = page.bullets.map((b) => `• ${b.replace(/\[\d+\]/g, '')}`).join('\n');
        slide.addText(bulletText, {
          x: 0.5, y: 1.7, w: 9, h: 4,
          fontSize: 14, color: '333333', bullet: true, lineSpacing: 28,
          fontFace: minorFont,
        });
      }

      if (page.note) {
        slide.addNotes(page.note);
      }
    });

    await pptx.writeFile({ fileName: `${result.title || 'PPT'}.pptx` });
    this.showToast('PPTX 文件已导出');
  }

  async exportToDOCX(result, template) {
    const docx = await import('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

    const content = result.content || '';
    const lines = content.split('\n');
    const children = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ text: '' }));
        continue;
      }
      if (trimmed.startsWith('# ')) {
        children.push(new Paragraph({
          text: trimmed.replace(/^#\s+/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        }));
      } else if (trimmed.startsWith('## ')) {
        children.push(new Paragraph({
          text: trimmed.replace(/^##\s+/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150 },
        }));
      } else if (trimmed.startsWith('### ')) {
        children.push(new Paragraph({
          text: trimmed.replace(/^###\s+/, ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 100 },
        }));
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        children.push(new Paragraph({
          text: trimmed.replace(/^[-*]\s+/, ''),
          bullet: { level: 0 },
          spacing: { after: 80 },
        }));
      } else if (/^\d+\.\s/.test(trimmed)) {
        children.push(new Paragraph({
          text: trimmed,
          bullet: { level: 0 },
          spacing: { after: 80 },
        }));
      } else {
        const parts = trimmed.split(/(\*\*.*?\*\*)/g).filter(Boolean);
        const runs = parts.map((p) => {
          if (p.startsWith('**') && p.endsWith('**')) {
            return new TextRun({ text: p.slice(2, -2), bold: true });
          }
          return new TextRun({ text: p });
        });
        children.push(new Paragraph({ children: runs, spacing: { after: 100 } }));
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title || '文档'}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('DOCX 文件已导出');
  }

  async exportToXLSX(result, template) {
    const XLSX = await import('xlsx');
    const rows = [result.columns, ...result.rows];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, result.title || 'Sheet1');
    XLSX.writeFile(wb, `${result.title || '表格'}.xlsx`);
    this.showToast('XLSX 文件已导出');
  }

  // ===================== 模板创建器 =====================

  getDefaultCreatorForm() {
    return {
      currentStep: 1,
      name: '',
      roleId: 'sales',
      abilityId: 'writing',
      outputType: outputTypes.TEXT,
      icon: this.getRecommendedIcon('writing', outputTypes.TEXT),
      description: '',
      defaultMode: 'kb',
      fields: [
        { id: 'topic', type: fieldTypes.TEXT, label: '主题', placeholder: '请输入主题', required: true, description: '', example: '', defaultValue: '', _expanded: false },
      ],
      outputConfig: { columns: [] },
      promptTemplate: this.getDefaultPromptTemplate('writing', [{ id: 'topic', label: '主题' }]),
      activePromptStyle: '通用生成',
    };
  }

  // ===================== 对话式创建模板 =====================

  getDefaultConversationState() {
    return {
      step: 'start',
      messages: [],
      collected: {},
      isTyping: false,
      templatePreview: null,
      started: false,
    };
  }

  resetConversation() {
    this.conversationState = this.getDefaultConversationState();
    this.render();
  }

  addConversationMessage(role, content, options = {}) {
    const msg = { role, content, timestamp: Date.now(), ...options };
    this.conversationState.messages.push(msg);
  }

  async startConversation() {
    const state = this.conversationState;
    if (state.started || state.messages.length > 0) return;
    state.started = true;
    state.isTyping = true;
    this.render();
    await this.delay(600);
    state.isTyping = false;
    const welcome = this.generateNextQuestion();
    this.addConversationMessage('ai', welcome);
    this.render();
    this.scrollConversationToBottom();
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  generateNextQuestion() {
    const { step, collected } = this.conversationState;
    switch (step) {
      case 'start':
        return '你好！我是模板创建助手。我们先从你想创建什么模板开始。\n\n可以告诉我：这个模板用来生成什么内容？例如“给客户做的产品方案 PPT”“销售周报”“面试邀约邮件”等。';
      case 'template_type':
        return `好的，我们要做一个「${collected.templateType || '新模板'}」。\n\n这个模板主要是给哪个岗位或角色使用的？例如：销售、客服、市场运营、HR、产品经理等。`;
      case 'user_role':
        return `明白了，给「${collected.userRole || '该岗位'}」使用。\n\n那每次生成内容时，都需要了解哪些关键信息？请用自然语言列出，例如：客户名称、预算范围、核心需求、竞品情况等。不用考虑“字段”这个词，就像告诉同事需要准备什么资料一样。`;
      case 'collect_info':
        return `收到。那生成的结果希望是什么形式？比如：一段文字、Markdown 文章、表格、PPT、邮件、步骤清单等。也可以补充说明风格要求，比如“正式商务”“简洁有力”“活泼生动”。`;
      case 'output_format':
        return `好的，输出形式是「${collected.outputFormat || '按默认'}」。\n\n最后请简单描述一下这个模板的使用场景或价值，方便以后你和同事理解它的用途。`;
      case 'confirm': {
        const preview = this.buildTemplateFromConversation();
        return `我已经根据你的描述整理好了模板，请确认：\n\n**${preview.name}**\n适用角色：${getRoleById(preview.roleId)?.name || preview.roleId} · 输出形式：${this.getOutputTypeLabel(preview.outputType)}\n\n需要收集的信息：${(preview.fields || []).map((f) => f.label).join('、') || '无'}\n\n如果你满意，点击「保存模板」；想调整，直接告诉我修改哪里，或点击「重新创建」。`;
      }
      default:
        return '还有其他需要补充的吗？';
    }
  }

  getOutputTypeLabel(outputType) {
    const labels = {
      [outputTypes.TEXT]: '文本',
      [outputTypes.MARKDOWN]: 'Markdown 文章',
      [outputTypes.TABLE]: '表格',
      [outputTypes.LIST]: '列表',
      [outputTypes.EMAIL]: '邮件',
      [outputTypes.PPT]: 'PPT',
      [outputTypes.QA]: '问答',
      [outputTypes.STEPS]: '步骤清单',
      [outputTypes.REPORT]: '研究报告',
    };
    return labels[outputType] || outputType;
  }

  async handleConversationSend() {
    const input = document.getElementById('wa-conversation-input');
    const value = input?.value?.trim();
    if (!value) return;

    this.addConversationMessage('user', value);
    input.value = '';
    this.conversationState.isTyping = true;
    this.render();
    this.scrollConversationToBottom();

    await this.delay(500 + Math.random() * 400);

    this.advanceConversationStep(value);
    this.conversationState.isTyping = false;

    if (this.conversationState.step !== 'complete') {
      const question = this.generateNextQuestion();
      this.addConversationMessage('ai', question);
    }

    this.render();
    this.scrollConversationToBottom();
    this.focusConversationInput();
  }

  advanceConversationStep(userText) {
    const state = this.conversationState;
    const text = userText.trim();

    switch (state.step) {
      case 'start':
        state.collected.templateType = text;
        state.step = 'template_type';
        break;
      case 'template_type':
        state.collected.userRole = text;
        // 尝试匹配岗位
        const matchedRole = workRoles.find((r) => text.includes(r.name));
        if (matchedRole) state.collected.roleId = matchedRole.id;
        state.step = 'user_role';
        break;
      case 'user_role':
        state.collected.infoDescription = text;
        state.collected.fields = this.extractFieldsFromDescription(text);
        state.step = 'collect_info';
        break;
      case 'collect_info': {
        state.collected.outputDescription = text;
        const { abilityId, outputType } = this.inferAbilityAndOutput(text);
        state.collected.abilityId = abilityId;
        state.collected.outputType = outputType;
        state.step = 'output_format';
        break;
      }
      case 'output_format':
        state.collected.description = text;
        state.step = 'confirm';
        break;
      case 'confirm': {
        const lower = text.toLowerCase();
        if (lower.includes('重新') || lower.includes('再来') || lower.includes('不对') || lower.includes('改')) {
          state.step = 'start';
          state.collected = {};
          state.messages = [];
        }
        break;
      }
      default:
        break;
    }
  }

  extractFieldsFromDescription(text) {
    // 尝试从自然语言描述中提取信息点
    const fields = [];
    const seen = new Set();

    // 常见信息点模式：顿号、逗号、数字序号分隔
    const segments = text.split(/[,，、;；。\n]/).map((s) => s.trim()).filter(Boolean);

    segments.forEach((seg) => {
      // 去掉“例如”“比如”等前缀
      let label = seg.replace(/^(例如|比如|如|像|包括|需要|涉及|的|有)/g, '').trim();
      if (!label || label.length < 2 || label.length > 20) return;

      // 去除示例值
      label = label.replace(/[：:].*$/, '').trim();
      if (!label) return;

      const id = this.generateFieldId(label);
      if (!id || seen.has(id)) return;
      seen.add(id);

      const type = this.inferFieldType(label);
      const field = { id, label, type, required: true, placeholder: `请输入${label}` };
      if (type === fieldTypes.TEXTAREA) {
        field.rows = 3;
      }
      if (type === fieldTypes.SELECT && label.includes('页数')) {
        field.options = ['5页', '8页', '10页', '15页', '20页'];
      }
      fields.push(field);
    });

    // 兜底：如果没有提取到，生成一个主题字段
    if (fields.length === 0) {
      fields.push({ id: 'topic', type: fieldTypes.TEXT, label: '主题', required: true, placeholder: '请输入主题' });
    }

    return fields;
  }

  inferFieldType(label) {
    const textareaKeywords = ['需求', '描述', '场景', '背景', '痛点', '内容', '说明', '情况', '信息', '要求', '备注', '目的', '建议'];
    const selectKeywords = [
      { kw: '风格', options: ['专业正式', '亲切自然', '简洁有力', '故事化', '活泼生动'] },
      { kw: '情绪', options: ['平和', '着急', '不满', '满意', '质疑'] },
      { kw: '页数', options: ['5页', '8页', '10页', '15页'] },
      { kw: '渠道', options: ['微信公众号', '知乎', '小红书', '官网', '邮件'] },
      { kw: '配色', options: ['品牌绿', '商务蓝', '科技黑', '活力橙'] },
    ];

    for (const item of selectKeywords) {
      if (label.includes(item.kw)) {
        return fieldTypes.SELECT;
      }
    }
    for (const kw of textareaKeywords) {
      if (label.includes(kw)) return fieldTypes.TEXTAREA;
    }
    return fieldTypes.TEXT;
  }

  inferAbilityAndOutput(text) {
    const lower = text.toLowerCase();
    if (lower.includes('ppt') || lower.includes('幻灯片') || lower.includes('汇报')) {
      return { abilityId: 'ppt', outputType: outputTypes.PPT };
    }
    if (lower.includes('表格') || lower.includes('对比表') || lower.includes('清单')) {
      return { abilityId: 'table', outputType: outputTypes.TABLE };
    }
    if (lower.includes('邮件') || lower.includes('email')) {
      return { abilityId: 'writing', outputType: outputTypes.EMAIL };
    }
    if (lower.includes('报告') || lower.includes('研究')) {
      return { abilityId: 'report', outputType: outputTypes.REPORT };
    }
    if (lower.includes('步骤') || lower.includes('流程') || lower.includes('sop')) {
      return { abilityId: 'writing', outputType: outputTypes.STEPS };
    }
    if (lower.includes('列表') || lower.includes('清单') || lower.includes('要点')) {
      return { abilityId: 'writing', outputType: outputTypes.LIST };
    }
    if (lower.includes('markdown') || lower.includes('文章')) {
      return { abilityId: 'writing', outputType: outputTypes.MARKDOWN };
    }
    return { abilityId: 'writing', outputType: outputTypes.TEXT };
  }

  buildTemplateFromConversation() {
    const { collected } = this.conversationState;
    const roleId = collected.roleId || this.matchRoleByText(collected.userRole) || 'sales';
    const { abilityId, outputType } = this.inferAbilityAndOutput(collected.outputDescription || collected.templateType || '');
    const finalAbilityId = collected.abilityId || abilityId;
    const finalOutputType = collected.outputType || outputType;
    const fields = collected.fields || this.extractFieldsFromDescription(collected.infoDescription || '');
    const name = collected.templateType?.split(/[,，、;；。]/)[0]?.trim() || '新建模板';

    return {
      id: generateId('tmpl'),
      name,
      roleId,
      abilityId: finalAbilityId,
      outputType: finalOutputType,
      icon: this.getRecommendedIcon(finalAbilityId, finalOutputType),
      description: collected.description || `通过对话创建的${name}模板`,
      defaultMode: getAbilityById(finalAbilityId)?.supportsKB ? 'kb' : 'free',
      fields,
      promptTemplate: this.getDefaultPromptTemplate(finalAbilityId, fields),
      isCustom: true,
    };
  }

  matchRoleByText(text) {
    if (!text) return null;
    const role = workRoles.find((r) => text.includes(r.name));
    return role?.id || null;
  }

  saveConversationTemplate() {
    const template = this.buildTemplateFromConversation();
    saveCustomTemplate(template);
    this.conversationState.step = 'complete';
    this.addConversationMessage('ai', `模板「${template.name}」已保存到「我的模板」，现在就可以去使用了。`);
    this.render();
    this.scrollConversationToBottom();
    this.showToast('模板已保存');
  }

  renderCreatorChatView() {
    const state = this.conversationState;
    if (!state.started && state.messages.length === 0) {
      setTimeout(() => this.startConversation(), 0);
    }

    return `
      <div class="wa-creator-chat-layout">
        <div class="wa-creator-chat-main">
          <div class="wa-conversation-messages" id="wa-conversation-messages">
            ${this.renderConversationMessages()}
          </div>
          ${state.step !== 'complete' ? `
            <div class="wa-conversation-input-area">
              <input type="text" class="wa-input" id="wa-conversation-input" placeholder="输入你的回答，按回车发送..." autocomplete="off">
              <button class="btn btn-primary" id="wa-conversation-send"><i class="fa-solid fa-paper-plane"></i> 发送</button>
            </div>
          ` : `
            <div class="wa-conversation-actions">
              <button class="btn btn-secondary" id="wa-conversation-restart"><i class="fa-solid fa-rotate-right"></i> 重新创建</button>
              <button class="btn btn-primary" id="wa-conversation-use"><i class="fa-solid fa-store"></i> 去模板市场查看</button>
            </div>
          `}
        </div>
        <div class="wa-creator-chat-side">
          ${this.renderConversationPreview()}
        </div>
      </div>
    `;
  }

  renderConversationMessages() {
    const state = this.conversationState;
    return state.messages
      .map((msg) => {
        if (msg.role === 'ai') {
          return `
            <div class="wa-message wa-message-ai">
              <div class="wa-message-avatar"><i class="fa-solid fa-robot"></i></div>
              <div class="wa-message-content">${this.formatMessageContent(msg.content)}</div>
            </div>
          `;
        }
        return `
          <div class="wa-message wa-message-user">
            <div class="wa-message-content">${this.escapeHtml(msg.content)}</div>
          </div>
        `;
      })
      .join('') + (state.isTyping ? this.renderTypingIndicator() : '');
  }

  renderTypingIndicator() {
    return `
      <div class="wa-message wa-message-ai">
        <div class="wa-message-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="wa-message-content wa-message-typing">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
  }

  formatMessageContent(content) {
    // 简单 Markdown：粗体、换行
    return this.escapeHtml(content)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  renderConversationPreview() {
    const template = this.buildTemplateFromConversation();
    const role = getRoleById(template.roleId);
    const ability = getAbilityById(template.abilityId);

    return `
      <div class="wa-creator-preview-card">
        <div class="wa-creator-preview-title"><i class="fa-solid fa-wand-magic-sparkles"></i> 实时生成的模板</div>
        <div class="wa-creator-preview-content">
          <div class="wa-creator-preview-template">
            <div class="wa-creator-preview-icon"><i class="fa-solid fa-${template.icon || 'file-lines'}"></i></div>
            <div>
              <div class="wa-creator-preview-name">${template.name || '未命名模板'}</div>
              <div class="wa-creator-preview-meta">
                <span style="color:${role?.color || 'var(--kb-text-muted)'}">${role?.name || '未指定岗位'}</span>
                <span>·</span>
                <span>${ability?.name || '写作'}</span>
                <span>·</span>
                <span>${this.getOutputTypeLabel(template.outputType)}</span>
              </div>
            </div>
          </div>
          <div class="wa-creator-preview-fields">
            ${(template.fields || []).length === 0 ? '<div class="wa-creator-preview-desc">还没有收集到信息点，继续对话即可自动生成。</div>' : ''}
            ${(template.fields || []).map((f) => `
              <div class="wa-creator-preview-field">
                <span class="wa-creator-preview-label">${f.label}</span>
                <span class="wa-creator-preview-type">${this.getFieldTypeLabel(f.type)}${f.required ? ' *' : ''}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ${this.conversationState.step === 'confirm' ? `
          <div class="wa-creator-actions" style="margin-top:16px;">
            <button class="btn btn-secondary" id="wa-conversation-restart-side">重新创建</button>
            <button class="btn btn-primary" id="wa-conversation-save-side"><i class="fa-solid fa-floppy-disk"></i> 保存模板</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  getFieldTypeLabel(type) {
    const labels = {
      [fieldTypes.TEXT]: '文本',
      [fieldTypes.TEXTAREA]: '多行文本',
      [fieldTypes.SELECT]: '下拉选择',
      [fieldTypes.MULTI_SELECT]: '多选',
      [fieldTypes.NUMBER]: '数字',
    };
    return labels[type] || type;
  }

  scrollConversationToBottom() {
    const container = document.getElementById('wa-conversation-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  focusConversationInput() {
    const input = document.getElementById('wa-conversation-input');
    if (input) input.focus();
  }

  bindConversationEvents() {
    const sendBtn = document.getElementById('wa-conversation-send');
    const input = document.getElementById('wa-conversation-input');

    sendBtn?.addEventListener('click', () => this.handleConversationSend());
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleConversationSend();
      }
    });

    document.getElementById('wa-conversation-restart')?.addEventListener('click', () => {
      this.resetConversation();
    });

    document.getElementById('wa-conversation-restart-side')?.addEventListener('click', () => {
      this.resetConversation();
    });

    document.getElementById('wa-conversation-save-side')?.addEventListener('click', () => {
      this.saveConversationTemplate();
    });

    document.getElementById('wa-conversation-use')?.addEventListener('click', () => {
      this.activeTab = 'templateMarket';
      this.marketTab = 'mine';
      this.render();
    });

    // 自动聚焦
    this.focusConversationInput();
  }

  // ===================== 表单创建辅助函数 =====================

  getRecommendedIcon(abilityId, outputType) {
    const map = {
      writing: 'pen-nib',
      table: 'table',
      ppt: 'presentation-screen',
      report: 'file-waveform',
      translate: 'language',
      transcribe: 'microphone-lines',
      image: 'image',
      video: 'video',
      music: 'music',
    };
    const outputMap = {
      [outputTypes.PPT]: 'presentation-screen',
      [outputTypes.TABLE]: 'table',
      [outputTypes.EMAIL]: 'envelope',
      [outputTypes.REPORT]: 'file-waveform',
      [outputTypes.QA]: 'circle-question',
      [outputTypes.LIST]: 'list-check',
      [outputTypes.STEPS]: 'arrow-progress',
      [outputTypes.MARKDOWN]: 'file-lines',
    };
    return outputMap[outputType] || map[abilityId] || 'file-lines';
  }

  getAbilityOutputTypes(abilityId) {
    const map = {
      writing: [outputTypes.TEXT, outputTypes.MARKDOWN, outputTypes.EMAIL, outputTypes.LIST, outputTypes.STEPS],
      table: [outputTypes.TABLE],
      ppt: [outputTypes.PPT],
      report: [outputTypes.REPORT, outputTypes.MARKDOWN],
      translate: [outputTypes.TEXT],
      transcribe: [outputTypes.TEXT, outputTypes.LIST],
      image: [outputTypes.TEXT],
      video: [outputTypes.TEXT],
      music: [outputTypes.TEXT],
    };
    return map[abilityId] || [outputTypes.TEXT];
  }

  getDefaultOutputType(abilityId) {
    const types = this.getAbilityOutputTypes(abilityId);
    return types[0] || outputTypes.TEXT;
  }

  generateFieldId(label) {
    if (!label) return '';
    // 英文直接转小写下划线
    const english = label.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    if (/^[a-z0-9_]+$/.test(english)) return english;

    // 常见中文词映射
    const dict = {
      主题: 'topic', 内容: 'content', 客户: 'customer', 产品: 'product', 行业: 'industry',
      预算: 'budget', 竞品: 'competitor', 问题: 'question', 场景: 'scenario', 风格: 'style',
      名称: 'name', 描述: 'description', 需求: 'needs', 痛点: 'pain', 目标: 'goal',
      渠道: 'channel', 角度: 'angle', 重点: 'focus', 要点: 'points', 页数: 'pages',
      配色: 'color', 对象: 'audience', 情绪: 'emotion', 回复: 'reply', 范围: 'scope',
      模块: 'module', 标题: 'title', 摘要: 'summary', 备注: 'notes', 建议: 'suggestions',
      公司: 'company', 部门: 'department', 岗位: 'role', 时间: 'time', 日期: 'date',
      数量: 'quantity', 价格: 'price', 方案: 'solution', 优势: 'advantages', 劣势: 'disadvantages',
      结论: 'conclusion', 背景: 'background', 方法: 'method', 结果: 'results', 行动: 'actions',
      汇报主题: 'topic', 汇报对象: 'audience', 核心信息: 'coreMessage', 邮件主题: 'subject',
      收件人: 'recipient', 邮件目的: 'purpose', 表格主题: 'topic', 对比维度: 'dimensions',
      报告主题: 'topic', 关注重点: 'focus', 客户名称: 'customerName', 客户需求: 'customerNeeds',
      推广产品: 'product', 投放渠道: 'channel', 切入角度: 'angle', 客户问题: 'customerQuestion',
      详细程度: 'detailLevel', 话术风格: 'tone', 回复风格: 'replyStyle',
    };
    for (const [cn, en] of Object.entries(dict)) {
      if (label.includes(cn)) return en;
    }

    // 兜底：按中文字数生成 pinyin 首字母风格的 ID
    const pinyinMap = {
      主: 'zhu', 题: 'ti', 内: 'nei', 容: 'rong', 客: 'ke', 户: 'hu', 产: 'chan', 品: 'pin',
      行: 'hang', 业: 'ye', 预: 'yu', 算: 'suan', 竞: 'jing', 问: 'wen', 场: 'chang',
      景: 'jing', 风: 'feng', 格: 'ge', 名: 'ming', 描: 'miao', 述: 'shu', 需: 'xu',
      求: 'qiu', 痛: 'tong', 目: 'mu', 标: 'biao', 渠: 'qu', 道: 'dao', 角: 'jiao',
      重: 'zhong', 点: 'dian', 要: 'yao', 页: 'ye', 配: 'pei', 色: 'se', 对: 'dui',
      象: 'xiang', 情: 'qing', 绪: 'xu', 回: 'hui', 复: 'fu', 范: 'fan', 围: 'wei',
      模: 'mo', 块: 'kuai', 标: 'biao', 摘: 'zhai', 备: 'bei', 注: 'zhu', 建: 'jian',
      议: 'yi', 公: 'gong', 司: 'si', 部: 'bu', 门: 'men', 岗: 'gang', 位: 'wei',
      时: 'shi', 间: 'jian', 日: 'ri', 期: 'qi', 数: 'shu', 量: 'liang', 价: 'jia',
      格: 'ge', 方: 'fang', 案: 'an', 优: 'you', 势: 'shi', 劣: 'lie', 结: 'jie',
      论: 'lun', 背: 'bei', 法: 'fa', 果: 'guo', 动: 'dong', 邮: 'you', 件: 'jian',
      收: 'shou', 明: 'ming', 细: 'xi', 总: 'zong', 类: 'lei', 型: 'xing', 语: 'yu',
      气: 'qi', 调: 'tiao', 文: 'wen', 字: 'zi', 图: 'tu', 片: 'pian', 视: 'shi',
      频: 'pin', 音: 'yin', 乐: 'yue',
    };
    const chars = label.split('').filter((c) => /[\u4e00-\u9fa5]/.test(c));
    if (chars.length === 0) return english || `field_${Date.now()}`;
    const pinyin = chars.map((c) => pinyinMap[c] || c).join('_');
    return pinyin;
  }

  getDefaultPromptTemplate(abilityId, fields) {
    const fieldList = fields.map((f) => `${f.label}：{${f.id}}`).join('\n');
    const ability = getAbilityById(abilityId);
    const abilityName = ability?.name || '内容';
    const verb = abilityName.endsWith('生成') ? '' : '生成';
    return `请根据以下信息${verb}${abilityName}：\n${fieldList ? `\n${fieldList}\n` : ''}\n要求：结构清晰、语言专业、贴合场景。`;
  }

  getDefaultFieldByOutputType(outputType) {
    switch (outputType) {
      case outputTypes.PPT:
        return [
          { id: 'topic', label: '汇报主题', placeholder: '例如：DmtPlat 企业知识库解决方案', required: true, description: '', example: '', defaultValue: '' },
          { id: 'audience', label: '汇报对象', placeholder: '例如：客户 IT 负责人', required: false, description: '', example: '', defaultValue: '' },
          { id: 'pages', label: '预计页数', placeholder: '例如：8页', required: false, type: fieldTypes.SELECT, options: ['5页', '8页', '10页', '15页'], description: '', example: '', defaultValue: '' },
          { id: 'coreMessage', label: '核心信息', placeholder: '一句话总结最想传递的信息', required: false, type: fieldTypes.TEXTAREA, description: '', example: '', defaultValue: '' },
        ];
      case outputTypes.TABLE:
        return [
          { id: 'topic', label: '表格主题', placeholder: '例如：竞品对比', required: true, description: '', example: '', defaultValue: '' },
          { id: 'dimensions', label: '对比维度', placeholder: '例如：价格、功能、服务', required: false, type: fieldTypes.TEXTAREA, description: '', example: '', defaultValue: '' },
        ];
      case outputTypes.REPORT:
        return [
          { id: 'topic', label: '报告主题', placeholder: '例如：企业知识管理市场趋势', required: true, description: '', example: '', defaultValue: '' },
          { id: 'focus', label: '关注重点', placeholder: '例如：市场规模、竞争格局', required: false, type: fieldTypes.TEXTAREA, description: '', example: '', defaultValue: '' },
        ];
      case outputTypes.EMAIL:
        return [
          { id: 'recipient', label: '收件人', placeholder: '例如：客户负责人', required: false, description: '', example: '', defaultValue: '' },
          { id: 'subject', label: '邮件主题', placeholder: '例如：合作方案沟通', required: true, description: '', example: '', defaultValue: '' },
          { id: 'purpose', label: '邮件目的', placeholder: '例如：介绍产品、跟进进度', required: true, type: fieldTypes.TEXTAREA, description: '', example: '', defaultValue: '' },
        ];
      default:
        return [
          { id: 'topic', label: '主题', placeholder: '请输入主题', required: true, description: '', example: '', defaultValue: '' },
        ];
    }
  }

  renderTemplateCreator() {
    this.container.innerHTML = `
      <header class="header">
        <div style="display:flex;align-items:center;gap:16px;">
          <button class="btn btn-ghost" id="wa-creator-back">← 返回</button>
          <h1 class="header-title">创建模板</h1>
        </div>
      </header>

      <div class="content wa-creator">
        <div class="wa-creator-tabs">
          <button class="wa-creator-tab ${this.creatorTab === 'chat' ? 'active' : ''}" data-tab="chat">
            <i class="fa-solid fa-comments"></i> 对话创建
          </button>
          <button class="wa-creator-tab ${this.creatorTab === 'form' ? 'active' : ''}" data-tab="form">
            <i class="fa-solid fa-pen-ruler"></i> 表单创建
          </button>
          <button class="wa-creator-tab ${this.creatorTab === 'extract' ? 'active' : ''}" data-tab="extract">
            <i class="fa-solid fa-wand-magic-sparkles"></i> 从示例提取
          </button>
        </div>

        ${this.creatorTab === 'chat' ? this.renderCreatorChatView() : this.creatorTab === 'form' ? this.renderCreatorFormView() : this.renderCreatorExtractView()}
      </div>
    `;

    this.bindTemplateCreatorEvents();
  }

  renderCreatorFormView() {
    const steps = [
      { id: 1, title: '基本信息', desc: '名称、岗位、能力' },
      { id: 2, title: '字段设计', desc: '表单字段与规则' },
      { id: 3, title: '提示词与输出', desc: '格式、指令与预览' },
    ];
    const current = this.creatorForm.currentStep;

    return `
      <div class="wa-creator-layout">
        <div class="wa-creator-left">
          <div class="wa-creator-steps">
            ${steps.map((s) => `
              <div class="wa-creator-step ${s.id === current ? 'active' : ''} ${s.id < current ? 'completed' : ''}" data-step="${s.id}">
                <div class="wa-creator-step-number">${s.id < current ? '<i class="fa-solid fa-check"></i>' : s.id}</div>
                <div class="wa-creator-step-info">
                  <div class="wa-creator-step-title">${s.title}</div>
                  <div class="wa-creator-step-desc">${s.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="wa-creator-main">
          ${current === 1 ? this.renderCreatorBasicSection() : ''}
          ${current === 2 ? this.renderCreatorFieldsSection() : ''}
          ${current === 3 ? this.renderCreatorPromptSection() : ''}

          <div class="wa-creator-step-actions">
            ${current > 1 ? `<button class="btn btn-secondary" id="wa-creator-prev"><i class="fa-solid fa-arrow-left"></i> 上一步</button>` : '<span></span>'}
            ${current < 3 ? `<button class="btn btn-primary" id="wa-creator-next">下一步 <i class="fa-solid fa-arrow-right"></i></button>` : `<button class="btn btn-primary" id="wa-creator-save"><i class="fa-solid fa-floppy-disk"></i> 保存模板</button>`}
          </div>
        </div>
        <div class="wa-creator-right">
          <div class="wa-creator-preview-card">
            <div class="wa-creator-preview-title"><i class="fa-solid fa-eye"></i> 实时预览</div>
            ${current === 3 ? this.renderCreatorFinalPreview() : this.renderCreatorPreview()}
          </div>
          ${current === 3 ? `
            <div class="wa-creator-actions" style="margin-top:12px;">
              <button class="btn btn-secondary" id="wa-creator-reset">重置</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderCreatorBasicSection() {
    const form = this.creatorForm;
    const ability = getAbilityById(form.abilityId);
    const supportsKB = ability?.supportsKB ?? true;
    const supportsFree = ability?.supportsFree ?? true;
    const allowedOutputs = this.getAbilityOutputTypes(form.abilityId);

    return `
      <div class="wa-creator-section" id="creator-section-basic">
        <div class="wa-creator-section-title">基本信息</div>
        <div class="wa-creator-section-subtitle">先定义模板给谁用、用来生成什么</div>
        <div class="wa-creator-form-grid">
          <div class="wa-form-item wa-form-item-full">
            <label class="wa-form-label">模板名称 <span class="wa-required">*</span></label>
            <input type="text" class="wa-input" id="creator-name" value="${form.name}" placeholder="例如：客户方案生成">
          </div>
          <div class="wa-form-item">
            <label class="wa-form-label">所属岗位</label>
            <select class="wa-input" id="creator-role">
              ${workRoles.map((r) => `<option value="${r.id}" ${form.roleId === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
            </select>
          </div>
          <div class="wa-form-item">
            <label class="wa-form-label">创作能力</label>
            <select class="wa-input" id="creator-ability">
              ${workAbilities.map((a) => `<option value="${a.id}" ${form.abilityId === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
            </select>
          </div>
          <div class="wa-form-item">
            <label class="wa-form-label">输出形式</label>
            <select class="wa-input" id="creator-output-type">
              ${allowedOutputs.map((value) => {
                const label = Object.entries(outputTypes).find(([k, v]) => v === value)?.[0] || value;
                return `<option value="${value}" ${form.outputType === value ? 'selected' : ''}>${label}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="wa-form-item">
            <label class="wa-form-label">默认模式</label>
            <select class="wa-input" id="creator-default-mode">
              ${supportsKB ? `<option value="kb" ${form.defaultMode === 'kb' ? 'selected' : ''}>基于知识库</option>` : ''}
              ${supportsFree ? `<option value="free" ${form.defaultMode === 'free' ? 'selected' : ''}>自由生成</option>` : ''}
            </select>
          </div>
          <div class="wa-form-item">
            <label class="wa-form-label">图标 <span class="wa-creator-auto-tip">已自动推荐</span></label>
            <div class="wa-creator-icon-input">
              <div class="wa-creator-icon-preview"><i class="fa-solid fa-${form.icon || 'file-lines'}"></i></div>
              <input type="text" class="wa-input" id="creator-icon" value="${form.icon}" placeholder="FontAwesome 图标名">
            </div>
          </div>
          <div class="wa-form-item wa-form-item-full">
            <label class="wa-form-label">模板描述</label>
            <textarea class="wa-input" id="creator-description" rows="3" placeholder="描述该模板的使用场景和价值，方便自己和他人理解">${form.description}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  renderCreatorFieldsSection() {
    const fields = this.creatorForm.fields;
    return `
      <div class="wa-creator-section" id="creator-section-fields">
        <div class="wa-creator-section-title">
          <span>字段设计</span>
          <div class="wa-creator-section-actions">
            <button class="btn btn-sm btn-secondary" id="wa-creator-load-default-fields"><i class="fa-solid fa-wand-magic-sparkles"></i> 加载推荐字段</button>
            <button class="btn btn-sm btn-primary" id="wa-creator-add-field"><i class="fa-solid fa-plus"></i> 添加字段</button>
          </div>
        </div>
        <div class="wa-creator-section-subtitle">用户将来需要填写的内容；点击字段标题展开编辑，字段 ID 会根据名称自动生成</div>
        <div class="wa-creator-fields">
          ${fields.length === 0 ? '<div class="wa-creator-empty-fields">还没有字段，点击「加载推荐字段」或「添加字段」开始</div>' : ''}
          ${fields.map((field, index) => this.renderCreatorFieldItem(field, index)).join('')}
        </div>
      </div>
    `;
  }

  renderCreatorFieldItem(field, index) {
    const typeOptions = Object.entries(fieldTypes).map(([key, value]) => `<option value="${value}" ${field.type === value ? 'selected' : ''}>${key}</option>`).join('');
    const showOptions = field.type === fieldTypes.SELECT || field.type === fieldTypes.MULTI_SELECT;
    const showRows = field.type === fieldTypes.TEXTAREA;
    const expanded = field._expanded === true;

    const typeIcon = {
      [fieldTypes.TEXT]: 'font',
      [fieldTypes.TEXTAREA]: 'align-left',
      [fieldTypes.SELECT]: 'list',
      [fieldTypes.MULTI_SELECT]: 'check-double',
      [fieldTypes.NUMBER]: 'hashtag',
    }[field.type] || 'font';

    const typeLabel = {
      [fieldTypes.TEXT]: '单行文本',
      [fieldTypes.TEXTAREA]: '多行文本',
      [fieldTypes.SELECT]: '下拉选择',
      [fieldTypes.MULTI_SELECT]: '多选',
      [fieldTypes.NUMBER]: '数字',
    }[field.type] || field.type;

    return `
      <div class="wa-creator-field-item ${expanded ? 'expanded' : ''}" data-index="${index}">
        <div class="wa-creator-field-header" data-index="${index}">
          <div class="wa-creator-field-title">
            <span class="wa-creator-field-type-icon"><i class="fa-solid fa-${typeIcon}"></i></span>
            <span class="wa-creator-field-name">${field.label || '未命名字段'}</span>
            <span class="wa-creator-field-type-label">${typeLabel}</span>
            <span class="wa-creator-field-id-tag">${field.id || '无 ID'}</span>
            ${field.required ? '<span class="wa-creator-field-required-tag">必填</span>' : ''}
          </div>
          <div class="wa-creator-field-actions">
            <button class="wa-creator-field-btn wa-creator-field-up" data-index="${index}" title="上移"><i class="fa-solid fa-arrow-up"></i></button>
            <button class="wa-creator-field-btn wa-creator-field-down" data-index="${index}" title="下移"><i class="fa-solid fa-arrow-down"></i></button>
            <button class="wa-creator-field-btn wa-creator-field-clone" data-index="${index}" title="复制"><i class="fa-solid fa-copy"></i></button>
            <button class="wa-creator-field-btn wa-creator-field-remove" data-index="${index}" title="删除"><i class="fa-solid fa-trash"></i></button>
            <button class="wa-creator-field-btn wa-creator-field-toggle" data-index="${index}" title="${expanded ? '收起' : '展开'}"><i class="fa-solid fa-${expanded ? 'chevron-up' : 'chevron-down'}"></i></button>
          </div>
        </div>
        <div class="wa-creator-field-body">
          <div class="wa-creator-field-row">
            <div class="wa-form-item">
              <label class="wa-form-label">字段名称 <span class="wa-required">*</span></label>
              <input type="text" class="wa-input wa-creator-field-label" data-index="${index}" data-prop="label" value="${field.label}" placeholder="例如：客户需求">
            </div>
            <div class="wa-form-item">
              <label class="wa-form-label">字段 ID <span class="wa-creator-auto-tip">自动生成</span></label>
              <input type="text" class="wa-input wa-creator-field-id" data-index="${index}" data-prop="id" value="${field.id}" placeholder="topic">
            </div>
          </div>
          <div class="wa-creator-field-row">
            <div class="wa-form-item">
              <label class="wa-form-label">字段类型</label>
              <select class="wa-input wa-creator-field-type" data-index="${index}" data-prop="type">
                ${typeOptions}
              </select>
            </div>
            <div class="wa-form-item">
              <label class="wa-form-label">输入提示</label>
              <input type="text" class="wa-input wa-creator-field-placeholder" data-index="${index}" data-prop="placeholder" value="${field.placeholder || ''}" placeholder="提示用户这里填什么">
            </div>
          </div>
          <div class="wa-creator-field-row">
            <div class="wa-form-item">
              <label class="wa-form-label">字段说明</label>
              <input type="text" class="wa-input wa-creator-field-description" data-index="${index}" data-prop="description" value="${field.description || ''}" placeholder="补充说明，帮助用户理解该字段">
            </div>
            <div class="wa-form-item">
              <label class="wa-form-label">示例值</label>
              <input type="text" class="wa-input wa-creator-field-example" data-index="${index}" data-prop="example" value="${field.example || ''}" placeholder="填写示例，降低用户思考成本">
            </div>
          </div>
          <div class="wa-creator-field-row">
            <div class="wa-form-item">
              <label class="wa-form-label">默认值</label>
              <input type="text" class="wa-input wa-creator-field-default" data-index="${index}" data-prop="defaultValue" value="${field.defaultValue || ''}" placeholder="表单打开时默认填充的内容">
            </div>
            <div class="wa-form-item wa-creator-field-options-row ${showOptions ? '' : 'hidden'}">
              <label class="wa-form-label">选项（用逗号分隔）</label>
              <textarea class="wa-input wa-creator-field-options" data-index="${index}" data-prop="options" rows="2" placeholder="选项1，选项2，选项3">${(field.options || []).join('，')}</textarea>
            </div>
          </div>
          <div class="wa-creator-field-row">
            <label class="wa-creator-field-checkbox">
              <input type="checkbox" class="wa-creator-field-required" data-index="${index}" data-prop="required" ${field.required ? 'checked' : ''}>
              <span>必填</span>
            </label>
            ${showRows ? `
              <div class="wa-form-item" style="flex:0 0 120px;">
                <label class="wa-form-label">行数</label>
                <input type="number" class="wa-input wa-creator-field-rows" data-index="${index}" data-prop="rows" value="${field.rows || 3}" min="1" max="20">
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderCreatorPromptSection() {
    const form = this.creatorForm;
    const fieldTags = form.fields.map((f) => ({ id: f.id, label: f.label })).filter((f) => f.id);
    const abilityName = getAbilityById(form.abilityId)?.name || '内容';
    const verb = abilityName.endsWith('生成') ? '' : '生成';
    const fieldList = form.fields.map((f) => `${f.label}：{${f.id}}`).join('\n');
    const promptTemplates = [
      { label: '通用生成', text: this.getDefaultPromptTemplate(form.abilityId, form.fields) },
      { label: '专业正式', text: `请基于以下信息，以专业正式的语气${verb}${abilityName}：\n${fieldList}\n\n要求：措辞严谨、逻辑清晰、适合商务场景。` },
      { label: '简洁有力', text: `请根据以下信息${verb}${abilityName}，要求简洁有力、重点突出：\n${fieldList}` },
      { label: '详细展开', text: `请根据以下信息详细${verb}${abilityName}，每个要点都要充分展开：\n${fieldList}\n\n要求：结构完整、论据充分、便于直接使用。` },
    ];

    const outputConfigHtml = this.renderCreatorOutputConfig();

    return `
      <div class="wa-creator-section" id="creator-section-prompt">
        <div class="wa-creator-section-title">提示词与输出</div>
        <div class="wa-creator-section-subtitle">定义 AI 如何根据字段内容生成结果，并按需配置输出格式</div>

        <div class="wa-creator-prompt-templates">
          <div class="wa-creator-prompt-templates-header">
            <label class="wa-form-label">快速选择提示词风格</label>
            <span class="wa-creator-active-style"><i class="fa-solid fa-wand-magic-sparkles"></i> 当前：${form.activePromptStyle || '自定义'}</span>
          </div>
          <div class="wa-creator-prompt-template-list">
            ${promptTemplates.map((t, i) => `<button class="btn btn-sm btn-ghost wa-creator-prompt-template-btn ${form.activePromptStyle === t.label ? 'active' : ''}" data-index="${i}">${t.label}</button>`).join('')}
          </div>
        </div>

        <div class="wa-form-item">
          <label class="wa-form-label">提示词模板</label>
          <textarea class="wa-input" id="creator-prompt-template" rows="10" placeholder="输入提示词模板，可用 {字段ID} 引用字段">${form.promptTemplate}</textarea>
        </div>

        <div class="wa-creator-field-tags">
          <label class="wa-form-label">插入字段变量</label>
          <div class="wa-creator-field-tag-list">
            ${fieldTags.length > 0 ? fieldTags.map((f) => `<button class="wa-creator-field-tag" data-field="${f.id}">{${f.id}} ${f.label}</button>`).join('') : '<span class="wa-creator-empty-fields" style="padding:0;">暂无可用字段，先去「字段设计」添加字段</span>'}
          </div>
        </div>

        <div class="wa-creator-prompt-tip">
          <i class="fa-solid fa-circle-info"></i>
          使用 <code>{字段ID}</code> 引用用户填写的内容，例如 <code>{topic}</code>。
        </div>

        ${outputConfigHtml}

        ${this.renderCreatorSummary()}
      </div>
    `;
  }

  renderCreatorOutputConfig() {
    const outputType = this.creatorForm.outputType;
    const config = this.creatorForm.outputConfig || {};

    let content = '';
    if (outputType === outputTypes.TABLE || outputType === outputTypes.REPORT) {
      content = `
        <div class="wa-form-item wa-form-item-full">
          <label class="wa-form-label">${outputType === outputTypes.TABLE ? '表格列名' : '报告章节'}（用逗号分隔）</label>
          <input type="text" class="wa-input" id="creator-output-columns" value="${(config.columns || []).join('，')}" placeholder="${outputType === outputTypes.TABLE ? '例如：维度，DmtPlat，竞品，分析' : '例如：背景，市场分析，结论，建议'}">
        </div>
      `;
    } else if (outputType === outputTypes.PPT) {
      content = `
        <div class="wa-creator-form-grid">
          <div class="wa-form-item">
            <label class="wa-form-label">PPT 风格</label>
            <select class="wa-input" id="creator-output-style" data-prop="style">
              ${['商务正式', '科技现代', '简约清新', '活泼生动'].map((s) => `<option value="${s}" ${config.style === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="wa-form-item">
            <label class="wa-form-label">配色偏好</label>
            <select class="wa-input" id="creator-output-color" data-prop="color">
              ${['品牌绿', '商务蓝', '科技黑', '活力橙'].map((c) => `<option value="${c}" ${config.color === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="wa-form-item">
            <label class="wa-form-label">默认页数</label>
            <select class="wa-input" id="creator-output-pages" data-prop="pages">
              ${['5页', '8页', '10页', '15页'].map((p) => `<option value="${p}" ${config.pages === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="wa-form-item wa-form-item-full">
            <label class="wa-creator-field-checkbox">
              <input type="checkbox" id="creator-output-notes" data-prop="includeNotes" ${config.includeNotes !== false ? 'checked' : ''}>
              <span>生成演讲备注</span>
            </label>
            <label class="wa-creator-field-checkbox" style="margin-left:20px;">
              <input type="checkbox" id="creator-output-images" data-prop="includeImageSuggestions" ${config.includeImageSuggestions !== false ? 'checked' : ''}>
              <span>生成配图建议</span>
            </label>
          </div>
        </div>
      `;
    } else if (outputType === outputTypes.EMAIL) {
      content = `
        <div class="wa-form-item wa-form-item-full">
          <label class="wa-form-label">邮件默认语气</label>
          <select class="wa-input" id="creator-output-tone" data-prop="tone">
            ${['正式', '亲切', '简洁', ' persuasive'].map((t) => `<option value="${t}" ${config.tone === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
      `;
    } else {
      return '';
    }

    return `
      <div class="wa-creator-output-config" id="creator-section-output">
        <div class="wa-creator-section-title" style="margin-bottom:16px;">输出格式配置</div>
        <div class="wa-creator-form-grid">
          ${content}
        </div>
      </div>
    `;
  }

  renderCreatorSummary() {
    const form = this.creatorForm;
    const role = getRoleById(form.roleId);
    const ability = getAbilityById(form.abilityId);
    const outputLabel = Object.entries(outputTypes).find(([k, v]) => v === form.outputType)?.[0] || form.outputType;

    return `
      <div class="wa-creator-summary">
        <div class="wa-creator-section-title">创建总览</div>
        <div class="wa-creator-summary-item">
          <span class="wa-creator-summary-label">模板名称</span>
          <span class="wa-creator-summary-value">${form.name || '未填写'}</span>
        </div>
        <div class="wa-creator-summary-item">
          <span class="wa-creator-summary-label">岗位 / 能力 / 输出</span>
          <span class="wa-creator-summary-value">${role?.name || '-'} / ${ability?.name || '-'} / ${outputLabel}</span>
        </div>
        <div class="wa-creator-summary-item">
          <span class="wa-creator-summary-label">字段数量</span>
          <span class="wa-creator-summary-value">${form.fields.length} 个</span>
        </div>
        <div class="wa-creator-summary-item">
          <span class="wa-creator-summary-label">默认模式</span>
          <span class="wa-creator-summary-value">${form.defaultMode === 'kb' ? '基于知识库' : '自由生成'}</span>
        </div>
      </div>
    `;
  }

  renderCreatorPreview() {
    const form = this.creatorForm;
    const role = getRoleById(form.roleId);
    const ability = getAbilityById(form.abilityId);
    const outputLabel = Object.entries(outputTypes).find(([k, v]) => v === form.outputType)?.[0] || form.outputType;

    return `
      <div class="wa-creator-preview-content">
        <div class="wa-creator-preview-template">
          <div class="wa-creator-preview-icon"><i class="fa-solid fa-${form.icon || 'file-lines'}"></i></div>
          <div class="wa-creator-preview-info">
            <div class="wa-creator-preview-name">${form.name || '未命名模板'}</div>
            <div class="wa-creator-preview-meta">
              <span style="color:${role?.color}">${role?.name || ''}</span>
              <span>·</span>
              <span>${ability?.name || ''}</span>
              <span>·</span>
              <span>${outputLabel}</span>
            </div>
          </div>
        </div>
        <div class="wa-creator-preview-form">
          ${form.fields.length === 0 ? '<div class="wa-creator-empty-fields">暂无字段</div>' : form.fields.map((f) => this.renderCreatorPreviewField(f)).join('')}
        </div>
        <div class="wa-creator-preview-desc">${form.description || '暂无描述'}</div>
      </div>
    `;
  }

  renderCreatorPreviewField(field) {
    const typeLabel = {
      [fieldTypes.TEXT]: 'text',
      [fieldTypes.TEXTAREA]: 'textarea',
      [fieldTypes.NUMBER]: 'number',
      [fieldTypes.SELECT]: 'select',
      [fieldTypes.MULTI_SELECT]: 'multi-select',
      [fieldTypes.DATE]: 'date',
      [fieldTypes.FILE]: 'file',
    }[field.type] || field.type;

    let input = '';
    if (field.type === fieldTypes.TEXTAREA) {
      input = `<textarea class="wa-input wa-creator-preview-input" rows="${field.rows || 3}" placeholder="${field.placeholder || ''}" disabled>${field.defaultValue || ''}</textarea>`;
    } else if (field.type === fieldTypes.SELECT) {
      input = `<select class="wa-input wa-creator-preview-input" disabled><option>${field.placeholder || '请选择'}</option></select>`;
    } else if (field.type === fieldTypes.MULTI_SELECT) {
      input = `<div class="wa-creator-preview-multi"><span class="wa-creator-preview-tag">选项1</span><span class="wa-creator-preview-tag">选项2</span></div>`;
    } else {
      input = `<input type="${field.type === fieldTypes.NUMBER ? 'number' : 'text'}" class="wa-input wa-creator-preview-input" placeholder="${field.placeholder || ''}" value="${field.defaultValue || ''}" disabled>`;
    }

    return `
      <div class="wa-creator-preview-form-item">
        <label class="wa-creator-preview-form-label">${field.label}${field.required ? ' *' : ''}</label>
        ${input}
        ${field.description ? `<div class="wa-creator-preview-form-desc">${field.description}</div>` : ''}
        ${field.example ? `<div class="wa-creator-preview-form-example">示例：${field.example}</div>` : ''}
      </div>
    `;
  }

  renderCreatorFinalPreview() {
    const form = this.creatorForm;
    const role = getRoleById(form.roleId);
    const ability = getAbilityById(form.abilityId);
    const outputLabel = Object.entries(outputTypes).find(([k, v]) => v === form.outputType)?.[0] || form.outputType;

    return `
      <div class="wa-creator-preview-content">
        <div class="wa-creator-preview-template">
          <div class="wa-creator-preview-icon"><i class="fa-solid fa-${form.icon || 'file-lines'}"></i></div>
          <div class="wa-creator-preview-info">
            <div class="wa-creator-preview-name">${form.name || '未命名模板'}</div>
            <div class="wa-creator-preview-meta">
              <span style="color:${role?.color}">${role?.name || ''}</span>
              <span>·</span>
              <span>${ability?.name || ''}</span>
              <span>·</span>
              <span>${outputLabel}</span>
            </div>
          </div>
        </div>
        <div class="wa-creator-final-fields">
          ${form.fields.map((f) => `
            <div class="wa-creator-final-field">
              <span class="wa-creator-final-field-name">${f.label}${f.required ? ' *' : ''}</span>
              <span class="wa-creator-final-field-type">${f.type}</span>
              ${f.description ? `<div class="wa-creator-final-field-desc">${f.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="wa-creator-preview-desc">${form.description || '暂无描述'}</div>
      </div>
    `;
  }

  renderCreatorExtractView() {
    const fileUploadHtml = this.renderFileUploadSection();
    return `
      <div class="wa-creator-extract">
        <div class="wa-creator-extract-left">
          ${fileUploadHtml}
          <div class="wa-creator-section">
            <div class="wa-creator-section-title">示例文本</div>
            <div class="wa-form-item">
              <label class="wa-form-label">模板名称 <span class="wa-required">*</span></label>
              <input type="text" class="wa-input" id="extract-name" value="${this.extractForm.name}" placeholder="例如：会议纪要生成">
            </div>
            <div class="wa-creator-form-grid">
              <div class="wa-form-item">
                <label class="wa-form-label">所属岗位</label>
                <select class="wa-input" id="extract-role">
                  ${workRoles.map((r) => `<option value="${r.id}" ${this.extractForm.roleId === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                </select>
              </div>
              <div class="wa-form-item">
                <label class="wa-form-label">创作能力</label>
                <select class="wa-input" id="extract-ability">
                  ${workAbilities.map((a) => `<option value="${a.id}" ${this.extractForm.abilityId === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
                </select>
              </div>
              <div class="wa-form-item">
                <label class="wa-form-label">输出形式</label>
                <select class="wa-input" id="extract-output-type">
                  ${Object.entries(outputTypes).map(([key, value]) => `<option value="${value}" ${this.extractForm.outputType === value ? 'selected' : ''}>${key}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="wa-form-item">
              <label class="wa-form-label">粘贴一段示例内容 <span class="wa-required">*</span></label>
              <textarea class="wa-input" id="extract-example" rows="10" placeholder="粘贴一段你希望模板生成的示例内容。系统会自动识别其中的变量和结构。">${this.extractForm.exampleText}</textarea>
            </div>
            <button class="btn btn-primary" id="wa-extract-start"><i class="fa-solid fa-wand-magic-sparkles"></i> 识别结构</button>
          </div>
        </div>
        <div class="wa-creator-extract-right">
          <div class="wa-creator-section">
            <div class="wa-creator-section-title">识别结果</div>
            ${this.extractPreview ? this.renderCreatorExtractPreview() : '<div class="wa-creator-empty-fields">在左侧粘贴示例、上传文件并点击识别后，将在这里预览提取的字段</div>'}
          </div>
        </div>
      </div>
    `;
  }

  renderFileUploadSection() {
    const acceptedTypes = '.pptx,.ppt,.docx,.doc,.xlsx,.xls,.pdf';
    const fileInfo = this.extractFile
      ? `<div class="wa-extract-file-info">
          <i class="fa-solid fa-file-${this.getFileIcon(this.extractFile.fileType)}"></i>
          <span>${this.extractFile.fileName}</span>
          <button class="btn btn-sm btn-ghost" id="wa-extract-file-clear"><i class="fa-solid fa-xmark"></i></button>
        </div>`
      : '';

    return `
      <div class="wa-creator-section">
        <div class="wa-creator-section-title">上传文件提取（支持 PPT / Word / Excel / PDF）</div>
        <div class="wa-extract-upload" id="wa-extract-upload-zone">
          <input type="file" id="wa-extract-file" accept="${acceptedTypes}" style="display:none;">
          <div class="wa-extract-upload-content">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <div class="wa-extract-upload-title">点击或拖拽文件到此处</div>
            <div class="wa-extract-upload-desc">支持 .pptx .docx .xlsx .pdf，自动提取大纲、配色、布局、图表等可复用信息</div>
          </div>
        </div>
        ${fileInfo}
        <div style="margin-top:12px;">
          <button class="btn btn-primary" id="wa-extract-file-start" ${this.extractParsing || !this.extractFile ? 'disabled' : ''}>
            <i class="fa-solid fa-wand-magic-sparkles"></i> ${this.extractParsing ? '解析中...' : '解析文件'}
          </button>
        </div>
      </div>
    `;
  }

  getFileIcon(fileType) {
    const map = { pptx: 'powerpoint', ppt: 'powerpoint', docx: 'word', doc: 'word', xlsx: 'excel', xls: 'excel', pdf: 'pdf' };
    return map[fileType] || 'lines';
  }

  renderCreatorExtractPreview() {
    const preview = this.extractPreview;
    const fileSummary = preview.parsedFromFile ? this.renderFileParseSummary(preview) : '';
    return `
      <div class="wa-creator-preview-content">
        <div class="wa-creator-preview-template">
          <div class="wa-creator-preview-icon"><i class="fa-solid fa-${preview.icon || 'file-lines'}"></i></div>
          <div class="wa-creator-preview-info">
            <div class="wa-creator-preview-name">${preview.name || '未命名模板'}</div>
            <div class="wa-creator-preview-meta">
              <span>${getRoleById(preview.roleId)?.name || ''}</span>
              <span>·</span>
              <span>${getAbilityById(preview.abilityId)?.name || ''}</span>
              <span>·</span>
              <span>${Object.entries(outputTypes).find(([k, v]) => v === preview.outputType)?.[0] || preview.outputType}</span>
            </div>
          </div>
        </div>
        ${fileSummary}
        <div class="wa-creator-preview-fields">
          ${preview.fields.map((f) => `
            <div class="wa-creator-preview-field">
              <span class="wa-creator-preview-label">${f.label}${f.required ? ' *' : ''}</span>
              <span class="wa-creator-preview-type">${f.type}</span>
            </div>
          `).join('')}
        </div>
        <div class="wa-creator-preview-desc">${preview.description || '暂无描述'}</div>
        <div class="wa-creator-extract-actions">
          <button class="btn btn-secondary" id="wa-extract-cancel">取消</button>
          <button class="btn btn-primary" id="wa-extract-save"><i class="fa-solid fa-floppy-disk"></i> 保存为模板</button>
        </div>
      </div>
    `;
  }

  renderFileParseSummary(preview) {
    const master = preview.masterData || {};
    const fileType = master.fileType || preview.fileType;
    const title = master.title || preview.title;
    const pageCount = master.pageCount;
    const totalSlides = master.totalSlides;
    const sheetCount = master.sheetCount;
    const typeDistribution = master.typeDistribution;
    const theme = master.theme || {};

    const fileTypeLabel = { pptx: 'PPT', docx: 'Word', xlsx: 'Excel', pdf: 'PDF' }[fileType] || fileType;
    const countLabel = totalSlides ? `${totalSlides} 页` : pageCount ? `${pageCount} 页` : sheetCount ? `${sheetCount} 张表` : '';

    let themeHtml = '';
    if (theme.colors) {
      const colorValues = Object.values(theme.colors).slice(0, 6);
      themeHtml = `
        <div class="wa-extract-summary-row">
          <span class="wa-extract-summary-label">主题配色</span>
          <div class="wa-extract-color-palette">
            ${colorValues.map((c) => `<span class="wa-extract-color-dot" style="background:${c}" title="${c}"></span>`).join('')}
          </div>
        </div>
      `;
    }
    if (theme.fonts) {
      themeHtml += `
        <div class="wa-extract-summary-row">
          <span class="wa-extract-summary-label">字体方案</span>
          <span>${theme.fonts.major || ''} / ${theme.fonts.minor || ''}</span>
        </div>
      `;
    }

    let structureHtml = '';
    if (typeDistribution) {
      const labels = { cover: '封面', catalog: '目录', content: '内容', section: '章节', end: '结尾' };
      structureHtml = `
        <div class="wa-extract-summary-row">
          <span class="wa-extract-summary-label">页面结构</span>
          <span>${Object.entries(typeDistribution).map(([k, v]) => `${labels[k] || k} ${v} 页`).join(' / ')}</span>
        </div>
      `;
    }

    return `
      <div class="wa-extract-file-summary">
        <div class="wa-extract-summary-row">
          <span class="wa-extract-summary-label">文件来源</span>
          <span>${fileTypeLabel} · ${title || '未命名'} ${countLabel ? '· ' + countLabel : ''}</span>
        </div>
        ${structureHtml}
        ${themeHtml}
      </div>
    `;
  }

  bindTemplateCreatorEvents() {
    // 返回首页
    document.getElementById('wa-creator-back')?.addEventListener('click', () => {
      this.activeTab = 'home';
      this.render();
    });

    // 标签切换
    this.container.querySelectorAll('.wa-creator-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.creatorTab = tab.dataset.tab;
        this.render();
      });
    });

    if (this.creatorTab === 'chat') {
      this.bindConversationEvents();
    }

    if (this.creatorTab === 'form') {
      // 步骤导航
      this.container.querySelectorAll('.wa-creator-step').forEach((step) => {
        step.addEventListener('click', () => {
          const stepNum = parseInt(step.dataset.step);
          if (stepNum && stepNum !== this.creatorForm.currentStep) {
            this.collectCurrentStep();
            this.creatorForm.currentStep = stepNum;
            this.render();
          }
        });
      });

      // 上一步 / 下一步
      document.getElementById('wa-creator-prev')?.addEventListener('click', () => {
        this.collectCurrentStep();
        if (this.creatorForm.currentStep > 1) {
          this.creatorForm.currentStep--;
          this.render();
        }
      });

      document.getElementById('wa-creator-next')?.addEventListener('click', () => {
        if (!this.validateCurrentStep()) return;
        this.collectCurrentStep();
        if (this.creatorForm.currentStep < 3) {
          this.creatorForm.currentStep++;
          this.render();
        }
      });

      // 基本信息变更
      ['creator-name', 'creator-icon', 'creator-description', 'creator-prompt-template'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => {
            this.collectCreatorBasic();
            this.updateCreatorPreview();
          });
        }
      });

      ['creator-role', 'creator-output-type', 'creator-default-mode'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', () => {
            this.collectCreatorBasic();
            this.updateCreatorPreview();
          });
        }
      });

      // 能力变化时联动输出形式、图标、默认字段、默认模式
      document.getElementById('creator-ability')?.addEventListener('change', () => {
        this.collectCreatorBasic();
        const ability = getAbilityById(this.creatorForm.abilityId);
        const newOutputType = this.getDefaultOutputType(this.creatorForm.abilityId);
        this.creatorForm.outputType = newOutputType;
        this.creatorForm.icon = this.getRecommendedIcon(this.creatorForm.abilityId, newOutputType);
        if (this.creatorForm.defaultMode === 'kb' && !ability?.supportsKB) {
          this.creatorForm.defaultMode = 'free';
        } else if (this.creatorForm.defaultMode === 'free' && !ability?.supportsFree) {
          this.creatorForm.defaultMode = 'kb';
        }
        this.creatorForm.promptTemplate = this.getDefaultPromptTemplate(this.creatorForm.abilityId, this.creatorForm.fields);
        this.render();
      });

      // 输出形式变化时联动图标、默认字段
      document.getElementById('creator-output-type')?.addEventListener('change', () => {
        this.collectCreatorBasic();
        this.creatorForm.icon = this.getRecommendedIcon(this.creatorForm.abilityId, this.creatorForm.outputType);
        this.creatorForm.promptTemplate = this.getDefaultPromptTemplate(this.creatorForm.abilityId, this.creatorForm.fields);
        this.render();
      });

      // 输出配置
      document.getElementById('creator-output-columns')?.addEventListener('input', () => {
        this.collectCreatorOutputConfig();
      });
      document.getElementById('creator-output-style')?.addEventListener('change', () => {
        this.collectCreatorOutputConfig();
      });
      document.getElementById('creator-output-color')?.addEventListener('change', () => {
        this.collectCreatorOutputConfig();
      });
      document.getElementById('creator-output-pages')?.addEventListener('change', () => {
        this.collectCreatorOutputConfig();
      });
      document.getElementById('creator-output-notes')?.addEventListener('change', () => {
        this.collectCreatorOutputConfig();
      });
      document.getElementById('creator-output-images')?.addEventListener('change', () => {
        this.collectCreatorOutputConfig();
      });
      document.getElementById('creator-output-tone')?.addEventListener('change', () => {
        this.collectCreatorOutputConfig();
      });

      // 加载推荐字段
      document.getElementById('wa-creator-load-default-fields')?.addEventListener('click', () => {
        this.loadDefaultFields();
      });

      // 添加字段
      document.getElementById('wa-creator-add-field')?.addEventListener('click', () => {
        this.addCreatorField();
      });

      // 字段操作
      this.container.querySelectorAll('.wa-creator-field-remove').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          this.removeCreatorField(index);
        });
      });

      this.container.querySelectorAll('.wa-creator-field-up').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          this.moveCreatorField(index, -1);
        });
      });

      this.container.querySelectorAll('.wa-creator-field-down').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          this.moveCreatorField(index, 1);
        });
      });

      this.container.querySelectorAll('.wa-creator-field-clone').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          this.cloneCreatorField(index);
        });
      });

      this.container.querySelectorAll('.wa-creator-field-toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          const field = this.creatorForm.fields[index];
          if (field) {
            field._expanded = !field._expanded;
            this.render();
          }
        });
      });

      this.container.querySelectorAll('.wa-creator-field-header').forEach((header) => {
        header.addEventListener('click', (e) => {
          if (e.target.closest('.wa-creator-field-actions')) return;
          const index = parseInt(header.dataset.index);
          const field = this.creatorForm.fields[index];
          if (field) {
            field._expanded = !field._expanded;
            this.render();
          }
        });
      });

      // 字段输入同步
      this.container.querySelectorAll('[data-prop]').forEach((el) => {
        el.addEventListener('input', () => {
          this.collectCreatorField(el);
          this.updateCreatorPreview();
        });
        el.addEventListener('change', () => {
          const prop = el.dataset.prop;
          const index = parseInt(el.dataset.index);
          const prevType = this.creatorForm.fields[index]?.type;
          this.collectCreatorField(el);
          if (prop === 'type' && prevType !== el.value) {
            this.render();
          } else {
            this.updateCreatorPreview();
          }
        });
      });

      // 提示词模板按钮
      this.container.querySelectorAll('.wa-creator-prompt-template-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          const abilityName = getAbilityById(this.creatorForm.abilityId)?.name || '内容';
          const verb = abilityName.endsWith('生成') ? '' : '生成';
          const fieldList = this.creatorForm.fields.map((f) => `${f.label}：{${f.id}}`).join('\n');
          const templates = [
            { label: '通用生成', text: this.getDefaultPromptTemplate(this.creatorForm.abilityId, this.creatorForm.fields) },
            { label: '专业正式', text: `请基于以下信息，以专业正式的语气${verb}${abilityName}：\n${fieldList}\n\n要求：措辞严谨、逻辑清晰、适合商务场景。` },
            { label: '简洁有力', text: `请根据以下信息${verb}${abilityName}，要求简洁有力、重点突出：\n${fieldList}` },
            { label: '详细展开', text: `请根据以下信息详细${verb}${abilityName}，每个要点都要充分展开：\n${fieldList}\n\n要求：结构完整、论据充分、便于直接使用。` },
          ];
          if (templates[index]) {
            this.creatorForm.promptTemplate = templates[index].text;
            this.creatorForm.activePromptStyle = templates[index].label;
            this.render();
            this.showToast(`已切换为「${templates[index].label}」风格`);
          }
        });
      });

      // 字段变量插入
      this.container.querySelectorAll('.wa-creator-field-tag').forEach((btn) => {
        btn.addEventListener('click', () => {
          const fieldId = btn.dataset.field;
          const textarea = document.getElementById('creator-prompt-template');
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const insert = `{${fieldId}}`;
            textarea.value = text.substring(0, start) + insert + text.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + insert.length;
            textarea.focus();
            this.creatorForm.promptTemplate = textarea.value;
            this.updateCreatorPreview();
          }
        });
      });

      // 重置与保存
      document.getElementById('wa-creator-reset')?.addEventListener('click', () => {
        this.creatorForm = this.getDefaultCreatorForm();
        this.render();
        this.showToast('已重置');
      });

      document.getElementById('wa-creator-save')?.addEventListener('click', () => {
        this.saveCreatorTemplate();
      });
    } else {
      // 示例提取
      ['extract-name', 'extract-example'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => {
            this.extractForm[id.split('-')[1]] = el.value;
          });
        }
      });

      ['extract-role', 'extract-ability', 'extract-output-type'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', () => {
            this.extractForm[id.split('-')[1]] = el.value;
          });
        }
      });

      document.getElementById('wa-extract-start')?.addEventListener('click', () => {
        this.startExtractTemplate();
      });

      document.getElementById('wa-extract-cancel')?.addEventListener('click', () => {
        this.extractPreview = null;
        this.extractForm = { name: '', roleId: 'sales', abilityId: 'writing', outputType: outputTypes.TEXT, exampleText: '' };
        this.render();
      });

      document.getElementById('wa-extract-save')?.addEventListener('click', () => {
        this.saveExtractedTemplate();
      });

      // 文件上传事件
      const fileInput = document.getElementById('wa-extract-file');
      const uploadZone = document.getElementById('wa-extract-upload-zone');

      uploadZone?.addEventListener('click', () => fileInput?.click());

      uploadZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
      });

      uploadZone?.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
      });

      uploadZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) this.handleExtractFileSelect(file);
      });

      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.handleExtractFileSelect(file);
      });

      document.getElementById('wa-extract-file-start')?.addEventListener('click', () => {
        this.startFileExtract();
      });

      document.getElementById('wa-extract-file-clear')?.addEventListener('click', () => {
        this.extractFile = null;
        this.extractPreview = null;
        this.render();
      });
    }
  }

  collectCurrentStep() {
    const step = this.creatorForm.currentStep;
    if (step === 1) this.collectCreatorBasic();
    if (step === 2) this.collectCreatorFields();
    if (step === 3) {
      this.collectCreatorPrompt();
      this.collectCreatorOutputConfig();
    }
  }

  validateCurrentStep() {
    const step = this.creatorForm.currentStep;
    if (step === 1) {
      this.collectCreatorBasic();
      if (!this.creatorForm.name.trim()) {
        this.showToast('请填写模板名称', 'error');
        document.getElementById('creator-name')?.focus();
        return false;
      }
      return true;
    }
    if (step === 2) {
      this.collectCreatorFields();
      if (this.creatorForm.fields.length === 0) {
        this.showToast('请至少添加一个字段', 'error');
        return false;
      }
      const invalidField = this.creatorForm.fields.find((f) => !f.id.trim() || !f.label.trim());
      if (invalidField) {
        this.showToast('字段ID和名称不能为空', 'error');
        // 高亮并展开有问题的字段
        this.creatorForm.fields.forEach((f, i) => {
          if (!f.id.trim() || !f.label.trim()) f._expanded = true;
        });
        this.render();
        return false;
      }
      return true;
    }
    return true;
  }

  collectCreatorBasic() {
    const name = document.getElementById('creator-name')?.value || '';
    const icon = document.getElementById('creator-icon')?.value || 'file-lines';
    const roleId = document.getElementById('creator-role')?.value || 'sales';
    const abilityId = document.getElementById('creator-ability')?.value || 'writing';
    const outputType = document.getElementById('creator-output-type')?.value || this.getDefaultOutputType(abilityId);
    const defaultMode = document.getElementById('creator-default-mode')?.value || 'kb';
    const description = document.getElementById('creator-description')?.value || '';

    this.creatorForm = {
      ...this.creatorForm,
      name,
      icon,
      roleId,
      abilityId,
      outputType,
      defaultMode,
      description,
    };
  }

  collectCreatorFields() {
    this.container.querySelectorAll('[data-prop]').forEach((el) => {
      this.collectCreatorField(el);
    });
  }

  collectCreatorOutputConfig() {
    const outputType = this.creatorForm.outputType;
    const config = { ...(this.creatorForm.outputConfig || {}) };

    if (outputType === outputTypes.TABLE || outputType === outputTypes.REPORT) {
      const columnsInput = document.getElementById('creator-output-columns')?.value || '';
      config.columns = columnsInput.split(/[,，]/).map((c) => c.trim()).filter(Boolean);
    } else if (outputType === outputTypes.PPT) {
      config.style = document.getElementById('creator-output-style')?.value || '商务正式';
      config.color = document.getElementById('creator-output-color')?.value || '品牌绿';
      config.pages = document.getElementById('creator-output-pages')?.value || '8页';
      config.includeNotes = document.getElementById('creator-output-notes')?.checked ?? true;
      config.includeImageSuggestions = document.getElementById('creator-output-images')?.checked ?? true;
    } else if (outputType === outputTypes.EMAIL) {
      config.tone = document.getElementById('creator-output-tone')?.value || '正式';
    }

    this.creatorForm.outputConfig = config;
  }

  collectCreatorPrompt() {
    const promptTemplate = document.getElementById('creator-prompt-template')?.value || '';
    if (promptTemplate !== this.creatorForm.promptTemplate) {
      this.creatorForm.activePromptStyle = '自定义';
    }
    this.creatorForm.promptTemplate = promptTemplate;
  }

  collectCreatorField(el) {
    const index = parseInt(el.dataset.index);
    const prop = el.dataset.prop;
    const field = this.creatorForm.fields[index];
    if (!field) return;

    const prevLabel = field.label;

    if (prop === 'required') {
      field[prop] = el.checked;
    } else if (prop === 'options') {
      field[prop] = el.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    } else if (prop === 'rows') {
      field[prop] = parseInt(el.value) || 3;
    } else {
      field[prop] = el.value;
    }

    // 字段名称变化时自动生成 ID
    if (prop === 'label' && el.value.trim() && (!field.id || field.id === this.generateFieldId(prevLabel) || field.id.startsWith('field_'))) {
      field.id = this.generateFieldId(el.value);
      const idInput = this.container.querySelector(`.wa-creator-field-id[data-index="${index}"]`);
      if (idInput) idInput.value = field.id;
    }

    // 类型变化时清理或初始化相关属性
    if (prop === 'type') {
      if (el.value === fieldTypes.SELECT || el.value === fieldTypes.MULTI_SELECT) {
        if (!field.options) field.options = [];
      } else if (el.value === fieldTypes.TEXTAREA) {
        if (!field.rows) field.rows = 3;
      }
    }
  }

  loadDefaultFields() {
    const defaultFields = this.getDefaultFieldByOutputType(this.creatorForm.outputType);
    this.creatorForm.fields = defaultFields.map((f) => ({ ...f, _expanded: false }));
    this.creatorForm.promptTemplate = this.getDefaultPromptTemplate(this.creatorForm.abilityId, this.creatorForm.fields);
    this.render();
    this.showToast('已加载推荐字段');
  }

  addCreatorField() {
    this.collectCreatorFields();
    const index = this.creatorForm.fields.length + 1;
    this.creatorForm.fields.push({
      id: `field_${index}`,
      type: fieldTypes.TEXT,
      label: `新字段 ${index}`,
      placeholder: '',
      required: false,
      description: '',
      example: '',
      defaultValue: '',
      _expanded: true,
    });
    this.render();
  }

  removeCreatorField(index) {
    this.creatorForm.fields.splice(index, 1);
    this.render();
  }

  moveCreatorField(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.creatorForm.fields.length) return;
    const [moved] = this.creatorForm.fields.splice(index, 1);
    this.creatorForm.fields.splice(newIndex, 0, moved);
    this.render();
  }

  cloneCreatorField(index) {
    this.collectCreatorFields();
    const field = this.creatorForm.fields[index];
    if (!field) return;
    const clone = {
      ...field,
      id: `${field.id}_copy`,
      label: `${field.label}（副本）`,
      _expanded: true,
    };
    this.creatorForm.fields.splice(index + 1, 0, clone);
    this.render();
    this.showToast('已复制字段');
  }

  updateCreatorPreview() {
    const preview = this.container.querySelector('.wa-creator-preview-card');
    if (preview) {
      const current = this.creatorForm.currentStep;
      preview.innerHTML = `
        <div class="wa-creator-preview-title"><i class="fa-solid fa-eye"></i> 实时预览</div>
        ${current === 3 ? this.renderCreatorFinalPreview() : this.renderCreatorPreview()}
      `;
    }
  }

  saveCreatorTemplate() {
    this.collectCurrentStep();

    if (!this.creatorForm.name.trim()) {
      this.showToast('请填写模板名称', 'error');
      this.creatorForm.currentStep = 1;
      this.render();
      return;
    }

    if (this.creatorForm.fields.length === 0) {
      this.showToast('请至少添加一个字段', 'error');
      this.creatorForm.currentStep = 2;
      this.render();
      return;
    }

    const invalidField = this.creatorForm.fields.find((f) => !f.id.trim() || !f.label.trim());
    if (invalidField) {
      this.showToast('字段ID和名称不能为空', 'error');
      this.creatorForm.currentStep = 2;
      this.render();
      return;
    }

    const ability = getAbilityById(this.creatorForm.abilityId);
    let defaultMode = this.creatorForm.defaultMode;
    if (defaultMode === 'kb' && !ability?.supportsKB) defaultMode = 'free';
    if (defaultMode === 'free' && !ability?.supportsFree) defaultMode = 'kb';

    // 清理内部状态字段
    const cleanFields = this.creatorForm.fields.map((f) => {
      const { _expanded, ...rest } = f;
      return rest;
    });

    const { activePromptStyle, currentStep, ...templateRest } = this.creatorForm;

    const template = {
      ...templateRest,
      fields: cleanFields,
      name: this.creatorForm.name.trim(),
      defaultMode,
      id: `custom_${Date.now()}`,
      isCustom: true,
      recommendedKBs: [],
    };

    saveCustomTemplate(template);
    this.creatorForm = this.getDefaultCreatorForm();
    this.showToast('模板已保存到「我的模板」');
    this.activeTab = 'templateMarket';
    this.marketTab = 'mine';
    this.render();
  }

  handleExtractFileSelect(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls', 'pdf'];
    if (!allowed.includes(ext)) {
      this.showToast('仅支持 PPT、Word、Excel、PDF 文件', 'error');
      return;
    }
    this.extractFile = { file, fileName: file.name, fileType: ext };
    this.extractPreview = null;
    this.render();
  }

  async startFileExtract() {
    if (!this.extractFile) {
      this.showToast('请先选择文件', 'error');
      return;
    }

    this.extractParsing = true;
    this.render();

    try {
      const formData = new FormData();
      formData.append('file', this.extractFile.file);

      const res = await fetch('http://localhost:3001/api/parse-template', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || '解析失败');
      }

      const ability = getAbilityById(this.extractForm.abilityId);
      let defaultMode = 'kb';
      if (defaultMode === 'kb' && !ability?.supportsKB) defaultMode = 'free';

      const fields = (data.suggestedFields || []).map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        placeholder: f.placeholder || '',
        required: f.required || false,
        rows: f.rows,
      }));

      const fileTypeMap = {
        pptx: { abilityId: 'ppt', outputType: outputTypes.PPT, icon: 'presentation-screen' },
        ppt: { abilityId: 'ppt', outputType: outputTypes.PPT, icon: 'presentation-screen' },
        docx: { abilityId: 'writing', outputType: outputTypes.MARKDOWN, icon: 'file-word' },
        doc: { abilityId: 'writing', outputType: outputTypes.MARKDOWN, icon: 'file-word' },
        xlsx: { abilityId: 'table', outputType: outputTypes.TABLE, icon: 'file-excel' },
        xls: { abilityId: 'table', outputType: outputTypes.TABLE, icon: 'file-excel' },
        pdf: { abilityId: 'report', outputType: outputTypes.REPORT, icon: 'file-pdf' },
      };
      const fileMapping = fileTypeMap[data.fileType] || { abilityId: this.extractForm.abilityId, outputType: this.extractForm.outputType, icon: 'file-lines' };

      const masterData = {
        fileType: data.fileType,
        fileName: data.fileName,
        title: data.title,
        ...(data.fileType === 'pptx' ? { theme: data.theme, slides: data.slides, typeDistribution: data.typeDistribution, totalSlides: data.totalSlides } : {}),
        ...(data.fileType === 'docx' ? { headings: data.headings, tables: data.tables, paragraphs: data.paragraphs, wordCount: data.wordCount } : {}),
        ...(data.fileType === 'xlsx' ? { sheets: data.sheets, sheetCount: data.sheetCount } : {}),
        ...(data.fileType === 'pdf' ? { headings: data.headings, paragraphs: data.paragraphs, pageCount: data.pageCount, author: data.author } : {}),
      };

      this.extractPreview = {
        id: `custom_${Date.now()}`,
        name: data.title || this.extractFile.fileName.replace(/\.[^.]+$/, ''),
        roleId: this.extractForm.roleId,
        abilityId: fileMapping.abilityId,
        outputType: fileMapping.outputType,
        defaultMode,
        description: `从 ${data.fileName} 提取的模板，包含 ${fields.length} 个可填充字段`,
        icon: fileMapping.icon,
        fields,
        promptTemplate: this.buildFileExtractPrompt(data),
        parsedFromFile: true,
        masterData,
      };

      this.showToast('文件解析完成');
    } catch (err) {
      console.error(err);
      this.showToast(err.message || '文件解析失败', 'error');
    } finally {
      this.extractParsing = false;
      this.render();
    }
  }

  buildFileExtractPrompt(data) {
    if (data.fileType === 'pptx') {
      return `请根据以下信息，生成一份遵循原 PPT 结构（${Object.entries(data.typeDistribution || {}).map(([k, v]) => `${k} ${v} 页`).join('、')}）和视觉风格的 PPT：\n{fields}\n\n原 PPT 大纲参考：\n${(data.slides || []).slice(0, 5).map((s) => `第${s.index}页（${s.type}）：${s.title}`).join('\n')}`;
    }
    if (data.fileType === 'docx') {
      return `请根据以下信息，参照原文档的章节结构和表格样式生成内容：\n{fields}\n\n原文档章节：\n${(data.headings || []).slice(0, 10).map((h) => h.text).join('\n')}`;
    }
    if (data.fileType === 'xlsx') {
      return `请根据以下信息生成表格数据，列结构参考：\n{fields}\n\n原表格列：${(data.sheets?.[0]?.headers || []).join('、')}`;
    }
    return `请根据以下信息生成内容：\n{fields}`;
  }

  startExtractTemplate() {
    const name = document.getElementById('extract-name')?.value?.trim();
    const exampleText = document.getElementById('extract-example')?.value?.trim();

    if (!name) {
      this.showToast('请填写模板名称', 'error');
      return;
    }
    if (!exampleText) {
      this.showToast('请粘贴示例内容', 'error');
      return;
    }

    this.extractForm.name = name;
    this.extractForm.exampleText = exampleText;

    this.extractPreview = extractTemplateFromExample({
      name,
      roleId: this.extractForm.roleId,
      abilityId: this.extractForm.abilityId,
      exampleText,
      outputType: this.extractForm.outputType,
    });

    this.render();
    this.showToast('已识别结构，请预览后保存');
  }

  saveExtractedTemplate() {
    if (!this.extractPreview) return;
    const ability = getAbilityById(this.extractPreview.abilityId);
    let defaultMode = this.extractPreview.defaultMode || 'kb';
    if (defaultMode === 'kb' && !ability?.supportsKB) defaultMode = 'free';
    if (defaultMode === 'free' && !ability?.supportsFree) defaultMode = 'kb';
    saveCustomTemplate({ ...this.extractPreview, isCustom: true, recommendedKBs: [], defaultMode });
    this.extractPreview = null;
    this.extractForm = { name: '', roleId: 'sales', abilityId: 'writing', outputType: outputTypes.TEXT, exampleText: '' };
    this.showToast('模板已保存到「我的模板」');
    this.activeTab = 'templateMarket';
    this.marketTab = 'mine';
    this.render();
  }

  handleMasterFileSelect(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls', 'pdf'];
    if (!allowed.includes(ext)) {
      this.showToast('仅支持 PPT、Word、Excel、PDF 文件', 'error');
      return;
    }
    this.parseMasterFile(file);
  }

  async parseMasterFile(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:3001/api/parse-template', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || '解析失败');
      }

      this.currentMasterData = {
        fileType: data.fileType,
        fileName: data.fileName,
        title: data.title,
        ...(data.fileType === 'pptx' ? { theme: data.theme, slides: data.slides, typeDistribution: data.typeDistribution } : {}),
        ...(data.fileType === 'docx' ? { headings: data.headings, tables: data.tables, paragraphs: data.paragraphs } : {}),
        ...(data.fileType === 'xlsx' ? { sheets: data.sheets, sheetCount: data.sheetCount } : {}),
        ...(data.fileType === 'pdf' ? { headings: data.headings, paragraphs: data.paragraphs, pageCount: data.pageCount, author: data.author } : {}),
      };
      this.useMaster = true;
      this.showToast('母版文件已加载');
      this.render();
    } catch (err) {
      console.error(err);
      this.showToast(err.message || '母版文件解析失败', 'error');
    }
  }

  handleAttachmentFileSelect(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls', 'pdf', 'txt', 'md'];
    if (!allowed.includes(ext)) {
      this.showToast('仅支持 PPT、Word、Excel、PDF、TXT、Markdown 文件', 'error');
      return;
    }
    this.parseAttachmentFile(file);
  }

  async parseAttachmentFile(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:3001/api/parse-template', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || '解析失败');
      }

      const attachment = {
        fileType: data.fileType,
        fileName: data.fileName,
        title: data.title,
        ...(data.fileType === 'pptx' ? { theme: data.theme, slides: data.slides, typeDistribution: data.typeDistribution } : {}),
        ...(data.fileType === 'docx' ? { headings: data.headings, tables: data.tables, paragraphs: data.paragraphs } : {}),
        ...(data.fileType === 'xlsx' ? { sheets: data.sheets, sheetCount: data.sheetCount } : {}),
        ...(data.fileType === 'pdf' ? { headings: data.headings, paragraphs: data.paragraphs, pageCount: data.pageCount, author: data.author } : {}),
        ...(data.fileType === 'txt' || data.fileType === 'md' ? { text: data.text } : {}),
      };
      this.freeAttachments.push(attachment);
      this.showToast('附件已上传');
      this.updateAttachmentPanel();
    } catch (err) {
      console.error(err);
      this.showToast(err.message || '附件解析失败', 'error');
    }
  }

  removeAttachment(index) {
    this.freeAttachments.splice(index, 1);
    this.updateAttachmentPanel();
  }

  // ===================== 模板市场 =====================

  renderTemplateMarket() {
    this.container.innerHTML = `
      <header class="header">
        <div style="display:flex;align-items:center;gap:16px;">
          <button class="btn btn-ghost" id="wa-market-back">← 返回</button>
          <h1 class="header-title">模板市场</h1>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" id="wa-market-create">
            <i class="fa-solid fa-plus"></i> 创建模板
          </button>
        </div>
      </header>

      <div class="content wa-market">
        <div class="wa-market-tabs">
          <button class="wa-market-tab ${this.marketTab === 'all' ? 'active' : ''}" data-tab="all">
            <i class="fa-solid fa-layer-group"></i> 全部模板
          </button>
          <button class="wa-market-tab ${this.marketTab === 'mine' ? 'active' : ''}" data-tab="mine">
            <i class="fa-solid fa-user"></i> 我的模板
          </button>
          <button class="wa-market-tab ${this.marketTab === 'pending' ? 'active' : ''}" data-tab="pending">
            <i class="fa-solid fa-clipboard-check"></i> 待审核
          </button>
        </div>

        ${this.renderMarketContent()}
      </div>
    `;

    this.bindTemplateMarketEvents();
  }

  renderMarketContent() {
    if (this.marketTab === 'all') {
      const templates = getAllTemplates();
      return this.renderMarketGrid(templates, 'all');
    }
    if (this.marketTab === 'mine') {
      const custom = getCustomTemplates();
      const team = getTeamTemplates().filter((t) => t.creator === '当前用户');
      return this.renderMarketGrid([...custom, ...team], 'mine');
    }
    if (this.marketTab === 'pending') {
      const pending = getTeamTemplates().filter((t) => t.status === 'pending');
      return this.renderMarketGrid(pending, 'pending');
    }
    return '';
  }

  renderMarketGrid(templates, context) {
    if (templates.length === 0) {
      return `
        <div class="wa-empty-state" style="padding:80px 0;">
          <div class="wa-empty-icon"><i class="fa-solid fa-folder-open"></i></div>
          <div class="wa-empty-title">暂无模板</div>
          <div class="wa-empty-desc">${context === 'pending' ? '当前没有待审核的团队模板' : '还没有模板，去创建一个吧'}</div>
          ${context !== 'pending' ? '<button class="btn btn-primary" id="wa-market-empty-create">去创建</button>' : ''}
        </div>
      `;
    }

    return `
      <div class="wa-market-grid">
        ${templates.map((template) => this.renderMarketCard(template, context)).join('')}
      </div>
    `;
  }

  renderMarketCard(template, context) {
    const role = getRoleById(template.roleId);
    const ability = getAbilityById(template.abilityId);
    const isTeam = template.status !== undefined;
    const statusMap = {
      pending: { label: '审核中', class: 'status-pending' },
      approved: { label: '已通过', class: 'status-approved' },
      rejected: { label: '已拒绝', class: 'status-rejected' },
    };
    const status = isTeam ? statusMap[template.status] : null;
    const outputLabel = Object.entries(outputTypes).find(([k, v]) => v === template.outputType)?.[0] || template.outputType;

    return `
      <div class="wa-market-card" data-id="${template.id}" data-source="${template.isCustom ? 'custom' : isTeam ? 'team' : 'official'}">
        <div class="wa-market-card-header">
          <div class="wa-market-card-icon"><i class="fa-solid fa-${template.icon || 'file-lines'}"></i></div>
          <div class="wa-market-card-status">
            ${status ? `<span class="wa-market-status ${status.class}">${status.label}</span>` : '<span class="wa-market-status status-official">官方</span>'}
          </div>
        </div>
        <div class="wa-market-card-name">${template.name}</div>
        <div class="wa-market-card-desc">${template.description || '暂无描述'}</div>
        <div class="wa-market-card-meta">
          <span style="color:${role?.color}">${role?.name || ''}</span>
          <span>·</span>
          <span>${ability?.name || ''}</span>
          <span>·</span>
          <span>${outputLabel}</span>
        </div>
        <div class="wa-market-card-tags">
          ${(template.fields || []).slice(0, 3).map((f) => `<span class="wa-market-tag">${f.label}</span>`).join('')}
          ${(template.fields || []).length > 3 ? `<span class="wa-market-tag">+${template.fields.length - 3}</span>` : ''}
        </div>
        <div class="wa-market-card-actions">
          <button class="btn btn-sm btn-primary wa-market-use" data-id="${template.id}" data-source="${template.isCustom ? 'custom' : isTeam ? 'team' : 'official'}">
            <i class="fa-solid fa-play"></i> 使用
          </button>
          ${template.isCustom ? `
            <button class="btn btn-sm btn-ghost wa-market-publish" data-id="${template.id}">
              <i class="fa-solid fa-share-nodes"></i> 发布到团队
            </button>
            <button class="btn btn-sm btn-ghost wa-market-delete" data-id="${template.id}" data-source="custom">
              <i class="fa-solid fa-trash"></i>
            </button>
          ` : ''}
          ${context === 'pending' && !template.isCustom ? `
            <button class="btn btn-sm btn-primary wa-market-approve" data-id="${template.id}">通过</button>
            <button class="btn btn-sm btn-ghost wa-market-reject" data-id="${template.id}">拒绝</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  bindTemplateMarketEvents() {
    document.getElementById('wa-market-back')?.addEventListener('click', () => {
      this.activeTab = 'home';
      this.render();
    });

    document.getElementById('wa-market-create')?.addEventListener('click', () => {
      this.activeTab = 'templateCreator';
      this.creatorTab = 'chat';
      this.conversationState = this.getDefaultConversationState();
      this.render();
    });

    document.getElementById('wa-market-empty-create')?.addEventListener('click', () => {
      this.activeTab = 'templateCreator';
      this.creatorTab = 'chat';
      this.conversationState = this.getDefaultConversationState();
      this.render();
    });

    this.container.querySelectorAll('.wa-market-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.marketTab = tab.dataset.tab;
        this.render();
      });
    });

    this.container.querySelectorAll('.wa-market-use').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.selectedTemplate = getAllTemplates().find((t) => t.id === id);
        if (this.selectedTemplate) {
          this.activeTab = 'editor';
          this.render();
        }
      });
    });

    this.container.querySelectorAll('.wa-market-publish').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.publishTemplateToTeam(id);
      });
    });

    this.container.querySelectorAll('.wa-market-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (confirm('确定删除该模板吗？')) {
          deleteCustomTemplate(id);
          this.render();
          this.showToast('已删除');
        }
      });
    });

    this.container.querySelectorAll('.wa-market-approve').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        approveTeamTemplate(id);
        this.render();
        this.showToast('已通过审核');
      });
    });

    this.container.querySelectorAll('.wa-market-reject').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        rejectTeamTemplate(id);
        this.render();
        this.showToast('已拒绝');
      });
    });
  }

  publishTemplateToTeam(templateId) {
    const custom = getCustomTemplates().find((t) => t.id === templateId);
    if (!custom) return;

    const version = prompt('请输入版本号（例如：1.0.0）：', '1.0.0');
    if (!version) return;

    const changeLog = prompt('请输入更新说明：', '首次发布到团队模板市场');
    if (changeLog === null) return;

    publishTeamTemplate({
      ...custom,
      sourceId: custom.id,
      version,
      changeLog,
      creator: '当前用户',
      publisherName: '当前用户',
    });

    this.render();
    this.showToast('已提交审核，请等待管理员审批');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}
