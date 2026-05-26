import { DataSourceForm } from './DataSourceForm.js';

export class EditKBModal {
  constructor(kbData, callback) {
    this.kbData = kbData;
    this.callback = callback;
    this.modal = null;
    this.currentStep = 1;
    this.formData = {
      name: kbData.name || '',
      description: kbData.description || ''
    };
    this.dataSources = kbData.dataSources ? [...kbData.dataSources] : [];
    this.init();
  }

  init() {
    this.modal = document.createElement('div');
    this.modal.id = 'edit-kb-modal';
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
          <h3>编辑知识库</h3>
          <button class="btn btn-circle btn-ghost modal-close">&times;</button>
        </div>
        <div class="modal-body" style="padding: 0;">
          <div class="kb-wizard">
            ${this.renderSteps()}
            <div class="kb-content">
              ${this.currentStep === 1 ? this.renderStep1() : this.renderStep2()}
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
      { number: '1', label: '基本信息' },
      { number: '2', label: '数据源配置' }
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
        <button class="btn btn-secondary" id="edit-cancel">取消</button>
        <button class="btn btn-primary" id="edit-next">下一步</button>
      `;
    } else {
      return `
        <button class="btn btn-secondary" id="edit-back">上一步</button>
        <button class="btn btn-primary" id="edit-save">保存修改</button>
      `;
    }
  }

  renderStep1() {
    return `
      <div class="kb-step1">
        <div class="basic-section">
          <h4>基本信息</h4>
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label class="form-label">知识库名称 *</label>
              <input type="text" class="input" id="edit-kb-name" placeholder="请输入知识库名称" value="${this.formData.name}" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label class="form-label">知识库描述</label>
              <textarea class="textarea" id="edit-kb-desc" placeholder="请输入知识库描述" rows="3">${this.formData.description || ''}</textarea>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderStep2() {
    const typeLabels = { document: '文档上传', web: '网页爬取', database: '数据库连接', qa: '问答导入' };
    const typeIcons = { document: '📄', web: '🌐', database: '🗄️', qa: '💬' };

    return `
      <div class="kb-step2">
        <div class="ds-header">
          <h4>数据源配置</h4>
          <button class="btn btn-primary btn-sm" id="edit-add-ds">+ 添加数据源</button>
        </div>

        <div class="ds-list" id="edit-ds-list">
          ${this.dataSources.length === 0 ? `
            <div class="ds-empty">
              <div class="empty-icon">📥</div>
              <p>暂无数据源</p>
              <p class="empty-hint">点击上方按钮添加数据源</p>
            </div>
          ` : this.dataSources.map((ds, index) => this.renderDataSourceItem(ds, index)).join('')}
        </div>

        <div class="ds-modal" id="edit-ds-modal" style="display: none;">
          <div class="ds-modal-content" id="edit-ds-modal-content"></div>
        </div>
      </div>
    `;
  }

  renderDataSourceItem(ds, index) {
    const typeLabels = { document: '文档上传', web: '网页爬取', database: '数据库连接', qa: '问答导入' };
    const typeIcons = { document: '📄', web: '🌐', database: '🗄️', qa: '💬' };

    return `
      <div class="ds-item" data-index="${index}">
        <div class="ds-item-header">
          <span class="ds-item-icon">${typeIcons[ds.type]}</span>
          <div class="ds-item-info">
            <div class="ds-item-name">${ds.name || typeLabels[ds.type]}</div>
            <div class="ds-item-type">${typeLabels[ds.type]}</div>
          </div>
          <div class="ds-item-actions">
            <button class="btn btn-ghost btn-sm edit-ds-edit">编辑</button>
            <button class="btn btn-ghost btn-sm edit-ds-delete">删除</button>
          </div>
        </div>
        <div class="ds-item-config">
          ${this.renderConfigSummary(ds.config || {})}
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

  bindEvents() {
    this.modal.querySelector('.modal-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    this.bindFooterEvents();
  }

  bindFooterEvents() {
    const cancelBtn = this.modal.querySelector('#edit-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    const backBtn = this.modal.querySelector('#edit-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.prevStep());
    }

    const nextBtn = this.modal.querySelector('#edit-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextStep());
    }

    const saveBtn = this.modal.querySelector('#edit-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveKB());
    }
  }

  bindStep2Events() {
    const addBtn = this.modal.querySelector('#edit-add-ds');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddDataSourceModal());
    }

    this.modal.querySelectorAll('.edit-ds-edit').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const ds = this.dataSources[index];
        this.showEditDataSourceModal(ds, index);
      });
    });

    this.modal.querySelectorAll('.edit-ds-delete').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        this.dataSources.splice(index, 1);
        this.render();
      });
    });
  }

  prevStep() {
    this.currentStep--;
    this.render();
  }

  nextStep() {
    if (this.currentStep === 1) {
      const nameInput = this.modal.querySelector('#edit-kb-name');
      const descInput = this.modal.querySelector('#edit-kb-desc');
      if (nameInput) this.formData.name = nameInput.value;
      if (descInput) this.formData.description = descInput.value;
    }
    this.currentStep++;
    this.render();
  }

  render() {
    const content = this.modal.querySelector('.kb-content');
    const footer = this.modal.querySelector('.modal-footer');
    
    if (!content || !footer) return;
    
    content.innerHTML = this.currentStep === 1 ? this.renderStep1() : this.renderStep2();
    footer.innerHTML = this.renderFooter();

    if (this.currentStep === 2) {
      this.bindStep2Events();
    }
    
    this.bindFooterEvents();
  }

  showAddDataSourceModal() {
    const types = [
      { type: 'document', name: '文档上传', desc: '上传PDF、Word等文档', icon: '📄' },
      { type: 'web', name: '网页爬取', desc: '爬取网页内容', icon: '🌐' },
      { type: 'database', name: '数据库连接', desc: '连接数据库', icon: '🗄️' },
      { type: 'qa', name: '问答导入', desc: '导入问答对', icon: '💬' }
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
                <div class="ds-type-icon">${t.icon}</div>
                <div class="ds-type-name">${t.name}</div>
                <div class="ds-type-desc">${t.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);

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
          <div id="edit-ds-form-container"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);

    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    const container = modal.querySelector('#edit-ds-form-container');
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

  saveKB() {
    const nameInput = this.modal.querySelector('#edit-kb-name');
    const descInput = this.modal.querySelector('#edit-kb-desc');
    
    const updatedKB = {
      ...this.kbData,
      name: nameInput?.value || this.formData.name,
      description: descInput?.value || this.formData.description,
      dataSources: this.dataSources,
      lastUpdate: '刚刚'
    };

    const savedKBs = localStorage.getItem('knowledgeBases');
    if (savedKBs) {
      const kbs = JSON.parse(savedKBs);
      const index = kbs.findIndex(kb => kb.id === this.kbData.id);
      if (index >= 0) {
        kbs[index] = updatedKB;
        localStorage.setItem('knowledgeBases', JSON.stringify(kbs));
      }
    }

    this.showToast('知识库修改成功！', 'success');
    this.close();

    if (this.callback) {
      this.callback(updatedKB);
    } else {
      window.location.reload();
    }
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