import { getStatusClass, getTypeIcon } from '../utils/helpers.js';

export class KBCard {
  constructor(kbData) {
    this.kbData = kbData;
    this.element = document.createElement('div');
    this.render();
  }

  render() {
    const {
      name,
      type,
      description,
      documentCount,
      lastUpdate,
      views,
      status,
    } = this.kbData;
    const statusClass = getStatusClass(status);
    const typeIcon = getTypeIcon(type);

    this.element.innerHTML = `
      <div class="kb-card" data-id="${this.kbData.id}">
        <div class="kb-card-header">
          <div>
            <div class="kb-card-title">${name}</div>
            <span class="tag ${status === 'active' ? 'tag-primary' : ''}">${typeIcon} ${type}</span>
          </div>
          <div class="kb-status ${statusClass}"></div>
        </div>
        <div class="kb-card-desc">${description}</div>
        <div class="kb-card-meta">
          <span><i class="fa-solid fa-file-lines"></i> ${documentCount} ${type === '问答' ? '问答' : '文档'}</span>
          <span><i class="fa-solid fa-clock"></i> ${lastUpdate}</span>
          <span><i class="fa-solid fa-eye"></i> ${views} 访问</span>
        </div>
        <div class="kb-card-actions">
          <button class="btn btn-sm btn-ghost" data-action="edit">编辑</button>
          <button class="btn btn-sm btn-ghost" data-action="train">训练</button>
          <button class="btn btn-sm btn-ghost" data-action="test">测试</button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const card = this.element.querySelector('.kb-card');
    const buttons = this.element.querySelectorAll('.kb-card-actions .btn');

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.btn')) {
        this.onClick?.(this.kbData);
      }
    });

    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        this.onAction?.(action, this.kbData);
      });
    });
  }

  setOnClick(callback) {
    this.onClick = callback;
  }

  setOnAction(callback) {
    this.onAction = callback;
  }
}
