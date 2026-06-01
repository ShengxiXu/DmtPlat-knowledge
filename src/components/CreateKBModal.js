import { DataSourceForm } from './DataSourceForm.js';
import { kbTemplates } from '../data/templates.js';

export class CreateKBModal {
  constructor() {
    this.modal = null;
    this.currentStep = 1;
    this.createMode = 'blank'; // 'blank' or 'template'
    this.selectedTemplate = null;
    this.dataSources = [];
    this.formData = {
      name: '',
      description: ''
    };
    this.init();
  }

  init() {
    this.modal = document.createElement('div');
    this.modal.id = 'create-kb-modal';
    this.modal.className = 'modal-overlay';
    this.modal.innerHTML = this.renderModal();
    document.body.appendChild(this.modal);    
    setTimeout(() => this.modal.classList.add('active'), 10);
    this.bindEvents();
  }

  renderModal() {
    return `
      <div class="modal" style="width: 720px; max-width: 90vw;">
        <div class="modal-header">
          <h3>创建知识库</h3>
          <button class="btn btn-circle btn-ghost modal-close">&times;</button>
        </div>
        <div class="modal-body" style="padding: 0;">
          <div class="kb-wizard">
            ${this.renderSteps()}
            <div class="kb-content">
              ${this.renderStep1()}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          ${this.renderFooter()}
        </div>
      </div>
    `;
  }

  renderSteps() {
    const steps = [
      { number: '1', label: '创建方式' },
      { number: '2', label: '配置数据源' },
      { number: '3', label: '确认创建' }
    ];

    return `
      <div class="kb-steps">
        ${steps.map((step, index) => `
          <div class="kb-step ${this.currentStep > index + 1 ? 'completed' : ''} ${this.currentStep === index + 1 ? 'active' : ''}">
            <div class="kb-step-number">${step.number}</div>
            <div class="kb-step-label">${step.label}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderFooter() {
    if (this.currentStep === 1) {
      return `
        <button class="btn btn-secondary" id="kb-cancel">取消</button>
        <button class="btn btn-primary" id="kb-next" disabled>下一步</button>
      `;
    } else if (this.currentStep === 2) {
      return `
        <button class="btn btn-secondary" id="kb-back">上一步</button>
        <button class="btn btn-primary" id="kb-next2">下一步</button>
      `;
    } else {
      return `
        <button class="btn btn-secondary" id="kb-back">上一步</button>
        <button class="btn btn-primary" id="kb-create" ${this.canCreate() ? '' : 'disabled'}>确认创建</button>
      `;
    }
  }

  renderStep1() {
    return `
      <div class="kb-step1">
        <div class="mode-section">
          <h4>选择创建方式</h4>
          <div class="mode-cards">
            <div class="mode-card ${this.createMode === 'blank' ? 'selected' : ''}" data-mode="blank">
              <div class="mode-icon"><i class="fa-solid fa-file-lines"></i></div>
              <div class="mode-info">
                <div class="mode-name">空白知识库</div>
                <div class="mode-desc">从空白开始创建，自由配置所有参数</div>
              </div>
            </div>
            <div class="mode-card ${this.createMode === 'template' ? 'selected' : ''}" data-mode="template">
              <div class="mode-icon"><i class="fa-solid fa-grid"></i></div>
              <div class="mode-info">
                <div class="mode-name">使用模板</div>
                <div class="mode-desc">选择预设模板快速创建，配置已优化</div>
              </div>
            </div>
          </div>
        </div>

        ${this.createMode === 'template' ? this.renderTemplateSelection() : ''}

        <div class="basic-section">
          <h4>基本信息</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">知识库名称 *</label>
              <input type="text" class="input" id="kb-name" placeholder="请输入知识库名称" value="${this.formData.name}" />
            </div>
            <div class="form-group">
              <label class="form-label">知识库描述</label>
              <input type="text" class="input" id="kb-desc" placeholder="请输入知识库描述" value="${this.formData.description}" />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTemplateSelection() {
    const categories = [...new Set(kbTemplates.map(t => t.category))];

    return `
      <div class="template-section">
        <h4>选择模板</h4>
        <div class="template-categories">
          ${categories.map(cat => `
            <span class="template-category ${this.selectedCategory === cat ? 'active' : ''}" data-category="${cat}">${cat}</span>
          `).join('')}
        </div>
        <div class="template-list">
          ${kbTemplates.map(template => `
            <div class="template-item ${this.selectedTemplate?.id === template.id ? 'selected' : ''}" data-template-id="${template.id}">
              <i class="fa-solid fa-${template.icon} template-icon"></i>
              <div class="template-info">
                <div class="template-name">${template.name}</div>
                <div class="template-desc">${template.description}</div>
                <div class="template-tags">
                  <span class="tag">${template.subCategory}</span>
                  <span class="tag">${template.dataSources.length}个数据源</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderStep2() {
    return `
      <div class="kb-step2">
        <div class="ds-header">
          <h4>配置数据源</h4>
          <button class="btn btn-primary btn-sm" id="add-ds">+ 添加数据源</button>
        </div>

        <div class="ds-list" id="ds-list">
          ${this.dataSources.length === 0 ? `
            <div class="ds-empty">
              <i class="fa-solid fa-inbox empty-icon"></i>
              <p>暂无数据源</p>
              <p class="empty-hint">点击上方按钮添加数据源</p>
            </div>
          ` : this.dataSources.map((ds, index) => this.renderDataSourceItem(ds, index)).join('')}
        </div>

        <div class="ds-modal" id="ds-modal" style="display: none;">
          <div class="ds-modal-content" id="ds-modal-content"></div>
        </div>
      </div>
    `;
  }

  renderDataSourceItem(ds, index) {
    const typeLabels = { document: '文档上传', web: '网页爬取', database: '数据库连接', qa: '问答导入' };
    const typeIcons = { document: 'file-lines', web: 'globe', database: 'database', qa: 'message' };

    return `
      <div class="ds-item" data-index="${index}">
        <div class="ds-item-header">
          <i class="fa-solid fa-${typeIcons[ds.type]} ds-item-icon"></i>
          <div class="ds-item-info">
            <div class="ds-item-name">${ds.name || typeLabels[ds.type]}</div>
            <div class="ds-item-type">${typeLabels[ds.type]}</div>
          </div>
          <div class="ds-item-actions">
            <button class="btn btn-ghost btn-sm ds-edit">编辑</button>
            <button class="btn btn-ghost btn-sm ds-delete">删除</button>
          </div>
        </div>
        <div class="ds-item-config">
          ${this.renderConfigSummary(ds.config)}
        </div>
      </div>
    `;
  }

  renderConfigSummary(config) {
    const items = [];
    if (config.priority !== undefined) items.push(`优先级: ${config.priority}级`);
    if (config.supportedFormats) items.push(`支持格式: ${config.supportedFormats.join(', ')}`);
    if (config.maxFileSize) items.push(`最大文件: ${config.maxFileSize}MB`);
    if (config.matchThreshold !== undefined) items.push(`匹配阈值: ${config.matchThreshold}`);
    if (config.maxQACount) items.push(`最大问答数: ${config.maxQACount}`);
    
    return items.length > 0 ? `
      <div class="config-summary">
        ${items.slice(0, 3).map(item => `<span class="config-item">${item}</span>`).join('')}
        ${items.length > 3 ? `<span class="config-more">还有${items.length - 3}项配置...</span>` : ''}
      </div>
    ` : '<span class="config-empty">配置已启用</span>';
  }

  renderStep3() {
    const typeLabels = { document: '文档上传', web: '网页爬取', database: '数据库连接', qa: '问答导入' };
    const typeIcons = { document: 'file-lines', web: 'globe', database: 'database', qa: 'message' };

    return `
      <div class="kb-step3">
        <div class="summary-section">
          <h4>知识库信息</h4>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">名称</span>
              <span class="summary-value">${this.formData.name}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">描述</span>
              <span class="summary-value">${this.formData.description || '无'}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">创建方式</span>
              <span class="summary-value">${this.createMode === 'template' ? `<i class="fa-solid fa-${this.selectedTemplate?.icon}"></i> ${this.selectedTemplate?.name}` : '空白知识库'}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">数据源数量</span>
              <span class="summary-value">${this.dataSources.length}个</span>
            </div>
          </div>
        </div>

        <div class="ds-summary-section">
          <h4>数据源配置</h4>
          <div class="ds-summary-list">
            ${this.dataSources.map((ds, index) => `
              <div class="ds-summary-item">
                <i class="fa-solid fa-${typeIcons[ds.type]} ds-summary-icon"></i>
                <div class="ds-summary-info">
                  <div class="ds-summary-name">${ds.name || typeLabels[ds.type]}</div>
                  <div class="ds-summary-type">${typeLabels[ds.type]}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="tip-box">
          <i class="fa-solid fa-lightbulb tip-icon"></i>
          <span class="tip-text">创建后仍可添加或修改数据源配置</span>
        </div>
      </div>
    `;
  }

  canCreate() {
    return this.formData.name.trim() !== '' && this.dataSources.length > 0;
  }

  bindEvents() {
    this.modal.querySelector('.modal-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    this.bindStep1Events();
    this.bindFooterEvents();
  }

  bindStep1Events() {
    // 创建方式选择
    this.modal.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', (e) => {
        this.modal.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.createMode = e.currentTarget.dataset.mode;
        
        if (this.createMode === 'template') {
          this.selectedTemplate = null;
        }
        
        this.render();
      });
    });

    // 模板选择
    this.modal.querySelectorAll('.template-item').forEach(item => {
      item.addEventListener('click', (e) => {
        this.modal.querySelectorAll('.template-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const templateId = e.currentTarget.dataset.templateId;
        this.selectedTemplate = kbTemplates.find(t => t.id === templateId);
        
        if (this.selectedTemplate?.preset) {
          this.formData.name = this.selectedTemplate.preset.kbName;
          this.formData.description = this.selectedTemplate.preset.kbDescription;
        }
        
        this.updateNextButton();
      });
    });

    // 名称输入
    const nameInput = this.modal.querySelector('#kb-name');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        this.formData.name = e.target.value;
        this.updateNextButton();
      });
    }

    // 描述输入
    const descInput = this.modal.querySelector('#kb-desc');
    if (descInput) {
      descInput.addEventListener('input', (e) => {
        this.formData.description = e.target.value;
      });
    }
  }

  bindFooterEvents() {
    const cancelBtn = this.modal.querySelector('#kb-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    const backBtn = this.modal.querySelector('#kb-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.prevStep());
    }

    const nextBtn = this.modal.querySelector('#kb-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextStep());
    }

    const nextBtn2 = this.modal.querySelector('#kb-next2');
    if (nextBtn2) {
      nextBtn2.addEventListener('click', () => this.nextStep());
    }

    const createBtn = this.modal.querySelector('#kb-create');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.createKB());
    }
  }

  bindStep2Events() {
    // 添加数据源
    const addBtn = this.modal.querySelector('#add-ds');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddDataSourceModal());
    }

    // 编辑数据源
    this.modal.querySelectorAll('.ds-edit').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const ds = this.dataSources[index];
        this.showEditDataSourceModal(ds, index);
      });
    });

    // 删除数据源
    this.modal.querySelectorAll('.ds-delete').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        this.dataSources.splice(index, 1);
        this.render();
      });
    });
  }

  updateNextButton() {
    const nextBtn = this.modal.querySelector('#kb-next');
    if (nextBtn) {
      const hasName = this.formData.name.trim() !== '';
      const ready = this.createMode === 'blank' ? hasName : (hasName && this.selectedTemplate);
      nextBtn.disabled = !ready;
    }
  }

  prevStep() {
    this.currentStep--;
    this.render();
  }

  nextStep() {
    if (this.currentStep === 1) {
      // 如果选择了模板，加载预设数据源
      if (this.createMode === 'template' && this.selectedTemplate) {
        this.dataSources = JSON.parse(JSON.stringify(this.selectedTemplate.dataSources));
      }
    }
    this.currentStep++;
    this.render();
  }

  render() {
    const content = this.modal.querySelector('.kb-content');
    const footer = this.modal.querySelector('.modal-footer');
    
    if (!content || !footer) return;
    
    content.innerHTML = this.currentStep === 1 ? this.renderStep1() : 
                        this.currentStep === 2 ? this.renderStep2() : this.renderStep3();
    
    footer.innerHTML = this.renderFooter();

    if (this.currentStep === 1) {
      this.bindStep1Events();
    } else if (this.currentStep === 2) {
      this.bindStep2Events();
    }
    
    this.bindFooterEvents();
  }

  showAddDataSourceModal() {
    const types = [
      { type: 'document', name: '文档上传', desc: '上传PDF、Word等文档', icon: 'file-lines' },
      { type: 'web', name: '网页爬取', desc: '爬取网页内容', icon: 'globe' },
      { type: 'database', name: '数据库连接', desc: '连接数据库', icon: 'database' },
      { type: 'qa', name: '问答导入', desc: '导入问答对', icon: 'message' }
    ];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay ds-type-modal';
    modal.innerHTML = `
      <div class="modal" style="width: 500px;">
        <div class="modal-header">
          <h3>选择数据源类型</h3>
          <button class="btn btn-circle btn-ghost modal-close">&times;</button>
        </div>
        <div class="modal-body" style="padding: 20px;">
          <div class="ds-type-grid">
            ${types.map(t => `
              <div class="ds-type-card" data-type="${t.type}">
                <i class="fa-solid fa-${t.icon} ds-type-icon"></i>
                <div class="ds-type-name">${t.name}</div>
                <div class="ds-type-desc">${t.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);    setTimeout(() => modal.classList.add('active'), 10);

    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelectorAll('.ds-type-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.type;
        document.body.removeChild(modal);
        this.showDataSourceConfigModal(type);
      });
    });
  }

  showEditDataSourceModal(ds, index) {
    this.showDataSourceConfigModal(ds.type, ds.config, index);
  }

  showDataSourceConfigModal(type, config = {}, index = -1) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay ds-config-modal';
    modal.innerHTML = `
      <div class="modal" style="width: 500px;">
        <div class="modal-header">
          <h3>${index >= 0 ? '编辑' : '添加'}数据源</h3>
          <button class="btn btn-circle btn-ghost modal-close">&times;</button>
        </div>
        <div class="modal-body" style="padding: 20px;">
          <div id="ds-form-container"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);    setTimeout(() => modal.classList.add('active'), 10);

    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    const container = modal.querySelector('#ds-form-container');
    const form = new DataSourceForm(type, config, (data) => {
      document.body.removeChild(modal);
      if (data) {
        if (index >= 0) {
          this.dataSources[index] = data;
        } else {
          this.dataSources.push(data);
        }
        this.render();
      }
    });
    form.render(container);
  }

  createKB() {
    const kbData = {
      id: Date.now().toString(),
      name: this.formData.name,
      description: this.formData.description,
      type: this.dataSources.length > 0 ? this.getKBType(this.dataSources[0].type) : '文档',
      createMode: this.createMode,
      templateId: this.selectedTemplate?.id || null,
      dataSources: this.dataSources,
      createdAt: new Date().toLocaleDateString('zh-CN'),
      lastUpdate: '刚刚',
      views: '0',
      status: 'active',
      documentCount: 0,
      creator: '管理员'
    };

    localStorage.setItem('newKB', JSON.stringify(kbData));

    this.showToast('知识库创建成功！', 'success');
    this.close();

    window.location.reload();
  }

  getKBType(dataSourceType) {
    const typeMap = {
      document: '文档',
      web: '网页',
      database: '数据库',
      qa: '问答'
    };
    return typeMap[dataSourceType] || '文档';
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  close() {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
    }
  }
}