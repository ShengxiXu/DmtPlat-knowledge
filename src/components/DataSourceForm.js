export class DataSourceForm {
  constructor(type, config = {}, callback) {
    this.type = type;
    this.config = config;
    this.callback = callback;
    this.fields = this.getFieldsByType(type);
  }

  getFieldsByType(type) {
    const fields = {
      document: [
        { key: 'name', label: '数据源名称', type: 'text', required: true, default: '文档上传' },
        { key: 'priority', label: '召回优先级', type: 'select', options: [{ value: 1, label: '1 - 最高' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5 - 最低' }], default: 3 },
        { key: 'supportedFormats', label: '支持格式', type: 'checkbox', options: ['pdf', 'doc', 'docx', 'txt', 'xlsx', 'csv', 'ppt', 'pptx'], default: ['pdf', 'doc', 'docx'] },
        { key: 'maxFileSize', label: '最大文件大小(MB)', type: 'number', default: 50, min: 1, max: 500 }
      ],
      web: [
        { key: 'name', label: '数据源名称', type: 'text', required: true, default: '网页爬取' },
        { key: 'priority', label: '召回优先级', type: 'select', options: [{ value: 1, label: '1 - 最高' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5 - 最低' }], default: 3 }
      ],
      database: [
        { key: 'name', label: '数据源名称', type: 'text', required: true, default: '数据库连接' },
        { key: 'priority', label: '召回优先级', type: 'select', options: [{ value: 1, label: '1 - 最高' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5 - 最低' }], default: 3 }
      ],
      qa: [
        { key: 'name', label: '数据源名称', type: 'text', required: true, default: '问答导入' },
        { key: 'priority', label: '召回优先级', type: 'select', options: [{ value: 1, label: '1 - 最高' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5 - 最低' }], default: 3 },
        { key: 'matchThreshold', label: '匹配阈值', type: 'number', default: 0.8, min: 0, max: 1, step: 0.05 },
        { key: 'enableFuzzyMatch', label: '启用模糊匹配', type: 'checkbox', single: true, default: true },
        { key: 'maxQACount', label: '最大问答对数', type: 'number', default: 1000, min: 1, max: 10000 }
      ]
    };
    return fields[type] || [];
  }

  getTypeLabel(type) {
    const labels = {
      document: '文档上传',
      web: '网页爬取',
      database: '数据库连接',
      qa: '问答导入'
    };
    return labels[type] || type;
  }

  getTypeIcon(type) {
    const icons = {
      document: 'file-text',
      web: 'globe',
      database: 'database',
      qa: 'message-square'
    };
    return icons[type] || 'package';
  }

  render(container) {
    container.innerHTML = `
      <div class="ds-form">
        <div class="ds-form-header">
          <i class="fa-solid fa-${this.getTypeIcon(this.type)} ds-icon"></i>
          <span class="ds-title">配置${this.getTypeLabel(this.type)}</span>
        </div>
        <div class="ds-form-body">
          ${this.fields.map(field => this.renderField(field)).join('')}
        </div>
        <div class="ds-form-footer">
          <button class="btn btn-secondary btn-sm" id="ds-cancel">取消</button>
          <button class="btn btn-primary btn-sm" id="ds-save">保存配置</button>
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  renderField(field) {
    const value = this.config[field.key] !== undefined ? this.config[field.key] : field.default;
    
    switch (field.type) {
      case 'text':
        return `
          <div class="form-group">
            <label class="form-label">${field.label}${field.required ? ' *' : ''}</label>
            <input type="text" class="input input-sm" data-field="${field.key}" value="${value || ''}" placeholder="${field.placeholder || ''}" />
          </div>
        `;
      case 'password':
        return `
          <div class="form-group">
            <label class="form-label">${field.label}</label>
            <input type="password" class="input input-sm" data-field="${field.key}" value="${value || ''}" />
          </div>
        `;
      case 'number':
        return `
          <div class="form-group">
            <label class="form-label">${field.label}</label>
            <input type="number" class="input input-sm" data-field="${field.key}" value="${value || ''}" 
                   ${field.min !== undefined ? `min="${field.min}"` : ''}
                   ${field.max !== undefined ? `max="${field.max}"` : ''}
                   ${field.step !== undefined ? `step="${field.step}"` : ''} />
          </div>
        `;
      case 'textarea':
        return `
          <div class="form-group">
            <label class="form-label">${field.label}</label>
            <textarea class="textarea textarea-sm" data-field="${field.key}" placeholder="${field.placeholder || ''}">${value || ''}</textarea>
          </div>
        `;
      case 'checkbox':
        if (field.single) {
          return `
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" data-field="${field.key}" ${value ? 'checked' : ''} />
                ${field.label}
              </label>
            </div>
          `;
        }
        return `
          <div class="form-group">
            <label class="form-label">${field.label}</label>
            <div class="checkbox-group">
              ${field.options.map(opt => `
                <label class="checkbox-item">
                  <input type="checkbox" data-field="${field.key}" value="${opt}" ${(value || []).includes(opt) ? 'checked' : ''} />
                  ${opt.toUpperCase()}
                </label>
              `).join('')}
            </div>
          </div>
        `;
      case 'select':
        return `
          <div class="form-group">
            <label class="form-label">${field.label}</label>
            <select class="input input-sm" data-field="${field.key}">
              ${field.options.map(opt => `
                <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
          </div>
        `;
      default:
        return '';
    }
  }

  bindEvents(container) {
    container.querySelector('#ds-cancel')?.addEventListener('click', () => {
      if (this.callback) this.callback(null);
    });

    container.querySelector('#ds-save')?.addEventListener('click', () => {
      const data = this.getData();
      if (this.callback) this.callback(data);
    });
  }

  getData() {
    const data = {
      type: this.type,
      name: '',
      config: {}
    };

    this.fields.forEach(field => {
      const element = document.querySelector(`[data-field="${field.key}"]`);
      if (!element) return;

      if (field.type === 'checkbox') {
        if (field.single) {
          data.config[field.key] = element.checked;
        } else {
          const checkboxes = document.querySelectorAll(`[data-field="${field.key}"]:checked`);
          data.config[field.key] = Array.from(checkboxes).map(c => c.value);
        }
      } else if (field.type === 'number') {
        data.config[field.key] = parseFloat(element.value) || field.default || 0;
      } else {
        data.config[field.key] = element.value || '';
      }

      if (field.key === 'name') {
        data.name = data.config[field.key];
      }
    });

    return data;
  }
}