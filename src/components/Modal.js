export class Modal {
  constructor(id, options = {}) {
    this.id = id;
    this.title = options.title || '';
    this.content = options.content || '';
    this.showCancel = options.showCancel !== false;
    this.showConfirm = options.showConfirm !== false;
    this.cancelText = options.cancelText || '取消';
    this.confirmText = options.confirmText || '确定';
    this.size = options.size || 'medium';
    this.render();
  }

  render() {
    const sizeClass =
      {
        small: 'modal-small',
        medium: 'modal-medium',
        large: 'modal-large',
        full: 'modal-full',
      }[this.size] || 'modal-medium';

    const modalHTML = `
      <div class="modal-overlay" id="${this.id}">
        <div class="modal ${sizeClass}">
          <div class="modal-header">
            <h3 style="font-size:18px;font-weight:600;">${this.title}</h3>
            <button class="btn btn-circle btn-ghost" data-action="close">✕</button>
          </div>
          <div class="modal-body">${this.content}</div>
          <div class="modal-footer">
            ${this.showCancel ? `<button class="btn btn-secondary" data-action="cancel">${this.cancelText}</button>` : ''}
            ${this.showConfirm ? `<button class="btn btn-primary" data-action="confirm">${this.confirmText}</button>` : ''}
          </div>
        </div>
      </div>
    `;

    const existingModal = document.getElementById(this.id);
    if (existingModal) {
      existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.bindEvents();
  }

  bindEvents() {
    const overlay = document.getElementById(this.id);
    const buttons = overlay.querySelectorAll('[data-action]');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;

        switch (action) {
          case 'close':
          case 'cancel':
            this.close();
            this.onCancel?.();
            break;
          case 'confirm':
            this.close();
            this.onConfirm?.();
            break;
        }
      });
    });
  }

  open() {
    document.getElementById(this.id)?.classList.add('active');
  }

  close() {
    document.getElementById(this.id)?.classList.remove('active');
  }

  setContent(content) {
    this.content = content;
    const modalBody = document
      .getElementById(this.id)
      ?.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = content;
    }
  }

  setTitle(title) {
    this.title = title;
    const modal = document.getElementById(this.id);
    if (modal) {
      modal.querySelector('.modal-header h3').textContent = title;
    }
  }

  setOnCancel(callback) {
    this.onCancel = callback;
  }

  setOnConfirm(callback) {
    this.onConfirm = callback;
  }

  destroy() {
    const modal = document.getElementById(this.id);
    if (modal) {
      modal.remove();
    }
  }
}

export class CreateKBModal extends Modal {
  constructor() {
    super('create-kb-modal', {
      title: '新建知识库',
      content: '',
      cancelText: '取消',
      confirmText: '完成',
      size: 'large',
    });

    this.currentStep = 1;
    this.createMode = 'blank';
    this.selectedType = 'document';
    this.selectedTemplate = null;
    this.kbName = '';
    this.kbDescription = '';
    this.kbVisibility = 'private';
    this.configData = {};

    this.renderStep1();
    this.bindStepEvents();
  }

  renderStep1() {
    this.setContent(`
      <div class="wizard-container">
        <div class="wizard-steps">
          <div class="step active">
            <span class="step-number">1</span>
            <span class="step-label">选择方式</span>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <span class="step-label">配置信息</span>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <span class="step-label">完成</span>
          </div>
        </div>

        <div class="step-content">
          <h3 style="margin-bottom:8px;">选择创建方式</h3>
          <p style="color:var(--kb-text-muted);font-size:14px;margin-bottom:24px;">选择一种方式开始创建知识库</p>

          <div class="mode-selector">
            <div class="mode-card ${this.createMode === 'blank' ? 'active' : ''}" data-mode="blank">
              <i class="fa-solid fa-file-lines"></i>
              <div class="mode-title">空白创建</div>
              <div class="mode-desc">从空白开始，自定义配置知识库</div>
            </div>
            <div class="mode-card ${this.createMode === 'template' ? 'active' : ''}" data-mode="template">
              <i class="fa-solid fa-grid"></i>
              <div class="mode-title">按模板创建</div>
              <div class="mode-desc">选择预设模板，快速创建知识库</div>
            </div>
          </div>

          ${this.createMode === 'blank' ? this.renderTypeSelection() : ''}
          ${this.createMode === 'template' ? this.renderTemplatePlaceholder() : ''}
        </div>

        <div class="step-actions">
          <button class="btn btn-secondary" data-action="cancel">取消</button>
          <button class="btn btn-primary" data-action="next" ${!this.canProceedToStep2() ? 'disabled' : ''}>下一步</button>
        </div>
      </div>
    `);
  }

  renderTypeSelection() {
    const types = [
      {
        id: 'document',
        name: '文档知识库',
        icon: 'file-lines',
        desc: '管理PDF、Word等文档',
        color: 'bg-blue',
      },
      {
        id: 'web',
        name: '网页知识库',
        icon: 'globe',
        desc: '自动采集网页内容',
        color: 'bg-green',
      },
      {
        id: 'database',
        name: '数据库知识库',
        icon: 'database',
        desc: '连接数据库同步数据',
        color: 'bg-purple',
      },
      {
        id: 'qa',
        name: '问答知识库',
        icon: 'message',
        desc: '智能问答与对话',
        color: 'bg-orange',
      },
    ];

    return `
      <div style="margin-top:24px;">
        <h4 style="margin-bottom:16px;">选择知识库类型</h4>
        <div class="type-grid">
          ${types
            .map(
              (type) => `
            <div class="type-card ${this.selectedType === type.id ? 'selected' : ''}" data-type="${type.id}">
              <i class="fa-solid fa-${type.icon}"></i>
              <div class="type-name">${type.name}</div>
              <div class="type-desc">${type.desc}</div>
              ${this.selectedType === type.id ? '<div class="type-check">✓</div>' : ''}
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  renderTemplatePlaceholder() {
    return `
      <div style="margin-top:24px;">
        <div id="template-selector-container"></div>
      </div>
    `;
  }

  renderStep2() {
    this.currentStep = 2;
    const typeNames = {
      document: '文档知识库',
      web: '网页知识库',
      database: '数据库知识库',
      qa: '问答知识库',
    };

    this.setContent(`
      <div class="wizard-container">
        <div class="wizard-steps">
          <div class="step completed">
            <span class="step-number">✓</span>
            <span class="step-label">选择方式</span>
          </div>
          <div class="step active">
            <span class="step-number">2</span>
            <span class="step-label">配置信息</span>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <span class="step-label">完成</span>
          </div>
        </div>

        <div class="step-content">
          <h3 style="margin-bottom:8px;">${this.selectedTemplate ? `基于模板「${this.selectedTemplate.name}」创建` : `创建${typeNames[this.selectedType]}`}</h3>
          <p style="color:var(--kb-text-muted);font-size:14px;margin-bottom:24px;">填写基本信息和配置选项</p>

          <div class="form-section">
            <h4><i class="fa-solid fa-file-lines"></i> 基本信息</h4>
            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">知识库名称 *</label>
                <input type="text" class="input" id="kb-name" placeholder="输入知识库名称" value="${this.kbName}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea class="textarea" id="kb-description" placeholder="简要描述知识库的用途">${this.kbDescription}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">可见范围</label>
              <select class="select" id="kb-visibility">
                <option value="private" ${this.kbVisibility === 'private' ? 'selected' : ''}>私有</option>
                <option value="team" ${this.kbVisibility === 'team' ? 'selected' : ''}>团队可见</option>
                <option value="public" ${this.kbVisibility === 'public' ? 'selected' : ''}>公开</option>
              </select>
            </div>
          </div>

          <div class="form-section">
            <h4><i class="fa-solid fa-gear"></i> 专项配置</h4>
            <div id="config-form-container">${this.renderConfigForm()}</div>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn btn-secondary" data-action="back">上一步</button>
          <button class="btn btn-primary" data-action="next" ${!this.canProceedToStep3() ? 'disabled' : ''}>下一步</button>
        </div>
      </div>
    `);
  }

  renderConfigForm() {
    const configs = {
      document: this.renderDocumentConfig(),
      web: this.renderWebConfig(),
      database: this.renderDatabaseConfig(),
      qa: this.renderQAConfig(),
    };
    return configs[this.selectedType] || '';
  }

  renderDocumentConfig() {
    const config = this.selectedTemplate?.config || {};
    const formats = ['pdf', 'docx', 'md', 'txt', 'xlsx'];
    const formatLabels = {
      pdf: 'PDF',
      docx: 'Word',
      md: 'Markdown',
      txt: 'TXT',
      xlsx: 'Excel',
    };
    const savedFormats = config.supportedFormats || [
      'pdf',
      'docx',
      'md',
      'txt',
    ];

    return `
      <div class="config-form" data-type="document">
        <div class="config-group">
          <label class="form-label">支持格式</label>
          <div class="checkbox-grid">
            ${formats
              .map(
                (f) => `
              <label class="checkbox-item">
                <input type="checkbox" name="doc-format" value="${f}" ${savedFormats.includes(f) ? 'checked' : ''}>
                <span>${formatLabels[f]}</span>
              </label>
            `
              )
              .join('')}
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">最大文件大小</label>
            <select class="select" name="doc-max-size">
              <option value="10MB" ${(config.maxFileSize || '50MB') === '10MB' ? 'selected' : ''}>10MB</option>
              <option value="50MB" ${(config.maxFileSize || '50MB') === '50MB' ? 'selected' : ''}>50MB</option>
              <option value="100MB" ${(config.maxFileSize || '50MB') === '100MB' ? 'selected' : ''}>100MB</option>
              <option value="500MB" ${(config.maxFileSize || '50MB') === '500MB' ? 'selected' : ''}>500MB</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">分块策略</label>
            <select class="select" name="doc-chunk">
              <option value="paragraph" ${(config.chunkStrategy || 'intelligent') === 'paragraph' ? 'selected' : ''}>按段落</option>
              <option value="char" ${(config.chunkStrategy || 'intelligent') === 'char' ? 'selected' : ''}>按字符数</option>
              <option value="intelligent" ${(config.chunkStrategy || 'intelligent') === 'intelligent' ? 'selected' : ''}>智能分块</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="toggle-group">
            <label class="toggle-item">
              <input type="checkbox" name="doc-ocr" ${(config.ocrEnabled !== undefined ? config.ocrEnabled : true) ? 'checked' : ''}>
              <span>OCR识别</span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" name="doc-summary" ${(config.createSummary !== undefined ? config.createSummary : true) ? 'checked' : ''}>
              <span>自动摘要</span>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  renderWebConfig() {
    const config = this.selectedTemplate?.config || {};

    return `
      <div class="config-form" data-type="web">
        <div class="form-group">
          <label class="form-label">起始URL</label>
          <textarea class="textarea" name="web-urls" placeholder="每行一个URL">${(config.startUrls || []).join('\n')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">爬取深度</label>
            <input type="number" class="input" name="web-depth" value="${config.crawlDepth || 3}" min="1" max="10">
          </div>
          <div class="form-group">
            <label class="form-label">最大页面数</label>
            <input type="number" class="input" name="web-pages" value="${config.maxPages || 100}" min="1" max="1000">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">更新周期</label>
            <select class="select" name="web-cycle">
              <option value="daily" ${(config.updateCycle || 'weekly') === 'daily' ? 'selected' : ''}>每天</option>
              <option value="weekly" ${(config.updateCycle || 'weekly') === 'weekly' ? 'selected' : ''}>每周</option>
              <option value="monthly" ${(config.updateCycle || 'weekly') === 'monthly' ? 'selected' : ''}>每月</option>
              <option value="manual" ${(config.updateCycle || 'weekly') === 'manual' ? 'selected' : ''}>手动</option>
            </select>
          </div>
          <div class="toggle-group">
            <label class="toggle-item">
              <input type="checkbox" name="web-domain" ${(config.domainRestriction !== undefined ? config.domainRestriction : true) ? 'checked' : ''}>
              <span>域名限制</span>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  renderDatabaseConfig() {
    const config = this.selectedTemplate?.config || {};

    return `
      <div class="config-form" data-type="database">
        <div class="form-group">
          <label class="form-label">数据库类型</label>
          <select class="select" name="db-type">
            <option value="mysql" ${(config.dbType || 'mysql') === 'mysql' ? 'selected' : ''}>MySQL</option>
            <option value="postgresql" ${(config.dbType || 'mysql') === 'postgresql' ? 'selected' : ''}>PostgreSQL</option>
            <option value="sqlserver" ${(config.dbType || 'mysql') === 'sqlserver' ? 'selected' : ''}>SQL Server</option>
            <option value="sqlite" ${(config.dbType || 'mysql') === 'sqlite' ? 'selected' : ''}>SQLite</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">主机地址</label>
            <input type="text" class="input" name="db-host" placeholder="localhost" value="${config.host || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">端口</label>
            <input type="number" class="input" name="db-port" value="${config.port || 3306}" min="1" max="65535">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">数据库名</label>
            <input type="text" class="input" name="db-name" placeholder="database_name" value="${config.database || ''}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">用户名</label>
            <input type="text" class="input" name="db-user" placeholder="username" value="${config.username || ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input type="password" class="input" name="db-pass" placeholder="password" value="${config.password || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">同步频率</label>
            <select class="select" name="db-sync">
              <option value="real-time" ${(config.syncFrequency || 'daily') === 'real-time' ? 'selected' : ''}>实时</option>
              <option value="hourly" ${(config.syncFrequency || 'daily') === 'hourly' ? 'selected' : ''}>每小时</option>
              <option value="daily" ${(config.syncFrequency || 'daily') === 'daily' ? 'selected' : ''}>每天</option>
              <option value="weekly" ${(config.syncFrequency || 'daily') === 'weekly' ? 'selected' : ''}>每周</option>
            </select>
          </div>
          <div class="toggle-group">
            <label class="toggle-item">
              <input type="checkbox" name="db-incremental" ${(config.updateStrategy || 'incremental') === 'incremental' ? 'checked' : ''}>
              <span>增量同步</span>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  renderQAConfig() {
    const config = this.selectedTemplate?.config || {};

    return `
      <div class="config-form" data-type="qa">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">训练轮数</label>
            <input type="number" class="input" name="qa-rounds" value="${config.trainingRounds || 5}" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="form-label">最大返回数</label>
            <input type="number" class="input" name="qa-results" value="${config.maxResults || 3}" min="1" max="10">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">相似度阈值: ${(config.similarityThreshold || 0.75).toFixed(2)}</label>
          <input type="range" class="range" name="qa-threshold" min="0" max="1" step="0.05" value="${config.similarityThreshold || 0.75}">
        </div>
        <div class="form-group">
          <label class="form-label">评分规则</label>
          <select class="select" name="qa-scoring">
            <option value="accuracy" ${(config.scoringRule || 'hybrid') === 'accuracy' ? 'selected' : ''}>准确率优先</option>
            <option value="relevance" ${(config.scoringRule || 'hybrid') === 'relevance' ? 'selected' : ''}>相关性优先</option>
            <option value="hybrid" ${(config.scoringRule || 'hybrid') === 'hybrid' ? 'selected' : ''}>混合排序</option>
          </select>
        </div>
        <div class="toggle-group">
          <label class="toggle-item">
            <input type="checkbox" name="qa-intent" ${(config.intentRecognition !== undefined ? config.intentRecognition : true) ? 'checked' : ''}>
            <span>意图识别</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" name="qa-multi-turn" ${(config.multiTurnDialog !== undefined ? config.multiTurnDialog : true) ? 'checked' : ''}>
            <span>多轮对话</span>
          </label>
          <label class="toggle-item">
            <input type="checkbox" name="qa-clarify" ${(config.rephraseClarification !== undefined ? config.rephraseClarification : true) ? 'checked' : ''}>
            <span>反问澄清</span>
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">问答对导入</label>
          <div class="upload-area" id="qa-upload">
            <div style="text-align:center;padding:16px;">
              <i class="fa-solid fa-folder-open" style="font-size:24px;margin-bottom:8px;"></i>
              <div style="font-size:13px;">点击或拖拽上传 CSV/JSON 文件</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderStep3() {
    this.currentStep = 3;
    const typeNames = {
      document: '文档知识库',
      web: '网页知识库',
      database: '数据库知识库',
      qa: '问答知识库',
    };

    this.setContent(`
      <div class="wizard-container">
        <div class="wizard-steps">
          <div class="step completed">
            <span class="step-number">✓</span>
            <span class="step-label">选择方式</span>
          </div>
          <div class="step completed">
            <span class="step-number">✓</span>
            <span class="step-label">配置信息</span>
          </div>
          <div class="step active">
            <span class="step-number">3</span>
            <span class="step-label">完成</span>
          </div>
        </div>

        <div class="step-content">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="font-size:64px;margin-bottom:16px;">🎉</div>
            <h3 style="margin-bottom:8px;">知识库配置完成</h3>
            <p style="color:var(--kb-text-muted);">确认以下信息后点击完成创建</p>
          </div>

          <div class="summary-card">
            <div class="summary-row">
              <span class="summary-label">知识库名称</span>
              <span class="summary-value">${this.kbName || '未填写'}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">知识库类型</span>
              <span class="summary-value">${typeNames[this.selectedType]}</span>
            </div>
            ${
              this.selectedTemplate
                ? `
              <div class="summary-row">
                <span class="summary-label">使用模板</span>
                <span class="summary-value">${this.selectedTemplate.name}</span>
              </div>
            `
                : ''
            }
            <div class="summary-row">
              <span class="summary-label">可见范围</span>
              <span class="summary-value">${this.kbVisibility === 'private' ? '私有' : this.kbVisibility === 'team' ? '团队可见' : '公开'}</span>
            </div>
            ${
              this.kbDescription
                ? `
              <div class="summary-row">
                <span class="summary-label">描述</span>
                <span class="summary-value">${this.kbDescription}</span>
              </div>
            `
                : ''
            }
          </div>
        </div>

        <div class="step-actions">
          <button class="btn btn-secondary" data-action="back">上一步</button>
          <button class="btn btn-primary" data-action="confirm">完成创建</button>
        </div>
      </div>
    `);
  }

  bindStepEvents() {
    const container = document.getElementById('create-kb-modal');

    container.addEventListener('click', (e) => {
      const target = e.target;
      const action =
        target.dataset.action ||
        target.closest('[data-action]')?.dataset.action;

      switch (action) {
        case 'cancel':
          this.close();
          this.onCancel?.();
          break;
        case 'back':
          if (this.currentStep === 2) {
            this.currentStep = 1;
            this.renderStep1();
          } else if (this.currentStep === 3) {
            this.renderStep2();
          }
          break;
        case 'next':
          if (this.currentStep === 1 && this.canProceedToStep2()) {
            this.saveStep1Data();
            this.renderStep2();
          } else if (this.currentStep === 2 && this.canProceedToStep3()) {
            this.saveStep2Data();
            this.renderStep3();
          }
          break;
        case 'confirm':
          this.close();
          this.onConfirm?.(this.getFormData());
          break;
      }
    });

    container.addEventListener('click', (e) => {
      const modeCard = e.target.closest('.mode-card');
      if (modeCard) {
        this.createMode = modeCard.dataset.mode;
        this.selectedTemplate = null;
        this.renderStep1();

        if (this.createMode === 'template') {
          setTimeout(() => {
            this.initTemplateSelector();
          }, 100);
        }
      }

      const typeCard = e.target.closest('.type-card');
      if (typeCard) {
        this.selectedType = typeCard.dataset.type;
        this.renderStep1();
      }
    });
  }

  initTemplateSelector() {
    import('./TemplateSelector.js').then(({ TemplateSelector }) => {
      const container = document.getElementById('template-selector-container');
      if (container) {
        this.templateSelector = new TemplateSelector(container);
        this.templateSelector.setOnSelect((template) => {
          this.selectedTemplate = template;
          this.selectedType = template.type;
        });
      }
    });
  }

  canProceedToStep2() {
    if (this.createMode === 'blank') {
      return !!this.selectedType;
    } else if (this.createMode === 'template') {
      return !!this.selectedTemplate;
    }
    return false;
  }

  canProceedToStep3() {
    return !!document.getElementById('kb-name')?.value.trim();
  }

  saveStep1Data() {
    if (this.createMode === 'template' && this.selectedTemplate) {
      this.selectedType = this.selectedTemplate.type;
    }
  }

  saveStep2Data() {
    this.kbName = document.getElementById('kb-name')?.value || '';
    this.kbDescription = document.getElementById('kb-description')?.value || '';
    this.kbVisibility =
      document.getElementById('kb-visibility')?.value || 'private';
  }

  getFormData() {
    const typeNames = {
      document: '文档',
      web: '网页',
      database: '数据库',
      qa: '问答',
    };

    return {
      name: this.kbName,
      description: this.kbDescription,
      type: typeNames[this.selectedType],
      visibility:
        this.kbVisibility === 'private'
          ? '私有'
          : this.kbVisibility === 'team'
            ? '团队可见'
            : '公开',
      templateId: this.selectedTemplate?.id,
      config: this.configData,
      createMode: this.createMode,
    };
  }

  open() {
    this.currentStep = 1;
    this.createMode = 'blank';
    this.selectedType = 'document';
    this.selectedTemplate = null;
    this.renderStep1();
    super.open();
  }
}
