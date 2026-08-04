import {
  workRoles,
  workAbilities,
  workTemplates,
  outputTypes,
  fieldTypes,
  pptThemes,
  pptColors,
  pptConfigDefinitions,
  contentStructureTemplates,
  getStructureTemplateById,
  getStructureTemplatesByOutputType,
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
  getQuickSceneTemplateIds,
  setQuickSceneTemplateIds,
  getQuickContentTemplateIds,
  setQuickContentTemplateIds,
  getKBDocuments,
  addDocumentToKB,
  mockGenerateContent,
  generatePPTContentFromOutline,
} from '../data/workAssistantData.js';
import {
  getAllContentTemplates,
  getContentTemplateById,
  defaultContentTemplates,
  pptSkeletonTemplates,
  sceneCategories,
  sceneCategoryColors,
  formatLabels,
} from '../data/contentTemplates.js';
import { knowledgeBases } from '../data/mockData.js';
import { formatDate, generateId, showToast as helpersShowToast } from '../utils/helpers.js';
import { FieldModal } from '../components/FieldModal.js';
import { generate as generateContent } from '../services/contentGenerator.js';
import { toggleTheme, onThemeChange, getThemeIcon, getEffectiveTheme } from '../utils/theme.js';

const ROLE_TO_SCENES = {
  sales: ['sales', 'office', 'personal'],
  customer_service: ['office', 'personal'],
  marketing: ['marketing', 'strategy', 'office', 'personal'],
  hr: ['hr', 'office', 'personal'],
  product: ['product', 'project', 'strategy', 'office', 'personal'],
  tech_support: ['personal'],
};

function getTemplateSceneIds(template) {
  return ROLE_TO_SCENES[template.roleId] || [];
}

export class WorkAssistant {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.onNavigate = options.onNavigate || null;
    this.activeRole = getLastRole();
    this.activeTab = options.initialTab || 'home';
    this.selectedTemplate = null;
    this.chatMessages = []; // 方案 A：聊天首页的消息列表
    this.chatStreaming = false; // 是否正在流式生成
    this.homeSelectedKBs = []; // 首页对话输入框关联的知识库
    this.homeKBPickerOpen = false; // 首页知识库选择器是否展开
    // 首页内容类型选择（参考豆包/Kimi：选择生成类型后展示对应配置项）
    this.chatContentType = 'chat'; // 'chat' | 'markdown' | 'ppt' | 'table' | 'video' | 'music'
    this.chatContentConfig = {}; // 当前类型下的配置取值
    this.initChatContentConfig(this.chatContentType);
    // 首页模型选择（替代原"深度思考"开关）
    this.homeModel = 'glm-4.6'; // 当前选中模型
    this.homeModelOpen = false; // 模型下拉是否展开
    // 首页加号菜单（合并知识库 + 附件入口）
    this.homePlusOpen = false;
    this.homeAttachments = []; // 首页附件列表
    // 首页「场景模板 / 内容模板」快速入口配置（最多3个，可自定义）
    this.quickSceneIds = getQuickSceneTemplateIds();
    this.quickContentIds = getQuickContentTemplateIds();
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

    // PPT 分步生成状态
    this.pptStep = 1; // 1: 主题内容, 2: 视觉结构, 3: 大纲确认
    this.pptConfig = this.getDefaultPPTConfig();
    this.currentStructureTemplateId = null; // 当前选中的结构模板
    this.pptVisualMode = 'custom'; // 'custom' | 'template' | 'upload'
    this.pptExpandedGroups = ['structure']; // 第二步配置分组展开状态，默认展开内容结构
    this.pptOutline = null;
    this.selectedSkeletonId = null; // PPT内容骨架模板ID
    this.pptSkeletonDropdownOpen = false;

    // 自由生成附件
    this.freeAttachments = [];
    this.currentAttachments = [];

    // 模板创建器状态
    this.creatorTab = 'chat'; // 'chat' | 'form' | 'extract'
    this.creatorForm = this.getDefaultCreatorForm();

    // 若从内容模板中心「使用此模板」进入，自动基于该内容模板生成一个临时创作场景，
    // 直接进入文档编辑页。用户在这里填写信息、生成并编辑的是自己的文档，
    // 而不是在编辑原模板文件。
    this.initialContentTemplateId = options.initialContentTemplateId || null;
    this.initialRecordId = options.initialRecordId || null;
    this.returnToView = options.returnToView || null;

    if (this.initialContentTemplateId) {
      const ct = getContentTemplateById(this.initialContentTemplateId);
      if (ct) {
        const { outputType, abilityId } = this.mapContentTemplateFormat(ct.format);
        this.selectedTemplate = this.createTempTemplateFromContentTemplate(
          ct,
          outputType,
          abilityId
        );
        this.activeTab = 'editor';
      }
    }

    this.restoreInitialRecord();

    this.extractForm = { name: '', roleId: 'sales', abilityId: 'writing', outputType: outputTypes.TEXT, exampleText: '' };
    this.extractPreview = null;
    this.extractFile = null;
    this.extractParsing = false;

    // 对话式创建模板状态
    this.conversationState = this.getDefaultConversationState();

    // 统一确认提示词页面状态
    this.creatorReviewState = {
      active: false,
      source: 'form',
      draftTemplate: null,
      currentTab: 'prompt',
      promptMode: 'preview',
      promptTemplate: '',
      structureType: 'free',
    };

    // 模板市场状态
    this.marketTab = 'all'; // 'all' | 'mine' | 'pending'
    this.marketViewMode = 'grid'; // 'grid' | 'list'
    this.marketCategoryMode = 'scene'; // 'scene' | 'role'
    this.marketCategory = 'all';

    // 内容模板选择
    this.selectedContentTemplateId = null;
    this.contentTemplateDropdownOpen = false;
    this.ctModalOpen = false;
    this.ctModalCategory = 'all';
    this.ctModalSearch = '';
    this.ctModalForCreator = false;
    this.ctModalForReview = false;

    // 图标选择弹窗
    this.iconModalOpen = false;
    this.iconModalSearch = '';

    // 场景模板编辑
    this.editingTemplateId = null;

    this.bindGlobalEvents();
    this.render();
    this.displayCurrentResultIfNeeded();
  }

  displayCurrentResultIfNeeded() {
    if (!this.selectedTemplate || !this.currentResult || this.activeTab !== 'editor') return;
    if (this.selectedTemplate.outputType === outputTypes.PPT) {
      this.showPPTResult(this.currentResult, this.selectedTemplate);
    } else {
      this.renderResult(this.currentResult, this.selectedTemplate);
    }
  }

  handleEditorBack() {
    if (this.returnToView && this.onNavigate) {
      const returnView = this.returnToView;
      this.returnToView = null;
      this.onNavigate(returnView);
      return;
    }
    this.activeTab = 'home';
    this.selectedTemplate = null;
    this.currentResult = null;
    this.pptStep = 1;
    this.pptConfig = this.getDefaultPPTConfig();
    this.pptOutline = null;
    this.render();
  }

  bindGlobalEvents() {
    // 事件委托：关联内容模板选择器
    this.container.addEventListener('click', (e) => {
      const trigger = e.target.closest('#wa-ct-selector-trigger');
      if (trigger) {
        if (e.target.closest('#wa-ct-clear-btn')) {
          e.stopPropagation();
          this.creatorForm.contentTemplateId = null;
          this.updateCreatorPreview();
          this.render();
          return;
        }
        this.ctModalOpen = true;
        this.ctModalForCreator = true;
        this.ctModalCategory = 'all';
        this.ctModalSearch = '';
        this.render();
      }
    });

    // 事件委托：图标选择器
    this.container.addEventListener('click', (e) => {
      const trigger = e.target.closest('#wa-icon-picker-trigger');
      if (trigger) {
        this.iconModalOpen = true;
        this.iconModalSearch = '';
        this.iconModalActiveCat = '常用';
        this.render();
      }
    });

    // 兜底：内容模板弹窗按钮在 document capture 阶段处理，避免某些情况下点击事件未正常传播到按钮
    document.addEventListener('click', (e) => {
      if (!this.ctModalOpen) return;
      if (e.target.closest('#wa-ct-modal-cancel') || e.target.closest('#wa-ct-modal-close')) {
        e.stopPropagation();
        this.ctModalOpen = false;
        this.render();
        return;
      }
      if (e.target.closest('#wa-ct-modal-confirm')) {
        e.stopPropagation();
        this.ctModalOpen = false;
        if (this.ctModalForCreator) {
          this.updateCreatorPreview();
        } else if (this.ctModalForReview) {
          this.creatorReviewState.structureType = 'free';
        }
        this.render();
        return;
      }
      if (e.target.id === 'wa-ct-modal-overlay') {
        this.ctModalOpen = false;
        this.render();
      }
    }, true);
  }

  restoreInitialRecord() {
    if (!this.initialRecordId) return;
    const record = getWorkHistory().find((r) => r.id === this.initialRecordId);
    if (!record) {
      this.showToast('创作记录不存在或已被删除');
      this.initialRecordId = null;
      return;
    }

    const allTemplates = [...getAllTemplates(), ...getCustomTemplates()];
    const template = allTemplates.find((t) => t.id === record.templateId);
    if (!template) {
      this.showToast('原始模板不存在，无法恢复记录');
      this.initialRecordId = null;
      return;
    }

    this.selectedTemplate = template;
    this.activeRole = record.roleId || template.roleId || getLastRole();
    setLastRole(this.activeRole);
    this.currentFormData = record.formData || {};
    this.currentMode = record.mode || template.defaultMode || 'kb';
    this.currentKBs = (record.kbIds || [])
      .map((id) => knowledgeBases.find((kb) => kb.id === id))
      .filter(Boolean);
    this.setSelectedKBs(record.kbIds || []);
    this.currentResult = record.result || null;
    this.activeTab = 'editor';

    if (template.outputType === outputTypes.PPT && this.currentResult) {
      this.pptStep = 3;
      this.pptStage = 'content';
    }
  }

  getDefaultPPTConfig() {
    const config = {};
    Object.values(pptConfigDefinitions).forEach((def) => {
      config[def.id] = def.defaultValue;
    });
    return config;
  }

  getRecentHistory() {
    try {
      const history = getWorkHistory();
      if (!Array.isArray(history)) return [];
      // 过滤掉无效记录，避免 undefined/null 导致渲染报错
      return history.filter((item) => item && typeof item === 'object' && item.id).slice(0, 5);
    } catch (e) {
      console.warn('读取最近创作失败:', e);
      return [];
    }
  }

  formatTime(isoString) {
    if (!isoString) return '';
    return formatDate(isoString);
  }

  render() {
    // 页面切换时清理可能残留的弹窗
    this.closePPTThemePicker();
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

  // ===================== 首页（极简设计） =====================

  getMinimalGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  }

  getSceneIcon(outputType) {
    const iconMap = {
      [outputTypes.PPT]: 'file-powerpoint',
      [outputTypes.TABLE]: 'table-cells',
      [outputTypes.EMAIL]: 'envelope',
      [outputTypes.QA]: 'comments',
      [outputTypes.STEPS]: 'list-check',
      [outputTypes.REPORT]: 'chart-line',
      [outputTypes.LIST]: 'list-ul',
      [outputTypes.MARKDOWN]: 'file-lines',
      [outputTypes.TEXT]: 'file-lines',
    };
    return iconMap[outputType] || 'file-lines';
  }

  getContentIcon(format) {
    const iconMap = {
      word: 'file-lines',
      ppt: 'file-powerpoint',
      excel: 'file-excel',
      markdown: 'file-lines',
    };
    return iconMap[format] || 'file-lines';
  }

  getOutputTypeLabel(outputType) {
    const labelMap = {
      [outputTypes.PPT]: 'PPT',
      [outputTypes.TABLE]: '表格',
      [outputTypes.EMAIL]: '邮件',
      [outputTypes.QA]: '问答',
      [outputTypes.STEPS]: '步骤',
      [outputTypes.REPORT]: '报告',
      [outputTypes.LIST]: '列表',
      [outputTypes.MARKDOWN]: '文档',
      [outputTypes.TEXT]: '文本',
    };
    return labelMap[outputType] || '文档';
  }

  renderMinimalTemplateRow(template, type) {
    const icon = type === 'scene'
      ? this.getSceneIcon(template.outputType)
      : this.getContentIcon(template.format);
    const meta = type === 'scene'
      ? this.getOutputTypeLabel(template.outputType)
      : ((formatLabels[template.format] || {}).label || template.format || '文档');
    const uses = type === 'content' && template.usedCount ? `${template.usedCount} 次` : '';
    return `
      <div class="minimal-template-row" data-template="${template.id}" data-type="${type}">
        <div class="minimal-template-icon"><i class="fa-regular fa-${icon}"></i></div>
        <div class="minimal-template-content">
          <div class="minimal-template-name">${this.escapeHtml(template.name)}</div>
          <div class="minimal-template-desc">${this.escapeHtml(template.description || '')}</div>
        </div>
        <div class="minimal-template-meta">
          <span>${meta}</span>
          ${uses ? `<span>${uses}</span>` : ''}
        </div>
        <i class="fa-solid fa-arrow-right minimal-template-arrow"></i>
      </div>
    `;
  }

  renderHome() {
    const isDark = getEffectiveTheme() === 'dark';
    const greeting = this.getMinimalGreeting();
    const docCount = this.getChatDocCount();
    const hasMessages = this.chatMessages.length > 0;
    const recents = this.getRecentHistory();

    this.container.innerHTML = `
      <div class="wa-chat-wrap ${hasMessages ? 'has-messages' : ''}">
        <div class="wa-chat-ambient"></div>

        <header class="wa-chat-topbar">
          <div class="wa-chat-brand">
            <span class="wa-chat-brand-dot"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
            <span>AI 创作中心</span>
          </div>
          <div class="wa-chat-top-actions">
            <button class="wa-chat-top-btn" id="wa-chat-docs" title="我的文档">
              <i class="fa-regular fa-folder-open"></i>
              <span>我的文档</span>
              ${docCount > 0 ? `<span class="count">${docCount}</span>` : ''}
            </button>
            <button class="wa-chat-theme-toggle" id="wa-chat-theme-toggle" title="切换主题">
              <i class="fa-solid fa-${isDark ? 'sun' : 'moon'}"></i>
            </button>
          </div>
        </header>

        <main class="wa-chat-main ${!hasMessages ? 'wa-chat-main--home' : ''}" id="wa-chat-main">
          ${!hasMessages ? `
            <div class="wa-chat-welcome">
              <div class="wa-chat-badge">
                <span class="dot"></span>
                <span>AI 已就绪</span>
              </div>
              <h1 class="wa-chat-title">${greeting}，<span class="gradient">直接开始对话</span></h1>
              <h2 class="wa-chat-title wa-chat-title--secondary">或选择下方结构化模板</h2>
              <p class="wa-chat-sub">支持关联知识库 · 流式输出 · 或选择下方结构化模板</p>
            </div>

            <div class="wa-chat-hero-composer">
              <div class="wa-chat-composer wa-chat-composer--hero">
                <textarea class="wa-chat-composer-input" id="wa-chat-input"
                          placeholder="${this.getChatInputPlaceholder()}"
                          rows="1" autocomplete="off" ${this.chatStreaming ? 'disabled' : ''}></textarea>
                <div class="wa-chat-config-row" id="wa-chat-config-row">${this.renderConfigRowInner(this.chatContentType)}</div>
                <div class="wa-chat-control-bar">
                  <div class="wa-chat-type-row" id="wa-chat-type-row">${this.renderTypeChips()}</div>
                  <div class="wa-chat-control-actions">
                    ${this.renderPlusButton()}
                    ${this.renderModelSelector()}
                    <button class="wa-chat-send-btn" id="wa-chat-send" type="button" ${this.chatStreaming ? 'disabled' : ''}>
                      <i class="fa-solid fa-arrow-up"></i>
                    </button>
                  </div>
                </div>
                ${this.renderHomeKBPicker()}
              </div>
            </div>

            <div class="wa-chat-alt-divider"><span>或使用结构化模板</span></div>
            <div class="wa-chat-alt-modes">
              <div class="wa-chat-alt-mode" data-mode="scene">
                <div class="wa-chat-alt-mode-head" data-mode="scene">
                  <div class="wa-chat-alt-mode-icon"><i class="fa-solid fa-layer-group"></i></div>
                  <div class="wa-chat-alt-mode-body">
                    <div class="wa-chat-alt-mode-title">场景模板 <span class="wa-chat-alt-mode-tag">结构化</span></div>
                    <div class="wa-chat-alt-mode-desc">选岗位模板，按字段生成 PPT/报告</div>
                  </div>
                  <div class="wa-chat-alt-mode-arrow"><i class="fa-solid fa-arrow-right"></i></div>
                </div>
                ${this.renderQuickEntries('scene')}
              </div>
              <div class="wa-chat-alt-mode" data-mode="content">
                <div class="wa-chat-alt-mode-head" data-mode="content">
                  <div class="wa-chat-alt-mode-icon"><i class="fa-solid fa-file-lines"></i></div>
                  <div class="wa-chat-alt-mode-body">
                    <div class="wa-chat-alt-mode-title">内容模板 <span class="wa-chat-alt-mode-tag">文档</span></div>
                    <div class="wa-chat-alt-mode-desc">选文档模板，直接进入编辑器</div>
                  </div>
                  <div class="wa-chat-alt-mode-arrow"><i class="fa-solid fa-arrow-right"></i></div>
                </div>
                ${this.renderQuickEntries('content')}
              </div>
            </div>

            <div class="wa-chat-recents wa-chat-recents--table">
              <div class="wa-chat-recents-header">
                <div class="wa-chat-recents-title">最近创作</div>
                ${recents.length > 0 ? `<div class="wa-chat-recents-link" id="wa-chat-recents-more">查看全部 <i class="fa-solid fa-chevron-right"></i></div>` : ''}
              </div>
              ${recents.length > 0 ? `
                <div class="wa-chat-recents-list">
                  ${recents.map((item) => this.renderRecentItem(item)).join('')}
                </div>
              ` : `
                <div class="wa-chat-recents-empty">
                  <i class="fa-regular fa-folder-open"></i>
                  <div class="wa-chat-recents-empty-title">暂无最近创作</div>
                  <div class="wa-chat-recents-empty-desc">在上方输入需求开始对话，或选择模板生成内容</div>
                </div>
              `}
            </div>
          ` : `
            <div class="wa-chat-messages" id="wa-chat-messages">
              ${this.chatMessages.map((m) => this.renderChatMessage(m)).join('')}
            </div>
          `}
        </main>

        ${hasMessages ? `
          <div class="wa-chat-composer-wrap">
            <div class="wa-chat-composer wa-chat-composer--hero wa-chat-composer--floating">
              <textarea class="wa-chat-composer-input" id="wa-chat-input"
                        placeholder="继续描述新需求..."
                        rows="1" autocomplete="off" ${this.chatStreaming ? 'disabled' : ''}></textarea>
              <div class="wa-chat-config-row" id="wa-chat-config-row">${this.renderConfigRowInner(this.chatContentType)}</div>
              <div class="wa-chat-control-bar">
                <div class="wa-chat-type-row" id="wa-chat-type-row">${this.renderTypeChips()}</div>
                <div class="wa-chat-control-actions">
                  ${this.renderPlusButton()}
                  ${this.renderModelSelector()}
                  <button class="wa-chat-send-btn" id="wa-chat-send" type="button" ${this.chatStreaming ? 'disabled' : ''}>
                    <i class="fa-solid fa-arrow-up"></i>
                  </button>
                </div>
              </div>
              ${this.renderHomeKBPicker()}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.bindHomeEvents();
    if (hasMessages) this.scrollToChatBottom();
  }

  // 首页知识库选择器
  renderHomeKBPicker() {
    const kbs = knowledgeBases || [];
    const selected = this.homeSelectedKBs || [];
    return `
      <div class="wa-chat-kb-picker ${this.homeKBPickerOpen ? 'show' : ''}" id="wa-chat-kb-picker">
        <div class="wa-chat-kb-picker-header">
          <span>关联知识库</span>
          <button class="wa-chat-kb-picker-close" id="wa-chat-kb-close" type="button"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="wa-chat-kb-picker-list">
          ${kbs.map((kb) => {
            const checked = selected.some((s) => s.id === kb.id);
            return `
              <label class="wa-chat-kb-item ${checked ? 'checked' : ''}">
                <input type="checkbox" data-kb-id="${kb.id}" ${checked ? 'checked' : ''}>
                <i class="fa-solid fa-book"></i>
                <span>${this.escapeHtml(kb.name)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ===================== 方案 A：聊天首页辅助方法 =====================

  getChatDocCount() {
    try {
      return getWorkHistory().length;
    } catch {
      return 0;
    }
  }

  renderChatTemplateCard(template, type, index) {
    const role = type === 'scene' ? getRoleById(template.roleId) : null;
    const icon = type === 'scene'
      ? this.getSceneIcon(template.outputType)
      : this.getContentIcon(template.format);
    const tagLabel = type === 'scene'
      ? this.getOutputTypeLabel(template.outputType)
      : (formatLabels[template.format] || template.format);
    const fields = template.fields || [];
    const fieldChips = fields.slice(0, 4).map((f) =>
      `<span class="wa-chat-field-chip ${f.required ? 'req' : ''}">${this.escapeHtml(f.label)}</span>`
    ).join('');
    const extraCount = fields.length > 4 ? `<span class="wa-chat-field-chip">+${fields.length - 4}</span>` : '';

    return `
      <div class="wa-chat-template-card" data-template="${template.id}" data-type="${type}"
           style="animation-delay:${index * 0.05}s">
        <div class="wa-chat-card-top">
          <div class="wa-chat-card-icon"><i class="fa-solid fa-${icon}"></i></div>
          <span class="wa-chat-card-tag">${tagLabel}</span>
        </div>
        <div class="wa-chat-card-name">${this.escapeHtml(template.name)}</div>
        <div class="wa-chat-card-desc">${this.escapeHtml(template.description || '')}</div>
        ${fieldChips ? `<div class="wa-chat-card-fields">${fieldChips}${extraCount}</div>` : ''}
      </div>
    `;
  }

  // 首页「场景模板 / 内容模板」卡片内嵌的快速入口区（最多3个，可自定义配置）
  // 无外层卡片：直接返回「常用标题 + 管理按钮 + mini卡片行」，嵌入 alt-mode 卡片底部
  renderQuickEntries(type) {
    const isScene = type === 'scene';
    const ids = isScene ? this.quickSceneIds : this.quickContentIds;
    const all = isScene ? getAllTemplates() : defaultContentTemplates;
    const items = ids
      .map((id) => all.find((t) => t && t.id === id))
      .filter(Boolean);

    const cards = items.length > 0
      ? items.map((t) => {
          const ic = isScene
            ? this.getSceneIcon(t.outputType)
            : this.getContentIcon(t.format);
          return `
            <button class="wa-quick-card" type="button" data-quick-type="${type}" data-template-id="${t.id}">
              <span class="wa-quick-card-icon"><i class="fa-solid fa-${ic}"></i></span>
              <span class="wa-quick-card-name">${this.escapeHtml(t.name)}</span>
            </button>
          `;
        }).join('')
      : `<div class="wa-quick-empty">点击「管理」添加常用模板</div>`;

    return `
      <div class="wa-quick-section" data-quick-type="${type}">
        <div class="wa-quick-section-bar">
          <span class="wa-quick-section-label">常用</span>
          <button class="wa-quick-manage" type="button" data-quick-type="${type}" title="管理常用模板">
            <i class="fa-solid fa-sliders"></i>
          </button>
        </div>
        <div class="wa-quick-cards">${cards}</div>
      </div>
    `;
  }

  renderChatMessage(msg) {
    if (msg.role === 'user') return this.renderChatUserMessage(msg);
    return this.renderChatAIMessage(msg);
  }

  renderChatUserMessage(msg) {
    if (msg.type === 'template-context') {
      const { template, formData, selectedKBs } = msg;
      const role = getRoleById(template.roleId);
      const fieldRows = (template.fields || []).map((f) => {
        const val = formData[f.id];
        let display = Array.isArray(val) ? val.join('、') : val;
        return `<div class="wa-chat-field-row">
          <span class="wa-chat-field-label">${this.escapeHtml(f.label)}</span>
          <span class="wa-chat-field-value">${this.escapeHtml(display || '—')}</span>
        </div>`;
      }).join('');

      return `
        <div class="wa-chat-message user">
          <div class="wa-chat-msg-avatar"><i class="fa-solid fa-user"></i></div>
          <div class="wa-chat-msg-content">
            <div class="wa-chat-msg-name">你</div>
            <div class="wa-chat-msg-bubble">
              <div class="wa-chat-context-tags">
              <span class="wa-chat-context-tag template"><i class="fa-solid fa-${template.icon || 'file-lines'}"></i> ${this.escapeHtml(template.name)}</span>
                ${role ? `<span class="wa-chat-context-tag">${this.escapeHtml(role.name)}</span>` : ''}
                ${selectedKBs.map((kb) => `<span class="wa-chat-context-tag kb"><i class="fa-solid fa-book"></i> ${this.escapeHtml(kb.name)}</span>`).join('')}
              </div>
              <div class="wa-chat-field-summary">${fieldRows}</div>
            </div>
          </div>
        </div>
      `;
    }
    return `
      <div class="wa-chat-message user">
        <div class="wa-chat-msg-avatar"><i class="fa-solid fa-user"></i></div>
        <div class="wa-chat-msg-content">
          <div class="wa-chat-msg-name">你</div>
          <div class="wa-chat-msg-bubble">${this.escapeHtml(msg.content || '')}</div>
        </div>
      </div>
    `;
  }

  renderChatAIMessage(msg) {
    return `
      <div class="wa-chat-message ai" id="wa-chat-msg-${msg.id}">
        <div class="wa-chat-msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="wa-chat-msg-content">
          <div class="wa-chat-msg-name">AI 助手</div>
          <div class="wa-chat-msg-bubble">${this.renderChatAIMessageInner(msg)}</div>
        </div>
      </div>
    `;
  }

  renderChatAIMessageInner(msg) {
    const steps = msg.thinkingSteps || [];
    const stepsHtml = steps.map((s) => `
      <div class="wa-chat-thinking-step ${s.status === 'done' ? 'done' : 'show'}">
        ${s.status === 'done'
          ? '<i class="fa-solid fa-check check"></i>'
          : '<i class="fa-solid fa-circle-notch loader"></i>'}
        <span>${this.escapeHtml(s.text)}</span>
      </div>
    `).join('');

    const thinkingHtml = steps.length > 0 ? `
      <div class="wa-chat-thinking-header">
        <i class="fa-solid fa-circle-notch"></i>
        <span>${msg.done ? '思考完成' : '思考中...'}</span>
      </div>
      <div class="wa-chat-thinking-steps">${stepsHtml}</div>
    ` : '';

    if (msg.done && msg.result && !msg.isFreeChat) {
      return this.renderChatResultCard(msg);
    }

    const contentHtml = msg.content
      ? `<div class="wa-chat-result-body">${msg.content}${msg.done ? '' : '<span class="wa-chat-cursor"></span>'}</div>`
      : '';
    return `${thinkingHtml}${contentHtml}`;
  }

  renderChatResultCard(msg) {
    const { template, result, selectedKBs, content } = msg;
    const outputLabel = this.getOutputTypeLabel(template.outputType);
    const kbNote = selectedKBs && selectedKBs.length > 0
      ? `<div class="wa-chat-kb-note"><i class="fa-solid fa-book"></i> 已参考《${selectedKBs.map((k) => k.name).join('、')}》</div>`
      : '';

    return `
      <div class="wa-chat-result-card">
        <div class="wa-chat-result-header">
          <div class="wa-chat-result-icon"><i class="fa-solid fa-${template.icon || 'file-lines'}"></i></div>
          <div class="wa-chat-result-title">${this.escapeHtml(template.name)}</div>
          <span class="wa-chat-result-tag">${outputLabel}</span>
        </div>
        <div class="wa-chat-result-body">${kbNote}${content}</div>
        <div class="wa-chat-result-actions">
          <button class="wa-chat-result-btn" data-action="copy" data-msg-id="${msg.id}">
            <i class="fa-solid fa-copy"></i> 复制
          </button>
          <button class="wa-chat-result-btn primary" data-action="edit" data-msg-id="${msg.id}">
            <i class="fa-solid fa-pen"></i> 编辑
          </button>
          <button class="wa-chat-result-btn ${msg.saved ? '' : 'primary'}" data-action="save" data-msg-id="${msg.id}" ${msg.saved ? 'disabled' : ''}>
            <i class="fa-solid fa-${msg.saved ? 'check' : 'floppy-disk'}"></i> ${msg.saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>
    `;
  }

  scrollToChatBottom() {
    const main = document.getElementById('wa-chat-main');
    if (main) requestAnimationFrame(() => { main.scrollTop = main.scrollHeight; });
  }

  // ===================== 方案 A：字段弹层 + 流式生成 =====================

  openFieldModal(template, type, options = {}) {
    if (type === 'content') {
      if (this.onNavigate) {
        this.onNavigate('contentTemplates', { initialContentTemplateId: template.id });
      }
      return;
    }
    new FieldModal({
      template,
      knowledgeBases,
      initialFormData: options.initialFormData || {},
      onConfirm: (result) => this.startChatGeneration(result),
    }).open();
  }

  async startChatGeneration({ template, formData, selectedKBs, mode, options = {} }) {
    const userMsg = {
      id: generateId('chatmsg'),
      role: 'user',
      type: 'template-context',
      template,
      formData,
      selectedKBs,
      mode,
    };
    const aiMsg = {
      id: generateId('chatmsg'),
      role: 'ai',
      thinkingSteps: [],
      content: '',
      result: null,
      template,
      formData,
      selectedKBs,
      mode,
      done: false,
    };
    this.chatMessages.push(userMsg, aiMsg);
    this.chatStreaming = true;
    this.render();

    try {
      const stream = generateContent(template, formData, mode, selectedKBs, options);
      for await (const event of stream) {
        if (event.type === 'thinking') {
          aiMsg.thinkingSteps.push({ text: event.step, status: 'active' });
        } else if (event.type === 'thinking_done') {
          const step = aiMsg.thinkingSteps.find((s) => s.text === event.step && s.status !== 'done');
          if (step) step.status = 'done';
        } else if (event.type === 'result_meta') {
          aiMsg.result = event.result;
        } else if (event.type === 'chunk') {
          aiMsg.content += event.text;
        } else if (event.type === 'done') {
          aiMsg.done = true;
          aiMsg.result = event.result;
        }
        this.updateChatStreamingMessage(aiMsg);
      }
      // 生成完成后自动保存到工作历史
      this.saveChatResultToHistory(aiMsg);
      aiMsg.saved = true;
      this.updateChatStreamingMessage(aiMsg);
    } catch (e) {
      aiMsg.content += `\n\n[生成失败：${e.message}]`;
      aiMsg.done = true;
      this.updateChatStreamingMessage(aiMsg);
    } finally {
      this.chatStreaming = false;
      // 启用输入框
      const input = document.getElementById('wa-chat-input');
      const sendBtn = document.getElementById('wa-chat-send');
      if (input) input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  updateChatStreamingMessage(aiMessage) {
    const el = document.getElementById(`wa-chat-msg-${aiMessage.id}`);
    if (!el) {
      // DOM 未找到（可能被重渲染），回退到整页刷新
      this.render();
      return;
    }
    const bubble = el.querySelector('.wa-chat-msg-bubble');
    if (bubble) bubble.innerHTML = this.renderChatAIMessageInner(aiMessage);
    this.scrollToChatBottom();
  }

  saveChatResultToHistory(aiMsg) {
    try {
      const { template, formData, selectedKBs, mode, result } = aiMsg;
      const kbs = Array.isArray(selectedKBs) ? selectedKBs : [];
      const role = getRoleById(template?.roleId);
      const ability = getAbilityById(template?.abilityId);
      const isFreeChat = aiMsg.isFreeChat || aiMsg.source === 'freeChat';
      const record = {
        id: generateId('wa'),
        templateId: template?.id,
        templateName: isFreeChat ? (aiMsg.title || 'AI 对话') : template?.name,
        title: isFreeChat ? (aiMsg.title || 'AI 对话') : (aiMsg.title || template?.name),
        source: aiMsg.source || (isFreeChat ? 'freeChat' : 'scene'),
        isFreeChat,
        abilityId: template?.abilityId,
        abilityName: ability?.name || '',
        roleId: template?.roleId,
        roleName: role?.name || '',
        mode: mode || 'free',
        kbIds: kbs.map((kb) => kb.id),
        kbNames: kbs.map((kb) => kb.name),
        formData: formData || {},
        result,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDraft: false,
      };
      addWorkHistory(record);
    } catch (e) {
      // 保存失败不影响已生成内容
      console.warn('保存到历史失败:', e);
    }
  }

  handleChatResultAction(action, msgId) {
    const msg = this.chatMessages.find((m) => m.id === msgId);
    if (!msg) return;

    if (action === 'copy') {
      const text = this.extractPlainText(msg.content || '');
      navigator.clipboard?.writeText(text).then(
        () => this.showToast('已复制到剪贴板', 'success'),
        () => this.showToast('复制失败', 'error')
      );
    } else if (action === 'edit') {
      this.selectedTemplate = msg.template;
      this.currentResult = msg.result;
      this.currentFormData = msg.formData;
      this.currentMode = msg.mode;
      this.currentKBs = msg.selectedKBs || [];
      this.activeTab = 'editor';
      this.render();
    } else if (action === 'save') {
      if (msg.saved) return;
      this.saveChatResultToHistory(msg);
      msg.saved = true;
      this.updateChatStreamingMessage(msg);
      this.showToast('已保存到我的文档', 'success');
    }
  }

  extractPlainText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  showToast(message, type = 'info') {
    helpersShowToast(message, type);
  }

  startNewChat() {
    this.chatMessages = [];
    this.chatStreaming = false;
    this.render();
  }

  // ===================== 快速入口配置弹窗 =====================

  // 绑定首页快速入口区事件（卡片点击 + 管理按钮）；保存配置后局部刷新时复用
  bindQuickEntryEvents() {
    this.container.querySelectorAll('.wa-quick-card').forEach((card) => {
      card.addEventListener('click', () => {
        const type = card.dataset.quickType;
        const id = card.dataset.templateId;
        if (!id) return;
        if (type === 'scene') {
          const tpl = getAllTemplates().find((t) => t && t.id === id);
          if (tpl) {
            this.selectedTemplate = tpl;
            this.activeTab = 'editor';
            this.render();
          }
        } else {
          if (this.onNavigate) this.onNavigate('contentTemplates', { initialContentTemplateId: id });
        }
      });
    });
    this.container.querySelectorAll('.wa-quick-manage').forEach((btn) => {
      btn.addEventListener('click', () => this.openQuickConfigModal(btn.dataset.quickType));
    });
  }

  openQuickConfigModal(type) {
    if (document.getElementById('wa-quick-config-modal')) return;
    const isScene = type === 'scene';
    const all = isScene ? getAllTemplates() : defaultContentTemplates;
    const selectedIds = new Set(isScene ? this.quickSceneIds : this.quickContentIds);
    const title = isScene ? '管理常用场景模板' : '管理常用内容模板';

    const items = all.map((t) => {
      if (!t) return '';
      const ic = isScene
        ? this.getSceneIcon(t.outputType)
        : this.getContentIcon(t.format);
      const tag = isScene
        ? this.getOutputTypeLabel(t.outputType)
        : (formatLabels[t.format] && formatLabels[t.format].label) || t.format;
      const checked = selectedIds.has(t.id) ? ' selected' : '';
      return `
        <div class="wa-quick-opt${checked}" data-id="${t.id}">
          <span class="wa-quick-opt-icon"><i class="fa-solid fa-${ic}"></i></span>
          <span class="wa-quick-opt-body">
            <span class="wa-quick-opt-name">${this.escapeHtml(t.name)}</span>
            <span class="wa-quick-opt-tag">${this.escapeHtml(String(tag))}</span>
          </span>
          <span class="wa-quick-opt-check"><i class="fa-solid fa-check"></i></span>
        </div>
      `;
    }).join('');

    const html = `
      <div class="wa-modal-overlay wa-quick-config-overlay" id="wa-quick-config-modal">
        <div class="wa-modal wa-quick-config-modal" onclick="event.stopPropagation()">
          <div class="wa-modal-header">
            <div class="wa-modal-title"><i class="fa-solid fa-sliders"></i> ${title}</div>
            <button class="wa-modal-close" id="wa-quick-config-close" type="button"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="wa-modal-body wa-quick-config-body">
            <div class="wa-quick-config-tip">最多选择 3 个，将展示在首页快速入口。已选 <b id="wa-quick-config-count">${selectedIds.size}</b>/3</div>
            <div class="wa-quick-opt-list">${items}</div>
          </div>
          <div class="wa-modal-footer">
            <button class="btn btn-ghost" id="wa-quick-config-cancel" type="button">取消</button>
            <button class="btn btn-primary" id="wa-quick-config-save" type="button">保存</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    this.bindQuickConfigModalEvents(type);
  }

  bindQuickConfigModalEvents(type) {
    const modal = document.getElementById('wa-quick-config-modal');
    if (!modal) return;
    const isScene = type === 'scene';
    const countEl = document.getElementById('wa-quick-config-count');
    const MAX = 3;

    const getSelected = () => Array.from(modal.querySelectorAll('.wa-quick-opt.selected'))
      .map((el) => el.dataset.id);
    const updateCount = () => { if (countEl) countEl.textContent = getSelected().length; };

    const close = () => modal.remove();
    document.getElementById('wa-quick-config-close')?.addEventListener('click', close);
    document.getElementById('wa-quick-config-cancel')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    modal.querySelectorAll('.wa-quick-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        const isSelected = opt.classList.contains('selected');
        if (!isSelected && getSelected().length >= MAX) {
          this.showToast(`最多只能选择 ${MAX} 个`, 'info');
          return;
        }
        opt.classList.toggle('selected', !isSelected);
        updateCount();
      });
    });

    document.getElementById('wa-quick-config-save')?.addEventListener('click', () => {
      const ids = getSelected();
      if (isScene) {
        setQuickSceneTemplateIds(ids);
        this.quickSceneIds = getQuickSceneTemplateIds();
      } else {
        setQuickContentTemplateIds(ids);
        this.quickContentIds = getQuickContentTemplateIds();
      }
      close();
      // 局部刷新对应 alt-mode 卡片内的快速入口区，避免整体 re-render 导致输入框失焦
      ['scene', 'content'].forEach((t) => {
        const modeCard = this.container.querySelector(`.wa-chat-alt-mode[data-mode="${t}"]`);
        const oldSection = modeCard?.querySelector('.wa-quick-section');
        if (oldSection) {
          oldSection.outerHTML = this.renderQuickEntries(t);
        }
      });
      this.bindQuickEntryEvents();
      this.showToast('已更新常用模板', 'success');
    });
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
    try {
      const source = item.source || this.inferItemSource(item);
      const config = this.getRecentItemStyle(source, item);
      const title = item.title || item.templateName || '未命名创作';
      const subtitle = config.subtitle;
      const initial = this.getRecentItemInitial(title, source);

      return `
        <a class="wa-recent-item" href="?view=myDocuments" data-id="${item.id}">
          <div class="wa-recent-inner">
            <div class="wa-recent-avatar" style="background:${config.bgColor};color:${config.iconColor}">
              ${initial}
            </div>
            <div class="wa-recent-content">
              <div class="wa-recent-title">${title}</div>
              <div class="wa-recent-desc">${subtitle}</div>
            </div>
            <div class="wa-recent-meta-right">
              <div class="wa-recent-time">${this.formatTime(item.updatedAt)}</div>
              <i class="fa-solid fa-chevron-right wa-recent-chevron"></i>
            </div>
          </div>
        </a>
      `;
    } catch (e) {
      console.warn('渲染最近创作项失败:', item, e);
      return '';
    }
  }

  getRecentItemInitial(title, source) {
    const safeTitle = String(title || '');
    const char = safeTitle.trim().charAt(0).toUpperCase();
    if (/[A-Za-z0-9\u4e00-\u9fa5]/.test(char)) return char;
    const fallback = { freeChat: '聊', scene: '场', content: '文' };
    return fallback[source] || '创';
  }

  inferItemSource(item) {
    if (item.isFreeChat) return 'freeChat';
    if (item.mode === 'free') return 'freeChat';
    const template = item.template || {};
    const type = template.type || template.outputType;
    if (type === 'content' || template.format) return 'content';
    if (template.fields || template.abilityId || template.roleId) return 'scene';
    return 'scene';
  }

  getRecentItemStyle(source, item) {
    if (source === 'freeChat' || item.isFreeChat) {
      return {
        icon: 'comments',
        bgColor: 'rgba(16,185,129,0.12)',
        iconColor: '#10b981',
        shadowColor: 'rgba(16,185,129,0.15)',
        subtitle: 'AI 对话 · 自由模式',
      };
    }
    if (source === 'content') {
      const format = item.template?.format || item.result?.format || 'word';
      const label = format === 'table' ? 'Excel' : format === 'ppt' ? 'PPT' : format === 'email' ? '邮件' : format === 'list' ? '列表' : 'Word';
      return {
        icon: 'file-lines',
        bgColor: 'rgba(16,185,129,0.12)',
        iconColor: '#059669',
        shadowColor: 'rgba(16,185,129,0.15)',
        subtitle: `内容模板 · ${label}`,
      };
    }
    // scene
    const outputType = item.template?.outputType || item.result?.outputType || 'ppt';
    const label = outputType === 'report' ? '报告' : outputType === 'markdown' ? '文档' : outputType === 'email' ? '邮件' : outputType === 'table' ? '表格' : 'PPT';
    const roleName = item.roleName || getRoleById(item.roleId)?.name || '';
    return {
      icon: 'layer-group',
      bgColor: 'rgba(59,130,246,0.12)',
      iconColor: '#2563eb',
      shadowColor: 'rgba(59,130,246,0.15)',
      subtitle: `场景模板 · ${roleName} · ${label}`,
    };
  }

  handleNaturalLanguageCreate(value) {
    const type = this.chatContentType || 'chat';
    if (type === 'chat') {
      // 聊天模式：直接进入流式对话
      this.startFreeChat(value);
      return;
    }
    // 结构化生成模式：按所选类型 + 配置项流式生成
    this.startTypedGeneration(value, type, { ...this.chatContentConfig, model: this.homeModel });
  }

  // ===================== 内容类型选择 + 按类型配置（参考豆包/Kimi） =====================

  getContentTypeOptions() {
    // 聊天是默认状态（无芯片），不作为内容输出类型选项
    return [
      { id: 'markdown', label: '文档', icon: 'file-lines' },
      { id: 'ppt', label: 'PPT', icon: 'file-powerpoint' },
      { id: 'table', label: '表格', icon: 'table-cells' },
      { id: 'video', label: '视频', icon: 'film' },
      { id: 'music', label: '音乐', icon: 'music' },
    ];
  }

  getContentTypeConfigSpec(type) {
    const specs = {
      ppt: [
        {
          id: 'length',
          label: '篇幅',
          type: 'select',
          options: [
            { v: '5', l: '5 页' },
            { v: '8', l: '8 页' },
            { v: '10', l: '10 页' },
            { v: '12', l: '12 页' },
            { v: '15', l: '15 页' },
            { v: '18', l: '18 页' },
            { v: '20', l: '20 页' },
            { v: '25', l: '25 页' },
            { v: '30', l: '30 页' },
          ],
          default: '12',
        },
        { id: 'style', label: '风格模板', type: 'theme_picker', default: 'business' },
      ],
      markdown: [
        { id: 'length', label: '篇幅', options: [{ v: 'short', l: '简短' }, { v: 'standard', l: '标准' }, { v: 'detailed', l: '详细' }], default: 'standard' },
        { id: 'style', label: '风格', options: [{ v: 'formal', l: '正式' }, { v: 'plain', l: '通俗' }, { v: 'professional', l: '专业' }], default: 'professional' },
      ],
      table: [],
      video: [
        { id: 'duration', label: '时长', options: [{ v: '5', l: '5 秒' }, { v: '10', l: '10 秒' }, { v: '15', l: '15 秒' }], default: '10' },
        { id: 'style', label: '风格', options: [{ v: 'realistic', l: '写实' }, { v: 'anime', l: '动画' }, { v: 'cinematic', l: '电影感' }, { v: 'cartoon', l: '卡通' }], default: 'cinematic' },
        { id: 'ratio', label: '画面比例', options: [{ v: '16:9', l: '16:9' }, { v: '9:16', l: '9:16' }, { v: '1:1', l: '1:1' }], default: '16:9' },
      ],
      music: [
        { id: 'duration', label: '时长', options: [{ v: '30', l: '30 秒' }, { v: '60', l: '1 分钟' }, { v: '120', l: '2 分钟' }], default: '60' },
        { id: 'genre', label: '曲风', options: [{ v: 'pop', l: '流行' }, { v: 'classical', l: '古典' }, { v: 'electronic', l: '电子' }, { v: 'light', l: '轻音乐' }, { v: 'folk', l: '民谣' }], default: 'pop' },
        { id: 'mood', label: '情绪', options: [{ v: 'happy', l: '欢快' }, { v: 'calm', l: '舒缓' }, { v: 'energetic', l: '激昂' }, { v: 'sad', l: '忧伤' }], default: 'happy' },
      ],
    };
    return specs[type] || [];
  }

  getChatInputPlaceholder() {
    const type = this.chatContentType;
    const map = {
      chat: '给 AI 助手发消息，或选择下方内容类型生成结构化内容',
      markdown: '描述要生成的文档报告，比如：写一份项目复盘报告',
      ppt: '描述 PPT 主题，比如：Q3 销售业绩汇报',
      table: '描述表格主题，比如：竞品功能对比表',
      video: '描述视频画面主题，比如：城市夜景延时摄影',
      music: '描述音乐主题或氛围，比如：轻松的咖啡馆背景音乐',
    };
    return map[type] || map.chat;
  }

  // ===================== 模型选择（替代"深度思考"开关） =====================

  getChatModels() {
    return [
      { id: 'glm-4-air', name: 'GLM-4 Air', vendor: '智谱', abbr: 'Z', tag: '快速' },
      { id: 'glm-4.6', name: 'GLM-4.6', vendor: '智谱', abbr: 'Z', tag: '均衡' },
      { id: 'glm-z1', name: 'GLM-Z1', vendor: '智谱', abbr: 'Z', tag: '推理' },
      { id: 'gpt-4o', name: 'GPT-4o', vendor: 'OpenAI', abbr: 'O', tag: '多模态' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', vendor: 'OpenAI', abbr: 'O', tag: '轻量' },
      { id: 'o3-mini', name: 'o3-mini', vendor: 'OpenAI', abbr: 'O', tag: '推理' },
      { id: 'claude-sonnet', name: 'Claude Sonnet', vendor: 'Anthropic', abbr: 'A', tag: '长文' },
      { id: 'claude-haiku', name: 'Claude Haiku', vendor: 'Anthropic', abbr: 'A', tag: '极速' },
      { id: 'gemini-pro', name: 'Gemini Pro', vendor: 'Google', abbr: 'G', tag: '长上下文' },
      { id: 'gemini-flash', name: 'Gemini Flash', vendor: 'Google', abbr: 'G', tag: '经济' },
      { id: 'deepseek-chat', name: 'DeepSeek Chat', vendor: 'DeepSeek', abbr: 'D', tag: '高性价比' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', vendor: 'DeepSeek', abbr: 'D', tag: '代码' },
    ];
  }

  getCurrentModel() {
    return this.getChatModels().find((m) => m.id === this.homeModel) || this.getChatModels()[1];
  }

  renderModelSelector() {
    const current = this.getCurrentModel();
    const models = this.getChatModels();
    const listHtml = models.map((m) => `
      <button type="button" class="wa-chat-model-item ${m.id === this.homeModel ? 'active' : ''}" data-model="${m.id}">
        <div class="wa-chat-model-item-main">
          <span class="wa-chat-model-item-abbr">${m.abbr || m.vendor[0]}</span>
          <span class="wa-chat-model-item-name">${m.name}</span>
          ${m.tag ? `<span class="wa-chat-model-item-tag">${m.tag}</span>` : ''}
        </div>
        ${m.id === this.homeModel ? '<i class="fa-solid fa-check wa-chat-model-item-check"></i>' : ''}
      </button>
    `).join('');
    return `
      <div class="wa-chat-model-wrap">
        <button class="wa-chat-model-btn" id="wa-chat-model" type="button" title="选择模型">
          <span class="wa-chat-model-dot"></span>
          <span id="wa-chat-model-label">${current.name}</span>
          <i class="fa-solid fa-chevron-down wa-chat-model-caret"></i>
        </button>
        <div class="wa-chat-model-popover" id="wa-chat-model-popover">
          <div class="wa-chat-model-popover-body">${listHtml}</div>
        </div>
      </div>
    `;
  }

  // ===================== 加号菜单（合并知识库 + 附件入口） =====================

  renderPlusButton() {
    const kbCount = (this.homeSelectedKBs || []).length;
    const attachCount = (this.homeAttachments || []).length;
    const hasActive = kbCount > 0 || attachCount > 0;
    return `
      <div class="wa-chat-plus-wrap">
        <button class="wa-chat-tool-btn wa-chat-plus-btn ${hasActive ? 'active' : ''}" id="wa-chat-plus" type="button" title="关联知识库 / 上传附件">
          <i class="fa-solid fa-plus"></i>
        </button>
        <div class="wa-chat-plus-popover" id="wa-chat-plus-popover">
          <div class="wa-chat-plus-popover-header">
            <span class="wa-chat-plus-popover-title">添加到对话</span>
          </div>
          <div class="wa-chat-plus-list">
            <button type="button" class="wa-chat-plus-item ${kbCount > 0 ? 'active' : ''}" id="wa-chat-plus-kb">
              <div class="wa-chat-plus-item-icon"><i class="fa-solid fa-book"></i></div>
              <div class="wa-chat-plus-item-body">
                <div class="wa-chat-plus-item-name">关联知识库</div>
                <div class="wa-chat-plus-item-desc" id="wa-chat-plus-kb-desc">${kbCount > 0 ? `已选 ${kbCount} 个` : '从知识库检索资料'}</div>
              </div>
              ${kbCount > 0 ? '<i class="fa-solid fa-circle-check wa-chat-plus-item-check"></i>' : '<i class="fa-solid fa-chevron-right wa-chat-plus-item-arrow"></i>'}
            </button>
            <button type="button" class="wa-chat-plus-item ${attachCount > 0 ? 'active' : ''}" id="wa-chat-plus-attach">
              <div class="wa-chat-plus-item-icon"><i class="fa-solid fa-paperclip"></i></div>
              <div class="wa-chat-plus-item-body">
                <div class="wa-chat-plus-item-name">上传附件</div>
                <div class="wa-chat-plus-item-desc" id="wa-chat-plus-attach-desc">${attachCount > 0 ? `已上传 ${attachCount} 个` : '结合附件内容生成'}</div>
              </div>
              ${attachCount > 0 ? '<i class="fa-solid fa-circle-check wa-chat-plus-item-check"></i>' : '<i class="fa-solid fa-chevron-right wa-chat-plus-item-arrow"></i>'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // 切换类型时初始化该类型的默认配置
  initChatContentConfig(type) {
    const spec = this.getContentTypeConfigSpec(type);
    const config = {};
    spec.forEach((g) => { config[g.id] = g.default; });
    this.chatContentConfig = config;
  }

  // ===================== 局部更新（不刷新页面） =====================
  // 所有 composer 交互均通过以下方法做 surgical DOM 更新，避免整体 renderHome 造成的闪烁。

  // 切换内容类型：点击已激活类型 → 回到聊天模式（toggle）
  selectChatType(type) {
    if (!type) return;
    const nextType = type === this.chatContentType ? 'chat' : type;
    this.chatContentType = nextType;
    this.initChatContentConfig(nextType);
    // 1) 类型芯片激活态
    this.container.querySelectorAll('.wa-chat-type-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.type === nextType);
    });
    // 2) 配置行局部刷新（聊天类型无配置 → 隐藏）
    const configRow = this.container.querySelector('#wa-chat-config-row');
    if (configRow) {
      configRow.innerHTML = this.renderConfigRowInner(nextType);
      configRow.classList.toggle('has-config', !!configRow.innerHTML.trim());
      this._bindConfigChips();
    }
    // 3) 占位符
    const input = this.container.querySelector('#wa-chat-input');
    if (input) {
      input.placeholder = this.getChatInputPlaceholder();
      input.focus();
    }
  }

  // 切换某配置项取值：仅更新该组芯片激活态
  selectChatConfig(key, val) {
    if (!key || !val) return;
    this.chatContentConfig = { ...this.chatContentConfig, [key]: val };
    this.container.querySelectorAll(`.wa-chat-config-chip[data-config="${key}"]`).forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.value === val);
    });
  }

  // 加号菜单展开/收起
  togglePlusMenu(open) {
    this.homePlusOpen = open;
    const pop = this.container.querySelector('#wa-chat-plus-popover');
    const btn = this.container.querySelector('#wa-chat-plus');
    if (pop) pop.classList.toggle('show', open);
    if (btn) btn.classList.toggle('open', open);
    if (open) this.toggleModelMenu(false);
  }

  // 同步加号按钮激活态与菜单内数量描述
  syncPlusButton() {
    const kbCount = (this.homeSelectedKBs || []).length;
    const attachCount = (this.homeAttachments || []).length;
    const hasActive = kbCount > 0 || attachCount > 0;
    const btn = this.container.querySelector('#wa-chat-plus');
    if (btn) btn.classList.toggle('active', hasActive);
    const kbDesc = this.container.querySelector('#wa-chat-plus-kb-desc');
    if (kbDesc) kbDesc.textContent = kbCount > 0 ? `已选 ${kbCount} 个` : '从知识库检索资料';
    const kbItem = this.container.querySelector('#wa-chat-plus-kb');
    if (kbItem) kbItem.classList.toggle('active', kbCount > 0);
    const attachDesc = this.container.querySelector('#wa-chat-plus-attach-desc');
    if (attachDesc) attachDesc.textContent = attachCount > 0 ? `已上传 ${attachCount} 个` : '结合附件内容生成';
    const attachItem = this.container.querySelector('#wa-chat-plus-attach');
    if (attachItem) attachItem.classList.toggle('active', attachCount > 0);
  }

  // 模型下拉展开/收起
  toggleModelMenu(open) {
    this.homeModelOpen = open;
    const pop = this.container.querySelector('#wa-chat-model-popover');
    const btn = this.container.querySelector('#wa-chat-model');
    if (pop) pop.classList.toggle('show', open);
    if (btn) btn.classList.toggle('open', open);
    if (open) this.togglePlusMenu(false);
  }

  // 选择模型：更新按钮显示 + 激活态 + 收起
  selectModel(id) {
    if (!id) return;
    this.homeModel = id;
    const m = this.getCurrentModel();
    const label = this.container.querySelector('#wa-chat-model-label');
    if (label) label.textContent = m.name;
    this.container.querySelectorAll('.wa-chat-model-item').forEach((item) => {
      const isActive = item.dataset.model === id;
      item.classList.toggle('active', isActive);
      const existing = item.querySelector('.wa-chat-model-item-check');
      if (isActive && !existing) {
        const check = document.createElement('i');
        check.className = 'fa-solid fa-check wa-chat-model-item-check';
        item.appendChild(check);
      } else if (!isActive && existing) {
        existing.remove();
      }
    });
    this.toggleModelMenu(false);
  }

  // 知识库选择器展开/收起
  toggleKBPicker(open) {
    this.homeKBPickerOpen = open;
    const picker = this.container.querySelector('#wa-chat-kb-picker');
    if (picker) picker.classList.toggle('show', open);
  }

  // 绑定配置项控件事件（局部刷新后重新绑定）
  _bindConfigChips() {
    // 1) chip 点击
    this.container.querySelectorAll('.wa-chat-config-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (this.chatStreaming) return;
        this.selectChatConfig(chip.dataset.config, chip.dataset.value);
      });
    });
    // 2) select 下拉
    this.container.querySelectorAll('.wa-chat-config-select').forEach((sel) => {
      sel.addEventListener('change', () => {
        if (this.chatStreaming) return;
        this.selectChatConfig(sel.dataset.config, sel.value);
      });
    });
    // 3) 主题模板选择器
    this.container.querySelectorAll('.wa-chat-config-theme-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.chatStreaming) return;
        this.openPPTThemeModal(btn.dataset.config);
      });
    });
  }

  // 仅渲染类型芯片 innerHTML（外层容器由模板提供，支持局部刷新）
  renderTypeChips() {
    const options = this.getContentTypeOptions();
    const current = this.chatContentType;
    return options.map((o) => `
      <button type="button" class="wa-chat-type-chip ${o.id === current ? 'active' : ''}" data-type="${o.id}" title="${o.label}">
        <i class="fa-solid fa-${o.icon}"></i>
        <span>${o.label}</span>
      </button>
    `).join('');
  }

  // 生成当前类型配置项的 innerHTML（供初始渲染与切换类型时局部更新）
  renderConfigRowInner(type) {
    const spec = this.getContentTypeConfigSpec(type);
    if (!spec || spec.length === 0) return '';
    const config = this.chatContentConfig || {};
    return spec.map((g) => {
      const controlType = g.type || 'chip';
      if (controlType === 'select') {
        const selectOptions = g.options.map((opt) => `
          <option value="${opt.v}" ${config[g.id] === opt.v ? 'selected' : ''}>${opt.l}</option>
        `).join('');
        return `
          <div class="wa-chat-config-group wa-chat-config-group--select">
            <span class="wa-chat-config-label">${g.label}</span>
            <div class="wa-chat-config-options">
              <select class="wa-chat-config-select" data-config="${g.id}">${selectOptions}</select>
            </div>
          </div>
        `;
      }
      if (controlType === 'theme_picker') {
        const themeId = config[g.id] || g.default;
        const theme = pptThemes[themeId] || Object.values(pptThemes)[0];
        return `
          <div class="wa-chat-config-group wa-chat-config-group--theme">
            <span class="wa-chat-config-label">${g.label}</span>
            <button type="button" class="wa-chat-config-theme-trigger" data-config="${g.id}" data-theme="${themeId}">
              <span class="wa-chat-config-theme-dot" style="background:${theme.coverBg};"></span>
              <span class="wa-chat-config-theme-name">${theme.label}</span>
              <i class="fa-solid fa-chevron-right wa-chat-config-theme-arrow"></i>
            </button>
          </div>
        `;
      }
      const chips = g.options.map((opt) => `
        <div class="wa-chat-config-chip ${config[g.id] === opt.v ? 'active' : ''}" data-config="${g.id}" data-value="${opt.v}">${opt.l}</div>
      `).join('');
      return `
        <div class="wa-chat-config-group">
          <span class="wa-chat-config-label">${g.label}</span>
          <div class="wa-chat-config-options">${chips}</div>
        </div>
      `;
    }).join('');
  }

  // 按所选类型构建临时模板与表单数据，复用流式生成管线
  startTypedGeneration(prompt, type, config) {
    const typeMap = {
      markdown: { outputType: outputTypes.MARKDOWN, abilityId: 'writing', name: '文档报告', icon: 'file-lines' },
      ppt: { outputType: outputTypes.PPT, abilityId: 'ppt', name: 'PPT', icon: 'file-powerpoint' },
      table: { outputType: outputTypes.TABLE, abilityId: 'table', name: '表格', icon: 'table-cells' },
      video: { outputType: outputTypes.VIDEO, abilityId: 'video', name: '视频', icon: 'film' },
      music: { outputType: outputTypes.MUSIC, abilityId: 'music', name: '音乐', icon: 'music' },
    };
    const m = typeMap[type];
    if (!m) { this.startFreeChat(prompt); return; }
    const template = {
      id: `chat_type_${type}`,
      name: `${m.name}生成`,
      roleId: 'sales',
      abilityId: m.abilityId,
      outputType: m.outputType,
      icon: m.icon,
      defaultMode: 'free',
      fields: [{ id: 'topic', type: fieldTypes.TEXT, label: '主题', required: true }],
      chatContentType: type,
    };
    const formData = { topic: prompt };
    // PPT 配置字段映射：length -> pageCount, style -> theme
    const mappedOptions = { ...config, chatContentType: type, attachments: this.homeAttachments || [] };
    if (type === 'ppt') {
      if (mappedOptions.length) {
        mappedOptions.pageCount = mappedOptions.length;
        delete mappedOptions.length;
      }
      if (mappedOptions.style) {
        mappedOptions.theme = mappedOptions.style;
        delete mappedOptions.style;
      }
    }
    this.startChatGeneration({
      template,
      formData,
      selectedKBs: this.homeSelectedKBs || [],
      mode: 'free',
      options: mappedOptions,
    });
  }

  // 纯对话流式生成（不依赖模板，类似 ChatGPT）
  async startFreeChat(value) {
    const selectedKBs = this.homeSelectedKBs || [];
    const userMsg = {
      id: generateId('chatmsg'),
      role: 'user',
      type: 'text',
      content: value,
    };
    const aiMsg = {
      id: generateId('chatmsg'),
      role: 'ai',
      thinkingSteps: [],
      content: '',
      result: null,
      template: { id: 'free-chat', name: 'AI 对话', icon: 'comments', outputType: 'markdown' },
      formData: { content: value },
      selectedKBs,
      mode: 'free',
      done: false,
      isFreeChat: true,
    };
    this.chatMessages.push(userMsg, aiMsg);
    this.chatStreaming = true;
    this.render();

    try {
      // 思考步骤
      const steps = selectedKBs.length > 0
        ? [`检索知识库：${selectedKBs.map((k) => k.name).join('、')}`, '分析问题', '组织回复']
        : ['分析问题', '组织回复'];
      for (const step of steps) {
        aiMsg.thinkingSteps.push({ text: step, status: 'active' });
        this.updateChatStreamingMessage(aiMsg);
        await this._chatDelay(500);
        const s = aiMsg.thinkingSteps.find((x) => x.text === step && x.status !== 'done');
        if (s) s.status = 'done';
        this.updateChatStreamingMessage(aiMsg);
        await this._chatDelay(150);
      }
      await this._chatDelay(200);

      // 生成回复内容
      const reply = this.generateFreeChatReply(value, selectedKBs);
      aiMsg.result = { content: reply };

      // 流式输出
      const chunkSize = 4;
      for (let i = 0; i < reply.length; i += chunkSize) {
        aiMsg.content += reply.slice(i, i + chunkSize);
        this.updateChatStreamingMessage(aiMsg);
        await this._chatDelay(18);
      }

      aiMsg.done = true;
      aiMsg.title = value.slice(0, 30) + (value.length > 30 ? '…' : '');
      aiMsg.source = 'freeChat';
      this.saveChatResultToHistory(aiMsg);
      aiMsg.saved = true;
      this.chatStreaming = false;
      this.updateChatStreamingMessage(aiMsg);
    } catch (e) {
      aiMsg.content += `\n\n[生成失败：${e.message}]`;
      aiMsg.done = true;
      this.chatStreaming = false;
      this.updateChatStreamingMessage(aiMsg);
    }
  }

  generateFreeChatReply(value, selectedKBs) {
    const kbNote = selectedKBs.length > 0
      ? `\n\n> 📖 已参考《${selectedKBs.map((k) => k.name).join('、')}》中的相关资料`
      : '';
    return `关于「${value}」，以下是我的建议：\n\n1. **明确目标**：首先梳理核心需求，确保方向清晰。\n2. **拆解要点**：将任务分解为可执行的步骤，便于跟踪进度。\n3. **执行方案**：根据实际情况选择合适的方法，逐步推进。\n4. **复盘优化**：完成后回顾效果，持续改进。\n\n如果你需要更具体的内容（如 PPT、报告、表格），可以点击下方"场景模板"选择对应模板生成。${kbNote}`;
  }

  _chatDelay(ms) {
    return new Promise((r) => setTimeout(r, ms));
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

    // 自动应用场景模板关联的内容模板
    if (template.contentTemplateId) {
      if (template.outputType === outputTypes.PPT) {
        // PPT 内容模板是骨架模板
        const skeleton = pptSkeletonTemplates.find((s) => s.id === template.contentTemplateId);
        if (skeleton) this.selectedSkeletonId = template.contentTemplateId;
      } else {
        // 非 PPT 内容模板
        const contentTemplate = getContentTemplateById(template.contentTemplateId);
        if (contentTemplate) this.selectedContentTemplateId = template.contentTemplateId;
      }
    }

    if (template.outputType === outputTypes.PPT) {
      this.renderPPTEditor();
      return;
    }

    const ability = getAbilityById(template.abilityId);
    const role = getRoleById(template.roleId);
    this.pptStage = 'outline';
    const draft = getDraft(template.id);
    const initialFormData = this.currentFormData || (draft ? draft.formData : {});
    const initialMode = this.currentMode || (draft ? draft.mode : template.defaultMode);

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
            ${template.outputType !== outputTypes.PPT ? this.renderContentTemplateSelector(template) : ''}
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

  // ===================== PPT 分步编辑器 =====================

  renderPPTEditor() {
    const template = this.selectedTemplate;
    const ability = getAbilityById(template.abilityId);
    const role = getRoleById(template.roleId);
    this.pptStage = 'outline';
    const draft = getDraft(template.id);
    const initialFormData = this.currentFormData || (draft && draft.formData) || {};
    const initialMode = this.currentMode || (draft && draft.mode) || template.defaultMode;

    if (draft && draft.pptConfig) {
      this.pptConfig = { ...this.getDefaultPPTConfig(), ...draft.pptConfig };
    } else {
      this.pptConfig = this.getDefaultPPTConfig();
    }

    // 恢复或初始化结构模板
    if (draft && draft.structureTemplateId !== undefined) {
      this.currentStructureTemplateId = draft.structureTemplateId || null;
    } else if (template.structureTemplateId) {
      this.currentStructureTemplateId = template.structureTemplateId;
    } else {
      this.currentStructureTemplateId = null;
    }

    // 恢复视觉模式
    if (draft && draft.pptVisualMode) {
      this.pptVisualMode = draft.pptVisualMode;
    } else if (this.currentMasterData || template.masterData || template.parsedFromFile) {
      this.pptVisualMode = 'upload';
    } else if (this.currentStructureTemplateId) {
      this.pptVisualMode = 'template';
    } else {
      this.pptVisualMode = 'custom';
    }

    // 恢复配置分组展开状态
    if (draft && draft.pptExpandedGroups) {
      this.pptExpandedGroups = draft.pptExpandedGroups;
    }

    // 恢复内容骨架
    if (draft && draft.skeletonId !== undefined) {
      this.selectedSkeletonId = draft.skeletonId || null;
    }

    // 若当前选中了结构模板，根据结构模板初始化视觉/结构配置
    const structureTemplate = this.currentStructureTemplateId ? getStructureTemplateById(this.currentStructureTemplateId) : null;
    if (structureTemplate && structureTemplate.style) {
      const style = structureTemplate.style;
      if (style.theme) this.pptConfig.theme = style.theme;
      if (style.color) this.pptConfig.color = style.color;
      if (style.ratio) this.pptConfig.ratio = style.ratio;
      if (style.font) this.pptConfig.font = style.font;
      if (style.background) this.pptConfig.background = style.background;
    }

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
              <i class="fa-solid fa-play"></i> ${this.getPPTPrimaryActionText()}
            </button>
          </div>
        </header>

        <div class="wa-editor-body">
          <aside class="wa-editor-left" id="wa-ppt-left">
            ${this.renderPPTStepper()}
            ${this.renderPPTStepContent(template, initialFormData)}
          </aside>

          <main class="wa-editor-main" id="wa-ppt-main">
            ${this.renderPPTMainContent()}
          </main>

          <aside class="wa-editor-right" id="wa-ppt-right">
            ${this.renderPPTRightContent()}
          </aside>
        </div>
      </div>
    `;

    this.bindPPTEditorEvents(template);
    this.refreshPPTPreview();
  }

  getPPTPrimaryActionText() {
    if (this.pptStep === 1) return '开始生成';
    if (this.pptStep === 2) return '生成大纲';
    return '确认生成完整PPT';
  }

  savePPTDraft(template) {
    const formData = this.currentFormData || {};
    saveDraft(template.id, {
      formData,
      mode: this.getSelectedMode(),
      pptConfig: this.pptConfig,
      structureTemplateId: this.currentStructureTemplateId,
      pptVisualMode: this.pptVisualMode,
      pptExpandedGroups: this.pptExpandedGroups,
      skeletonId: this.selectedSkeletonId,
    });
  }

  renderPPTStepper() {
    const steps = [
      { id: 1, label: '主题内容' },
      { id: 2, label: '视觉结构' },
      { id: 3, label: '大纲确认' },
    ];
    return `
      <div class="wa-ppt-stepper">
        ${steps.map((step) => {
          const active = step.id === this.pptStep;
          const completed = step.id < this.pptStep;
          return `
            <div class="wa-ppt-step ${active ? 'active' : ''} ${completed ? 'completed' : ''}" data-step="${step.id}">
              <div class="wa-ppt-step-num">${completed ? '<i class="fa-solid fa-check"></i>' : step.id}</div>
              <span>${step.label}</span>
            </div>
          `;
        }).join('<div class="wa-ppt-step-divider"></div>')}
      </div>
    `;
  }

  renderPPTStepContent(template, formData) {
    if (this.pptStep === 1) return this.renderPPTStep1(template, formData);
    if (this.pptStep === 2) return this.renderPPTStep2(template);
    return this.renderPPTStep3();
  }

  renderPPTMainContent() {
    if (this.pptStep === 1) {
      return `
        <div class="wa-ppt-preview-empty">
          <div class="wa-ppt-preview-empty-icon"><i class="fa-solid fa-presentation-screen"></i></div>
          <div class="wa-ppt-preview-empty-title">准备生成</div>
          <div class="wa-ppt-preview-empty-desc">填写左侧信息后，将在第二步预览 PPT 视觉效果</div>
        </div>
      `;
    }
    if (this.pptStep === 2) {
      return this.renderPPTPreview();
    }
    return this.renderPPTOutlineEdit();
  }

  renderPPTSettingsCard(ability, mode, template) {
    const selectedKBs = this.getSelectedKBs();
    const kbCount = selectedKBs.length;

    const collapsed = this.pptStep === 2 || this.pptStep === 3;

    return `
      <div class="wa-ppt-settings-card wa-ppt-settings-featured">
        <div class="wa-ppt-settings-toggle" id="wa-ppt-settings-toggle">
          <div class="wa-ppt-settings-header-row">
            <div class="wa-ppt-settings-title">
              <i class="fa-solid fa-sliders"></i>
              <span>生成设置</span>
              <span class="wa-ppt-settings-badge">亮点</span>
            </div>
            <i class="fa-solid fa-chevron-${collapsed ? 'down' : 'up'} wa-ppt-settings-arrow"></i>
          </div>
          <div class="wa-ppt-settings-summary">
            ${mode === 'kb' ? '基于知识库' : '自由生成'} · ${kbCount} 个知识库
          </div>
        </div>
        <div class="wa-ppt-settings-body" id="wa-ppt-settings-body" style="display: ${collapsed ? 'none' : 'block'};">
          ${this.renderModeSelector(mode, ability)}
          ${this.renderAttachmentPanel(mode, ability)}
          ${this.renderKBSelector(mode, ability)}
        </div>
      </div>
    `;
  }

  renderPPTRightContent() {
    const template = this.selectedTemplate;
    const ability = getAbilityById(template.abilityId);
    const mode = this.currentMode || template.defaultMode;
    return this.renderPPTSettingsCard(ability, mode, template) + this.renderPPTRightPanel();
  }

  renderPPTRightPanel() {
    if (this.pptStep === 1) {
      return this.renderPPTStep1Hint();
    }
    if (this.pptStep === 2) {
      return this.renderPPTPageStructure();
    }
    return this.renderPPTNotesAndImages();
  }

  renderPPTStep1Hint() {
    return `
      <div class="wa-ppt-hint">
        <i class="fa-solid fa-lightbulb"></i>
        <div>
          <strong>填写提示</strong>
          <div style="margin-top:4px;">先明确汇报主题和核心信息，再进入第二步选择视觉风格与内容结构。建议补充关键要点，便于生成更贴合的大纲。</div>
        </div>
      </div>
    `;
  }

  renderPPTStep1(template, formData) {
    return `
      <div class="wa-ppt-step-panel" id="wa-ppt-step-1">
        <div class="wa-panel">
          <div class="wa-panel-title">输入信息</div>
          <div class="wa-form">
            ${template.fields.map((field) => this.renderField(field, formData[field.id])).join('')}
          </div>
        </div>
        <div class="wa-ppt-step-actions">
          <span></span>
          <button class="btn btn-primary" id="wa-ppt-step1-next">下一步 →</button>
        </div>
      </div>
    `;
  }

  renderPPTStep2(template) {
    const groups = {
      visual: '视觉表现',
      structure: '内容结构',
      output: '输出形式',
      brand: '品牌信息',
      advanced: '高级设置',
    };

    const visualFieldIds = ['theme', 'color', 'ratio', 'background', 'font', 'decorations'];
    const hideVisual = this.pptVisualMode !== 'custom';

    const groupedFields = {};
    Object.values(pptConfigDefinitions).forEach((def) => {
      if (hideVisual && visualFieldIds.includes(def.id)) return;
      if (!groupedFields[def.group]) groupedFields[def.group] = [];
      groupedFields[def.group].push(def);
    });

    return `
      <div class="wa-ppt-step-panel" id="wa-ppt-step-2">
        ${this.renderPPTVisualModeSelector()}
        ${this.pptVisualMode === 'template' ? this.renderPPTTemplateSelector() : ''}
        ${this.pptVisualMode === 'upload' ? this.renderPPTUploadTemplatePanel(template) : ''}
        <div class="wa-ppt-config-groups">
          ${Object.entries(groupedFields).map(([group, fields]) => {
            const expanded = this.pptExpandedGroups.includes(group);
            const content = fields.map((def) => this.renderPPTConfigField(def)).join('');
            const skeletonSection = group === 'structure' ? this.renderPPTSkeletonSelector() : '';
            return `
              <div class="wa-panel wa-ppt-config-group ${expanded ? 'expanded' : ''}" data-group="${group}">
                <div class="wa-ppt-config-group-header">
                  <div class="wa-ppt-config-group-title">${groups[group]}</div>
                  <i class="fa-solid fa-chevron-${expanded ? 'up' : 'down'} wa-ppt-config-group-arrow"></i>
                </div>
                <div class="wa-ppt-config-group-body" style="display:${expanded ? 'block' : 'none'};">
                  ${skeletonSection}
                  ${content}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="wa-ppt-step-actions">
          <button class="btn btn-ghost" id="wa-ppt-step2-prev">← 上一步</button>
          <button class="btn btn-primary" id="wa-ppt-step2-next">下一步 →</button>
        </div>
      </div>
    `;
  }

  renderPPTVisualModeSelector() {
    const modes = [
      { id: 'custom', label: '自由配置', desc: '灵活调整配色、主题、版式等视觉参数', icon: 'sliders' },
      { id: 'template', label: '选择模板', desc: '从预设模板中选择完整视觉风格', icon: 'layer-group' },
      { id: 'upload', label: '上传模板', desc: '上传已有PPT文件作为视觉母版', icon: 'cloud-arrow-up' },
    ];
    return `
      <div class="wa-panel wa-ppt-visual-mode-panel">
        <div class="wa-panel-title">视觉生成方式</div>
        <div class="wa-ppt-visual-mode-list">
          ${modes.map((mode) => `
            <div class="wa-ppt-visual-mode-item ${this.pptVisualMode === mode.id ? 'active' : ''}" data-mode="${mode.id}">
              <div class="wa-ppt-visual-mode-icon"><i class="fa-solid fa-${mode.icon}"></i></div>
              <div class="wa-ppt-visual-mode-info">
                <div class="wa-ppt-visual-mode-label">${mode.label}</div>
                <div class="wa-ppt-visual-mode-desc">${mode.desc}</div>
              </div>
              <div class="wa-ppt-visual-mode-check"><i class="fa-solid fa-check"></i></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderPPTSkeletonSelector() {
    const selectedSkeleton = this.selectedSkeletonId
      ? pptSkeletonTemplates.find((s) => s.id === this.selectedSkeletonId)
      : null;

    return `
      <div class="wa-ppt-skeleton-section">
        <div class="wa-ppt-skeleton-label">内容骨架</div>
        <div class="wa-ppt-skeleton-current" id="wa-ppt-skeleton-current">
          ${selectedSkeleton ? `
            <div class="wa-ppt-skeleton-current-info">
              <div class="wa-ppt-skeleton-current-icon"><i class="fa-solid fa-sitemap"></i></div>
              <div>
                <div class="wa-ppt-skeleton-current-name">${selectedSkeleton.name}</div>
                <div class="wa-ppt-skeleton-current-desc">${selectedSkeleton.storyline.length} 个章节 · ${selectedSkeleton.description}</div>
              </div>
            </div>
            <button class="wa-ppt-skeleton-change" id="wa-ppt-skeleton-change">更换</button>
          ` : `
            <div class="wa-ppt-skeleton-placeholder">
              <div class="wa-ppt-skeleton-placeholder-icon"><i class="fa-regular fa-folder-open"></i></div>
              <div class="wa-ppt-skeleton-placeholder-text">
                <div class="wa-ppt-skeleton-placeholder-title">选择内容骨架</div>
                <div class="wa-ppt-skeleton-placeholder-desc">预设 storyline 结构，一键套用</div>
              </div>
              <i class="fa-solid fa-chevron-right wa-ppt-skeleton-arrow"></i>
            </div>
          `}
        </div>
        ${this.pptSkeletonDropdownOpen ? this.renderPPTSkeletonDropdown() : ''}
      </div>
    `;
  }

  renderPPTSkeletonDropdown() {
    return `
      <div class="wa-ppt-skeleton-dropdown">
        <div class="wa-ppt-skeleton-dropdown-header">
          <span>选择内容骨架</span>
          <button class="wa-ppt-skeleton-close" id="wa-ppt-skeleton-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="wa-ppt-skeleton-dropdown-list">
          <div class="wa-ppt-skeleton-option ${!this.selectedSkeletonId ? 'active' : ''}" data-skeleton-id="">
            <div class="wa-ppt-skeleton-option-icon"><i class="fa-solid fa-infinity"></i></div>
            <div>
              <div class="wa-ppt-skeleton-option-name">自由生成（无固定结构）</div>
              <div class="wa-ppt-skeleton-option-desc">AI 根据主题自由组织内容结构</div>
            </div>
          </div>
          ${pptSkeletonTemplates.map((s) => `
            <div class="wa-ppt-skeleton-option ${this.selectedSkeletonId === s.id ? 'active' : ''}" data-skeleton-id="${s.id}">
              <div class="wa-ppt-skeleton-option-icon"><i class="fa-solid fa-sitemap"></i></div>
              <div>
                <div class="wa-ppt-skeleton-option-name">${s.name}</div>
                <div class="wa-ppt-skeleton-option-desc">${s.storyline.length} 个章节 · ${s.description}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderPPTTemplateCard(t, options = {}) {
    const style = t.style || {};
    const theme = pptThemes[style.theme] || {};
    const color = pptColors[style.color] || {};
    const selected = this.currentStructureTemplateId === t.id ? 'selected' : '';
    const compact = options.size === 'compact' ? 'wa-ppt-template-card-compact' : '';
    const shortName = t.name.replace(/\s*\d+\s*页\s*PPT/i, '');

    const coverScenes = {
      business: this.renderCoverScene('business', shortName, color.primary),
      tech: this.renderCoverScene('tech', shortName, color.primary),
      minimal: this.renderCoverScene('minimal', shortName, color.primary),
      lively: this.renderCoverScene('lively', shortName, color.primary),
      academic: this.renderCoverScene('academic', shortName, color.primary),
      dark: this.renderCoverScene('dark', shortName, color.primary),
    };
    const scene = coverScenes[style.theme] || coverScenes.business;

    return `
      <div class="wa-ppt-template-card ${selected} ${compact}" data-id="${t.id}">
        <div class="wa-ppt-thumb" style="--accent:${color.primary || '#10b981'};">
          <button class="wa-ppt-preview-eye" data-preview="${t.id}" title="预览模板">
            <i class="fa-regular fa-eye"></i>
          </button>
          <div class="wa-ppt-thumb-inner theme-${style.theme || 'business'}">
            ${scene}
          </div>
        </div>
        ${options.showName !== false ? `<div class="wa-ppt-template-card-name">${shortName}</div>` : ''}
      </div>
    `;
  }

  // 渲染 PPT 风格模板选择弹窗（与 renderPPTTemplateModal 结构保持一致）
  renderPPTThemeModal(configKey) {
    const currentTheme = (this.chatContentConfig || {})[configKey] || 'business';
    const themeColorMap = { business: 'green', tech: 'blue', minimal: 'green', lively: 'orange', academic: 'gray', dark: 'purple' };
    const templates = Object.values(pptThemes).map((theme) => ({
      id: `theme_${theme.id}`,
      name: theme.label,
      style: { theme: theme.id, color: themeColorMap[theme.id] || 'green' },
    }));
    return `
      <div class="wa-modal-overlay" id="wa-chat-theme-modal">
        <div class="wa-modal wa-modal-lg">
          <div class="wa-modal-header">
            <div class="wa-modal-title"><i class="fa-solid fa-layer-group"></i> 选择风格模板</div>
            <button class="wa-modal-close" id="wa-chat-theme-modal-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="wa-modal-body">
            <div class="wa-ppt-template-modal-desc">选择一个视觉风格，系统将自动应用对应的配色、字体和版式。</div>
            <div class="wa-ppt-template-grid wa-ppt-template-grid-modal">
              ${templates.map((t) => {
                const selected = t.style.theme === currentTheme ? 'selected' : '';
                return `<div class="wa-ppt-theme-card-wrap ${selected}" data-theme="${t.style.theme}">${this.renderPPTTemplateCard(t, { size: 'compact' })}</div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  openPPTThemeModal(configKey) {
    if (document.getElementById('wa-chat-theme-modal')) return;
    this._currentThemeConfigKey = configKey;
    const modalHTML = this.renderPPTThemeModal(configKey);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.bindPPTThemeModalEvents();
  }

  bindPPTThemeModalEvents() {
    const modal = document.getElementById('wa-chat-theme-modal');
    if (!modal) return;

    const close = () => modal.remove();
    const configKey = this._currentThemeConfigKey;

    document.getElementById('wa-chat-theme-modal-close')?.addEventListener('click', close);

    // 预览按钮
    modal.querySelectorAll('.wa-ppt-preview-eye').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.preview;
        if (id) this.openTemplatePreview(id);
      });
    });

    // 选择风格模板
    modal.querySelectorAll('.wa-ppt-theme-card-wrap').forEach((card) => {
      card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        if (configKey) this.selectChatConfig(configKey, theme);
        // 同步更新触发按钮显示
        const trigger = this.container.querySelector('.wa-chat-config-theme-trigger');
        if (trigger) {
          const t = pptThemes[theme] || Object.values(pptThemes)[0];
          trigger.dataset.theme = theme;
          const dot = trigger.querySelector('.wa-chat-config-theme-dot');
          const name = trigger.querySelector('.wa-chat-config-theme-name');
          if (dot) dot.style.background = t.coverBg;
          if (name) name.textContent = t.label;
        }
        close();
      });
    });

    // 点击遮罩关闭
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  }

  closePPTThemePicker() {
    const modal = document.getElementById('wa-chat-theme-modal');
    if (modal) modal.remove();
  }

  renderCoverScene(theme, title, accent) {
    const scenes = {
      business: `
        <div class="cover-scene cover-business">
          <div class="cover-bg-city"></div>
          <div class="cover-panel">
            <div class="cover-panel-line"></div>
            <div class="cover-panel-tag">ANNUAL REPORT</div>
            <div class="cover-panel-title">${title}</div>
            <div class="cover-panel-sub">商务汇报 · 战略规划 · 数据总结</div>
            <div class="cover-panel-footer">
              <span>2026</span>
              <span class="cover-dot">·</span>
              <span>Q3</span>
            </div>
          </div>
        </div>
      `,
      tech: `
        <div class="cover-scene cover-tech">
          <div class="cover-glow-1"></div>
          <div class="cover-glow-2"></div>
          <div class="cover-grid"></div>
          <div class="cover-tech-content">
            <div class="cover-tech-badge">
              <span class="cover-tech-dot"></span>
              TECH BRIEFING
            </div>
            <div class="cover-tech-title">${title}</div>
            <div class="cover-tech-sub">架构升级 · 技术演进 · 产品迭代</div>
            <div class="cover-tech-cards">
              <div class="cover-tech-card"><i class="fa-solid fa-microchip"></i></div>
              <div class="cover-tech-card"><i class="fa-solid fa-network-wired"></i></div>
              <div class="cover-tech-card"><i class="fa-solid fa-robot"></i></div>
            </div>
          </div>
        </div>
      `,
      minimal: `
        <div class="cover-scene cover-minimal">
          <div class="cover-minimal-circle"></div>
          <div class="cover-minimal-dot"></div>
          <div class="cover-minimal-content">
            <div class="cover-minimal-label">PROPOSAL</div>
            <div class="cover-minimal-line"></div>
            <div class="cover-minimal-title">${title}</div>
            <div class="cover-minimal-sub">轻量化方案 · 高效落地</div>
          </div>
        </div>
      `,
      lively: `
        <div class="cover-scene cover-lively">
          <div class="cover-lively-blob-1"></div>
          <div class="cover-lively-blob-2"></div>
          <div class="cover-lively-content">
            <div class="cover-lively-tag">
              <i class="fa-solid fa-bolt"></i>
              CREATIVE IDEA
            </div>
            <div class="cover-lively-title">${title}</div>
            <div class="cover-lively-sub">创意营销 · 品牌升级 · 活动策划</div>
          </div>
          <div class="cover-lively-shapes">
            <div class="shape-circle"></div>
            <div class="shape-square"></div>
            <div class="shape-triangle"></div>
          </div>
        </div>
      `,
      academic: `
        <div class="cover-scene cover-academic">
          <div class="cover-academic-grid"></div>
          <div class="cover-academic-chart">
            <div class="chart-bar" style="height:45%"></div>
            <div class="chart-bar chart-bar-accent" style="height:70%"></div>
            <div class="chart-bar" style="height:55%"></div>
            <div class="chart-bar chart-bar-accent" style="height:85%"></div>
            <div class="chart-bar" style="height:65%"></div>
            <div class="chart-bar" style="height:40%"></div>
          </div>
          <div class="cover-academic-content">
            <div class="cover-academic-tag">RESEARCH</div>
            <div class="cover-academic-title">${title}</div>
            <div class="cover-academic-sub">数据分析 · 研究洞察 · 学术报告</div>
          </div>
        </div>
      `,
      dark: `
        <div class="cover-scene cover-dark">
          <div class="cover-dark-gradient"></div>
          <div class="cover-dark-particles"></div>
          <div class="cover-dark-content">
            <div class="cover-dark-line"></div>
            <div class="cover-dark-title">${title}</div>
            <div class="cover-dark-sub">PREMIUM · LUXURY · FLAGSHIP</div>
            <div class="cover-dark-pill">2026 旗舰发布</div>
          </div>
          <div class="cover-dark-corner tl"></div>
          <div class="cover-dark-corner br"></div>
        </div>
      `,
    };
    return scenes[theme] || scenes.business;
  }

  renderTemplatePreviewModal(template) {
    const style = template.style || {};
    const theme = pptThemes[style.theme] || {};
    const color = pptColors[style.color] || {};
    const pages = [
      { type: 'cover', label: '封面页' },
      { type: 'toc', label: '目录页' },
      { type: 'chart', label: '图表正文页' },
    ];
    const accent = color.primary || '#10b981';
    return `
      <div class="wa-modal-overlay" id="wa-template-preview-modal">
        <div class="wa-modal wa-modal-xl wa-template-preview-modal">
          <div class="wa-modal-header">
            <div class="wa-modal-title"><i class="fa-regular fa-images"></i> ${template.name} 预览</div>
            <button class="wa-modal-close" id="wa-template-preview-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="wa-modal-body">
            <div class="wa-preview-main" style="--accent:${accent};">
              <div class="wa-preview-main-slide theme-${style.theme || 'business'}" data-preview-main>
                ${this.renderPPTSlidePreview(template, 'cover', 'large')}
              </div>
            </div>
            <div class="wa-preview-thumbs">
              ${pages.map((p, i) => `
                <div class="wa-preview-thumb ${i === 0 ? 'active' : ''}" data-preview-type="${p.type}" data-idx="${i}">
                  <div class="wa-preview-thumb-slide theme-${style.theme || 'business'}" style="--accent:${accent};">
                    ${this.renderPPTSlidePreview(template, p.type, 'small')}
                  </div>
                  <div class="wa-preview-thumb-label">${p.label}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="wa-modal-footer wa-preview-footer">
            <button class="btn btn-ghost" id="wa-template-preview-cancel">再看看</button>
            <button class="btn btn-primary" id="wa-template-preview-use">使用此模板</button>
          </div>
        </div>
      </div>
    `;
  }

  renderPPTSlidePreview(template, type, size = 'small') {
    const style = template.style || {};
    const accent = style.color ? (pptColors[style.color]?.primary || '#10b981') : '#10b981';
    const isLarge = size === 'large';
    const scale = isLarge ? 2 : 1;
    if (type === 'cover') {
      return `
        <div class="wa-slide-cover">
          <div class="cover-bg-city cover-bg"></div>
          <div class="wa-slide-cover-content">
            <div class="wa-slide-cover-tag">PRODUCT REPORT</div>
            <div class="wa-slide-cover-line"></div>
            <div class="wa-slide-cover-title">Q3 产品战略<br/>汇报材料</div>
            <div class="wa-slide-cover-sub">战略回顾 · 能力升级 · 下阶段规划</div>
            <div class="wa-slide-cover-bottom">
              <span class="wa-slide-cover-brand">DmtPlat</span>
              <span class="wa-slide-cover-date">2026.07</span>
            </div>
          </div>
          <div class="wa-slide-deco-bars"></div>
        </div>
      `;
    }
    if (type === 'toc') {
      return `
        <div class="wa-slide-toc">
          <div class="wa-slide-toc-left">
            <div class="wa-slide-toc-bignum">01</div>
            <div class="wa-slide-toc-title-wrap">
              <div class="wa-slide-toc-title">目录</div>
              <div class="wa-slide-toc-en">CONTENTS</div>
            </div>
          </div>
          <div class="wa-slide-toc-right">
            <div class="wa-slide-toc-item"><span class="wa-slide-toc-dot"></span><span class="wa-slide-toc-text">项目背景与目标</span></div>
            <div class="wa-slide-toc-item"><span class="wa-slide-toc-dot"></span><span class="wa-slide-toc-text">核心能力与亮点</span></div>
            <div class="wa-slide-toc-item"><span class="wa-slide-toc-dot"></span><span class="wa-slide-toc-text">落地成果与数据</span></div>
            <div class="wa-slide-toc-item"><span class="wa-slide-toc-dot"></span><span class="wa-slide-toc-text">下阶段规划</span></div>
            <div class="wa-slide-toc-item"><span class="wa-slide-toc-dot"></span><span class="wa-slide-toc-text">总结与展望</span></div>
          </div>
        </div>
      `;
    }
    return `
      <div class="wa-slide-chart">
        <div class="wa-slide-chart-header">
          <div class="wa-slide-chart-num">03</div>
          <div class="wa-slide-chart-titles">
            <div class="wa-slide-chart-title-text">Q3 核心指标完成情况</div>
            <div class="wa-slide-chart-sub">单位：万元 · 数据截至 2026.06</div>
          </div>
        </div>
        <div class="wa-slide-chart-body">
          <div class="wa-slide-bar-chart">
            <div class="wa-slide-bar" style="height:70%;"><span>120</span></div>
            <div class="wa-slide-bar wa-slide-bar-accent" style="height:90%;"><span>156</span></div>
            <div class="wa-slide-bar" style="height:55%;"><span>92</span></div>
            <div class="wa-slide-bar" style="height:80%;"><span>138</span></div>
            <div class="wa-slide-bar wa-slide-bar-accent2" style="height:65%;"><span>108</span></div>
          </div>
          <div class="wa-slide-bar-labels">
            <span>1月</span><span>2月</span><span>3月</span><span>4月</span><span>5月</span>
          </div>
        </div>
        <div class="wa-slide-chart-footer">
          <span class="wa-slide-chart-legend"><i style="background:${accent};"></i>目标完成</span>
          <span class="wa-slide-chart-legend"><i style="background:currentColor;opacity:.3;"></i>实际达成</span>
        </div>
      </div>
    `;
  }

  openTemplatePreview(templateId) {
    if (document.getElementById('wa-template-preview-modal')) return;
    const template = getStructureTemplateById(templateId);
    if (!template) return;
    const modalHTML = this.renderTemplatePreviewModal(template);
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('wa-template-preview-modal');
    const close = () => modal.remove();
    document.getElementById('wa-template-preview-close')?.addEventListener('click', close);
    document.getElementById('wa-template-preview-cancel')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    // 缩略图切换大图
    const mainSlide = modal.querySelector('[data-preview-main]');
    const thumbs = modal.querySelectorAll('.wa-preview-thumb');
    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const type = thumb.dataset.previewType;
        thumbs.forEach((t) => t.classList.remove('active'));
        thumb.classList.add('active');
        mainSlide.innerHTML = this.renderPPTSlidePreview(template, type, 'large');
      });
    });

    // 使用此模板
    document.getElementById('wa-template-preview-use')?.addEventListener('click', () => {
      this.currentStructureTemplateId = templateId;
      const structureTemplate = getStructureTemplateById(templateId);
      if (structureTemplate && structureTemplate.style) {
        const style = structureTemplate.style;
        if (style.theme) this.pptConfig.theme = style.theme;
        if (style.color) this.pptConfig.color = style.color;
        if (style.ratio) this.pptConfig.ratio = style.ratio;
        if (style.font) this.pptConfig.font = style.font;
        if (style.background) this.pptConfig.background = style.background;
      }
      this.savePPTDraft(this.selectedTemplate);
      modal.remove();
      this.renderPPTEditor();
    });
  }

  renderPPTTemplateSelector() {
    const templates = getStructureTemplatesByOutputType(outputTypes.PPT);
    if (!this.currentStructureTemplateId && templates.length > 0) {
      this.currentStructureTemplateId = templates[0].id;
      const first = templates[0];
      if (first.style) {
        const style = first.style;
        if (style.theme) this.pptConfig.theme = style.theme;
        if (style.color) this.pptConfig.color = style.color;
        if (style.ratio) this.pptConfig.ratio = style.ratio;
        if (style.font) this.pptConfig.font = style.font;
        if (style.background) this.pptConfig.background = style.background;
      }
    }
    const currentTemplate = templates.find((t) => t.id === this.currentStructureTemplateId);
    return `
      <div class="wa-panel">
        <div class="wa-panel-title">
          <span>选择预设模板</span>
          <button class="btn btn-sm btn-ghost wa-ppt-template-more-btn" id="wa-ppt-template-more">
            <i class="fa-solid fa-layer-group"></i> 更多
          </button>
        </div>
        <div class="wa-ppt-template-single">
          ${currentTemplate ? this.renderPPTTemplateCard(currentTemplate, { showName: false }) : '<div class="wa-ppt-template-empty">暂无可用模板</div>'}
        </div>
      </div>
    `;
  }

  renderPPTTemplateModal() {
    const templates = getStructureTemplatesByOutputType(outputTypes.PPT);
    return `
      <div class="wa-modal-overlay" id="wa-ppt-template-modal">
        <div class="wa-modal wa-modal-lg">
          <div class="wa-modal-header">
            <div class="wa-modal-title"><i class="fa-solid fa-layer-group"></i> 选择 PPT 模板</div>
            <button class="wa-modal-close" id="wa-ppt-template-modal-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="wa-modal-body">
            <div class="wa-ppt-template-modal-desc">选择一个预设模板，系统将自动应用对应的配色、字体和版式。</div>
            <div class="wa-ppt-template-grid wa-ppt-template-grid-modal">
              ${templates.map((t) => this.renderPPTTemplateCard(t, { size: 'compact' })).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  openPPTTemplateModal() {
    if (document.getElementById('wa-ppt-template-modal')) return;
    const modalHTML = this.renderPPTTemplateModal();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.bindPPTTemplateModalEvents();
  }

  bindPPTTemplateModalEvents() {
    const modal = document.getElementById('wa-ppt-template-modal');
    if (!modal) return;

    const close = () => modal.remove();

    document.getElementById('wa-ppt-template-modal-close')?.addEventListener('click', close);

    // 预览按钮
    modal.querySelectorAll('.wa-ppt-preview-eye').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.preview;
        if (id) this.openTemplatePreview(id);
      });
    });

    modal.querySelectorAll('.wa-ppt-template-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.currentStructureTemplateId = id;
        const structureTemplate = getStructureTemplateById(id);
        if (structureTemplate && structureTemplate.style) {
          const style = structureTemplate.style;
          if (style.theme) this.pptConfig.theme = style.theme;
          if (style.color) this.pptConfig.color = style.color;
          if (style.ratio) this.pptConfig.ratio = style.ratio;
          if (style.font) this.pptConfig.font = style.font;
          if (style.background) this.pptConfig.background = style.background;
        }
        this.savePPTDraft(this.selectedTemplate);
        modal.remove();
        this.renderPPTEditor();
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  renderPPTUploadTemplatePanel(template) {
    const master = this.currentMasterData || template.masterData;
    if (!master && !template.parsedFromFile) {
      return `
        <div class="wa-panel">
          <div class="wa-panel-title">上传PPT模板</div>
          <div class="wa-master-empty">
            <i class="fa-solid fa-file-import"></i>
            <div>上传PPT文件作为视觉母版</div>
            <div style="font-size:12px;color:var(--kb-text-muted);">系统将自动提取配色、字体和版式</div>
          </div>
          <div class="wa-master-upload" id="wa-ppt-template-upload-zone">
            <input type="file" id="wa-ppt-template-file" accept=".pptx,.ppt,.docx,.doc,.xlsx,.xls,.pdf" style="display:none;">
            <button class="btn btn-sm btn-secondary" id="wa-ppt-template-upload-btn"><i class="fa-solid fa-cloud-arrow-up"></i> 上传PPT模板</button>
          </div>
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
      <div class="wa-panel">
        <div class="wa-panel-title">
          <span>已上传PPT模板</span>
          <span class="wa-panel-subtitle">${fileTypeLabel}</span>
        </div>
        <div class="wa-master-info">
          <i class="fa-solid fa-file-${this.getFileIcon(master?.fileType)}"></i>
          <div>
            <div class="wa-master-file">${master?.fileName || template.name}</div>
            <div class="wa-master-meta">${structureHint} ${themeHint}</div>
          </div>
        </div>
        <div class="wa-master-upload" id="wa-ppt-template-upload-zone" style="margin-top:10px;">
          <input type="file" id="wa-ppt-template-file" accept=".pptx,.ppt,.docx,.doc,.xlsx,.xls,.pdf" style="display:none;">
          <button class="btn btn-sm btn-ghost" id="wa-ppt-template-upload-btn"><i class="fa-solid fa-rotate"></i> 更换模板文件</button>
        </div>
      </div>
    `;
  }

  renderPPTStep3() {
    return `
      <div class="wa-ppt-step-panel" id="wa-ppt-step-3">
        <div class="wa-panel">
          <div class="wa-panel-title">大纲编辑</div>
          <p class="wa-ppt-step-desc">可对每页标题和要点进行修改、增删或拖拽排序。</p>
        </div>
        <div class="wa-ppt-step-actions">
          <button class="btn btn-ghost" id="wa-ppt-step3-prev">← 上一步</button>
          <button class="btn btn-primary" id="wa-ppt-step3-generate">✓ 确认生成完整PPT</button>
        </div>
      </div>
    `;
  }

  renderPPTConfigField(def) {
    const value = this.pptConfig[def.id];
    if (def.type === 'text') {
      return `
        <div class="wa-form-item">
          <label class="wa-form-label">${def.label}</label>
          <input type="text" class="wa-input wa-ppt-config-input" data-field="${def.id}" value="${this.escapeHtml(value)}" placeholder="选填">
        </div>
      `;
    }
    if (def.type === 'select') {
      return `
        <div class="wa-form-item">
          <label class="wa-form-label">${def.label}</label>
          <div class="wa-ppt-option-group" data-field="${def.id}">
            ${def.options.map((opt) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const selected = value === optValue ? 'selected' : '';
              return `<div class="wa-ppt-option-card ${selected}" data-value="${this.escapeHtml(optValue)}">${optLabel}</div>`;
            }).join('')}
          </div>
        </div>
      `;
    }
    if (def.type === 'multi_select') {
      const selectedValues = Array.isArray(value) ? value : [];
      return `
        <div class="wa-form-item">
          <label class="wa-form-label">${def.label}</label>
          <div class="wa-ppt-option-group" data-field="${def.id}" data-multi="true">
            ${def.options.map((opt) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const selected = selectedValues.includes(optValue) ? 'selected' : '';
              return `<div class="wa-ppt-option-card ${selected}" data-value="${this.escapeHtml(optValue)}">${optLabel}</div>`;
            }).join('')}
          </div>
        </div>
      `;
    }
    return '';
  }

  renderPPTPreview() {
    const cfg = this.pptConfig;
    const theme = pptThemes[cfg.theme] || pptThemes.business;
    const color = pptColors[cfg.color] || pptColors.green;
    const formData = this.currentFormData || {};
    const structureTemplate = getStructureTemplateById(this.currentStructureTemplateId);

    const outline = this.getMockPPTOutline();
    const contentTitles = outline
      .filter((p) => p.type === 'content')
      .map((p) => p.title);

    const slides = outline.map((page) => {
      if (page.type === 'toc') {
        return {
          type: page.type,
          title: page.title,
          bullets: contentTitles.slice(0, 5),
        };
      }
      return {
        type: page.type,
        title: page.title,
        subtitle: page.type === 'cover' ? (cfg.company || theme.label) : (page.type === 'end' ? (formData.coreMessage || '让知识创造价值') : undefined),
        bullets: page.bullets,
      };
    });

    const displaySlides = slides.slice(0, 6);
    const templateName = structureTemplate
      ? structureTemplate.name.replace(/\s*\d+\s*页\s*PPT/i, '')
      : theme.label;
    const totalPages = slides.length;
    const selectedSkeleton = this.selectedSkeletonId
      ? pptSkeletonTemplates.find((s) => s.id === this.selectedSkeletonId)
      : null;
    const skeletonInfo = selectedSkeleton ? ` · 骨架：${selectedSkeleton.name}` : ' · 骨架：自由生成';

    return `
      <div class="wa-ppt-preview">
        <div class="wa-ppt-preview-header">
          <div>
            <div class="wa-ppt-preview-title">视觉预览</div>
            <div class="wa-ppt-preview-subtitle">${templateName} · ${cfg.ratio} · 共${totalPages}页${skeletonInfo}</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="wa-ppt-fullscreen-preview">🔍 展开全屏预览</button>
        </div>
        <div class="wa-ppt-preview-grid">
          ${displaySlides.map((slide) => this.renderPPTSlideThumb(slide, theme, color, cfg)).join('')}
        </div>
      </div>
    `;
  }

  renderPPTSlideThumb(slide, theme, color, cfg) {
    const isCoverOrEnd = slide.type === 'cover' || slide.type === 'end';
    const bg = isCoverOrEnd ? theme.coverBg : theme.contentBg;
    const textColor = isCoverOrEnd ? theme.textColor : theme.contentTextColor;
    const ratioClass = `wa-ppt-ratio-${cfg.ratio.replace(':', '-')}`;
    const decorationClass = (cfg.decorations || []).map((d) => `wa-ppt-deco-${d}`).join(' ');

    return `
      <div class="wa-ppt-slide-thumb ${ratioClass} ${decorationClass}" style="font-family:${theme.fontFamily};background:${bg};color:${textColor};--accent:${color.primary};">
        <div class="wa-ppt-slide-thumb-content">
          ${slide.subtitle ? `<div class="wa-ppt-slide-thumb-subtitle">${this.escapeHtml(slide.subtitle)}</div>` : ''}
          <div class="wa-ppt-slide-thumb-title">${this.escapeHtml(slide.title)}</div>
          ${(slide.bullets || []).map((b) => `<div class="wa-ppt-slide-thumb-bullet">• ${this.escapeHtml(b)}</div>`).join('')}
        </div>
        <div class="wa-ppt-slide-label">${this.getSlideTypeLabel(slide.type)}</div>
      </div>
    `;
  }

  getSlideTypeLabel(type) {
    const labels = { cover: '封面', toc: '目录', content: '内容页', end: '结束页' };
    return labels[type] || type;
  }

  renderPPTOutlineEdit() {
    const outline = this.pptOutline || this.getMockPPTOutline();
    return `
      <div class="wa-ppt-preview">
        <div class="wa-ppt-preview-header">
          <div>
            <div class="wa-ppt-preview-title">大纲确认</div>
            <div class="wa-ppt-preview-subtitle">共 ${outline.length} 页 · 可编辑调整</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="wa-ppt-regenerate-outline">🔄 重新生成大纲</button>
        </div>
        <div class="wa-ppt-outline-list" id="wa-ppt-outline-list">
          ${outline.map((page, idx) => this.renderPPTOutlineItem(page, idx)).join('')}
        </div>
      </div>
    `;
  }

  getMockPPTOutline() {
    const formData = this.currentFormData || {};
    const topic = formData.topic || '汇报主题';
    const cfg = this.pptConfig;
    const pageCount = parseInt(cfg.pageCount, 10) || 8;

    const selectedSkeleton = this.selectedSkeletonId
      ? pptSkeletonTemplates.find((s) => s.id === this.selectedSkeletonId)
      : null;

    const bulletsMap = {
      simple: ['要点一', '要点二'],
      standard: ['要点一', '要点二', '要点三'],
      detailed: ['要点一', '要点二', '要点三', '要点四', '要点五'],
    };
    const bullets = bulletsMap[cfg.density || 'standard'] || bulletsMap.standard;

    const outline = [{ type: 'cover', title: topic }];
    if (pageCount >= 6) outline.push({ type: 'toc', title: '目录' });

    const contentPageCount = Math.max(2, pageCount - (pageCount >= 6 ? 3 : 2));
    for (let i = 0; i < contentPageCount; i++) {
      let title = '补充内容';
      if (selectedSkeleton && selectedSkeleton.storyline && selectedSkeleton.storyline[i]) {
        title = selectedSkeleton.storyline[i].title;
      } else if (i === 0) {
        title = '背景与痛点';
      } else if (i === 1) {
        title = '产品核心能力';
      } else if (i === 2) {
        title = '应用场景';
      } else if (i === 3) {
        title = '实施路径';
      } else if (i === 4) {
        title = '客户价值';
      } else {
        title = `补充内容 ${i - 4}`;
      }
      outline.push({ type: 'content', title, bullets: [...bullets] });
    }

    outline.push({ type: 'end', title: '感谢聆听' });
    return outline.slice(0, pageCount);
  }

  renderPPTOutlineItem(page, idx) {
    return `
      <div class="wa-ppt-outline-item" data-index="${idx}" draggable="true">
        <div class="wa-ppt-outline-item-header">
          <input type="text" class="wa-ppt-outline-item-title" value="${this.escapeHtml(page.title)}" data-index="${idx}">
          <span class="wa-ppt-outline-item-page">第 ${idx + 1} 页</span>
          <button class="wa-ppt-outline-item-delete" data-index="${idx}"><i class="fa-solid fa-xmark"></i></button>
        </div>
        ${page.bullets ? `
          <ul class="wa-ppt-outline-item-points">
            ${page.bullets.map((b) => `<li>${this.escapeHtml(b)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }

  renderPPTPageStructure() {
    const outline = this.pptOutline || this.getMockPPTOutline();
    const cfg = this.pptConfig;
    const structureTemplate = getStructureTemplateById(this.currentStructureTemplateId);
    const selectedSkeleton = this.selectedSkeletonId
      ? pptSkeletonTemplates.find((s) => s.id === this.selectedSkeletonId)
      : null;
    const structureLabels = {
      'total-part-total': '总-分-总',
      'problem-solution': '问题-方案',
      timeline: '时间线',
      compare: '对比分析',
      story: '故事线',
    };
    const densityLabels = {
      simple: '简洁',
      standard: '标准',
      detailed: '详细',
    };

    return `
      <div class="wa-panel">
        <div class="wa-panel-title">页面结构</div>
        <div style="font-size:12px;color:var(--kb-text-muted);margin-bottom:12px;">
          ${selectedSkeleton ? `内容骨架：${selectedSkeleton.name}` : ''}
          ${cfg.structure ? `${selectedSkeleton ? ' · ' : ''}逻辑：${structureLabels[cfg.structure] || cfg.structure}` : ''}
          ${cfg.density ? ` · 密度：${densityLabels[cfg.density] || cfg.density}` : ''}
        </div>
        <div class="wa-ppt-outline-list-compact" id="wa-ppt-page-structure">
          ${outline.map((page, idx) => `
            <div class="wa-ppt-outline-compact-item">
              <span class="wa-ppt-outline-compact-num">${idx + 1}</span>
              <span class="wa-ppt-outline-compact-title">${this.escapeHtml(page.title)}</span>
              <span class="wa-ppt-outline-compact-type">${this.getSlideTypeLabel(page.type)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderPPTNotesAndImages() {
    const outline = this.pptOutline || this.getMockPPTOutline();
    const cfg = this.pptConfig;
    const notesLevel = cfg.notes || 'none';
    const imageLevel = cfg.imageSuggestion || 'none';

    const notesHtml =
      notesLevel === 'none'
        ? '<p>已关闭演讲备注，可在第二步“输出形式”中开启。</p>'
        : outline
            .map(
              (page) => `
          <p>
            <strong>${this.getSlideTypeLabel(page.type)}${page.type === 'content' ? ` · ${this.escapeHtml(page.title)}` : ''}：</strong>
            ${this.generatePPTNote(page, notesLevel)}
          </p>
        `
            )
            .join('');

    const suggestions = imageLevel === 'none' ? [] : this.generatePPTImageSuggestions(outline, imageLevel);
    const imagesHtml =
      suggestions.length > 0
        ? suggestions.map((s) => `<div class="wa-ppt-image-suggestion">${this.escapeHtml(s)}</div>`).join('')
        : '<div class="wa-ppt-image-suggestion">已关闭配图建议，可在第二步“输出形式”中开启。</div>';

    return `
      <div class="wa-panel">
        <div class="wa-panel-title">演讲备注</div>
        <div class="wa-ppt-notes">${notesHtml}</div>
      </div>
      <div class="wa-panel">
        <div class="wa-panel-title">配图建议</div>
        <div class="wa-ppt-image-suggestions">${imagesHtml}</div>
      </div>
    `;
  }

  generatePPTNote(page, level) {
    const detailed = level === 'detailed';
    switch (page.type) {
      case 'cover':
        return detailed
          ? '开场问候后，用一句话点明汇报主题与目标听众，建立预期，控制在30秒内。'
          : '开场介绍主题与汇报人，控制30秒。';
      case 'toc':
        return detailed
          ? '快速概述本次汇报的章节安排，让观众对时间分配和重点有整体感知。'
          : '简要说明内容结构与节奏。';
      case 'end':
        return detailed
          ? '总结核心结论，重申价值，并给出明确的下一步行动或致谢。'
          : '总结要点并收尾。';
      default:
        return detailed
          ? `围绕“${page.title}”先抛出核心观点，再用2-3个论据或数据支撑，最后回扣主题。`
          : `简要阐述“${page.title}”的关键论点。`;
    }
  }

  generatePPTImageSuggestions(outline, level) {
    const suggestions = [];
    outline.forEach((page, idx) => {
      if (page.type === 'cover') {
        suggestions.push(`封面：使用符合“${this.pptConfig.theme || 'business'}”主题的品牌主视觉`);
        return;
      }
      if (page.type === 'end') {
        suggestions.push('结束页：使用寓意总结/展望的场景图');
        return;
      }
      if (page.type === 'toc') {
        suggestions.push('目录页：使用简洁的结构示意图或图标');
        return;
      }
      if (level === 'each') {
        suggestions.push(`第 ${idx + 1} 页（${page.title}）：${this.getImageThemeForTitle(page.title)}`);
      } else if (level === 'key') {
        if (idx === 1 || (page.title && /核心|价值|优势|方案|产品/.test(page.title))) {
          suggestions.push(`第 ${idx + 1} 页（${page.title}）：${this.getImageThemeForTitle(page.title)}`);
        }
      }
    });
    if (suggestions.length === 0) suggestions.push('当前配置下暂无关键页配图建议');
    return suggestions;
  }

  getImageThemeForTitle(title) {
    if (/背景|痛点|问题|挑战/.test(title)) return '信息孤岛或问题场景示意图';
    if (/产品|能力|功能|方案/.test(title)) return '产品界面或架构示意图';
    if (/场景|应用|案例/.test(title)) return '客户使用场景实拍或插画';
    if (/价值|收益|效果|ROI/.test(title)) return '增长曲线或数据可视化配图';
    if (/实施|路径|计划|里程碑/.test(title)) return '时间轴或路线图配图';
    return '与主题相关的高质量场景图';
  }

  getFormValue(fieldId) {
    const input = this.container.querySelector(`#field-${fieldId}`);
    return input ? input.value : '';
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
          <div class="wa-panel-title">PPT模版上传</div>
          <div class="wa-master-empty">
            <i class="fa-solid fa-file-import"></i>
            <div>当前模板未关联文件母版</div>
            <div style="font-size:12px;color:var(--kb-text-muted);">上传文件后可基于原文件母版生成内容</div>
          </div>
          <div class="wa-master-upload" id="wa-master-upload-zone">
            <input type="file" id="wa-master-file" accept=".pptx,.ppt,.docx,.doc,.xlsx,.xls,.pdf" style="display:none;">
            <button class="btn btn-sm btn-secondary" id="wa-master-upload-btn"><i class="fa-solid fa-cloud-arrow-up"></i> 上传PPT模版</button>
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

  renderContentTemplateSelector(template) {
    const allTemplates = getAllContentTemplates();
    const selectedId = this.selectedContentTemplateId;
    const selectedTemplate = selectedId ? getContentTemplateById(selectedId) : null;

    const compatibleTemplates = allTemplates.filter((t) => {
      if (!t.format) return true;
      const templateFormat = template.outputType;
      if (templateFormat === outputTypes.MARKDOWN || templateFormat === outputTypes.TEXT || templateFormat === outputTypes.REPORT) {
        return t.format === 'word' || t.format === 'list' || t.format === 'steps';
      }
      if (templateFormat === outputTypes.TABLE) return t.format === 'table';
      if (templateFormat === outputTypes.EMAIL) return t.format === 'email';
      if (templateFormat === outputTypes.LIST) return t.format === 'list';
      if (templateFormat === outputTypes.STEPS) return t.format === 'steps';
      return true;
    });

    return `
      <div class="wa-panel" id="wa-content-template-panel" style="border-color: var(--kb-primary-light);background: linear-gradient(135deg, var(--kb-primary-muted) 0%, #fff 100%);">
        <div class="wa-panel-title">
          <span style="display:flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-file-contract" style="color: var(--kb-primary-dark);"></i>
            内容模板
          </span>
          <button class="wa-ct-manage-btn" id="wa-ct-manage" title="管理内容模板">
            <i class="fa-solid fa-gear"></i> 管理
          </button>
        </div>
        <div class="wa-ct-tip">选择模板可控制输出结构和风格，让内容更符合你的需求</div>
        <div class="wa-content-template-select">
          ${selectedTemplate ? `
            <div class="wa-ct-selected">
              <div class="wa-ct-icon" style="background:var(--kb-primary-subtle);color:var(--kb-primary);">
                <i class="fa-solid ${template.outputType === outputTypes.TABLE ? 'fa-table-cells' : template.outputType === outputTypes.EMAIL ? 'fa-envelope' : template.outputType === outputTypes.STEPS ? 'fa-list-ol' : template.outputType === outputTypes.LIST ? 'fa-list-check' : 'fa-file-lines'}"></i>
              </div>
              <div class="wa-ct-info">
                <div class="wa-ct-name">${selectedTemplate.name}</div>
                <div class="wa-ct-desc">${selectedTemplate.description || '自定义内容结构'}</div>
              </div>
              <button class="wa-ct-change" id="wa-ct-change"><i class="fa-solid fa-rotate-right"></i> 更换</button>
            </div>
          ` : `
            <div class="wa-ct-placeholder" id="wa-ct-select-btn">
              <div class="wa-ct-placeholder-icon"><i class="fa-regular fa-file-lines"></i></div>
              <div class="wa-ct-placeholder-text">
                <div class="wa-ct-placeholder-title">选择内容模板</div>
                <div class="wa-ct-placeholder-desc">点击选择模板来控制输出结构和格式</div>
              </div>
              <i class="fa-solid fa-chevron-right wa-ct-arrow"></i>
            </div>
          `}
          ${this.contentTemplateDropdownOpen ? `
            <div class="wa-ct-dropdown">
              <div class="wa-ct-dropdown-header">
                <span>选择内容模板</span>
                <button class="wa-ct-close" id="wa-ct-close"><i class="fa-solid fa-xmark"></i></button>
              </div>
              <div class="wa-ct-dropdown-list">
                <div class="wa-ct-option ${!selectedId ? 'active' : ''}" data-ct-id="">
                  <div class="wa-ct-option-icon"><i class="fa-solid fa-infinity"></i></div>
                  <div>
                    <div class="wa-ct-option-name">自由生成（无固定结构）</div>
                    <div class="wa-ct-option-desc">AI 自由发挥，不限制内容结构</div>
                  </div>
                </div>
                ${compatibleTemplates.map((t) => `
                  <div class="wa-ct-option ${selectedId === t.id ? 'active' : ''}" data-ct-id="${t.id}">
                    <div class="wa-ct-option-icon" style="background:${t.format === 'word' ? '#EFF6FF;color:#1D4ED8' : t.format === 'table' ? '#ECFDF5;color:#047857' : t.format === 'email' ? '#EFF6FF;color:#1D4ED8' : t.format === 'steps' ? '#F5F3FF;color:#6D28D9' : '#F3F4F6;color:#374151'}">
                      <i class="fa-solid ${t.format === 'word' ? 'fa-file-lines' : t.format === 'table' ? 'fa-table-cells' : t.format === 'email' ? 'fa-envelope' : t.format === 'steps' ? 'fa-list-ol' : 'fa-list-check'}"></i>
                    </div>
                    <div>
                      <div class="wa-ct-option-name">${t.name}</div>
                      <div class="wa-ct-option-desc">${t.description || ''}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
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
    const kbBtn = `<button class="btn btn-sm btn-ghost" id="wa-result-to-kb" title="将此内容添加到知识库"><i class="fa-solid fa-book-bookmark"></i> 添加到知识库</button>`;
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
            ${kbBtn}
          ` : isTable ? `
            <button class="btn btn-sm btn-ghost" id="wa-result-copy"><i class="fa-solid fa-copy"></i> 复制</button>
            <button class="btn btn-sm btn-ghost" id="wa-export-xlsx"><i class="fa-solid fa-file-excel"></i> 导出XLSX</button>
            ${kbBtn}
          ` : isDocument ? `
            <button class="btn btn-sm btn-ghost" id="wa-result-copy"><i class="fa-solid fa-copy"></i> 复制</button>
            <button class="btn btn-sm btn-ghost" id="wa-export-docx"><i class="fa-solid fa-file-word"></i> 导出DOCX</button>
            ${kbBtn}
          ` : `
            <button class="btn btn-sm btn-ghost" id="wa-result-copy"><i class="fa-solid fa-copy"></i> 复制</button>
            ${kbBtn}
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

  getSelectedMode() {
    return this.getCurrentMode();
  }

  // ===================== 事件绑定 =====================

  bindHomeEvents() {
    // 输入框发送
    const chatInput = this.container.querySelector('#wa-chat-input');
    const chatSend = this.container.querySelector('#wa-chat-send');
    const handleSend = () => {
      const value = chatInput?.value?.trim();
      if (!value || this.chatStreaming) return;
      chatInput.value = '';
      if (chatInput.tagName === 'TEXTAREA') chatInput.style.height = 'auto';
      this.handleNaturalLanguageCreate(value);
    };
    chatSend?.addEventListener('click', handleSend);
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // 内容类型选择：局部更新（不刷新页面），点击已激活类型 → 回到聊天模式
    this.container.querySelectorAll('.wa-chat-type-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (this.chatStreaming) return;
        const type = chip.dataset.type;
        if (!type) return;
        this.selectChatType(type);
      });
    });

    // 按类型配置项：局部切换激活态
    this._bindConfigChips();

    // textarea 自动增高
    if (chatInput && chatInput.tagName === 'TEXTAREA') {
      chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
      });
    }

    // 辅助模式入口：场景模板 / 内容模板（点击头部跳转，快速入口区单独处理）
    this.container.querySelectorAll('.wa-chat-alt-mode-head').forEach((head) => {
      head.addEventListener('click', () => {
        const type = head.dataset.mode;
        if (type === 'scene') {
          this.activeTab = 'templateMarket';
          this.render();
        } else if (type === 'content') {
          if (this.onNavigate) this.onNavigate('contentTemplates');
        }
      });
    });

    // 加号按钮 → 展开知识库 / 附件菜单（局部切换）
    this.container.querySelector('#wa-chat-plus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlusMenu(!this.homePlusOpen);
    });
    // 加号菜单项：关联知识库 → 打开知识库选择器
    this.container.querySelector('#wa-chat-plus-kb')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlusMenu(false);
      this.toggleKBPicker(true);
    });
    // 加号菜单项：上传附件（占位提示）
    this.container.querySelector('#wa-chat-plus-attach')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlusMenu(false);
      this.showToast('附件上传功能开发中', 'info');
    });

    // 模型选择按钮 → 展开/收起下拉（局部切换）
    this.container.querySelector('#wa-chat-model')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleModelMenu(!this.homeModelOpen);
    });
    // 模型项点击 → 切换模型（局部更新）
    this.container.querySelectorAll('.wa-chat-model-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectModel(item.dataset.model);
      });
    });

    // 知识库选择器关闭（局部切换）
    this.container.querySelector('#wa-chat-kb-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleKBPicker(false);
    });
    this.container.querySelectorAll('#wa-chat-kb-picker input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const kbId = cb.dataset.kbId;
        const kb = (knowledgeBases || []).find((k) => k.id === kbId);
        if (!kb) return;
        if (!this.homeSelectedKBs) this.homeSelectedKBs = [];
        if (cb.checked) {
          if (!this.homeSelectedKBs.some((s) => s.id === kbId)) {
            this.homeSelectedKBs.push(kb);
          }
        } else {
          this.homeSelectedKBs = this.homeSelectedKBs.filter((s) => s.id !== kbId);
        }
        cb.closest('.wa-chat-kb-item')?.classList.toggle('checked', cb.checked);
        this.syncPlusButton();
      });
    });

    // 点击页面空白处收起加号菜单 / 模型下拉 / 知识库选择器（局部切换，不刷新）
    if (this._homePopoverDocHandler) {
      document.removeEventListener('click', this._homePopoverDocHandler);
    }
    this._homePopoverDocHandler = (e) => {
      const t = e.target;
      const inPlus = t.closest && t.closest('.wa-chat-plus-wrap');
      const inModel = t.closest && t.closest('.wa-chat-model-wrap');
      const inKB = t.closest && t.closest('#wa-chat-kb-picker');
      let changed = false;
      if (!inPlus && this.homePlusOpen) { this.togglePlusMenu(false); changed = true; }
      if (!inModel && this.homeModelOpen) { this.toggleModelMenu(false); changed = true; }
      if (!inKB && this.homeKBPickerOpen) { this.toggleKBPicker(false); changed = true; }
      // 阻止后续无意义处理
      if (changed) return;
    };
    document.addEventListener('click', this._homePopoverDocHandler);

    // 选择模板按钮（消息状态下）→ 新对话回到首页
    this.container.querySelector('#wa-chat-pick-template')?.addEventListener('click', () => {
      this.startNewChat();
    });

    // 最近创作项点击 → 跳转到我的文档
    this.container.querySelectorAll('.wa-recent-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.onNavigate) this.onNavigate('myDocuments');
      });
    });
    this.container.querySelector('#wa-chat-recents-more')?.addEventListener('click', () => {
      if (this.onNavigate) this.onNavigate('myDocuments');
    });

    // 快速入口卡片点击 → 直接进入对应编辑器
    this.bindQuickEntryEvents();

    // 「管理」按钮 → 打开配置弹窗（包含在 bindQuickEntryEvents 内）
    // 主题切换（统一使用 theme.js）
    const themeToggle = this.container.querySelector('#wa-chat-theme-toggle');
    themeToggle?.addEventListener('click', () => {
      toggleTheme();
    });
    // 监听主题变化，更新图标
    if (!this._themeChangeListener) {
      this._themeChangeListener = onThemeChange(() => {
        const icon = this.container.querySelector('#wa-chat-theme-toggle i');
        if (icon) icon.className = `fa-solid fa-${getThemeIcon()}`;
      });
    }

    // 我的文档
    this.container.querySelector('#wa-chat-docs')?.addEventListener('click', () => {
      if (this.onNavigate) this.onNavigate('myDocuments');
    });

    // 结果卡片操作（事件委托）
    this.container.querySelectorAll('.wa-chat-result-btn[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const msgId = btn.dataset.msgId;
        if (action && msgId) this.handleChatResultAction(action, msgId);
      });
    });
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

  bindPPTEditorEvents(template) {
    // 返回
    document.getElementById('wa-editor-back')?.addEventListener('click', () => {
      this.handleEditorBack();
    });

    // 切换能力
    document.getElementById('wa-switch-ability')?.addEventListener('click', () => {
      this.openAbilityModal(template.abilityId);
    });

    // 模式选择
    this.container.querySelectorAll('.wa-mode-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.container.querySelectorAll('.wa-mode-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        this.updateKBPanel();
        this.updateAttachmentPanel();
      });
    });

    // 第二步视觉生成方式切换
    this.container.querySelectorAll('.wa-ppt-visual-mode-item').forEach((item) => {
      item.addEventListener('click', () => {
        const mode = item.dataset.mode;
        if (mode === this.pptVisualMode) return;
        this.pptVisualMode = mode;
        if (mode !== 'template') {
          this.currentStructureTemplateId = null;
        }
        this.savePPTDraft(template);
        this.renderPPTEditor();
      });
    });

    // 第二步模板预览按钮
    this.container.querySelectorAll('.wa-ppt-preview-eye').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.preview;
        if (id) this.openTemplatePreview(id);
      });
    });

    // 第二步模板选择
    this.container.querySelectorAll('.wa-ppt-template-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.currentStructureTemplateId = id;
        const structureTemplate = getStructureTemplateById(id);
        if (structureTemplate && structureTemplate.style) {
          const style = structureTemplate.style;
          if (style.theme) this.pptConfig.theme = style.theme;
          if (style.color) this.pptConfig.color = style.color;
          if (style.ratio) this.pptConfig.ratio = style.ratio;
          if (style.font) this.pptConfig.font = style.font;
          if (style.background) this.pptConfig.background = style.background;
        }
        this.savePPTDraft(template);
        this.renderPPTEditor();
      });
    });

    // 第二步更多模板弹窗
    document.getElementById('wa-ppt-template-more')?.addEventListener('click', () => {
      this.openPPTTemplateModal();
    });

    // 第二步上传模板
    this.bindPPTTemplateUploadEvents();

    // 步骤条点击
    this.container.querySelectorAll('.wa-ppt-step').forEach((step) => {
      step.addEventListener('click', () => {
        const targetStep = parseInt(step.dataset.step, 10);
        if (targetStep <= this.pptStep) {
          this.pptStep = targetStep;
          this.renderPPTEditor();
        }
      });
    });

    // 步骤 1：下一步
    document.getElementById('wa-ppt-step1-next')?.addEventListener('click', () => {
      const formData = this.collectFormData(template);
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
      this.currentFormData = formData;
      saveDraft(template.id, { formData, mode: this.getSelectedMode(), pptConfig: this.pptConfig, structureTemplateId: this.currentStructureTemplateId, pptVisualMode: this.pptVisualMode });
      this.pptStep = 2;
      this.renderPPTEditor();
    });

    // 步骤 2：上一步/下一步
    document.getElementById('wa-ppt-step2-prev')?.addEventListener('click', () => {
      const formData = { ...this.currentFormData, ...this.collectFormData(template) };
      this.currentFormData = formData;
      saveDraft(template.id, { formData, mode: this.getSelectedMode(), pptConfig: this.pptConfig, structureTemplateId: this.currentStructureTemplateId, pptVisualMode: this.pptVisualMode });
      this.pptStep = 1;
      this.renderPPTEditor();
    });
    document.getElementById('wa-ppt-step2-next')?.addEventListener('click', () => {
      const formData = { ...this.currentFormData, ...this.collectFormData(template) };
      this.currentFormData = formData;
      saveDraft(template.id, { formData, mode: this.getSelectedMode(), pptConfig: this.pptConfig, structureTemplateId: this.currentStructureTemplateId, pptVisualMode: this.pptVisualMode, skeletonId: this.selectedSkeletonId });
      this.pptStep = 3;
      this.pptOutline = null; // 重新生成大纲
      this.renderPPTEditor();
      this.startPPTOutlineGeneration(template);
    });

    // 内容骨架选择器
    document.getElementById('wa-ppt-skeleton-current')?.addEventListener('click', () => {
      this.pptSkeletonDropdownOpen = !this.pptSkeletonDropdownOpen;
      this.renderPPTEditor();
    });
    document.getElementById('wa-ppt-skeleton-change')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.pptSkeletonDropdownOpen = !this.pptSkeletonDropdownOpen;
      this.renderPPTEditor();
    });
    document.getElementById('wa-ppt-skeleton-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.pptSkeletonDropdownOpen = false;
      this.renderPPTEditor();
    });
    this.container.querySelectorAll('.wa-ppt-skeleton-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const skeletonId = opt.dataset.skeletonId;
        this.selectedSkeletonId = skeletonId || null;
        this.pptSkeletonDropdownOpen = false;
        this.renderPPTEditor();
        this.savePPTDraft(template);
      });
    });

    // 步骤 3：上一步/确认生成
    document.getElementById('wa-ppt-step3-prev')?.addEventListener('click', () => {
      saveDraft(template.id, { formData: this.currentFormData, mode: this.getSelectedMode(), pptConfig: this.pptConfig, structureTemplateId: this.currentStructureTemplateId, pptVisualMode: this.pptVisualMode });
      this.pptStep = 2;
      this.renderPPTEditor();
    });
    document.getElementById('wa-ppt-step3-generate')?.addEventListener('click', () => {
      this.startPPTContentGeneration(template);
    });

    // 顶部主按钮
    document.getElementById('wa-start-generate')?.addEventListener('click', () => {
      if (this.pptStep === 1) {
        document.getElementById('wa-ppt-step1-next')?.click();
      } else if (this.pptStep === 2) {
        document.getElementById('wa-ppt-step2-next')?.click();
      } else {
        this.startPPTContentGeneration(template);
      }
    });

    // 体验示例
    document.getElementById('wa-load-example')?.addEventListener('click', () => {
      this.loadExample(template);
    });

    // 生成设置折叠
    this.bindPPTSettingsToggle();

    // 第二步配置分组折叠（手风琴效果，DOM 直接操作避免滚动跳动）
    this.container.querySelectorAll('.wa-ppt-config-group-header').forEach((header) => {
      header.addEventListener('click', () => {
        const groupEl = header.closest('.wa-ppt-config-group');
        const group = groupEl?.dataset.group;
        if (!group) return;

        const body = groupEl.querySelector('.wa-ppt-config-group-body');
        const arrow = groupEl.querySelector('.wa-ppt-config-group-arrow');
        const willExpand = !this.pptExpandedGroups.includes(group);

        // 收起其他分组（手风琴）
        this.container.querySelectorAll('.wa-ppt-config-group').forEach((el) => {
          if (el !== groupEl && el.classList.contains('expanded')) {
            el.classList.remove('expanded');
            const otherBody = el.querySelector('.wa-ppt-config-group-body');
            const otherArrow = el.querySelector('.wa-ppt-config-group-arrow');
            if (otherBody) otherBody.style.display = 'none';
            if (otherArrow) {
              otherArrow.classList.remove('fa-chevron-up');
              otherArrow.classList.add('fa-chevron-down');
            }
          }
        });

        if (willExpand) {
          this.pptExpandedGroups = [group];
          groupEl.classList.add('expanded');
          if (body) body.style.display = 'block';
          if (arrow) {
            arrow.classList.remove('fa-chevron-down');
            arrow.classList.add('fa-chevron-up');
          }
        } else {
          this.pptExpandedGroups = [];
          groupEl.classList.remove('expanded');
          if (body) body.style.display = 'none';
          if (arrow) {
            arrow.classList.remove('fa-chevron-up');
            arrow.classList.add('fa-chevron-down');
          }
        }

        this.savePPTDraft(template);
      });
    });

    // 结构模板切换
    document.getElementById('wa-ppt-structure-template')?.addEventListener('change', (e) => {
      const structureTemplateId = e.target.value;
      this.currentStructureTemplateId = structureTemplateId;
      const structureTemplate = structureTemplateId ? getStructureTemplateById(structureTemplateId) : null;
      const hint = document.getElementById('wa-ppt-structure-template-hint');
      if (hint) {
        hint.textContent = structureTemplate ? structureTemplate.description : '选择后，PPT 的页面结构和视觉风格将按模板固定。';
      }
      if (structureTemplate && structureTemplate.style) {
        const style = structureTemplate.style;
        if (style.theme) this.pptConfig.theme = style.theme;
        if (style.color) this.pptConfig.color = style.color;
        if (style.ratio) this.pptConfig.ratio = style.ratio;
        if (style.font) this.pptConfig.font = style.font;
        if (style.background) this.pptConfig.background = style.background;
      }
      this.refreshPPTPreview();
    });

    // 配置项输入事件
    this.container.querySelectorAll('.wa-ppt-config-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        this.pptConfig[field] = e.target.value;
        this.refreshPPTPreview();
      });
    });

    // 配置项选项卡事件
    this.container.querySelectorAll('.wa-ppt-option-group').forEach((group) => {
      const isMulti = group.dataset.multi === 'true';
      const field = group.dataset.field;
      group.querySelectorAll('.wa-ppt-option-card').forEach((card) => {
        card.addEventListener('click', () => {
          const value = card.dataset.value;
          if (isMulti) {
            const current = Array.isArray(this.pptConfig[field]) ? this.pptConfig[field] : [];
            if (current.includes(value)) {
              this.pptConfig[field] = current.filter((v) => v !== value);
              card.classList.remove('selected');
            } else {
              this.pptConfig[field] = [...current, value];
              card.classList.add('selected');
            }
          } else {
            this.pptConfig[field] = value;
            group.querySelectorAll('.wa-ppt-option-card').forEach((c) => c.classList.remove('selected'));
            card.classList.add('selected');
          }
          this.refreshPPTPreview();
        });
      });
    });

    // 重新生成大纲
    document.getElementById('wa-ppt-regenerate-outline')?.addEventListener('click', () => {
      this.pptOutline = null;
      this.startPPTOutlineGeneration(template);
    });

    // 知识库、附件、母版事件复用现有逻辑
    this.bindKBSelectorEvents();
    this.bindAttachmentEvents();
    this.bindMasterUploadEvents(template);

    // 大纲编辑事件（仅在第三步有内容后绑定）
    this.bindPPTOutlineEvents();
  }

  refreshPPTPreview() {
    if (this.pptStep !== 2) return;
    const main = document.getElementById('wa-ppt-main');
    if (main) main.innerHTML = this.renderPPTMainContent();
    const right = document.getElementById('wa-ppt-right');
    if (right) right.innerHTML = this.renderPPTRightContent();
    this.bindPPTSettingsToggle();
  }

  bindPPTSettingsToggle() {
    const toggle = document.getElementById('wa-ppt-settings-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      const body = document.getElementById('wa-ppt-settings-body');
      const icon = document.querySelector('#wa-ppt-settings-toggle .wa-ppt-settings-arrow');
      if (!body || !icon) return;
      if (body.style.display === 'none') {
        body.style.display = 'block';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
      } else {
        body.style.display = 'none';
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
      }
    });
  }

  bindPPTOutlineEvents() {
    if (this.pptStep !== 3) return;
    const list = document.getElementById('wa-ppt-outline-list');
    if (!list) return;

    // 标题编辑（实时更新模型与右侧辅助面板）
    list.querySelectorAll('.wa-ppt-outline-item-title').forEach((input) => {
      const selectAll = () => {
        input.setSelectionRange(0, input.value.length);
      };
      input.addEventListener('focus', selectAll);
      input.addEventListener('click', selectAll);
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (this.pptOutline && this.pptOutline[idx]) {
          this.pptOutline[idx].title = e.target.value;
          const right = document.getElementById('wa-ppt-right');
          if (right) right.innerHTML = this.renderPPTRightContent();
          this.bindPPTSettingsToggle();
        }
      });
    });

    // 删除页面
    list.querySelectorAll('.wa-ppt-outline-item-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        if (!this.pptOutline) return;
        this.pptOutline.splice(idx, 1);
        const main = document.getElementById('wa-ppt-main');
        const right = document.getElementById('wa-ppt-right');
        if (main) main.innerHTML = this.renderPPTMainContent();
        if (right) right.innerHTML = this.renderPPTRightContent();
        this.bindPPTSettingsToggle();
        this.bindPPTOutlineEvents();
      });
    });

    // 拖拽排序
    list.querySelectorAll('.wa-ppt-outline-item').forEach((item) => {
      item.addEventListener('dragstart', () => {
        this.dragSrcIndex = parseInt(item.dataset.index, 10);
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        this.dragSrcIndex = null;
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const dstIndex = parseInt(item.dataset.index, 10);
        if (this.pptOutline && this.dragSrcIndex !== null && this.dragSrcIndex !== dstIndex) {
          const [moved] = this.pptOutline.splice(this.dragSrcIndex, 1);
          this.pptOutline.splice(dstIndex, 0, moved);
          const main = document.getElementById('wa-ppt-main');
          const right = document.getElementById('wa-ppt-right');
          if (main) main.innerHTML = this.renderPPTMainContent();
          if (right) right.innerHTML = this.renderPPTRightContent();
          this.bindPPTSettingsToggle();
          this.bindPPTOutlineEvents();
        }
      });
    });
  }

  startPPTOutlineGeneration(template) {
    const main = document.getElementById('wa-ppt-main');
    if (main) {
      main.innerHTML = `
        <div class="wa-ppt-generating">
          <div class="wa-ppt-generating-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
          <div class="wa-ppt-generating-title">正在生成大纲</div>
          <div class="wa-ppt-generating-desc">根据主题、配置和附件信息生成 PPT 大纲...</div>
        </div>
      `;
    }

    // 模拟异步生成
    setTimeout(() => {
      this.pptOutline = this.generatePPTOutline(template);
      if (this.pptStep === 3) {
        const main2 = document.getElementById('wa-ppt-main');
        if (main2) main2.innerHTML = this.renderPPTMainContent();
        const right2 = document.getElementById('wa-ppt-right');
        if (right2) right2.innerHTML = this.renderPPTRightContent();
        this.bindPPTSettingsToggle();
        this.bindPPTOutlineEvents();
      }
    }, 800);
  }

  generatePPTOutline(template) {
    const formData = this.currentFormData || this.collectFormData(template);
    const topic = formData.topic || '汇报主题';
    const keyPoints = (formData.keyPoints || '').split(/[,，、]/).filter(Boolean);
    const cfg = this.pptConfig;
    const pageCount = parseInt(cfg.pageCount, 10) || 8;
    const density = cfg.density || 'standard';
    const structure = cfg.structure || 'total-part-total';

    const bulletsMap = {
      simple: 2,
      standard: 3,
      detailed: 5,
    };
    const bulletsPerPage = bulletsMap[density] || 3;

    const attachmentPoints = this.extractAttachmentOutlinePoints();
    const defaultPoints = attachmentPoints.length > 0
      ? attachmentPoints
      : ['背景与痛点', '产品核心能力', '应用场景', '实施路径', '客户价值'];
    const contentPoints = keyPoints.length > 0 ? keyPoints : defaultPoints;

    const structureMap = {
      'total-part-total': ['项目背景', '核心能力', '应用场景', '实施路径', '价值总结'],
      'problem-solution': ['现状问题', '痛点分析', '解决方案', '实施路径', '预期效果'],
      'timeline': ['发展历程', '当前阶段', '核心成果', '未来规划', '战略展望'],
      'compare': ['方案对比', '优势分析', '劣势分析', '适用场景', '结论建议'],
      'story': ['故事背景', '挑战与冲突', '关键转折', '解决方案', '成果与启示'],
    };

    let structureTitles;
    const selectedSkeleton = this.selectedSkeletonId
      ? pptSkeletonTemplates.find((s) => s.id === this.selectedSkeletonId)
      : null;

    if (selectedSkeleton && selectedSkeleton.storyline) {
      structureTitles = selectedSkeleton.storyline.map((s) => s.title);
    } else {
      structureTitles = structureMap[structure] || structureMap['total-part-total'];
    }

    const makeBullets = (count, guide) => {
      const arr = [];
      for (let i = 0; i < count; i++) {
        arr.push(`要点${i + 1}`);
      }
      return arr;
    };

    const outline = [{ type: 'cover', title: topic }];
    if (pageCount >= 6) outline.push({ type: 'toc', title: '目录' });

    const contentPageCount = Math.max(2, pageCount - (pageCount >= 6 ? 3 : 2));

    for (let i = 0; i < contentPageCount; i++) {
      let title;
      let guide;
      if (i < structureTitles.length) {
        title = structureTitles[i];
        if (selectedSkeleton && selectedSkeleton.storyline[i]) {
          guide = selectedSkeleton.storyline[i].guide;
        }
      } else if (i - structureTitles.length < contentPoints.length) {
        title = contentPoints[i - structureTitles.length];
      } else {
        title = `补充内容 ${i - structureTitles.length + 1}`;
      }
      outline.push({ type: 'content', title, bullets: makeBullets(bulletsPerPage, guide), guide });
    }

    while (outline.length < pageCount - 1) {
      outline.push({ type: 'content', title: `补充内容 ${outline.length}`, bullets: makeBullets(bulletsPerPage) });
    }

    outline.push({ type: 'end', title: '感谢聆听' });
    return outline.slice(0, pageCount);
  }

  extractAttachmentOutlinePoints() {
    if (this.getCurrentMode() !== 'free') return [];
    const attachments = this.currentAttachments?.length ? this.currentAttachments : this.freeAttachments;
    if (!attachments || !attachments.length) return [];

    const points = [];
    attachments.forEach((file) => {
      if (file.headings && file.headings.length) {
        file.headings.slice(0, 5).forEach((h) => {
          const text = typeof h === 'string' ? h : h.text;
          if (text && text.length <= 20 && !points.includes(text)) points.push(text);
        });
      } else if (file.slides && file.slides.length) {
        file.slides.slice(1, 6).forEach((s) => {
          const text = s.title;
          if (text && text.length <= 20 && !points.includes(text)) points.push(text);
        });
      } else if (file.sheets && file.sheets.length && file.sheets[0].headers) {
        const header = file.sheets[0].headers[0];
        if (header && !points.includes(header)) points.push(header);
      }
    });
    return points.slice(0, 6);
  }

  startPPTContentGeneration(template) {
    this.currentFormData = this.currentFormData || this.collectFormData(template);
    this.currentMode = this.getSelectedMode();
    this.currentKBs = this.getSelectedKBs();
    this.currentAttachments = this.currentMode === 'free' ? [...this.freeAttachments] : [];

    const main = document.getElementById('wa-ppt-main');
    if (main) {
      main.innerHTML = `
        <div class="wa-ppt-generating">
          <div class="wa-ppt-generating-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
          <div class="wa-ppt-generating-title">正在生成完整 PPT</div>
          <div class="wa-ppt-generating-desc">请稍候，正在根据大纲生成每页内容...</div>
        </div>
      `;
    }

    setTimeout(() => {
      const result = mockGenerateContent(
        template,
        this.currentFormData,
        this.currentMode,
        this.currentKBs,
        {
          useMaster: this.useMaster,
          stage: 'content',
          attachments: this.currentAttachments,
          pptConfig: this.pptConfig,
          pptOutline: this.pptOutline,
        }
      );
      this.currentResult = result;
      this.showPPTResult(result, template);
    }, 1200);
  }

  showPPTResult(result, template) {
    this.pptStage = 'content';
    this.pptStep = 'result';
    const main = document.getElementById('wa-ppt-main');
    const right = document.getElementById('wa-ppt-right');
    const left = document.getElementById('wa-ppt-left');
    if (left) left.innerHTML = this.renderPPTResultLeftPanel(result);
    if (main) main.innerHTML = this.renderPPTOutput(result);
    if (right) right.innerHTML = this.renderPPTSidePanel(result);
    this.bindResultEvents(result, template);
    this.bindPPTEvents(result, template);
    this.bindPPTResultPanelEvents(result, template);
  }

  refreshPPTResultView(result, template) {
    const main = document.getElementById('wa-ppt-main');
    const right = document.getElementById('wa-ppt-right');
    if (main) main.innerHTML = this.renderPPTOutput(result);
    if (right) right.innerHTML = this.renderPPTSidePanel(result);
    this.bindResultEvents(result, template);
    this.bindPPTEvents(result, template);
  }

  renderPPTResultLeftPanel(result) {
    return `
      <div class="wa-panel">
        <div class="wa-panel-title">生成完成</div>
        <div style="font-size:13px;color:var(--kb-text-muted);margin-bottom:12px;">
          已生成 ${result.pages.length} 页 PPT，可直接编辑中间内容或重新生成。
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button class="btn btn-primary" id="wa-ppt-regenerate-result"><i class="fa-solid fa-rotate-right"></i> 重新生成</button>
          <button class="btn btn-ghost" id="wa-ppt-back-to-outline">← 返回修改大纲</button>
        </div>
      </div>
    `;
  }

  bindPPTResultPanelEvents(result, template) {
    document.getElementById('wa-ppt-regenerate-result')?.addEventListener('click', () => {
      this.pptStep = 3;
      this.startPPTContentGeneration(template);
    });
    document.getElementById('wa-ppt-back-to-outline')?.addEventListener('click', () => {
      this.pptStep = 3;
      this.renderPPTEditor();
      this.bindPPTOutlineEvents();
    });
  }

  collectFormData(template) {
    const formData = {};
    template.fields.forEach((field) => {
      const input = this.container.querySelector(`#field-${field.id}`);
      if (input) {
        formData[field.id] = input.value;
      }
    });
    return formData;
  }

  bindEditorEvents(template) {
    document.getElementById('wa-editor-back')?.addEventListener('click', () => {
      this.handleEditorBack();
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

    // 内容模板选择器事件
    this.container.addEventListener('click', (e) => {
      const selectBtn = e.target.closest('#wa-ct-select-btn, #wa-ct-change');
      if (selectBtn) {
        e.stopPropagation();
        this.contentTemplateDropdownOpen = !this.contentTemplateDropdownOpen;
        this.updateContentTemplatePanel(template);
      }
      const closeBtn = e.target.closest('#wa-ct-close');
      if (closeBtn) {
        e.stopPropagation();
        this.contentTemplateDropdownOpen = false;
        this.updateContentTemplatePanel(template);
      }
      const option = e.target.closest('.wa-ct-option');
      if (option) {
        e.stopPropagation();
        const ctId = option.dataset.ctId;
        this.selectedContentTemplateId = ctId || null;
        this.contentTemplateDropdownOpen = false;
        this.updateContentTemplatePanel(template);
        this.autoSaveDraft(template);
      }
      const manageBtn = e.target.closest('#wa-ct-manage');
      if (manageBtn) {
        e.stopPropagation();
        if (this.onNavigate) {
          this.onNavigate('contentTemplates');
        }
      }
    });
  }

  updateContentTemplatePanel(template) {
    const panel = document.getElementById('wa-content-template-panel');
    if (panel) {
      panel.outerHTML = this.renderContentTemplateSelector(template);
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

    document.getElementById('wa-result-to-kb')?.addEventListener('click', () => {
      this.openAddToKBModal(result, template);
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
    // 在 PPT 分步编辑器的结果态下，DOM 结构与通用编辑器不同，需要单独刷新
    const refreshPPTView = () => {
      if (this.pptStep === 'result') {
        this.refreshPPTResultView(result, template);
      } else {
        this.renderResult(result, template);
      }
    };

    // 视图切换
    this.container.querySelectorAll('.wa-ppt-view-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.pptViewMode = tab.dataset.view;
        refreshPPTView();
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
      refreshPPTView();
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
        refreshPPTView();
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
        refreshPPTView();
        this.showToast('已重新生成当前页');
      });
    });

    // 幻灯片翻页
    document.getElementById('wa-ppt-slide-prev')?.addEventListener('click', () => {
      if (this.pptCurrentPage > 0) {
        this.pptCurrentPage--;
        refreshPPTView();
      }
    });
    document.getElementById('wa-ppt-slide-next')?.addEventListener('click', () => {
      if (this.pptCurrentPage < result.pages.length - 1) {
        this.pptCurrentPage++;
        refreshPPTView();
      }
    });

    // 缩略图点击
    this.container.querySelectorAll('.wa-ppt-slide-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        this.pptCurrentPage = parseInt(thumb.dataset.index);
        refreshPPTView();
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
        refreshPPTView();
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

  bindKBSelectorEvents() {
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
  }

  bindPPTTemplateUploadEvents() {
    const fileInput = document.getElementById('wa-ppt-template-file');
    const uploadZone = document.getElementById('wa-ppt-template-upload-zone');
    uploadZone?.addEventListener('click', () => fileInput?.click());
    uploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.handleMasterFileSelect(file);
    });
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleMasterFileSelect(file);
    });
  }

  bindMasterUploadEvents(template) {
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
      const contentTemplate = this.selectedContentTemplateId
        ? getContentTemplateById(this.selectedContentTemplateId)
        : null;
      const options = { useMaster, stage, attachments, contentTemplate };
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

  openAddToKBModal(result, template) {
    // 移除已有弹窗
    document.getElementById('wa-kb-modal')?.remove();

    const kbs = this.getAvailableKnowledgeBases();
    if (!kbs.length) {
      this.showToast('暂无可用知识库，请先创建知识库');
      return;
    }

    const typeLabel = template?.outputType === outputTypes.PPT ? 'PPT'
      : template?.outputType === outputTypes.TABLE ? '表格'
      : '文档';
    const preview = this.resultToMarkdown(result);
    const previewShort = preview.length > 200 ? preview.substring(0, 200) + '...' : preview;

    const overlay = document.createElement('div');
    overlay.id = 'wa-kb-modal';
    overlay.className = 'wa-modal-overlay';
    overlay.innerHTML = `
      <div class="wa-modal wa-kb-modal-box" onclick="event.stopPropagation()">
        <div class="wa-modal-header">
          <h3><i class="fa-solid fa-book-bookmark"></i> 添加到知识库</h3>
          <button class="wa-modal-close" id="wa-kb-modal-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="wa-modal-body">
          <div class="wa-kb-modal-preview">
            <div class="wa-kb-modal-preview-label">即将添加的内容</div>
            <div class="wa-kb-modal-preview-name">${this.escapeHtml(result.title || '未命名内容')}</div>
            <div class="wa-kb-modal-preview-meta">
              <span><i class="fa-solid fa-tag"></i> ${typeLabel}</span>
              <span><i class="fa-solid fa-align-left"></i> ${preview.length} 字</span>
              ${template?.name ? `<span><i class="fa-solid fa-wand-magic-sparkles"></i> ${this.escapeHtml(template.name)}</span>` : ''}
            </div>
            <div class="wa-kb-modal-preview-text">${this.escapeHtml(previewShort)}</div>
          </div>
          <div class="wa-kb-modal-section">
            <div class="wa-kb-modal-section-label">选择目标知识库</div>
            <div class="wa-kb-modal-list">
              ${kbs.map((kb) => `
                <label class="wa-kb-modal-item" data-kb-id="${kb.id}">
                  <input type="radio" name="wa-kb-target" value="${kb.id}" ${kbs.length === 1 ? 'checked' : ''}>
                  <div class="wa-kb-modal-item-icon"><i class="fa-solid fa-${kb.type === '问答' ? 'message' : kb.type === '网页' ? 'globe' : 'folder-open'}"></i></div>
                  <div class="wa-kb-modal-item-info">
                    <div class="wa-kb-modal-item-name">${this.escapeHtml(kb.name)}</div>
                    <div class="wa-kb-modal-item-desc">${this.escapeHtml(kb.description || '')}</div>
                    <div class="wa-kb-modal-item-meta">${kb.type} · ${kb.documentCount || 0} 篇文档 · 更新于 ${kb.lastUpdate || '-'}</div>
                  </div>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="wa-kb-modal-section">
            <label class="wa-kb-modal-checkbox">
              <input type="checkbox" id="wa-kb-include-meta" checked>
              <span>包含生成元信息（模板名称、创建时间等）</span>
            </label>
          </div>
        </div>
        <div class="wa-modal-footer">
          <button class="btn btn-ghost" id="wa-kb-modal-cancel">取消</button>
          <button class="btn btn-primary" id="wa-kb-modal-confirm"><i class="fa-solid fa-check"></i> 确认添加</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 绑定事件
    overlay.addEventListener('click', () => overlay.remove());
    overlay.querySelector('#wa-kb-modal-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#wa-kb-modal-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#wa-kb-modal-confirm').addEventListener('click', () => {
      const selected = overlay.querySelector('input[name="wa-kb-target"]:checked');
      if (!selected) {
        this.showToast('请选择一个知识库');
        return;
      }
      const kbId = selected.value;
      const kb = kbs.find((k) => k.id === kbId);
      const includeMeta = overlay.querySelector('#wa-kb-include-meta').checked;
      overlay.remove();
      this.addResultToKnowledgeBase(result, template, kb, includeMeta);
    });
  }

  getAvailableKnowledgeBases() {
    try {
      const raw = localStorage.getItem('knowledgeBases');
      const kbs = raw ? JSON.parse(raw) : [];
      return Array.isArray(kbs) ? kbs.filter((kb) => kb.status !== 'disabled' && kb.status !== 'inactive') : [];
    } catch {
      return [];
    }
  }

  addResultToKnowledgeBase(result, template, kb, includeMeta = true) {
    if (!result || !kb) return;

    let content = this.resultToMarkdown(result);
    if (includeMeta) {
      const now = new Date().toLocaleString('zh-CN');
      const meta = `> 本文由智能工作助手生成\n> - 模板：${template?.name || '自定义'}\n> - 类型：${template?.outputType || '文档'}\n> - 时间：${now}\n> - 知识库：${kb.name}\n\n`;
      content = meta + content;
    }

    const typeMap = {
      [outputTypes.PPT]: 'Markdown',
      [outputTypes.TABLE]: 'Markdown',
    };
    const docType = typeMap[template?.outputType] || 'Markdown';
    const sizeKb = Math.max(1, Math.round(content.length / 1024));

    const document = {
      id: 'doc_wa_' + Date.now(),
      name: `${result.title || '未命名内容'}.md`,
      type: docType,
      size: `${sizeKb} KB`,
      uploadTime: '刚刚',
      status: '已索引',
      progress: 100,
      content,
      source: 'workAssistant',
      sourceTemplate: template?.name || '',
      createdAt: new Date().toISOString(),
    };

    addDocumentToKB(kb.id, document);
    this.showToast(`已添加到知识库「${kb.name}」`);
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

  resultToMarkdown(result) {
    if (!result) return '';
    const title = result.title || '未命名内容';
    // 文档类（markdown / text / email / steps / report）
    if (result.content) {
      let md = `# ${title}\n\n`;
      if (result.citations && result.citations.length) {
        md += result.content + '\n\n---\n\n## 参考来源\n\n';
        result.citations.forEach((c, i) => {
          md += `${i + 1}. [${c.title || c.name || '来源'}](${c.url || '#'})\n`;
        });
      } else {
        md += result.content;
      }
      return md;
    }
    // PPT 类
    if (result.pages) {
      let md = `# ${title}\n\n`;
      md += `> 风格：${result.style || '标准'} | 配色：${result.color || '默认'} | 页数：${result.pages.length}\n\n---\n\n`;
      result.pages.forEach((page, index) => {
        md += `## 第 ${index + 1} 页 · ${page.title}\n\n`;
        if (page.subtitle) md += `**${page.subtitle}**\n\n`;
        (page.bullets || []).forEach((b) => { md += `- ${b}\n`; });
        if (page.note) md += `\n**演讲备注**：${page.note}\n`;
        md += '\n---\n\n';
      });
      return md;
    }
    // 表格类
    if (result.columns && result.rows) {
      let md = `# ${title}\n\n`;
      md += `| ${result.columns.join(' | ')} |\n`;
      md += `| ${result.columns.map(() => '---').join(' | ')} |\n`;
      result.rows.forEach((row) => {
        md += `| ${row.join(' | ')} |\n`;
      });
      return md;
    }
    return `# ${title}\n\n（无内容）`;
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
      outputType: outputTypes.MARKDOWN,
      icon: this.getRecommendedIcon('writing', outputTypes.MARKDOWN),
      description: '',
      defaultMode: 'kb',
      fields: [
        { id: 'topic', type: fieldTypes.TEXT, label: '主题', placeholder: '请输入主题', required: true, description: '', example: '', defaultValue: '', _expanded: false },
      ],
      outputConfig: { columns: [] },
      promptTemplate: this.getDefaultPromptTemplate('writing', [{ id: 'topic', label: '主题' }]),
      activePromptStyle: '通用生成',
      contentTemplateId: null,
      promptGenerationIndex: 0,
      structureType: 'free',
    };
  }

  getContentTemplatesForCreator(outputType) {
    if (outputType === outputTypes.PPT) {
      return pptSkeletonTemplates.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        type: 'skeleton',
        format: 'ppt',
        category: ['featured'],
        featured: true,
        themeColor: '#10b981',
        content: { sections: s.slides || [] },
        usedCount: 0,
      }));
    }

    const formatMap = {
      [outputTypes.TEXT]: ['word'],
      [outputTypes.MARKDOWN]: ['word'],
      [outputTypes.REPORT]: ['word'],
      [outputTypes.EMAIL]: ['email'],
      [outputTypes.TABLE]: ['table'],
      [outputTypes.LIST]: ['list'],
      [outputTypes.STEPS]: ['steps', 'list'],
      [outputTypes.QA]: ['list'],
    };

    const allowedFormats = formatMap[outputType] || ['word'];
    return getAllContentTemplates()
      .filter((t) => allowedFormats.includes(t.format))
      .map((t) => ({ ...t, type: 'content' }));
  }

  /**
   * 将内容模板格式映射为场景创建器的输出类型和能力
   */
  mapContentTemplateFormat(format) {
    switch (format) {
      case 'table':
        return { outputType: outputTypes.TABLE, abilityId: 'table' };
      case 'email':
        return { outputType: outputTypes.EMAIL, abilityId: 'writing' };
      case 'list':
        return { outputType: outputTypes.LIST, abilityId: 'writing' };
      case 'steps':
        return { outputType: outputTypes.STEPS, abilityId: 'writing' };
      case 'word':
      default:
        return { outputType: outputTypes.MARKDOWN, abilityId: 'writing' };
    }
  }

  /**
   * 基于内容模板生成一个临时创作场景，用于「使用此模板」后直接进入编辑器
   */
  createTempTemplateFromContentTemplate(ct, outputType, abilityId) {
    const template = {
      id: `temp_use_${ct.id}_${Date.now()}`,
      name: ct.name || '未命名文档',
      description: ct.description || '',
      roleId: 'sales',
      abilityId,
      outputType,
      icon: this.getRecommendedIcon(abilityId, outputType),
      defaultMode: 'free',
      fields: [
        {
          id: 'topic',
          type: fieldTypes.TEXT,
          label: '主题',
          placeholder: '请输入文档主题',
          required: true,
        },
      ],
      contentTemplateId: ct.id,
    };

    if (outputType === outputTypes.TABLE && ct.content?.columns) {
      template.outputConfig = { columns: ct.content.columns };
    }

    return template;
  }

  // ===================== 图标选择弹窗 =====================
  getIconList() {
    return [
      { name: 'pen-nib', cat: '写作' },
      { name: 'file-lines', cat: '文档' },
      { name: 'file-waveform', cat: '文档' },
      { name: 'file-contract', cat: '文档' },
      { name: 'newspaper', cat: '文档' },
      { name: 'book-open', cat: '文档' },
      { name: 'table', cat: '表格' },
      { name: 'table-cells', cat: '表格' },
      { name: 'calculator', cat: '表格' },
      { name: 'chart-line', cat: '数据' },
      { name: 'chart-bar', cat: '数据' },
      { name: 'chart-pie', cat: '数据' },
      { name: 'presentation-screen', cat: 'PPT' },
      { name: 'slideshare', cat: 'PPT' },
      { name: 'display', cat: 'PPT' },
      { name: 'envelope', cat: '邮件' },
      { name: 'paper-plane', cat: '邮件' },
      { name: 'inbox', cat: '邮件' },
      { name: 'list-check', cat: '列表' },
      { name: 'list-ul', cat: '列表' },
      { name: 'list-ol', cat: '列表' },
      { name: 'check-double', cat: '列表' },
      { name: 'arrow-progress', cat: '步骤' },
      { name: 'arrow-right-arrow-left', cat: '步骤' },
      { name: 'wand-magic-sparkles', cat: 'AI' },
      { name: 'robot', cat: 'AI' },
      { name: 'brain', cat: 'AI' },
      { name: 'lightbulb', cat: '创意' },
      { name: 'rocket', cat: '创意' },
      { name: 'gem', cat: '创意' },
      { name: 'star', cat: '常用' },
      { name: 'heart', cat: '常用' },
      { name: 'thumbs-up', cat: '常用' },
      { name: 'bolt', cat: '常用' },
      { name: 'fire', cat: '常用' },
      { name: 'flag', cat: '常用' },
      { name: 'briefcase', cat: '商务' },
      { name: 'building', cat: '商务' },
      { name: 'users', cat: '商务' },
      { name: 'user-tie', cat: '商务' },
      { name: 'handshake', cat: '商务' },
      { name: 'trending-up', cat: '商务' },
      { name: 'target', cat: '目标' },
      { name: 'trophy', cat: '目标' },
      { name: 'medal', cat: '目标' },
      { name: 'gear', cat: '设置' },
      { name: 'wrench', cat: '设置' },
      { name: 'sliders', cat: '设置' },
      { name: 'magnifying-glass', cat: '搜索' },
      { name: 'circle-question', cat: '问答' },
      { name: 'comments', cat: '沟通' },
      { name: 'message', cat: '沟通' },
      { name: 'microphone-lines', cat: '语音' },
      { name: 'mic', cat: '语音' },
      { name: 'language', cat: '翻译' },
      { name: 'globe', cat: '翻译' },
      { name: 'image', cat: '图片' },
      { name: 'images', cat: '图片' },
      { name: 'camera', cat: '图片' },
      { name: 'video', cat: '视频' },
      { name: 'youtube', cat: '视频' },
      { name: 'film', cat: '视频' },
      { name: 'music', cat: '音乐' },
      { name: 'headphones', cat: '音乐' },
      { name: 'book', cat: '学习' },
      { name: 'graduation-cap', cat: '学习' },
      { name: 'school', cat: '学习' },
      { name: 'clipboard-check', cat: '任务' },
      { name: 'clipboard-list', cat: '任务' },
      { name: 'calendar', cat: '时间' },
      { name: 'clock', cat: '时间' },
      { name: 'hourglass', cat: '时间' },
      { name: 'folder-open', cat: '文件' },
      { name: 'folder', cat: '文件' },
      { name: 'database', cat: '数据' },
      { name: 'hard-drive', cat: '数据' },
      { name: 'cloud', cat: '云' },
      { name: 'server', cat: '技术' },
      { name: 'code', cat: '技术' },
      { name: 'terminal', cat: '技术' },
    ];
  }

  getIconCategories() {
    const icons = this.getIconList();
    const cats = {};
    icons.forEach((icon) => {
      if (!cats[icon.cat]) cats[icon.cat] = [];
      cats[icon.cat].push(icon);
    });
    return cats;
  }

  renderIconPickerModal() {
    if (!this.iconModalOpen) return '';

    const iconCats = this.getIconCategories();
    const catList = Object.keys(iconCats);
    const activeCat = this.iconModalActiveCat || catList[0];
    const searchKey = this.iconModalSearch?.toLowerCase().trim() || '';

    let displayIcons = searchKey
      ? this.getIconList().filter((icon) => icon.name.toLowerCase().includes(searchKey) || icon.cat.includes(searchKey))
      : iconCats[activeCat] || [];

    return `
      <div class="wa-icon-modal-overlay" id="wa-icon-modal-overlay">
        <div class="wa-icon-modal" onclick="event.stopPropagation()">
          <div class="wa-icon-modal-header">
            <div class="wa-icon-modal-title">选择图标</div>
            <div class="wa-icon-modal-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="wa-icon-search-input" placeholder="搜索图标..." value="${this.iconModalSearch}">
            </div>
            <button class="wa-icon-modal-close" id="wa-icon-modal-close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="wa-icon-modal-body">
            <div class="wa-icon-modal-sidebar">
              ${catList.map((cat) => `
                <div class="wa-icon-modal-cat-item ${cat === activeCat ? 'active' : ''}" data-icon-cat="${cat}">
                  <span>${cat}</span>
                  <span class="wa-icon-modal-cat-count">${iconCats[cat].length}</span>
                </div>
              `).join('')}
            </div>
            <div class="wa-icon-modal-content">
              <div class="wa-icon-grid">
                ${displayIcons.map((icon) => `
                  <div class="wa-icon-grid-item ${this.creatorForm.icon === icon.name ? 'selected' : ''}" data-icon="${icon.name}" title="${icon.name}">
                    <i class="fa-solid fa-${icon.name}"></i>
                    <span class="wa-icon-name">${icon.name}</span>
                  </div>
                `).join('')}
              </div>
              ${displayIcons.length === 0 ? `
                <div class="wa-icon-empty">
                  <i class="fa-regular fa-face-frown"></i>
                  <span>未找到匹配的图标</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ===================== 内容模板选择弹窗 =====================
  getContentTemplateMiniPreview(template) {
    const format = template.format;
    const themeColor = template.themeColor || '#10b981';

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

  renderModalTemplateCard(t, selectedId) {
    const isSelected = selectedId === t.id;
    const themeColor = t.themeColor || '#10b981';
    const formatInfo = formatLabels[t.format] || formatLabels.word;
    const isPersonal = t.level === 'personal';
    return `
      <div class="wa-ct-modal-card ${isSelected ? 'selected' : ''}" data-ct-id="${t.id}">
        <div class="wa-ct-card-preview">
          <div class="wa-ct-card-preview-header">
            <div class="wa-ct-card-type-icon" style="background:${themeColor}15;color:${themeColor}">
              <i class="fa-solid ${formatInfo.icon}"></i>
            </div>
            ${t.featured ? '<div class="wa-ct-card-featured-badge"><i class="fa-solid fa-star"></i></div>' : ''}
          </div>
          <div class="wa-ct-card-preview-body">
            ${this.getContentTemplateMiniPreview(t)}
          </div>
          ${isSelected ? '<div class="wa-ct-card-selected-mark"><i class="fa-solid fa-check"></i></div>' : ''}
        </div>
        <div class="wa-ct-card-footer">
          <h3 class="wa-ct-card-title">${this.escapeHtml(t.name)}</h3>
          <p class="wa-ct-card-desc">${this.escapeHtml(t.description || '')}</p>
          <div class="wa-ct-card-meta-row">
            <span class="wa-ct-card-meta">
              <i class="fa-solid fa-users-viewfinder"></i> ${(t.usedCount || 0).toLocaleString()} 次使用
            </span>
            <span class="wa-ct-card-source ${isPersonal ? 'personal' : 'official'}">
              ${isPersonal ? '我的' : '官方'}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderModalFreeCard(selectedId) {
    const isSelected = !selectedId;
    return `
      <div class="wa-ct-modal-card ${isSelected ? 'selected' : ''}" data-ct-id="">
        <div class="wa-ct-card-preview" style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;gap:8px;">
          <div class="wa-ct-card-type-icon" style="background:#e2e8f0;color:#64748b;width:40px;height:40px;font-size:18px;border-radius:10px;">
            <i class="fa-solid fa-infinity"></i>
          </div>
        </div>
        <div class="wa-ct-card-footer">
          <h3 class="wa-ct-card-title">自由生成</h3>
          <p class="wa-ct-card-desc">AI 自由发挥，不限制结构</p>
          <div class="wa-ct-card-meta-row">
            <span class="wa-ct-card-meta"><i class="fa-solid fa-wand-magic-sparkles"></i> 无模板</span>
            <span class="wa-ct-card-source official">系统</span>
          </div>
        </div>
      </div>
    `;
  }

  renderContentTemplateModal() {
    if (!this.ctModalOpen) return '';

    const allTemplates = this.ctModalForCreator
      ? this.getContentTemplatesForCreator(this.creatorForm.outputType)
      : this.ctModalForReview
        ? this.getContentTemplatesForCreator(this.creatorReviewState.draftTemplate?.outputType)
        : getAllContentTemplates();

    let filteredTemplates = allTemplates;

    if (this.ctModalCategory === 'featured') {
      filteredTemplates = allTemplates.filter((t) => t.featured);
    } else if (this.ctModalCategory !== 'all') {
      filteredTemplates = allTemplates.filter((t) => t.category && t.category.includes(this.ctModalCategory));
    }

    if (this.ctModalSearch) {
      const keyword = this.ctModalSearch.toLowerCase();
      filteredTemplates = filteredTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(keyword) ||
          (t.description && t.description.toLowerCase().includes(keyword)) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(keyword)))
      );
    }

    const selectedId = this.ctModalForCreator
      ? this.creatorForm.contentTemplateId
      : this.ctModalForReview
        ? this.creatorReviewState.draftTemplate?.contentTemplateId
        : this.selectedContentTemplateId;

    return `
      <div class="wa-ct-modal-overlay" id="wa-ct-modal-overlay">
        <div class="wa-ct-modal">
          <div class="wa-ct-modal-header">
            <div class="wa-ct-modal-title">
              <i class="fa-solid fa-layer-group"></i>
              <span>选择内容模板</span>
            </div>
            <div class="wa-ct-modal-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="wa-ct-modal-search-input" placeholder="搜索模板名称、标签..." value="${this.ctModalSearch}">
            </div>
            <button class="wa-ct-modal-close" id="wa-ct-modal-close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="wa-ct-modal-body">
            <div class="wa-ct-modal-sidebar">
              <div class="wa-ct-modal-sidebar-title">分类</div>
              ${sceneCategories.map((cat) => {
                const isActive = this.ctModalCategory === cat.id;
                const color = sceneCategoryColors[cat.id] || '#6b7280';
                const count = cat.id === 'all' 
                  ? allTemplates.length 
                  : cat.id === 'featured'
                    ? allTemplates.filter((t) => t.featured).length
                    : allTemplates.filter((t) => t.category && t.category.includes(cat.id)).length;
                return `
                  <div class="wa-ct-modal-cat-item ${isActive ? 'active' : ''}" data-cat="${cat.id}">
                    <div class="wa-ct-modal-cat-icon" style="background: ${isActive ? color : '#f3f4f6'}; color: ${isActive ? '#fff' : color};">
                      <i class="fa-solid ${cat.icon}"></i>
                    </div>
                    <span class="wa-ct-modal-cat-name">${cat.name}</span>
                    <span class="wa-ct-modal-cat-count">${count}</span>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="wa-ct-modal-content">
              <div class="wa-ct-modal-content-header">
                <span class="wa-ct-modal-count">共 ${filteredTemplates.length} 个模板</span>
              </div>
              <div class="wa-ct-modal-grid">
                ${this.renderModalFreeCard(selectedId)}
                ${filteredTemplates.map((t) => this.renderModalTemplateCard(t, selectedId)).join('')}
              </div>
              ${filteredTemplates.length === 0 ? `
                <div class="wa-ct-modal-empty">
                  <i class="fa-regular fa-file-lines"></i>
                  <div>暂无匹配的模板</div>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="wa-ct-modal-footer">
            <button class="btn btn-secondary" id="wa-ct-modal-cancel">取消</button>
            <button class="btn btn-primary" id="wa-ct-modal-confirm">
              <i class="fa-solid fa-check"></i> 确认选择
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindContentTemplateModalEvents() {
    if (!this.ctModalOpen) return;

    document.getElementById('wa-ct-modal-close')?.addEventListener('click', () => {
      this.ctModalOpen = false;
      this.render();
    });

    document.getElementById('wa-ct-modal-cancel')?.addEventListener('click', () => {
      this.ctModalOpen = false;
      this.render();
    });

    document.getElementById('wa-ct-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'wa-ct-modal-overlay') {
        this.ctModalOpen = false;
        this.render();
      }
    });

    document.querySelectorAll('.wa-ct-modal-cat-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.ctModalCategory = item.dataset.cat;
        this.render();
      });
    });

    document.getElementById('wa-ct-modal-search-input')?.addEventListener('input', (e) => {
      this.ctModalSearch = e.target.value;
      this.updateModalContent();
    });

    document.querySelectorAll('.wa-ct-modal-card').forEach((card) => {
      card.addEventListener('click', () => {
        const ctId = card.dataset.ctId;
        if (this.ctModalForCreator) {
          this.creatorForm.contentTemplateId = ctId || null;
        } else if (this.ctModalForReview) {
          if (this.creatorReviewState.draftTemplate) {
            this.creatorReviewState.draftTemplate.contentTemplateId = ctId || null;
          }
        } else {
          this.selectedContentTemplateId = ctId || null;
        }
        document.querySelectorAll('.wa-ct-modal-card').forEach((c) => {
          c.classList.remove('selected');
        });
        card.classList.add('selected');
      });
    });

    document.getElementById('wa-ct-modal-confirm')?.addEventListener('click', () => {
      this.ctModalOpen = false;
      if (this.ctModalForCreator) {
        this.updateCreatorPreview();
      } else if (this.ctModalForReview) {
        this.creatorReviewState.structureType = 'free';
      }
      this.render();
    });
  }

  updateModalContent() {
    const allTemplates = this.ctModalForCreator
      ? this.getContentTemplatesForCreator(this.creatorForm.outputType)
      : this.ctModalForReview
        ? this.getContentTemplatesForCreator(this.creatorReviewState.draftTemplate?.outputType)
        : getAllContentTemplates();

    let filteredTemplates = allTemplates;

    if (this.ctModalCategory === 'featured') {
      filteredTemplates = allTemplates.filter((t) => t.featured);
    } else if (this.ctModalCategory !== 'all') {
      filteredTemplates = allTemplates.filter((t) => t.category && t.category.includes(this.ctModalCategory));
    }

    if (this.ctModalSearch) {
      const keyword = this.ctModalSearch.toLowerCase();
      filteredTemplates = filteredTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(keyword) ||
          (t.description && t.description.toLowerCase().includes(keyword)) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(keyword)))
      );
    }

    const selectedId = this.ctModalForCreator
      ? this.creatorForm.contentTemplateId
      : this.ctModalForReview
        ? this.creatorReviewState.draftTemplate?.contentTemplateId
        : this.selectedContentTemplateId;

    const grid = document.querySelector('.wa-ct-modal-grid');
    const countEl = document.querySelector('.wa-ct-modal-count');
    const emptyEl = document.querySelector('.wa-ct-modal-empty');

    if (countEl) {
      countEl.textContent = `共 ${filteredTemplates.length} 个模板`;
    }

    if (grid) {
      let html = this.renderModalFreeCard(selectedId);
      html += filteredTemplates.map((t) => this.renderModalTemplateCard(t, selectedId)).join('');
      grid.innerHTML = html;

      grid.querySelectorAll('.wa-ct-modal-card').forEach((card) => {
        card.addEventListener('click', () => {
          const ctId = card.dataset.ctId;
          if (this.ctModalForCreator) {
            this.creatorForm.contentTemplateId = ctId || null;
          } else if (this.ctModalForReview) {
            if (this.creatorReviewState.draftTemplate) {
              this.creatorReviewState.draftTemplate.contentTemplateId = ctId || null;
            }
          } else {
            this.selectedContentTemplateId = ctId || null;
          }
          grid.querySelectorAll('.wa-ct-modal-card').forEach((c) => {
            c.classList.remove('selected');
          });
          card.classList.add('selected');
        });
      });
    }

    if (emptyEl) {
      emptyEl.style.display = filteredTemplates.length === 0 ? 'flex' : 'none';
    }
  }

  bindIconPickerModalEvents() {
    if (!this.iconModalOpen) return;

    document.getElementById('wa-icon-modal-close')?.addEventListener('click', () => {
      this.iconModalOpen = false;
      this.render();
    });

    document.getElementById('wa-icon-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'wa-icon-modal-overlay') {
        this.iconModalOpen = false;
        this.render();
      }
    });

    document.querySelectorAll('.wa-icon-modal-cat-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.iconModalActiveCat = item.dataset.iconCat;
        this.render();
      });
    });

    document.getElementById('wa-icon-search-input')?.addEventListener('input', (e) => {
      this.iconModalSearch = e.target.value;
      this.updateIconModalContent();
    });

    document.querySelectorAll('.wa-icon-grid-item').forEach((item) => {
      item.addEventListener('click', () => {
        const iconName = item.dataset.icon;
        this.creatorForm.icon = iconName;
        this.iconModalOpen = false;
        this.updateCreatorPreview();
        this.render();
      });
    });
  }

  updateIconModalContent() {
    const iconCats = this.getIconCategories();
    const catList = Object.keys(iconCats);
    const activeCat = this.iconModalActiveCat || catList[0];
    const searchKey = this.iconModalSearch?.toLowerCase().trim() || '';

    let displayIcons = searchKey
      ? this.getIconList().filter((icon) => icon.name.toLowerCase().includes(searchKey) || icon.cat.includes(searchKey))
      : iconCats[activeCat] || [];

    const grid = document.querySelector('.wa-icon-grid');
    if (grid) {
      grid.innerHTML = displayIcons.map((icon) => `
        <div class="wa-icon-grid-item ${this.creatorForm.icon === icon.name ? 'selected' : ''}" data-icon="${icon.name}" title="${icon.name}">
          <i class="fa-solid fa-${icon.name}"></i>
          <span class="wa-icon-name">${icon.name}</span>
        </div>
      `).join('');

      grid.querySelectorAll('.wa-icon-grid-item').forEach((item) => {
        item.addEventListener('click', () => {
          const iconName = item.dataset.icon;
          this.creatorForm.icon = iconName;
          this.iconModalOpen = false;
          this.updateCreatorPreview();
          this.render();
        });
      });
    }

    const emptyEl = document.querySelector('.wa-icon-empty');
    if (emptyEl) {
      emptyEl.style.display = displayIcons.length === 0 ? 'flex' : 'none';
    }
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

  enterReviewFromConversation() {
    const conversationTemplate = this.buildTemplateFromConversation();
    const draftTemplate = {
      ...conversationTemplate,
      id: generateId('tmpl'),
      outputConfig: {},
      contentTemplateId: null,
      isCustom: true,
      recommendedKBs: [],
    };

    const ability = getAbilityById(draftTemplate.abilityId);
    if (draftTemplate.defaultMode === 'kb' && !ability?.supportsKB) draftTemplate.defaultMode = 'free';
    if (draftTemplate.defaultMode === 'free' && !ability?.supportsFree) draftTemplate.defaultMode = 'kb';

    this.creatorReviewState = {
      active: true,
      source: 'chat',
      draftTemplate,
      currentTab: 'prompt',
      promptMode: 'preview',
      promptTemplate: this.generateReviewPrompt(draftTemplate, 'free', null),
      structureType: 'free',
    };

    this.render();
  }

  renderCreatorPanel({ variant, title, desc, progress, config, preview, footer, extra }) {
    return `
      <div class="wa-creator-form-new">
        <div class="wa-creator-panel wa-creator-panel--seamless wa-creator-${variant}-panel">
          <div class="wa-creator-panel-header">
            <div class="wa-creator-panel-header-text">
              <div class="wa-creator-panel-title">${title}</div>
              <div class="wa-creator-panel-desc">${desc}</div>
            </div>
            ${progress ? `<div class="wa-creator-panel-progress">${progress}</div>` : ''}
          </div>
          <div class="wa-creator-panel-body">
            <div class="wa-creator-panel-config wa-creator-${variant}-config">
              ${config}
            </div>
            <div class="wa-creator-panel-preview">
              ${preview}
            </div>
          </div>
          ${footer ? `<div class="wa-creator-panel-footer">${footer}</div>` : ''}
        </div>
        ${extra || ''}
      </div>
    `;
  }

  renderCreatorChatView() {
    const state = this.conversationState;
    if (!state.started && state.messages.length === 0) {
      setTimeout(() => this.startConversation(), 0);
    }

    const progressMap = {
      start: 1,
      template_type: 2,
      user_role: 3,
      collect_info: 4,
      output_format: 5,
      confirm: 6,
      complete: 6,
    };
    const progress = progressMap[state.step] || 1;

    const progressHtml = `
      <div class="wa-creator-canvas-progress">
        <span class="wa-creator-canvas-progress-dot active"></span>
        <span class="wa-creator-canvas-progress-dot ${progress >= 2 ? 'active' : ''}"></span>
        <span class="wa-creator-canvas-progress-dot ${progress >= 3 ? 'active' : ''}"></span>
        <span class="wa-creator-canvas-progress-dot ${progress >= 4 ? 'active' : ''}"></span>
        <span class="wa-creator-canvas-progress-dot ${progress >= 5 ? 'active' : ''}"></span>
        <span class="wa-creator-canvas-progress-dot ${progress >= 6 ? 'active' : ''}"></span>
      </div>
    `;

    const config = `
      <div class="wa-conversation-messages" id="wa-conversation-messages">
        ${this.renderConversationMessages()}
      </div>
      ${state.step === 'confirm' || state.step === 'complete' ? '' : `
        <div class="wa-conversation-input-wrapper">
          <div class="wa-conversation-input-capsule">
            <input type="text" class="wa-input" id="wa-conversation-input" placeholder="输入你的回答，按回车发送..." autocomplete="off">
            <button class="btn btn-primary btn-icon" id="wa-conversation-send"><i class="fa-solid fa-paper-plane"></i></button>
          </div>
        </div>
      `}
    `;

    const footer = state.step === 'confirm' || state.step === 'complete' ? `
      <div class="wa-preview-live"><span></span> Live</div>
      <div class="wa-creator-form-actions">
        <button class="btn btn-text" id="wa-conversation-restart"><i class="fa-solid fa-rotate-right"></i> 重新创建</button>
        <button class="btn btn-primary btn-pill" id="wa-conversation-confirm-review"><i class="fa-solid fa-arrow-right"></i> 进入提示词确认</button>
      </div>
    ` : `
      <div class="wa-preview-live"><span></span> Live</div>
      <div class="wa-preview-hint"><i class="fa-regular fa-lightbulb"></i><span>继续对话以完善模板结构</span></div>
    `;

    return this.renderCreatorPanel({
      variant: 'chat',
      title: '对话创建模板',
      desc: '像聊天一样描述需求，AI 会实时整理成模板结构',
      progress: progressHtml,
      config,
      preview: this.renderConversationPreview(),
      footer,
    });
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
    const fields = template.fields || [];

    return `
      <div class="wa-preview-card-header">
        <div class="wa-creator-preview-icon"><i class="fa-solid fa-${template.icon || 'file-lines'}"></i></div>
        <div class="wa-creator-preview-info">
          <div class="wa-creator-preview-name">${template.name || '未命名模板'}</div>
          <div class="wa-creator-preview-meta">
            <span class="wa-preview-tag" style="--tag-color:${role?.color || '#10b981'}">${role?.name || '未指定岗位'}</span>
            <span class="wa-preview-tag">${ability?.name || '写作'}</span>
            <span class="wa-preview-tag">${this.getOutputTypeLabel(template.outputType)}</span>
          </div>
        </div>
      </div>
      <div class="wa-creator-preview-fields">
        ${fields.length === 0 ? '<div class="wa-preview-empty"><i class="fa-regular fa-lightbulb"></i><span>还没有收集到信息点，继续对话即可自动生成。</span></div>' : ''}
        ${fields.map((f) => `
          <div class="wa-creator-preview-field">
            <div class="wa-preview-field-main">
              <span class="wa-field-status wa-field-status--collected"></span>
              <span class="wa-creator-preview-label">${f.label}</span>
            </div>
            <span class="wa-creator-preview-type">${this.getFieldTypeLabel(f.type)}${f.required ? ' *' : ''}</span>
          </div>
        `).join('')}
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

    document.getElementById('wa-conversation-confirm-review')?.addEventListener('click', () => {
      this.enterReviewFromConversation();
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
      writing: [outputTypes.MARKDOWN, outputTypes.TEXT, outputTypes.EMAIL, outputTypes.LIST, outputTypes.STEPS],
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

  resetCreatorForm() {
    this.creatorForm = this.getDefaultCreatorForm();
  }

  getAbilityIdByOutputType(outputType) {
    const priorityMap = {
      [outputTypes.TABLE]: 'table',
      [outputTypes.PPT]: 'ppt',
      [outputTypes.REPORT]: 'report',
      [outputTypes.EMAIL]: 'writing',
      [outputTypes.LIST]: 'writing',
      [outputTypes.STEPS]: 'writing',
      [outputTypes.MARKDOWN]: 'writing',
      [outputTypes.TEXT]: 'writing',
    };
    return priorityMap[outputType] || 'writing';
  }

  getContentTypeCards() {
    return [
      { id: 'writing', name: '文档写作', icon: 'file-lines', desc: '方案、话术、邮件等文字内容', color: '#3b82f6' },
      { id: 'table', name: '表格生成', icon: 'table', desc: '对比表、清单表、报价单等', color: '#10b981' },
      { id: 'ppt', name: 'PPT 制作', icon: 'presentation-screen', desc: '演示文稿大纲与内容生成', color: '#f59e0b' },
      { id: 'report', name: '研究报告', icon: 'file-waveform', desc: '行业研究、市场调研报告', color: '#f97316' },
      { id: 'translate', name: '内容翻译', icon: 'language', desc: '多语言文本翻译', color: '#06b6d4' },
      { id: 'transcribe', name: '录音转写', icon: 'microphone-lines', desc: '音频转写并提取要点', color: '#ec4899' },
      { id: 'image', name: '图像生成', icon: 'image', desc: '海报、配图、图片生成', color: '#f43f5e' },
      { id: 'video', name: '视频生成', icon: 'video', desc: '短视频脚本与数字人视频', color: '#0ea5e9' },
      { id: 'music', name: '音乐生成', icon: 'music', desc: '背景音乐、音效生成', color: '#14b8a6' },
    ];
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
    if (this.creatorReviewState.active) {
      this.renderCreatorReview();
      return;
    }

    // 保留滚动位置，避免重绘后跳回顶部
    const liveSnapshot = {
      formConfig: document.querySelector('.wa-creator-form-config')?.scrollTop || 0,
      extractConfig: document.querySelector('.wa-creator-extract-config')?.scrollTop || 0,
      formPreview: document.querySelector('.wa-creator-form-panel .wa-creator-panel-preview')?.scrollTop || 0,
      extractPreview: document.querySelector('.wa-creator-extract-panel .wa-creator-panel-preview')?.scrollTop || 0,
    };
    const usedLast = !!this._lastCreatorScroll;
    const scrollSnapshot = this._lastCreatorScroll || liveSnapshot;
    this._lastCreatorScroll = null;
    console.log('SCROLL_SNAPSHOT', JSON.stringify({ usedLast, live: liveSnapshot, restored: scrollSnapshot }));

    this.container.innerHTML = `
      <header class="header">
        <div style="display:flex;align-items:center;gap:16px;">
          <button class="btn btn-ghost" id="wa-creator-back"><i class="fa-solid fa-arrow-left"></i></button>
          <div>
            <h1 class="header-title">创建场景模板</h1>
            ${this.creatorTab === 'form' ? '<div style="font-size:12px;color:var(--kb-text-muted);margin-top:2px;">第 1 步 / 共 2 步</div>' : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-ghost" id="wa-creator-cancel">取消</button>
        </div>
      </header>

      <div class="content wa-creator ${this.creatorTab}-creator-active">
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

      ${this.renderContentTemplateModal()}
      ${this.renderIconPickerModal()}
    `;

    this.bindTemplateCreatorEvents();

    // 恢复滚动位置
    const restore = () => {
      const formConfig = document.querySelector('.wa-creator-form-config');
      if (formConfig) formConfig.scrollTop = scrollSnapshot.formConfig;
      const extractConfig = document.querySelector('.wa-creator-extract-config');
      if (extractConfig) extractConfig.scrollTop = scrollSnapshot.extractConfig;
      const formPreview = document.querySelector('.wa-creator-form-panel .wa-creator-panel-preview');
      if (formPreview) formPreview.scrollTop = scrollSnapshot.formPreview;
      const extractPreview = document.querySelector('.wa-creator-extract-panel .wa-creator-panel-preview');
      if (extractPreview) extractPreview.scrollTop = scrollSnapshot.extractPreview;
    };
    restore();
    // 浏览器在重绘/焦点后可能还会自动滚动，再强制恢复一次
    setTimeout(restore, 0);
  }

  captureCreatorScroll() {
    return {
      formConfig: document.querySelector('.wa-creator-form-config')?.scrollTop || 0,
      extractConfig: document.querySelector('.wa-creator-extract-config')?.scrollTop || 0,
      formPreview: document.querySelector('.wa-creator-form-panel .wa-creator-panel-preview')?.scrollTop || 0,
      extractPreview: document.querySelector('.wa-creator-extract-panel .wa-creator-panel-preview')?.scrollTop || 0,
    };
  }

  // ===================== 统一确认提示词页面 =====================

  getReviewStructures() {
    return [
      { id: 'free', type: 'builtin', name: '自由结构', icon: 'wand-magic-sparkles', meta: '无约束' },
      { id: 'scheme', type: 'builtin', name: '方案文档', icon: 'file-lines', meta: '5 个主章节' },
      { id: 'weekly', type: 'builtin', name: '周报', icon: 'calendar-week', meta: '5 个主章节' },
      { id: 'meeting', type: 'builtin', name: '会议纪要', icon: 'handshake', meta: '5 个主章节' },
    ];
  }

  getBuiltinStructureChapters(type) {
    const structures = {
      scheme: [
        '一、项目背景与需求分析',
        '1.1 客户业务现状',
        '1.2 核心痛点与挑战',
        '二、整体解决方案',
        '三、产品优势与价值',
        '四、实施与服务方案',
        '五、总结与建议',
      ],
      weekly: [
        '一、本周工作回顾',
        '二、重点工作进展',
        '三、遇到的问题与风险',
        '四、下周工作计划',
        '五、需要支持的事项',
      ],
      meeting: [
        '一、会议基本信息',
        '二、与会人员',
        '三、会议议题与讨论',
        '四、会议决议',
        '五、行动项与跟进',
      ],
    };
    return structures[type] || [];
  }

  generateReviewPrompt(draft, structureType, contentTemplateId) {
    const ability = getAbilityById(draft.abilityId);
    const abilityName = ability?.name || '内容';
    const verb = abilityName.endsWith('生成') ? '' : '生成';
    const fieldList = draft.fields.map((f) => `${f.label}：{${f.id}}`).join('\n');
    const outputTypeLabel = this.getOutputTypeLabel(draft.outputType);

    let prompt = `请根据以下信息${verb}${abilityName}（${outputTypeLabel}）：\n${fieldList ? `\n${fieldList}\n` : ''}\n要求：结构清晰、语言专业、贴合场景。`;

    if (structureType && structureType !== 'free') {
      const chapters = this.getBuiltinStructureChapters(structureType);
      if (chapters.length > 0) {
        prompt += `\n\n请严格按照以下结构生成内容：\n${chapters.join('\n')}`;
      }
    } else if (contentTemplateId) {
      const ct = getContentTemplateById(contentTemplateId);
      const sections = ct?.content?.sections;
      if (sections && sections.length > 0) {
        prompt += `\n\n请严格按照以下结构生成内容：\n${sections.map((s) => s.title).join('\n')}`;
      }
    }

    return prompt;
  }

  getReviewFieldTypeLabel(type) {
    const labels = {
      [fieldTypes.TEXT]: '短文本',
      [fieldTypes.TEXTAREA]: '长文本',
      [fieldTypes.NUMBER]: '数字',
      [fieldTypes.SELECT]: '单选',
      [fieldTypes.MULTI_SELECT]: '多选',
      [fieldTypes.DATE]: '日期',
      [fieldTypes.FILE]: '文件',
    };
    return labels[type] || type;
  }

  renderCreatorReview() {
    const state = this.creatorReviewState;
    const draft = state.draftTemplate;
    const isFormSource = state.source === 'form';
    const stepText = isFormSource ? '第 2 步 / 共 2 步' : '确认提示词';

    // 保留滚动位置，避免重绘后跳回顶部
    const liveSnapshot = {
      reviewSidebar: document.querySelector('.wa-creator-review-sidebar')?.scrollTop || 0,
    };
    const usedLast = !!this._lastReviewScroll;
    const scrollSnapshot = this._lastReviewScroll || liveSnapshot;
    this._lastReviewScroll = null;

    const structures = this.getReviewStructures();
    const structureHtml = structures.map((s) => {
      const isActive = state.structureType === s.id;
      return `
        <div class="wa-review-structure-card ${isActive ? 'active' : ''} ${s.id === 'free' ? 'wa-review-structure-free' : ''}" data-structure="${s.id}">
          ${isActive ? '<div class="wa-review-structure-check"><i class="fa-solid fa-check"></i></div>' : ''}
          <div class="wa-review-structure-icon"><i class="fa-solid ${s.icon}"></i></div>
          <div class="wa-review-structure-name">${s.name}</div>
          <div class="wa-review-structure-meta">${s.meta}</div>
        </div>
      `;
    }).join('');

    const varTags = draft.fields.map((f) => `
      <span class="wa-review-var-tag" data-field="${f.id}">{${f.id}}</span>
    `).join('');

    const promptEditorHtml = this.renderReviewPromptEditor(draft, state);
    const formPreviewHtml = this.renderReviewFormPreview(draft);
    const testHtml = this.renderReviewTest(draft);

    this.container.innerHTML = `
      <header class="header">
        <div style="display:flex;align-items:center;gap:16px;">
          <button class="btn btn-ghost" id="wa-review-back"><i class="fa-solid fa-arrow-left"></i> 返回</button>
          <div>
            <h1 class="header-title" style="font-size:16px;">确认提示词</h1>
            <div style="font-size:12px;color:var(--kb-text-muted);margin-top:2px;">${stepText}</div>
          </div>
        </div>
        <button class="btn btn-ghost" id="wa-review-cancel">取消</button>
      </header>

      <div class="content wa-creator-review">
        <div class="wa-creator-review-layout">
          <div class="wa-creator-review-sidebar">
            <div class="wa-review-section">
              <div class="wa-review-section-title"><i class="fa-solid fa-list-check"></i> 字段管理</div>
              <div class="wa-review-fields">
                ${draft.fields.map((f, i) => this.renderReviewFieldItem(f, i)).join('')}
              </div>
              <button class="btn btn-sm btn-secondary wa-review-add-field" style="width:100%;margin-top:10px;"><i class="fa-solid fa-plus"></i> 添加字段</button>
            </div>

            <div class="wa-review-section">
              <div class="wa-review-section-title"><i class="fa-solid fa-sitemap"></i> 输出结构</div>
              <div class="wa-review-structure-grid">
                ${structureHtml}
              </div>
              <button class="btn btn-text wa-review-ct-btn" style="width:100%;margin-top:10px;">
                <i class="fa-solid fa-layer-group"></i> 从内容模板库选择
              </button>
              ${draft.contentTemplateId ? `
                <div class="wa-review-ct-selected">
                  <i class="fa-solid fa-file-lines"></i>
                  <span>${getContentTemplateById(draft.contentTemplateId)?.name || '已选择模板'}</span>
                  <button class="wa-review-ct-clear" title="清除"><i class="fa-solid fa-xmark"></i></button>
                </div>
              ` : ''}
            </div>

            <div class="wa-review-section">
              <div class="wa-review-section-title"><i class="fa-solid fa-tags"></i> 插入变量</div>
              <div class="wa-review-section-desc">点击变量可快速插入到提示词中</div>
              <div class="wa-review-var-tags">
                ${varTags || '<span class="wa-review-empty-vars">暂无可用变量</span>'}
              </div>
            </div>

            <div class="wa-review-section">
              <div class="wa-review-section-title"><i class="fa-solid fa-wand-magic-sparkles"></i> 重新生成</div>
              <div class="wa-review-section-desc">修改左侧配置后，可重新生成提示词</div>
              <button class="btn btn-primary wa-review-regenerate" style="width:100%;">
                <i class="fa-solid fa-rotate"></i> 重新生成提示词
              </button>
            </div>
          </div>

          <div class="wa-creator-review-preview">
            <div class="wa-review-tabs">
              <button class="wa-review-tab ${state.currentTab === 'prompt' ? 'active' : ''}" data-tab="prompt">
                <i class="fa-solid fa-terminal"></i> 提示词
              </button>
              <button class="wa-review-tab ${state.currentTab === 'form' ? 'active' : ''}" data-tab="form">
                <i class="fa-regular fa-rectangle-list"></i> 表单预览
              </button>
              <button class="wa-review-tab ${state.currentTab === 'test' ? 'active' : ''}" data-tab="test">
                <i class="fa-solid fa-play"></i> 测试生成
              </button>
            </div>

            <div class="wa-review-tab-content">
              <div class="wa-review-pane ${state.currentTab === 'prompt' ? 'active' : ''}" data-pane="prompt">
                ${promptEditorHtml}
              </div>
              <div class="wa-review-pane ${state.currentTab === 'form' ? 'active' : ''}" data-pane="form">
                ${formPreviewHtml}
              </div>
              <div class="wa-review-pane ${state.currentTab === 'test' ? 'active' : ''}" data-pane="test">
                ${testHtml}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="wa-creator-review-bottom">
        <div class="wa-review-bottom-hint">
          <i class="fa-solid fa-check-circle"></i>
          <span>提示词已生成，可编辑确认后保存</span>
        </div>
        <div class="wa-review-bottom-actions">
          <button class="btn btn-secondary" id="wa-review-back-edit">
            <i class="fa-solid fa-arrow-left"></i> 返回编辑
          </button>
          <button class="btn btn-primary" id="wa-review-save">
            <i class="fa-solid fa-check"></i> 保存模板
          </button>
        </div>
      </div>

      ${this.renderContentTemplateModal()}
      ${this.renderIconPickerModal()}
    `;

    this.bindCreatorReviewEvents();

    // 恢复滚动位置
    const restore = () => {
      const reviewSidebar = document.querySelector('.wa-creator-review-sidebar');
      if (reviewSidebar) reviewSidebar.scrollTop = scrollSnapshot.reviewSidebar;
    };
    restore();
    setTimeout(restore, 0);
  }

  captureReviewScroll() {
    return {
      reviewSidebar: document.querySelector('.wa-creator-review-sidebar')?.scrollTop || 0,
    };
  }

  renderReviewFieldItem(field, index) {
    const typeOptions = Object.entries(fieldTypes).map(([key, value]) => `<option value="${value}" ${field.type === value ? 'selected' : ''}>${this.getReviewFieldTypeLabel(value)}</option>`).join('');
    const showOptions = field.type === fieldTypes.SELECT || field.type === fieldTypes.MULTI_SELECT;
    const expanded = field._reviewExpanded === true;
    return `
      <div class="wa-review-field-item ${expanded ? 'expanded' : ''}" data-index="${index}">
        <div class="wa-review-field-header" data-index="${index}">
          <div class="wa-review-field-title">
            <span class="wa-review-field-name">${field.label || '未命名'}</span>
            <span class="wa-review-field-type">${this.getReviewFieldTypeLabel(field.type)}</span>
            ${field.required ? '<span class="wa-review-field-required">*</span>' : ''}
          </div>
          <div class="wa-review-field-actions">
            <button class="wa-review-field-btn wa-review-field-remove" data-index="${index}" title="删除"><i class="fa-solid fa-trash"></i></button>
            <button class="wa-review-field-btn wa-review-field-toggle" data-index="${index}" title="${expanded ? '收起' : '展开'}"><i class="fa-solid fa-${expanded ? 'chevron-up' : 'chevron-down'}"></i></button>
          </div>
        </div>
        <div class="wa-review-field-body" onclick="event.stopPropagation()">
          <div class="wa-form-item">
            <label class="wa-form-label">字段名称 <span class="wa-required">*</span></label>
            <input type="text" class="wa-input wa-review-field-label" data-index="${index}" value="${field.label}" placeholder="例如：客户需求">
          </div>
          <div class="wa-review-field-row">
            <div class="wa-form-item">
              <label class="wa-form-label">字段类型</label>
              <select class="wa-input wa-review-field-type" data-index="${index}">
                ${typeOptions}
              </select>
            </div>
            <div class="wa-form-item">
              <label class="wa-creator-field-checkbox">
                <input type="checkbox" class="wa-review-field-required" data-index="${index}" ${field.required ? 'checked' : ''}>
                <span>必填</span>
              </label>
            </div>
          </div>
          <div class="wa-form-item">
            <label class="wa-form-label">占位提示</label>
            <input type="text" class="wa-input wa-review-field-placeholder" data-index="${index}" value="${field.placeholder || ''}" placeholder="提示用户这里填什么">
          </div>
          <div class="wa-form-item wa-review-field-options ${showOptions ? '' : 'hidden'}">
            <label class="wa-form-label">选项（每行一个或逗号分隔）</label>
            <textarea class="wa-input wa-review-field-options-input" data-index="${index}" rows="2" placeholder="选项1，选项2，选项3">${(field.options || []).join('，')}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  renderReviewPromptEditor(draft, state) {
    const renderedPrompt = this.renderPromptHighlights(state.promptTemplate);
    return `
      <div class="wa-prompt-card">
        <div class="wa-prompt-header">
          <div class="wa-prompt-title"><i class="fa-solid fa-file-code"></i> AI 将收到这条提示词</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <div class="wa-prompt-mode-switch">
              <button class="wa-prompt-mode-btn wa-review-mode-btn ${state.promptMode === 'edit' ? 'active' : ''}" data-mode="edit">编辑</button>
              <button class="wa-prompt-mode-btn wa-review-mode-btn ${state.promptMode === 'preview' ? 'active' : ''}" data-mode="preview">预览</button>
            </div>
            <button class="btn btn-sm btn-secondary wa-review-copy-prompt"><i class="fa-regular fa-copy"></i> 复制</button>
          </div>
        </div>
        <div class="wa-review-prompt-body">
          <div class="wa-review-prompt-editor ${state.promptMode === 'edit' ? 'active' : ''}">
            <textarea class="wa-review-prompt-textarea" id="wa-review-prompt-textarea">${state.promptTemplate}</textarea>
          </div>
          <div class="wa-review-prompt-render ${state.promptMode === 'preview' ? 'active' : ''}">${renderedPrompt}</div>
        </div>
      </div>
    `;
  }

  renderPromptHighlights(text) {
    if (!text) return '<span style="color:var(--kb-text-muted);">暂无提示词</span>';
    return this.escapeHtml(text)
      .replace(/^(# .+)$/gm, '<span class="wa-review-prompt-section">$1</span>')
      .replace(/(\{[^}]+\})/g, '<span class="wa-review-prompt-var">$1</span>');
  }

  renderReviewFormPreview(draft) {
    const role = getRoleById(draft.roleId);
    const ability = getAbilityById(draft.abilityId);
    return `
      <div class="wa-review-form-preview-wrap">
        <div class="wa-review-form-preview-card">
          <div class="wa-review-form-preview-header">
            <div class="wa-review-form-preview-tag">${ability?.name || '文档'} · ${this.getOutputTypeLabel(draft.outputType)}</div>
            <div class="wa-review-form-preview-title">${draft.name || '未命名模板'}</div>
            <div class="wa-review-form-preview-desc">${draft.description || '请输入以下信息'}</div>
          </div>
          <div class="wa-review-form-preview-body">
            ${draft.fields.map((f) => this.renderReviewFormPreviewField(f)).join('')}
            <button class="wa-review-form-preview-generate"><i class="fa-solid fa-wand-magic-sparkles"></i> 开始生成</button>
          </div>
        </div>
      </div>
    `;
  }

  renderReviewFormPreviewField(field) {
    let input = '';
    if (field.type === fieldTypes.TEXTAREA) {
      input = `<div class="wa-review-form-preview-input wa-review-form-preview-textarea">${field.placeholder || '请输入'}</div>`;
    } else if (field.type === fieldTypes.NUMBER) {
      input = `<div class="wa-review-form-preview-input">${field.placeholder || '请输入数字'}</div>`;
    } else if (field.type === fieldTypes.DATE) {
      input = `<div class="wa-review-form-preview-input"><i class="fa-regular fa-calendar"></i> ${field.placeholder || '请选择日期'}</div>`;
    } else if (field.type === fieldTypes.FILE) {
      input = `<div class="wa-review-form-preview-input"><i class="fa-solid fa-paperclip"></i> ${field.placeholder || '点击上传文件'}</div>`;
    } else if (field.type === fieldTypes.SELECT || field.type === fieldTypes.MULTI_SELECT) {
      const opts = (field.options || []).slice(0, 3);
      if (opts.length === 0) {
        input = `<div class="wa-review-form-preview-input">${field.placeholder || '请选择'}</div>`;
      } else {
        input = `<div class="wa-review-form-preview-options">${opts.map((o) => `
          <div class="wa-review-form-preview-option">
            <div class="wa-review-form-preview-option-box" style="border-radius:${field.type === fieldTypes.SELECT ? '50%' : '3px'};"></div>
            <span>${o}</span>
          </div>
        `).join('')}</div>`;
      }
    } else {
      input = `<div class="wa-review-form-preview-input">${field.placeholder || '请输入'}</div>`;
    }
    return `
      <div class="wa-review-form-preview-field">
        <label class="wa-review-form-preview-label">${field.label}${field.required ? '<span class="wa-review-form-preview-required">*</span>' : ''}</label>
        ${input}
      </div>
    `;
  }

  renderReviewTest(draft) {
    return `
      <div class="wa-review-test-wrap">
        <div class="wa-review-test-card">
          <div class="wa-review-test-title"><i class="fa-solid fa-vial"></i> 填写测试值</div>
          <div class="wa-review-test-fields">
            ${draft.fields.map((f) => this.renderReviewTestField(f)).join('')}
          </div>
          <button class="btn btn-primary wa-review-run-test" style="width:100%;margin-top:8px;">
            <i class="fa-solid fa-play"></i> 运行测试生成
          </button>
          <div class="wa-review-test-result" id="wa-review-test-result">
            <div class="wa-review-test-result-title"><i class="fa-solid fa-sparkles"></i> 模拟生成结果</div>
            填入测试值后点击运行...
          </div>
        </div>
      </div>
    `;
  }

  renderReviewTestField(field) {
    if (field.type === fieldTypes.TEXTAREA) {
      return `<div class="wa-review-test-field"><label class="wa-review-test-label">${field.label}</label><textarea class="wa-input wa-review-test-input" data-id="${field.id}" rows="3" placeholder="${field.placeholder || ''}"></textarea></div>`;
    }
    if (field.type === fieldTypes.NUMBER) {
      return `<div class="wa-review-test-field"><label class="wa-review-test-label">${field.label}</label><input type="number" class="wa-input wa-review-test-input" data-id="${field.id}" placeholder="${field.placeholder || '请输入数字'}"></div>`;
    }
    if (field.type === fieldTypes.DATE) {
      return `<div class="wa-review-test-field"><label class="wa-review-test-label">${field.label}</label><input type="date" class="wa-input wa-review-test-input" data-id="${field.id}"></div>`;
    }
    if (field.type === fieldTypes.FILE) {
      return `<div class="wa-review-test-field"><label class="wa-review-test-label">${field.label}</label><input type="file" class="wa-input wa-review-test-input" data-id="${field.id}" style="padding:8px 12px;"></div>`;
    }
    if (field.type === fieldTypes.SELECT || field.type === fieldTypes.MULTI_SELECT) {
      const opts = field.options || [];
      if (opts.length === 0) {
        return `<div class="wa-review-test-field"><label class="wa-review-test-label">${field.label}</label><div style="padding:10px 12px;border:1.5px solid var(--kb-border);border-radius:8px;font-size:12px;color:var(--kb-text-muted);">未配置选项</div></div>`;
      }
      if (field.type === fieldTypes.SELECT) {
        return `<div class="wa-review-test-field"><label class="wa-review-test-label">${field.label}</label><select class="wa-input wa-review-test-input" data-id="${field.id}"><option value="">请选择</option>${opts.map((o) => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
      }
      return `<div class="wa-review-test-field"><label class="wa-review-test-label">${field.label}</label><div class="wa-review-test-checkbox-group">${opts.map((o) => `<label class="wa-review-test-checkbox"><input type="checkbox" value="${o}" data-id="${field.id}"> <span>${o}</span></label>`).join('')}</div></div>`;
    }
    return `<div class="wa-review-test-field"><label class="wa-review-test-label">${field.label}</label><input type="text" class="wa-input wa-review-test-input" data-id="${field.id}" placeholder="${field.placeholder || ''}"></div>`;
  }

  bindCreatorReviewEvents() {
    // 在 mousedown 时先记录滚动位置，防止后续重绘跳动
    this.container.addEventListener(
      'mousedown',
      (e) => {
        this._lastReviewScroll = this.captureReviewScroll();
        if (e.target.closest('.wa-review-field-header, .wa-review-field-toggle, .wa-review-add-field, .wa-review-field-remove, .wa-review-field-move')) {
          e.preventDefault();
        }
      },
      true
    );

    document.getElementById('wa-review-back')?.addEventListener('click', () => {
      this.creatorReviewState.active = false;
      this.render();
    });

    document.getElementById('wa-review-back-edit')?.addEventListener('click', () => {
      this.creatorReviewState.active = false;
      this.render();
    });

    document.getElementById('wa-review-cancel')?.addEventListener('click', () => {
      if (confirm('确定要取消创建吗？已填写的内容将不会保存。')) {
        this.creatorReviewState = {
          active: false,
          source: 'form',
          draftTemplate: null,
          currentTab: 'prompt',
          promptMode: 'preview',
          promptTemplate: '',
          structureType: 'free',
        };
        this.render();
      }
    });

    document.getElementById('wa-review-save')?.addEventListener('click', () => {
      this.confirmSaveTemplate();
    });

    this.container.querySelectorAll('.wa-review-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.creatorReviewState.currentTab = tab.dataset.tab;
        this.render();
      });
    });

    const promptTextarea = document.getElementById('wa-review-prompt-textarea');
    promptTextarea?.addEventListener('input', () => {
      this.creatorReviewState.promptTemplate = promptTextarea.value;
      this.creatorReviewState.promptMode = 'edit';
      this.updateReviewPromptRender();
    });

    this.container.querySelectorAll('.wa-review-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.creatorReviewState.promptMode = btn.dataset.mode;
        if (btn.dataset.mode === 'edit') {
          this.creatorReviewState.promptTemplate = document.getElementById('wa-review-prompt-textarea')?.value || this.creatorReviewState.promptTemplate;
        }
        this.render();
      });
    });

    this.container.querySelector('.wa-review-copy-prompt')?.addEventListener('click', () => {
      navigator.clipboard.writeText(this.creatorReviewState.promptTemplate);
      this.showToast('提示词已复制');
    });

    this.container.querySelectorAll('.wa-review-structure-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.creatorReviewState.structureType = card.dataset.structure;
        this.creatorReviewState.draftTemplate.contentTemplateId = null;
        this.render();
      });
    });

    document.querySelector('.wa-review-ct-btn')?.addEventListener('click', () => {
      this.ctModalOpen = true;
      this.ctModalForCreator = false;
      this.ctModalForReview = true;
      this.ctModalCategory = 'all';
      this.ctModalSearch = '';
      this.render();
    });

    this.container.querySelector('.wa-review-ct-clear')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.creatorReviewState.draftTemplate.contentTemplateId = null;
      this.render();
    });

    this.container.querySelectorAll('.wa-review-var-tag').forEach((tag) => {
      tag.addEventListener('click', () => {
        const fieldId = tag.dataset.field;
        const textarea = document.getElementById('wa-review-prompt-textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const insert = `{${fieldId}}`;
        textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + insert.length;
        textarea.focus();
        this.creatorReviewState.promptTemplate = textarea.value;
        this.creatorReviewState.promptMode = 'edit';
        this.updateReviewPromptRender();
      });
    });

    document.querySelector('.wa-review-regenerate')?.addEventListener('click', () => {
      this.regenerateReviewPrompt();
    });

    this.container.querySelectorAll('.wa-review-field-header').forEach((header) => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.wa-review-field-actions')) return;
        e.preventDefault();
        const index = parseInt(header.dataset.index);
        const field = this.creatorReviewState.draftTemplate.fields[index];
        if (!field) return;
        // 只允许展开一个字段；展开新字段时合上其他字段
        const willExpand = !field._reviewExpanded;
        this.creatorReviewState.draftTemplate.fields.forEach((f) => {
          f._reviewExpanded = false;
        });
        if (willExpand) {
          field._reviewExpanded = true;
        }
        this.render();
      });
    });

    this.container.querySelectorAll('.wa-review-field-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const index = parseInt(btn.dataset.index);
        const field = this.creatorReviewState.draftTemplate.fields[index];
        if (!field) return;
        // 只允许展开一个字段；展开新字段时合上其他字段
        const willExpand = !field._reviewExpanded;
        this.creatorReviewState.draftTemplate.fields.forEach((f) => {
          f._reviewExpanded = false;
        });
        if (willExpand) {
          field._reviewExpanded = true;
        }
        this.render();
      });
    });

    this.container.querySelectorAll('.wa-review-field-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        if (this.creatorReviewState.draftTemplate.fields.length <= 1) {
          this.showToast('至少保留一个字段', 'error');
          return;
        }
        this.creatorReviewState.draftTemplate.fields.splice(index, 1);
        this.render();
      });
    });

    document.querySelector('.wa-review-add-field')?.addEventListener('click', () => {
      const fields = this.creatorReviewState.draftTemplate.fields;
      const index = fields.length + 1;
      fields.push({
        id: `field_${Date.now()}`,
        type: fieldTypes.TEXT,
        label: `新字段 ${index}`,
        placeholder: '',
        required: false,
        _reviewExpanded: true,
      });
      this.render();
    });

    this.container.querySelectorAll('.wa-review-field-label').forEach((input) => {
      input.addEventListener('input', () => {
        const index = parseInt(input.dataset.index);
        const field = this.creatorReviewState.draftTemplate.fields[index];
        if (!field) return;
        const prevLabel = field.label;
        field.label = input.value;
        if (input.value.trim() && (!field.id || field.id === this.generateFieldId(prevLabel) || field.id.startsWith('field_'))) {
          field.id = this.generateFieldId(input.value);
        }
        this.updateReviewVarTags();
        this.updateReviewFormPreview();
      });
    });

    this.container.querySelectorAll('.wa-review-field-type').forEach((select) => {
      select.addEventListener('change', () => {
        const index = parseInt(select.dataset.index);
        const field = this.creatorReviewState.draftTemplate.fields[index];
        if (!field) return;
        field.type = select.value;
        if (field.type === fieldTypes.SELECT || field.type === fieldTypes.MULTI_SELECT) {
          if (!field.options) field.options = [];
        }
        this.render();
      });
    });

    this.container.querySelectorAll('.wa-review-field-required').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const index = parseInt(checkbox.dataset.index);
        const field = this.creatorReviewState.draftTemplate.fields[index];
        if (field) field.required = checkbox.checked;
        this.updateReviewFormPreview();
      });
    });

    this.container.querySelectorAll('.wa-review-field-placeholder').forEach((input) => {
      input.addEventListener('input', () => {
        const index = parseInt(input.dataset.index);
        const field = this.creatorReviewState.draftTemplate.fields[index];
        if (field) field.placeholder = input.value;
        this.updateReviewFormPreview();
      });
    });

    this.container.querySelectorAll('.wa-review-field-options-input').forEach((textarea) => {
      textarea.addEventListener('input', () => {
        const index = parseInt(textarea.dataset.index);
        const field = this.creatorReviewState.draftTemplate.fields[index];
        if (field) field.options = textarea.value.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean);
      });
    });

    document.querySelector('.wa-review-run-test')?.addEventListener('click', () => {
      this.runReviewTest();
    });

    this.bindContentTemplateModalEvents();
    this.bindIconPickerModalEvents();
  }

  updateReviewPromptRender() {
    const render = this.container.querySelector('.wa-review-prompt-render');
    if (render) {
      render.innerHTML = this.renderPromptHighlights(this.creatorReviewState.promptTemplate);
    }
  }

  updateReviewVarTags() {
    const draft = this.creatorReviewState.draftTemplate;
    const container = this.container.querySelector('.wa-review-var-tags');
    if (container) {
      container.innerHTML = draft.fields.map((f) => `
        <span class="wa-review-var-tag" data-field="${f.id}">{${f.id}}</span>
      `).join('');
      container.querySelectorAll('.wa-review-var-tag').forEach((tag) => {
        tag.addEventListener('click', () => {
          const fieldId = tag.dataset.field;
          const textarea = document.getElementById('wa-review-prompt-textarea');
          if (!textarea) return;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const insert = `{${fieldId}}`;
          textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + insert.length;
          textarea.focus();
          this.creatorReviewState.promptTemplate = textarea.value;
          this.creatorReviewState.promptMode = 'edit';
          this.updateReviewPromptRender();
        });
      });
    }
  }

  updateReviewFormPreview() {
    const draft = this.creatorReviewState.draftTemplate;
    const container = this.container.querySelector('.wa-review-form-preview-body');
    if (container) {
      container.innerHTML = draft.fields.map((f) => this.renderReviewFormPreviewField(f)).join('') + `
        <button class="wa-review-form-preview-generate"><i class="fa-solid fa-wand-magic-sparkles"></i> 开始生成</button>
      `;
    }
  }

  regenerateReviewPrompt() {
    const draft = this.creatorReviewState.draftTemplate;
    this.creatorReviewState.promptTemplate = this.generateReviewPrompt(draft, this.creatorReviewState.structureType, draft.contentTemplateId);
    this.creatorReviewState.promptMode = 'preview';
    this.render();
  }

  runReviewTest() {
    const draft = this.creatorReviewState.draftTemplate;
    const values = draft.fields.map((f) => {
      if (f.type === fieldTypes.MULTI_SELECT) {
        const checked = this.container.querySelectorAll(`input[type="checkbox"][data-id="${f.id}"]:checked`);
        return Array.from(checked).map((c) => c.value).join(', ');
      }
      if (f.type === fieldTypes.FILE) {
        const el = this.container.querySelector(`input[type="file"][data-id="${f.id}"]`);
        return el && el.files.length > 0 ? el.files[0].name : '';
      }
      const el = this.container.querySelector(`.wa-review-test-input[data-id="${f.id}"]`);
      return el ? (el.value || '').trim() : '';
    });

    if (values.every((v) => !v)) {
      this.showToast('请至少填写一个测试值', 'error');
      return;
    }

    const resultEl = document.getElementById('wa-review-test-result');
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="wa-review-test-result-title"><i class="fa-solid fa-sparkles"></i> 模拟生成结果</div>
        <div style="color:var(--kb-text-muted);margin-bottom:8px;">已收到以下输入：</div>
        ${draft.fields.map((f, i) => `<div style="margin-bottom:6px;"><strong>${f.label}：</strong>${values[i] || '（未填写）'}</div>`).join('')}
        <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--kb-border);color:var(--kb-text);">
          系统将基于上述输入和当前提示词结构生成最终内容。此处为模拟展示，真实场景会调用大模型生成。
        </div>
      `;
    }
  }

  collectReviewFields() {
    const draft = this.creatorReviewState.draftTemplate;
    this.container.querySelectorAll('.wa-review-field-label').forEach((input) => {
      const index = parseInt(input.dataset.index);
      const field = draft.fields[index];
      if (field) field.label = input.value;
    });
    this.container.querySelectorAll('.wa-review-field-type').forEach((select) => {
      const index = parseInt(select.dataset.index);
      const field = draft.fields[index];
      if (field) field.type = select.value;
    });
    this.container.querySelectorAll('.wa-review-field-required').forEach((checkbox) => {
      const index = parseInt(checkbox.dataset.index);
      const field = draft.fields[index];
      if (field) field.required = checkbox.checked;
    });
    this.container.querySelectorAll('.wa-review-field-placeholder').forEach((input) => {
      const index = parseInt(input.dataset.index);
      const field = draft.fields[index];
      if (field) field.placeholder = input.value;
    });
    this.container.querySelectorAll('.wa-review-field-options-input').forEach((textarea) => {
      const index = parseInt(textarea.dataset.index);
      const field = draft.fields[index];
      if (field) field.options = textarea.value.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean);
    });
  }

  confirmSaveTemplate() {
    const state = this.creatorReviewState;
    const draft = state.draftTemplate;
    if (!draft) return;

    this.collectReviewFields();

    if (!draft.name.trim()) {
      this.showToast('请填写模板名称', 'error');
      return;
    }
    if (draft.fields.length === 0) {
      this.showToast('请至少添加一个字段', 'error');
      return;
    }
    const invalidField = draft.fields.find((f) => !f.id.trim() || !f.label.trim());
    if (invalidField) {
      this.showToast('字段ID和名称不能为空', 'error');
      return;
    }

    const ability = getAbilityById(draft.abilityId);
    let defaultMode = draft.defaultMode || 'kb';
    if (defaultMode === 'kb' && !ability?.supportsKB) defaultMode = 'free';
    if (defaultMode === 'free' && !ability?.supportsFree) defaultMode = 'kb';

    const cleanFields = draft.fields.map((f) => {
      const { _reviewExpanded, ...rest } = f;
      return rest;
    });

    const template = {
      ...draft,
      fields: cleanFields,
      name: draft.name.trim(),
      promptTemplate: state.promptTemplate,
      defaultMode,
      id: this.editingTemplateId || generateId('tmpl'),
      isCustom: true,
      recommendedKBs: [],
    };

    const isEdit = !!this.editingTemplateId;
    saveCustomTemplate(template);
    this.editingTemplateId = null;
    this.creatorReviewState = {
      active: false,
      source: 'form',
      draftTemplate: null,
      currentTab: 'prompt',
      promptMode: 'preview',
      promptTemplate: '',
      structureType: 'free',
    };
    this.creatorForm = this.getDefaultCreatorForm();
    this.extractPreview = null;
    this.conversationState = this.getDefaultConversationState();
    this.showToast(isEdit ? '模板已更新' : '模板已保存到「我的模板」');
    this.activeTab = 'templateMarket';
    this.marketTab = 'mine';
    this.render();
  }

  // ===================== 表单创建 =====================

  goToCreatorReviewFromForm() {
    this.collectCreatorBasic();
    this.collectCreatorFields();
    this.collectCreatorOutputConfig();

    if (!this.creatorForm.name.trim()) {
      this.showToast('请填写模板名称', 'error');
      document.getElementById('creator-name')?.focus();
      return;
    }
    if (this.creatorForm.fields.length === 0) {
      this.showToast('请至少添加一个字段', 'error');
      return;
    }
    const invalidField = this.creatorForm.fields.find((f) => !f.label.trim());
    if (invalidField) {
      this.showToast('字段名称不能为空', 'error');
      this.creatorForm.fields.forEach((f, i) => {
        if (!f.label.trim()) f._expanded = true;
      });
      this.render();
      return;
    }

    const cleanFields = this.creatorForm.fields.map((f) => {
      const { _expanded, ...rest } = f;
      return rest;
    });

    const { activePromptStyle, currentStep, promptGenerationIndex, structureType, ...formRest } = this.creatorForm;
    const draftTemplate = {
      ...formRest,
      fields: cleanFields,
      id: this.editingTemplateId || generateId('tmpl'),
      isCustom: true,
      recommendedKBs: [],
    };

    const ability = getAbilityById(draftTemplate.abilityId);
    if (draftTemplate.defaultMode === 'kb' && !ability?.supportsKB) draftTemplate.defaultMode = 'free';
    if (draftTemplate.defaultMode === 'free' && !ability?.supportsFree) draftTemplate.defaultMode = 'kb';

    const reviewStructureType = draftTemplate.contentTemplateId ? 'free' : (structureType || 'free');

    this.creatorReviewState = {
      active: true,
      source: 'form',
      draftTemplate,
      currentTab: 'prompt',
      promptMode: 'preview',
      promptTemplate: this.generateReviewPrompt(draftTemplate, reviewStructureType, draftTemplate.contentTemplateId),
      structureType: reviewStructureType,
    };

    this.render();
  }

  renderCreatorFormView() {
    const config = `
      <div class="wa-creator-form-card-body">
        ${this.renderCreatorBasicSection()}
        ${this.renderCreatorFieldsSection()}
        ${this.renderCreatorStructureSection()}
      </div>
    `;

    const footer = `
      <div class="wa-creator-form-hint" id="wa-creator-form-hint">
        <i class="fa-solid fa-circle-info"></i>
        <span>请填写模板名称和至少一个输入字段</span>
      </div>
      <div class="wa-creator-form-actions">
        <button class="btn btn-text" id="wa-creator-cancel">取消</button>
        <button class="btn btn-primary" id="wa-creator-generate-review" disabled>
          <i class="fa-solid fa-wand-magic-sparkles"></i> 生成提示词
        </button>
      </div>
    `;

    return this.renderCreatorPanel({
      variant: 'form',
      title: '创建场景模板',
      desc: '填写基本信息和输入字段，系统将据此生成完整的 AI 提示词。',
      config,
      preview: `<div id="wa-creator-form-preview-content">${this.renderCreatorPreview()}</div>`,
      footer,
      extra: `${this.renderContentTemplateModal()}${this.renderIconPickerModal()}`,
    });
  }

  renderCreatorStructureSection() {
    const structures = this.getReviewStructures();
    const state = this.creatorForm;
    const structureHtml = structures.map((s) => {
      const isActive = state.structureType === s.id;
      return `
        <div class="structure-card wa-creator-structure-card ${isActive ? 'active' : ''} ${s.id === 'free' ? 'structure-card-free' : ''}" data-structure="${s.id}">
          ${isActive ? '<div class="structure-card-check"><i class="fa-solid fa-check"></i></div>' : ''}
          <div class="structure-card-icon"><i class="fa-solid ${s.icon}"></i></div>
          <div class="structure-card-name">${s.name}</div>
          <div class="structure-card-meta">${s.meta}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="wa-creator-section structure-section" id="creator-section-structure">
        <div class="structure-section-header">
          <div class="structure-section-title"><i class="fa-solid fa-sitemap"></i> 输出结构 <span style="font-weight:400;color:#9ca3af;">（可选）</span></div>
          <button class="wa-creator-ct-link" type="button">
            <i class="fa-solid fa-layer-group"></i> 从内容模板库选择
          </button>
        </div>
        <div class="structure-cards">
          ${structureHtml}
        </div>
        ${state.contentTemplateId ? `
          <div class="wa-review-ct-selected">
            <i class="fa-solid fa-file-lines"></i>
            <span>${getContentTemplateById(state.contentTemplateId)?.name || '已选择模板'}</span>
            <button class="wa-review-ct-clear" id="wa-creator-ct-clear" title="清除"><i class="fa-solid fa-xmark"></i></button>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderCreatorBasicSection() {
    const form = this.creatorForm;
    const allowedOutputs = this.getAbilityOutputTypes(form.abilityId);

    const abilityOptions = workAbilities.map((a) => {
      const isSelected = form.abilityId === a.id;
      return `<option value="${a.id}" ${isSelected ? 'selected' : ''}>${a.name}</option>`;
    }).join('');

    const outputFormatLabels = {
      [outputTypes.TEXT]: '纯文本',
      [outputTypes.MARKDOWN]: 'Markdown',
      [outputTypes.EMAIL]: '邮件',
      [outputTypes.LIST]: '清单列表',
      [outputTypes.STEPS]: '步骤流程',
      [outputTypes.TABLE]: '表格',
      [outputTypes.PPT]: 'PPT',
      [outputTypes.REPORT]: '报告',
    };

    const outputOptions = allowedOutputs.map((ot) => {
      const isSelected = form.outputType === ot;
      return `<option value="${ot}" ${isSelected ? 'selected' : ''}>${outputFormatLabels[ot] || ot}</option>`;
    }).join('');

    return `
      <div class="wa-creator-section wa-creator-section-basic" id="creator-section-basic">
        <div class="section-title"><i class="fa-solid fa-circle-info"></i> 基本信息</div>
        <div class="form-group">
          <label class="form-label">模板名称 <span class="required">*</span></label>
          <input type="text" class="form-input" id="creator-name" value="${form.name}" placeholder="例如：客户方案生成">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">内容类型 <span class="required">*</span></label>
            <select class="form-select" id="creator-ability">
              ${abilityOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">输出格式 <span class="required">*</span></label>
            <select class="form-select" id="creator-output-type">
              ${outputOptions}
            </select>
          </div>
        </div>
      </div>
    `;
  }

  renderCreatorFieldsSection() {
    const fields = this.creatorForm.fields;
    return `
      <div class="wa-creator-section" id="creator-section-fields">
        <div class="section-title"><i class="fa-solid fa-list-check"></i> 输入字段 <span class="required">*</span></div>
        <div class="wa-creator-section-subtitle">用户将来需要填写的内容；点击字段即可展开编辑</div>
        <div class="fields-list">
          ${fields.length === 0 ? '<div class="wa-creator-empty-fields">还没有字段，点击下方按钮开始添加</div>' : ''}
          ${fields.map((field, index) => this.renderCreatorFieldItem(field, index)).join('')}
        </div>
        <button class="add-field-btn" id="wa-creator-add-field" type="button"><i class="fa-solid fa-plus"></i> 添加字段</button>
      </div>
    `;
  }

  renderCreatorFieldItem(field, index) {
    const typeOptions = Object.entries(fieldTypes).map(([key, value]) => `<option value="${value}" ${field.type === value ? 'selected' : ''}>${this.getReviewFieldTypeLabel(value)}</option>`).join('');
    const showOptions = field.type === fieldTypes.SELECT || field.type === fieldTypes.MULTI_SELECT;
    const expanded = field._expanded === true;
    const typeLabel = this.getReviewFieldTypeLabel(field.type);
    const initial = (field.label || '未').charAt(0);

    return `
      <div class="field-item ${expanded ? 'active' : ''}" data-index="${index}">
        <div class="field-item-main wa-creator-field-header" data-index="${index}">
          <i class="fa-solid fa-grip-vertical field-drag"></i>
          <div class="field-icon">${initial}</div>
          <div class="field-info">
            <div class="field-name">${field.label || '未命名'}${field.required ? '<span class="required">*</span>' : ''}</div>
            <div class="field-meta">${typeLabel}${field.required ? ' · 必填' : ''}</div>
          </div>
          <div class="field-actions">
            <button class="field-action wa-creator-field-toggle" data-index="${index}" title="${expanded ? '收起' : '编辑'}"><i class="fa-solid fa-${expanded ? 'chevron-up' : 'pen'}"></i></button>
            <button class="field-action wa-creator-field-remove" data-index="${index}" title="删除"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        ${expanded ? `
        <div class="field-editor" onclick="event.stopPropagation()">
          <div class="field-editor-header">
            <div class="field-editor-title">编辑字段：${field.label || '未命名'}</div>
            <div class="field-editor-actions">
              <button class="field-action wa-creator-field-remove" data-index="${index}" title="删除"><i class="fa-solid fa-trash"></i></button>
              <button class="btn btn-primary btn-sm wa-creator-field-done" data-index="${index}">完成</button>
            </div>
          </div>
          <div class="wa-creator-field-edit-row">
            <div class="wa-form-item">
              <label class="wa-form-label">字段名称 <span class="wa-required">*</span></label>
              <input type="text" class="wa-input wa-creator-field-label" data-index="${index}" data-prop="label" value="${field.label}" placeholder="例如：客户需求">
            </div>
            <div class="wa-form-item">
              <label class="wa-form-label">字段类型</label>
              <select class="wa-input wa-creator-field-type" data-index="${index}" data-prop="type">
                ${typeOptions}
              </select>
            </div>
          </div>
          <div class="wa-creator-field-edit-row">
            <div class="wa-form-item">
              <label class="wa-form-label">占位提示</label>
              <input type="text" class="wa-input wa-creator-field-placeholder" data-index="${index}" data-prop="placeholder" value="${field.placeholder || ''}" placeholder="提示用户这里填什么">
            </div>
            <div class="wa-form-item wa-creator-field-options-row ${showOptions ? '' : 'hidden'}">
              <label class="wa-form-label">选项（每行一个或逗号分隔）</label>
              <textarea class="wa-input wa-creator-field-options" data-index="${index}" data-prop="options" rows="2" placeholder="选项1，选项2，选项3">${(field.options || []).join('，')}</textarea>
            </div>
          </div>
          <div class="wa-creator-field-edit-row">
            <label class="wa-creator-field-checkbox">
              <input type="checkbox" class="wa-creator-field-required" data-index="${index}" data-prop="required" ${field.required ? 'checked' : ''}>
              <span>必填</span>
            </label>
          </div>
        </div>
        ` : ''}
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
          <div class="wa-creator-prompt-label-row">
            <label class="wa-form-label">提示词模板</label>
            <button class="btn btn-sm btn-primary wa-creator-ai-generate-btn" type="button" ${form.aiGenerating ? 'disabled' : ''}>
              ${form.aiGenerating ? '<i class="fa-solid fa-circle-notch fa-spin"></i> 生成中...' : (form.promptGenerationIndex > 0 ? '<i class="fa-solid fa-rotate"></i> 重新生成' : '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 生成')}
            </button>
          </div>
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

  generateAIPrompt() {
    const form = this.creatorForm;
    form.aiGenerating = true;
    this.render();

    setTimeout(() => {
      const ability = getAbilityById(form.abilityId);
      const abilityName = ability?.name || '内容';
      const verb = abilityName.endsWith('生成') ? '' : '生成';
      const fieldList = form.fields.map((f) => `${f.label}：{${f.id}}`).join('\n');
      const fieldRefs = form.fields.map((f) => `{${f.id}}`).join('、');
      const outputTypeMap = {
        [outputTypes.TEXT]: '纯文本',
        [outputTypes.TABLE]: '表格',
        [outputTypes.REPORT]: '报告',
        [outputTypes.PPT]: 'PPT',
        [outputTypes.EMAIL]: '邮件',
        [outputTypes.LIST]: '清单',
        [outputTypes.STEPS]: '步骤',
      };
      const outputTypeLabel = outputTypeMap[form.outputType] || '内容';
      const columns = form.outputConfig?.columns || [];
      const columnsHint = columns.length > 0 ? `，建议包含以下维度/章节：${columns.join('、')}` : '';

      const styles = [
        {
          label: '结构化专业版',
          text: `你是一位资深的${abilityName}专家。请基于以下信息${verb}一份${outputTypeLabel}：

${fieldList}

要求：
1. 结构清晰，逻辑严密；
2. 使用专业、正式的商务语气；
3. 输出为${outputTypeLabel}格式${columnsHint}；
4. 确保内容可直接用于实际工作场景。`,
        },
        {
          label: '角色任务版',
          text: `角色：你是一位经验丰富的${abilityName}顾问。
任务：根据用户提供的信息${verb}一份高质量${outputTypeLabel}。

输入信息：
${fieldList}

执行要求：
- 先理解需求，再组织内容；
- 重点突出${fieldRefs}等关键信息；
- 语气专业、表达流畅；
- 最终输出须为${outputTypeLabel}形式${columnsHint}。`,
        },
        {
          label: '示例驱动版',
          text: `请根据以下字段信息${verb}${outputTypeLabel}：

${fieldList}

参考思路：
1. 开篇点明核心主题；
2. 围绕${fieldRefs}逐层展开；
3. 结尾给出总结或下一步建议。

输出要求：
- 格式：${outputTypeLabel}${columnsHint}；
- 风格：${form.activePromptStyle || '专业正式'}；
- 质量：信息准确、表达自然、可直接复用。`,
        },
      ];

      const index = form.promptGenerationIndex % styles.length;
      const selected = styles[index];
      form.promptTemplate = selected.text;
      form.activePromptStyle = 'AI ' + selected.label;
      form.promptGenerationIndex += 1;
      form.aiGenerating = false;

      this.render();
      this.showToast(`已${form.promptGenerationIndex > 1 ? '重新' : ''}生成「${selected.label}」提示词`);

      const textarea = document.getElementById('creator-prompt-template');
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 800);
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
    const contentTemplate = form.contentTemplateId
      ? (this.getContentTemplatesForCreator(form.outputType).find((t) => t.id === form.contentTemplateId) || null)
      : null;

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
        <div class="wa-creator-summary-item">
          <span class="wa-creator-summary-label">关联内容模板</span>
          <span class="wa-creator-summary-value">${contentTemplate ? contentTemplate.name : '自由生成'}</span>
        </div>
      </div>
    `;
  }

  renderCreatorPreview() {
    const form = this.creatorForm;
    const role = getRoleById(form.roleId);
    const ability = getAbilityById(form.abilityId);
    const outputLabel = this.getOutputTypeLabel(form.outputType);
    const contentTemplate = form.contentTemplateId
      ? (this.getContentTemplatesForCreator(form.outputType).find((t) => t.id === form.contentTemplateId) || null)
      : null;

    return `
      <div class="wa-preview-card-header">
        <div class="wa-creator-preview-icon"><i class="fa-solid fa-${form.icon || 'file-lines'}"></i></div>
        <div class="wa-creator-preview-info">
          <div class="wa-creator-preview-name">${form.name || '未命名模板'}</div>
          <div class="wa-creator-preview-meta">
            <span class="wa-preview-tag" style="--tag-color:${role?.color || '#10b981'}">${role?.name || '未指定岗位'}</span>
            <span class="wa-preview-tag">${ability?.name || '写作'}</span>
            <span class="wa-preview-tag">${outputLabel}</span>
          </div>
          ${contentTemplate ? `<div class="wa-creator-preview-meta"><span class="wa-preview-tag wa-preview-tag-link"><i class="fa-solid fa-layer-group"></i> ${contentTemplate.name}</span></div>` : ''}
        </div>
      </div>
      <div class="wa-creator-preview-fields">
        ${form.fields.length === 0 ? '<div class="wa-preview-empty"><i class="fa-regular fa-pen-to-square"></i><span>暂无字段，添加字段后即可在此处预览。</span></div>' : form.fields.map((f) => `
          <div class="wa-creator-preview-field">
            <div class="wa-preview-field-main">
              <span class="wa-field-status ${f.label.trim() ? 'wa-field-status--collected' : 'wa-field-status--pending'}"></span>
              <span class="wa-creator-preview-label">${f.label || '未命名字段'}${f.required ? ' *' : ''}</span>
            </div>
            <span class="wa-creator-preview-type">${this.getFieldTypeLabel(f.type)}</span>
          </div>
        `).join('')}
      </div>
      <div class="wa-preview-card-desc">${form.description || '暂无描述'}</div>
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
    const outputLabel = this.getOutputTypeLabel(form.outputType);

    return `
      <div class="wa-preview-card-header">
        <div class="wa-creator-preview-icon"><i class="fa-solid fa-${form.icon || 'file-lines'}"></i></div>
        <div class="wa-creator-preview-info">
          <div class="wa-creator-preview-name">${form.name || '未命名模板'}</div>
          <div class="wa-creator-preview-meta">
            <span class="wa-preview-tag" style="--tag-color:${role?.color || '#10b981'}">${role?.name || ''}</span>
            <span class="wa-preview-tag">${ability?.name || ''}</span>
            <span class="wa-preview-tag">${outputLabel}</span>
          </div>
        </div>
      </div>
      <div class="wa-creator-preview-fields">
        ${form.fields.map((f) => `
          <div class="wa-creator-preview-field">
            <div class="wa-preview-field-main">
              <span class="wa-field-status wa-field-status--collected"></span>
              <span class="wa-creator-preview-label">${f.label}${f.required ? ' *' : ''}</span>
            </div>
            <span class="wa-creator-preview-type">${this.getFieldTypeLabel(f.type)}</span>
          </div>
        `).join('')}
      </div>
      <div class="wa-preview-card-desc">${form.description || '暂无描述'}</div>
    `;
  }

  renderCreatorExtractView() {
    const fileUploadHtml = this.renderFileUploadSection();
    const hasPreview = !!this.extractPreview;

    const config = `
      <div class="wa-creator-form-card-body">
        ${fileUploadHtml}
        <div class="wa-creator-section">
          <div class="wa-creator-section-title"><i class="fa-solid fa-file-lines"></i> 示例文本</div>
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
                ${Object.entries(outputTypes).map(([key, value]) => `<option value="${value}" ${this.extractForm.outputType === value ? 'selected' : ''}>${this.getOutputTypeLabel(value)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="wa-form-item">
            <label class="wa-form-label">粘贴一段示例内容 <span class="wa-required">*</span></label>
            <textarea class="wa-input" id="extract-example" rows="8" placeholder="粘贴一段你希望模板生成的示例内容。系统会自动识别其中的变量和结构。">${this.extractForm.exampleText}</textarea>
          </div>
          <button class="btn btn-primary btn-pill" id="wa-extract-start" style="width:100%;"><i class="fa-solid fa-wand-magic-sparkles"></i> 识别结构</button>
        </div>
      </div>
    `;

    const preview = hasPreview ? this.renderCreatorExtractPreview() : `
      <div class="wa-preview-card-header">
        <div class="wa-creator-preview-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="wa-creator-preview-info">
          <div class="wa-creator-preview-name">识别结果</div>
          <div class="wa-creator-preview-meta">
            <span class="wa-preview-tag">等待识别</span>
          </div>
        </div>
      </div>
      <div class="wa-preview-empty">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>在左侧粘贴示例、上传文件并点击识别后，将在这里预览提取的字段。</span>
      </div>
    `;

    const footer = hasPreview ? `
      <div class="wa-preview-live"><span></span> Live</div>
      <div class="wa-creator-form-actions">
        <button class="btn btn-text" id="wa-extract-cancel">取消</button>
        <button class="btn btn-primary btn-pill" id="wa-extract-confirm-review"><i class="fa-solid fa-arrow-right"></i> 进入确认页</button>
      </div>
    ` : `
      <div class="wa-preview-hint"><i class="fa-regular fa-lightbulb"></i><span>AI 将自动识别结构</span></div>
      <div></div>
    `;

    return this.renderCreatorPanel({
      variant: 'extract',
      title: '<i class="fa-solid fa-wand-magic-sparkles"></i> 从示例提取模板',
      desc: '上传文件或粘贴示例内容，AI 会自动识别结构并生成模板。',
      config,
      preview,
      footer,
    });
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
      <div class="wa-preview-card-header">
        <div class="wa-creator-preview-icon"><i class="fa-solid fa-${preview.icon || 'file-lines'}"></i></div>
        <div class="wa-creator-preview-info">
          <div class="wa-creator-preview-name">${preview.name || '未命名模板'}</div>
          <div class="wa-creator-preview-meta">
            <span class="wa-preview-tag" style="--tag-color:${getRoleById(preview.roleId)?.color || '#10b981'}">${getRoleById(preview.roleId)?.name || ''}</span>
            <span class="wa-preview-tag">${getAbilityById(preview.abilityId)?.name || ''}</span>
            <span class="wa-preview-tag">${this.getOutputTypeLabel(preview.outputType)}</span>
          </div>
        </div>
      </div>
      ${fileSummary}
      <div class="wa-creator-preview-fields">
        ${preview.fields.map((f) => `
          <div class="wa-creator-preview-field">
            <div class="wa-preview-field-main">
              <span class="wa-field-status wa-field-status--collected"></span>
              <span class="wa-creator-preview-label">${f.label}${f.required ? ' *' : ''}</span>
            </div>
            <span class="wa-creator-preview-type">${this.getFieldTypeLabel(f.type)}</span>
          </div>
        `).join('')}
      </div>
      <div class="wa-preview-card-desc">${preview.description || '暂无描述'}</div>
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
    // 在 mousedown 时先记录滚动位置，并阻止浏览器自动滚动目标元素
    this.container.addEventListener(
      'mousedown',
      (e) => {
        this._lastCreatorScroll = this.captureCreatorScroll();
        if (e.target.closest('.wa-creator-field-header, .add-field-btn, .wa-creator-field-toggle, .wa-creator-field-done')) {
          e.preventDefault();
        }
      },
      true
    );

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
      // 取消创建
      document.getElementById('wa-creator-cancel')?.addEventListener('click', () => {
        this.activeTab = 'home';
        this.creatorForm = this.getDefaultCreatorForm();
        this.render();
      });

      // 生成提示词并进入统一确认页
      const startReview = () => this.goToCreatorReviewFromForm();
      document.getElementById('wa-creator-generate-review')?.addEventListener('click', startReview);

      // 输出结构卡片点击
      this.container.querySelectorAll('.wa-creator-structure-card').forEach((card) => {
        card.addEventListener('click', () => {
          this.creatorForm.structureType = card.dataset.structure;
          if (this.creatorForm.structureType !== 'free') {
            this.creatorForm.contentTemplateId = null;
          }
          this.render();
        });
      });

      // 内容模板库选择
      this.container.querySelector('.wa-creator-ct-link')?.addEventListener('click', () => {
        this.ctModalOpen = true;
        this.ctModalForCreator = true;
        this.ctModalForReview = false;
        this.ctModalCategory = 'all';
        this.ctModalSearch = '';
        this.render();
      });

      this.container.querySelector('#wa-creator-ct-clear')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.creatorForm.contentTemplateId = null;
        this.render();
      });

      // 基本信息变更
      const nameInput = document.getElementById('creator-name');
      if (nameInput) {
        nameInput.addEventListener('input', () => {
          this.collectCreatorBasic();
          this.updateStep1GenerateButton();
          this.updateCreatorFormPreview();
        });
      }

      const abilitySelect = document.getElementById('creator-ability');
      if (abilitySelect) {
        abilitySelect.addEventListener('change', () => {
          const typeId = abilitySelect.value;
          this.creatorForm.abilityId = typeId;
          const ability = getAbilityById(typeId);
          const newOutputType = this.getDefaultOutputType(typeId);
          this.creatorForm.outputType = newOutputType;
          this.creatorForm.icon = this.getRecommendedIcon(typeId, newOutputType);
          if (this.creatorForm.defaultMode === 'kb' && !ability?.supportsKB) {
            this.creatorForm.defaultMode = 'free';
          } else if (this.creatorForm.defaultMode === 'free' && !ability?.supportsFree) {
            this.creatorForm.defaultMode = 'kb';
          }
          this.creatorForm.promptTemplate = this.getDefaultPromptTemplate(typeId, this.creatorForm.fields);
          this.creatorForm.contentTemplateId = null;
          this.creatorForm.structureType = 'free';
          this.render();
        });
      }

      const outputSelect = document.getElementById('creator-output-type');
      if (outputSelect) {
        outputSelect.addEventListener('change', () => {
          const format = outputSelect.value;
          this.creatorForm.outputType = format;
          this.creatorForm.icon = this.getRecommendedIcon(this.creatorForm.abilityId, format);
          this.creatorForm.promptTemplate = this.getDefaultPromptTemplate(this.creatorForm.abilityId, this.creatorForm.fields);
          const matched = this.getContentTemplatesForCreator(format).find(
            (t) => t.id === this.creatorForm.contentTemplateId
          );
          if (!matched) {
            this.creatorForm.contentTemplateId = null;
          }
          this.render();
        });
      }

      // 取消按钮
      document.getElementById('wa-creator-cancel')?.addEventListener('click', () => {
        this.resetCreatorForm();
        this.activeTab = 'templateMarket';
        this.render();
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
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(btn.dataset.index);
          const field = this.creatorForm.fields[index];
          if (field) {
            field._expanded = !field._expanded;
            this.render();
          }
        });
      });

      this.container.querySelectorAll('.wa-creator-field-done').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(btn.dataset.index);
          const field = this.creatorForm.fields[index];
          if (field) {
            field._expanded = false;
            this.render();
          }
        });
      });

      this.container.querySelectorAll('.wa-creator-field-header').forEach((header) => {
        header.addEventListener('click', (e) => {
          if (e.target.closest('.field-actions')) return;
          e.preventDefault();
          const index = parseInt(header.dataset.index);
          const field = this.creatorForm.fields[index];
          if (!field) return;

          // 只允许展开一个字段；展开新字段时合上其他字段
          const willExpand = !field._expanded;
          this.creatorForm.fields.forEach((f) => {
            f._expanded = false;
          });
          if (willExpand) {
            field._expanded = true;
          }
          this.render();
        });
      });

      // 字段输入同步
      this.container.querySelectorAll('[data-prop]').forEach((el) => {
        el.addEventListener('input', () => {
          this.collectCreatorField(el);
          this.updateStep1GenerateButton();
          this.updateCreatorFormPreview();
        });
        el.addEventListener('change', () => {
          const prop = el.dataset.prop;
          const index = parseInt(el.dataset.index);
          const prevType = this.creatorForm.fields[index]?.type;
          this.collectCreatorField(el);
          this.updateStep1GenerateButton();
          this.updateCreatorFormPreview();
          if (prop === 'type' && prevType !== el.value) {
            this.render();
          }
        });
      });

      // 初始化生成按钮状态
      this.updateStep1GenerateButton();
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

      document.getElementById('wa-extract-confirm-review')?.addEventListener('click', () => {
        this.enterReviewFromExtract();
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

    // 内容模板选择弹窗事件
    this.bindContentTemplateModalEvents();

    // 图标选择弹窗事件
    this.bindIconPickerModalEvents();
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
    const name = document.getElementById('creator-name')?.value || this.creatorForm.name || '';
    const icon = this.creatorForm.icon || 'file-lines';
    const roleId = this.creatorForm.roleId || 'sales';
    const abilityId = document.getElementById('creator-ability')?.value || this.creatorForm.abilityId || 'writing';
    const outputType = document.getElementById('creator-output-type')?.value || this.creatorForm.outputType || this.getDefaultOutputType(abilityId);
    const defaultMode = this.creatorForm.defaultMode || 'kb';
    const contentTemplateId = this.creatorForm.contentTemplateId;
    const description = this.creatorForm.description || '';

    this.creatorForm = {
      ...this.creatorForm,
      name,
      icon,
      roleId,
      abilityId,
      outputType,
      defaultMode,
      contentTemplateId,
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
    this.creatorForm.fields = defaultFields.map((f) => {
      const label = f.label;
      return {
        id: f.id || this.generateFieldId(label),
        type: f.type || fieldTypes.TEXT,
        label,
        placeholder: f.placeholder || '',
        required: f.required ?? false,
        options: f.options,
        _expanded: false,
      };
    });
    this.creatorForm.promptTemplate = this.getDefaultPromptTemplate(this.creatorForm.abilityId, this.creatorForm.fields);
    this.render();
    this.showToast('已加载推荐字段');
  }

  addCreatorField() {
    this.collectCreatorFields();
    // 新增字段时自动收起其他字段，避免列表过长把输出结构挤出可视区
    this.creatorForm.fields.forEach((f) => {
      f._expanded = false;
    });
    const index = this.creatorForm.fields.length + 1;
    const label = `新字段 ${index}`;
    this.creatorForm.fields.push({
      id: this.generateFieldId(label),
      type: fieldTypes.TEXT,
      label,
      placeholder: '',
      required: false,
      _expanded: true,
    });
    this.render();
  }

  updateStep1GenerateButton() {
    const name = document.getElementById('creator-name')?.value || this.creatorForm.name || '';
    const hasFields = this.creatorForm.fields.length > 0;
    const allFieldsValid = this.creatorForm.fields.every((f) => f.label.trim());
    const btn = document.getElementById('wa-creator-generate-review');
    const hint = document.getElementById('wa-creator-form-hint');
    const valid = name.trim() && hasFields && allFieldsValid;
    if (btn) btn.disabled = !valid;
    if (hint) {
      if (valid) {
        hint.innerHTML = '<i class="fa-solid fa-check-circle"></i><span>信息已完善，可以生成提示词</span>';
        hint.classList.add('valid');
      } else {
        hint.innerHTML = '<i class="fa-solid fa-circle-info"></i><span>请填写模板名称和至少一个输入字段</span>';
        hint.classList.remove('valid');
      }
    }
  }

  updateCreatorFormPreview() {
    const container = document.getElementById('wa-creator-form-preview-content');
    if (container) {
      container.innerHTML = this.renderCreatorPreview();
    }
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
    const container = document.getElementById('wa-creator-form-preview-content');
    if (container) {
      const current = this.creatorForm.currentStep;
      container.innerHTML = current === 3 ? this.renderCreatorFinalPreview() : this.renderCreatorPreview();
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
      id: this.editingTemplateId || `custom_${Date.now()}`,
      isCustom: true,
      recommendedKBs: [],
    };

    const isEdit = !!this.editingTemplateId;
    saveCustomTemplate(template);
    this.editingTemplateId = null;
    this.creatorForm = this.getDefaultCreatorForm();
    this.showToast(isEdit ? '模板已更新' : '模板已保存到「我的模板」');
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

  enterReviewFromExtract() {
    if (!this.extractPreview) return;
    const ability = getAbilityById(this.extractPreview.abilityId);
    let defaultMode = this.extractPreview.defaultMode || 'kb';
    if (defaultMode === 'kb' && !ability?.supportsKB) defaultMode = 'free';
    if (defaultMode === 'free' && !ability?.supportsFree) defaultMode = 'kb';

    const draftTemplate = {
      ...this.extractPreview,
      id: generateId('tmpl'),
      defaultMode,
      outputConfig: {},
      contentTemplateId: null,
      isCustom: true,
      recommendedKBs: [],
    };

    this.creatorReviewState = {
      active: true,
      source: 'extract',
      draftTemplate,
      currentTab: 'prompt',
      promptMode: 'preview',
      promptTemplate: draftTemplate.promptTemplate || this.generateReviewPrompt(draftTemplate, 'free', null),
      structureType: 'free',
    };

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
      <div class="wa-market-wrap">
        <header class="wa-market-header">
          <div class="wa-market-header-left">
            <button class="wa-market-back" id="wa-market-back">
              <i class="fa-solid fa-arrow-left"></i>
              <span>返回</span>
            </button>
            <div class="wa-market-title-section">
              <h1 class="wa-market-title">模板市场</h1>
              <p class="wa-market-subtitle">按岗位与能力选择模板，快速生成结构化内容</p>
            </div>
          </div>
          <button class="wa-market-create" id="wa-market-create">
            <i class="fa-solid fa-plus"></i>
            <span>创建模板</span>
          </button>
        </header>

        <div class="wa-market-tabs">
          <button class="wa-market-tab ${this.marketTab === 'all' ? 'active' : ''}" data-tab="all">全部模板</button>
          <button class="wa-market-tab ${this.marketTab === 'mine' ? 'active' : ''}" data-tab="mine">我的模板</button>
          <button class="wa-market-tab ${this.marketTab === 'pending' ? 'active' : ''}" data-tab="pending">待审核</button>
        </div>

        ${this.renderMarketContent()}
      </div>
    `;

    this.bindTemplateMarketEvents();
  }

  renderMarketContent() {
    let baseTemplates = [];
    let context = 'all';
    if (this.marketTab === 'all') {
      baseTemplates = getAllTemplates();
    } else if (this.marketTab === 'mine') {
      const custom = getCustomTemplates();
      const team = getTeamTemplates().filter((t) => t.creator === '当前用户');
      baseTemplates = [...custom, ...team];
      context = 'mine';
    } else if (this.marketTab === 'pending') {
      baseTemplates = getTeamTemplates().filter((t) => t.status === 'pending');
      context = 'pending';
    }

    if (baseTemplates.length === 0) {
      return `
        <div class="wa-market-empty">
          <div class="wa-market-empty-icon"><i class="fa-solid fa-folder-open"></i></div>
          <div class="wa-market-empty-title">暂无模板</div>
          <div class="wa-market-empty-desc">${context === 'pending' ? '当前没有待审核的团队模板' : '还没有模板，去创建一个吧'}</div>
          ${context !== 'pending' ? '<button class="wa-market-create wa-market-create--inline" id="wa-market-empty-create"><i class="fa-solid fa-plus"></i>去创建</button>' : ''}
        </div>
      `;
    }

    let templates = baseTemplates;
    if (this.marketCategory !== 'all') {
      if (this.marketCategoryMode === 'scene') {
        templates = baseTemplates.filter((t) => getTemplateSceneIds(t).includes(this.marketCategory));
      } else {
        templates = baseTemplates.filter((t) => t.roleId === this.marketCategory);
      }
    }

    const filterBar = this.renderMarketFilterBar(baseTemplates);

    if (templates.length === 0) {
      return `
        ${filterBar}
        <div class="wa-market-empty">
          <div class="wa-market-empty-icon"><i class="fa-solid fa-filter"></i></div>
          <div class="wa-market-empty-title">暂无匹配模板</div>
          <div class="wa-market-empty-desc">当前筛选条件下没有模板，换个分类试试</div>
        </div>
      `;
    }

    const contentHtml = this.marketViewMode === 'grid'
      ? `<div class="wa-market-grid">${templates.map((template) => this.renderMarketCard(template, context)).join('')}</div>`
      : `<div class="wa-market-list">${templates.map((template) => this.renderMarketListItem(template, context)).join('')}</div>`;

    return `${filterBar}${contentHtml}`;
  }

  renderMarketFilterBar(baseTemplates) {
    const categories = this.marketCategoryMode === 'scene'
      ? sceneCategories
      : [{ id: 'all', name: '全部', icon: 'fa-layer-group' }, ...workRoles.map((r) => ({ id: r.id, name: r.name, icon: r.icon }))];

    const getCount = (catId) => {
      if (catId === 'all') return baseTemplates.length;
      if (this.marketCategoryMode === 'scene') {
        return baseTemplates.filter((t) => getTemplateSceneIds(t).includes(catId)).length;
      }
      return baseTemplates.filter((t) => t.roleId === catId).length;
    };

    return `
      <div class="wa-market-filter-bar">
        <div class="wa-market-filter-left">
          <div class="wa-market-category-mode">
            <div class="wa-market-category-mode-tab ${this.marketCategoryMode === 'scene' ? 'active' : ''}" data-mode="scene">
              <i class="fa-solid fa-swatchbook"></i> 场景
            </div>
            <div class="wa-market-category-mode-tab ${this.marketCategoryMode === 'role' ? 'active' : ''}" data-mode="role">
              <i class="fa-solid fa-user-tag"></i> 岗位
            </div>
          </div>
          <div class="wa-market-category-nav">
            ${categories.map((cat) => {
              const isActive = this.marketCategory === cat.id;
              const count = getCount(cat.id);
              return `
                <div class="wa-market-category-pill ${isActive ? 'active' : ''}" data-cat="${cat.id}">
                  ${cat.icon ? `<i class="fa-solid ${cat.icon}"></i>` : ''}
                  <span>${cat.name}</span>
                  <span class="wa-market-category-count">${count}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="wa-market-view-toggle">
          <div class="wa-market-view-btn ${this.marketViewMode === 'grid' ? 'active' : ''}" data-view="grid" title="卡片视图">
            <i class="fa-solid fa-border-all"></i>
          </div>
          <div class="wa-market-view-btn ${this.marketViewMode === 'list' ? 'active' : ''}" data-view="list" title="列表视图">
            <i class="fa-solid fa-list"></i>
          </div>
        </div>
      </div>
    `;
  }

  renderMarketCard(template, context) {
    const { role, ability, outputLabel, status, isTeam, roleColor, cardColor } = this.getMarketTemplateMeta(template);
    const sceneIds = getTemplateSceneIds(template);
    const sceneNames = sceneIds.map((id) => {
      const cat = sceneCategories.find((c) => c.id === id);
      return cat?.name;
    }).filter(Boolean);

    return `
      <div class="wa-market-card" data-id="${template.id}" data-source="${template.isCustom ? 'custom' : isTeam ? 'team' : 'official'}">
        <div class="wa-market-card-main">
          <div class="wa-market-card-icon" style="background:${cardColor.bg};color:${cardColor.color};box-shadow:0 3px 10px ${cardColor.shadow}">
            <i class="fa-solid fa-${template.icon || 'file-lines'}"></i>
          </div>
          <div class="wa-market-card-body">
            <div class="wa-market-card-name-row">
              <div class="wa-market-card-name" title="${this.escapeHtml(template.name)}">${this.escapeHtml(template.name)}</div>
              ${this.renderMarketStatusBadge(status, isTeam)}
            </div>
            <div class="wa-market-card-desc">${this.escapeHtml(template.description || '暂无描述')}</div>
            <div class="wa-market-card-meta">
              <span class="wa-market-card-meta-tag role" style="background:${roleColor}15;color:${roleColor};border-color:${roleColor}30">
                <i class="fa-solid fa-${role?.icon || 'user'}"></i> ${role?.name || '未知岗位'}
              </span>
              ${sceneNames.slice(0, 1).map((name) => `<span class="wa-market-card-meta-tag scene"><i class="fa-solid fa-swatchbook"></i> ${name}</span>`).join('')}
              <span class="wa-market-card-meta-tag ability"><i class="fa-solid fa-bolt"></i> ${ability?.name || '通用'}</span>
              <span class="wa-market-card-meta-tag output"><i class="fa-solid fa-arrow-right-from-bracket"></i> ${outputLabel}</span>
            </div>
          </div>
        </div>
        <div class="wa-market-card-footer">
          ${this.renderMarketActions(template, context, 'wa-market-use')}
        </div>
      </div>
    `;
  }

  renderMarketListItem(template, context) {
    const { role, ability, outputLabel, status, isTeam, roleColor, cardColor } = this.getMarketTemplateMeta(template);
    const sceneIds = getTemplateSceneIds(template);
    const sceneNames = sceneIds.map((id) => {
      const cat = sceneCategories.find((c) => c.id === id);
      return cat?.name;
    }).filter(Boolean);

    return `
      <div class="wa-market-list-item" data-id="${template.id}" data-source="${template.isCustom ? 'custom' : isTeam ? 'team' : 'official'}">
        <div class="wa-market-list-icon" style="background:${cardColor.bg};color:${cardColor.color};box-shadow:0 3px 10px ${cardColor.shadow}">
          <i class="fa-solid fa-${template.icon || 'file-lines'}"></i>
        </div>
        <div class="wa-market-list-body">
          <div class="wa-market-list-name-row">
            <div class="wa-market-list-name" title="${this.escapeHtml(template.name)}">${this.escapeHtml(template.name)}</div>
            ${this.renderMarketStatusBadge(status, isTeam)}
          </div>
          <div class="wa-market-list-desc">${this.escapeHtml(template.description || '暂无描述')}</div>
          <div class="wa-market-list-meta">
            <span class="wa-market-list-meta-tag role" style="background:${roleColor}15;color:${roleColor};border-color:${roleColor}30">
              <i class="fa-solid fa-${role?.icon || 'user'}"></i> ${role?.name || '未知岗位'}
            </span>
            ${sceneNames.slice(0, 2).map((name) => `<span class="wa-market-list-meta-tag scene"><i class="fa-solid fa-swatchbook"></i> ${name}</span>`).join('')}
            <span class="wa-market-list-meta-tag ability"><i class="fa-solid fa-bolt"></i> ${ability?.name || '通用'}</span>
            <span class="wa-market-list-meta-tag output"><i class="fa-solid fa-arrow-right-from-bracket"></i> ${outputLabel}</span>
          </div>
        </div>
        <div class="wa-market-list-actions">
          ${this.renderMarketActions(template, context, 'wa-market-use wa-market-use--sm')}
        </div>
      </div>
    `;
  }

  getMarketTemplateMeta(template) {
    const role = getRoleById(template.roleId);
    const ability = getAbilityById(template.abilityId);
    const isTeam = template.status !== undefined;
    const statusMap = {
      pending: { label: '审核中', bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
      approved: { label: '已通过', bg: 'rgba(16,185,129,0.12)', color: '#059669' },
      rejected: { label: '已拒绝', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
    };
    const status = isTeam ? statusMap[template.status] : null;
    const outputLabel = this.getOutputTypeLabel(template.outputType);
    const roleColor = role?.color || '#6b7280';
    const cardColor = this.getMarketCardColor(template);
    return { role, ability, outputLabel, status, isTeam, roleColor, cardColor };
  }

  renderMarketStatusBadge(status, isTeam) {
    return status
      ? `<span class="wa-market-status" style="background:${status.bg};color:${status.color}">${status.label}</span>`
      : `<span class="wa-market-status" style="background:rgba(16,185,129,0.1);color:#10b981">官方</span>`;
  }

  renderMarketActions(template, context, useClass) {
    const isTeam = template.status !== undefined;
    const source = template.isCustom ? 'custom' : isTeam ? 'team' : 'official';
    return `
      <button class="${useClass}" data-id="${template.id}" data-source="${source}">
        <i class="fa-solid fa-play"></i>
        <span>使用</span>
      </button>
      ${template.isCustom ? `
        <button class="wa-market-action" data-action="edit" data-id="${template.id}" data-source="custom" title="编辑"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="wa-market-action" data-action="publish" data-id="${template.id}" title="发布"><i class="fa-solid fa-share-nodes"></i></button>
        <button class="wa-market-action wa-market-action--danger" data-action="delete" data-id="${template.id}" data-source="custom" title="删除"><i class="fa-solid fa-trash"></i></button>
      ` : ''}
      ${context === 'pending' && !template.isCustom ? `
        <button class="${useClass}" data-action="approve" data-id="${template.id}"><i class="fa-solid fa-check"></i>通过</button>
        <button class="wa-market-action wa-market-action--danger" data-action="reject" data-id="${template.id}"><i class="fa-solid fa-xmark"></i>拒绝</button>
      ` : ''}
    `;
  }

  getMarketCardColor(template) {
    const colors = [
      { bg: 'rgba(16,185,129,0.12)', color: '#10b981', shadow: 'rgba(16,185,129,0.15)' },
      { bg: 'rgba(59,130,246,0.12)', color: '#2563eb', shadow: 'rgba(59,130,246,0.15)' },
      { bg: 'rgba(16,185,129,0.12)', color: '#059669', shadow: 'rgba(16,185,129,0.15)' },
      { bg: 'rgba(245,158,11,0.12)', color: '#d97706', shadow: 'rgba(245,158,11,0.15)' },
      { bg: 'rgba(236,72,153,0.12)', color: '#db2777', shadow: 'rgba(236,72,153,0.15)' },
      { bg: 'rgba(6,182,212,0.12)', color: '#0891b2', shadow: 'rgba(6,182,212,0.15)' },
    ];
    let idx = 0;
    if (template.outputType) {
      const outputTypeValues = Object.values(outputTypes);
      idx = outputTypeValues.indexOf(template.outputType) % colors.length;
    }
    return colors[idx];
  }

  bindTemplateMarketEvents() {
    document.getElementById('wa-market-back')?.addEventListener('click', () => {
      this.activeTab = 'home';
      this.render();
    });

    document.getElementById('wa-market-create')?.addEventListener('click', () => {
      this.activeTab = 'templateCreator';
      this.creatorTab = 'chat';
      this.editingTemplateId = null;
      this.creatorForm = this.getDefaultCreatorForm();
      this.conversationState = this.getDefaultConversationState();
      this.render();
    });

    document.getElementById('wa-market-empty-create')?.addEventListener('click', () => {
      this.activeTab = 'templateCreator';
      this.creatorTab = 'chat';
      this.editingTemplateId = null;
      this.creatorForm = this.getDefaultCreatorForm();
      this.conversationState = this.getDefaultConversationState();
      this.render();
    });

    this.container.querySelectorAll('.wa-market-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.marketTab = tab.dataset.tab;
        this.render();
      });
    });

    this.container.querySelectorAll('.wa-market-category-mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.marketCategoryMode = tab.dataset.mode;
        this.marketCategory = 'all';
        this.render();
      });
    });

    this.container.querySelectorAll('.wa-market-category-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        this.marketCategory = pill.dataset.cat;
        this.render();
      });
    });

    this.container.querySelectorAll('.wa-market-view-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.marketViewMode = btn.dataset.view;
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

    this.container.querySelectorAll('.wa-market-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const source = btn.dataset.source;
        if (action === 'edit') {
          const template = source === 'custom'
            ? getCustomTemplates().find((t) => t.id === id)
            : getTeamTemplates().find((t) => t.id === id);
          if (template) {
            this.editingTemplateId = template.id;
            this.creatorForm = {
              ...this.getDefaultCreatorForm(),
              ...template,
              currentStep: 1,
              activePromptStyle: template.activePromptStyle || '通用生成',
              fields: (template.fields || []).map((f) => ({ ...f, _expanded: false })),
            };
            this.activeTab = 'templateCreator';
            this.creatorTab = 'form';
            this.render();
            this.showToast('已加载模板进行编辑');
          }
        } else if (action === 'publish') {
          this.publishTemplateToTeam(id);
        } else if (action === 'delete') {
          if (confirm('确定删除该模板吗？')) {
            deleteCustomTemplate(id);
            this.render();
            this.showToast('已删除');
          }
        } else if (action === 'reject') {
          rejectTeamTemplate(id);
          this.render();
          this.showToast('已拒绝');
        }
      });
    });

    this.container.querySelectorAll('.wa-market-use[data-action="approve"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        approveTeamTemplate(id);
        this.render();
        this.showToast('已通过审核');
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
