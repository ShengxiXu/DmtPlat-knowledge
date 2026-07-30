import { kbTemplates } from '../data/templates.js';

export class TemplateSelector {
  constructor(container, callback) {
    this.container = container;
    this.callback = callback;
    this.selectedTemplate = null;
    this.groups = {
      recommended: {
        name: '推荐',
        templates: [
          'template_product_help',
          'template_customer_service',
          'template_internal_wiki',
        ],
      },
      team: {
        name: '团队协作库',
        templates: [
          'template_employee_training',
          'template_marketing_faq',
          'template_web_crawler',
          'template_db_sync',
          'template_finance_regulations',
          'template_medical_guide',
        ],
      },
      industry: {
        name: '行业解决方案',
        templates: [
          'template_ecommerce_faq',
          'template_insurance_qa',
          'template_hospital_faq',
          'template_retail_product',
        ],
      },
    };
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="template-selector-new">
        <div class="template-main">
          ${this.renderGroups()}
        </div>
        <div class="template-preview">
          <div class="preview-header">
            <h3>模板结构预览</h3>
          </div>
          <div class="preview-content" id="preview-content">
            ${this.selectedTemplate ? this.renderPreview(this.selectedTemplate) : '<div class="preview-empty">请选择一个模板查看预览</div>'}
          </div>
        </div>
      </div>
    `;
  }

  renderGroups() {
    return Object.entries(this.groups)
      .map(
        ([key, group]) => `
      <div class="template-group">
        <h4 class="group-title">${group.name}</h4>
        <div class="template-grid">
          ${group.templates
            .map((templateId) => {
              const template = kbTemplates.find((t) => t.id === templateId);
              if (!template) return '';
              const isSelected = this.selectedTemplate?.id === template.id;
              return `
              <div class="template-card-new ${isSelected ? 'selected' : ''}" data-template-id="${template.id}">
                <i class="fa-solid fa-${template.icon} template-icon-new"></i>
                <div class="template-info">
                  <div class="template-name">${template.name}</div>
                  <div class="template-desc">${template.description}</div>
                </div>
                ${isSelected ? '<div class="template-check">✓</div>' : ''}
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `
      )
      .join('');
  }

  renderPreview(template) {
    return `
      <div class="preview-title">
        <i class="fa-solid fa-${template.icon} preview-icon"></i>
        <span class="preview-name">${template.name}</span>
      </div>
      <p class="preview-desc">${template.description}</p>
      <div class="preview-section">
        <h5>适用场景</h5>
        <ul class="preview-list">
          ${template.scenarios?.map((s) => `<li>${s}</li>`).join('') || '<li>暂无</li>'}
        </ul>
      </div>
      <div class="preview-section">
        <h5>推荐功能</h5>
        <ul class="preview-list">
          ${template.recommendedFeatures?.map((f) => `<li>${f}</li>`).join('') || '<li>暂无</li>'}
        </ul>
      </div>
    `;
  }

  bindEvents() {
    this.container.addEventListener('click', (e) => {
      const card = e.target.closest('.template-card-new');
      if (card) {
        const templateId = card.dataset.templateId;
        this.selectedTemplate = kbTemplates.find((t) => t.id === templateId);

        // 更新选中状态
        this.container
          .querySelectorAll('.template-card-new')
          .forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');

        // 更新预览
        const previewContent = this.container.querySelector('#preview-content');
        if (previewContent) {
          previewContent.innerHTML = this.renderPreview(this.selectedTemplate);
        }

        // 通知父组件
        if (this.callback) {
          this.callback(this.selectedTemplate);
        }
      }
    });
  }

  getSelectedTemplate() {
    return this.selectedTemplate;
  }
}
