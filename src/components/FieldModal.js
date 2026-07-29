// 字段表单弹层组件（方案 A）
// 用法：new FieldModal({ template, knowledgeBases, onConfirm, onCancel }).open()
import { renderFieldInput, collectFieldValues, validateFields, escapeHtml } from '../utils/fieldRenderer.js';

export class FieldModal {
  constructor(options = {}) {
    this.template = options.template;
    this.knowledgeBases = options.knowledgeBases || [];
    this.initialFormData = options.initialFormData || {};
    this.initialKBs = options.initialKBs || [];
    this.mode = options.mode || this.template?.defaultMode || 'free';
    this.onConfirm = options.onConfirm;
    this.onCancel = options.onCancel;
    this.selectedKBs = [...this.initialKBs];
    this.overlayId = 'wa-fm-overlay-' + Date.now();
    this.boundClick = this._handleClick.bind(this);
    this.boundKeydown = this._handleKeydown.bind(this);
  }

  open() {
    // 移除已有弹层
    this.close();
    const overlay = document.createElement('div');
    overlay.id = this.overlayId;
    overlay.className = 'wa-fm-overlay';
    overlay.innerHTML = this._render();
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.addEventListener('click', this.boundClick, true);
    document.addEventListener('keydown', this.boundKeydown);
    // 默认聚焦第一个输入框
    setTimeout(() => {
      const firstInput = overlay.querySelector('.wa-fm-input');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  close() {
    const overlay = document.getElementById(this.overlayId);
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 200);
    }
    document.removeEventListener('click', this.boundClick, true);
    document.removeEventListener('keydown', this.boundKeydown);
  }

  _render() {
    const t = this.template;
    if (!t) return '';
    const fieldsHtml = (t.fields || []).map((f) => renderFieldInput(f, this.initialFormData[f.id])).join('');
    const kbSection = this.knowledgeBases.length > 0 ? this._renderKBSection() : '';
    const exampleBtn = t.example ? `
      <div class="wa-fm-example" id="wa-fm-example">
        <i class="fa-solid fa-wand-magic-sparkles"></i> 一键填入示例
      </div>
    ` : '';

    return `
      <div class="wa-fm-modal" role="dialog" aria-modal="true">
        <div class="wa-fm-header">
          <div class="wa-fm-icon"><i class="fa-solid fa-${t.icon || 'file-lines'}"></i></div>
          <div class="wa-fm-title-group">
            <div class="wa-fm-title">${escapeHtml(t.name)}</div>
            <div class="wa-fm-subtitle">填写以下字段，AI 将基于结构化信息生成</div>
          </div>
          <button class="wa-fm-close" data-action="cancel" title="关闭"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="wa-fm-body">
          ${kbSection}
          ${exampleBtn}
          ${fieldsHtml}
        </div>
        <div class="wa-fm-footer">
          <button class="wa-fm-btn ghost" data-action="cancel">取消</button>
          <button class="wa-fm-btn primary" data-action="confirm">
            <i class="fa-solid fa-play"></i> 开始生成
          </button>
        </div>
      </div>
    `;
  }

  _renderKBSection() {
    return `
      <div class="wa-fm-kb-section">
        <div class="wa-fm-kb-title"><i class="fa-solid fa-book"></i> 关联知识库（可选，提升内容质量）</div>
        <div class="wa-fm-kb-options">
          <div class="wa-fm-kb-opt ${this.selectedKBs.length === 0 ? 'active' : ''}" data-kb-id="none">
            <i class="fa-solid fa-circle-xmark"></i> 不关联
          </div>
          ${this.knowledgeBases.map((kb) => `
            <div class="wa-fm-kb-opt ${this.selectedKBs.some((s) => s.id === kb.id) ? 'active' : ''}" data-kb-id="${kb.id}">
              <i class="fa-solid fa-book"></i> ${escapeHtml(kb.name)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  _handleClick(e) {
    const overlay = document.getElementById(this.overlayId);
    if (!overlay) return;
    // 点击遮罩关闭
    if (e.target === overlay) {
      this._cancel();
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'cancel') { e.stopPropagation(); this._cancel(); return; }
    if (action === 'confirm') { e.stopPropagation(); this._confirm(); return; }

    // 知识库选项
    const kbOpt = e.target.closest('[data-kb-id]');
    if (kbOpt) {
      e.stopPropagation();
      const kbId = kbOpt.dataset.kbId;
      overlay.querySelectorAll('.wa-fm-kb-opt').forEach((o) => o.classList.remove('active'));
      kbOpt.classList.add('active');
      if (kbId === 'none') {
        this.selectedKBs = [];
      } else {
        const kb = this.knowledgeBases.find((k) => k.id === kbId);
        this.selectedKBs = kb ? [kb] : [];
      }
      return;
    }

    // 一键填示例
    if (e.target.closest('#wa-fm-example')) {
      e.stopPropagation();
      this._fillExample();
      return;
    }
  }

  _handleKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); this._cancel(); }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); this._confirm(); }
  }

  _fillExample() {
    const overlay = document.getElementById(this.overlayId);
    if (!overlay || !this.template.example) return;
    this.template.fields.forEach((f) => {
      const el = overlay.querySelector(`[data-field-id="${f.id}"]`);
      if (el && this.template.example[f.id] != null) {
        if (f.type === 'multi_select') {
          // multi_select 是 checkbox 数组
          el.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            cb.checked = (this.template.example[f.id] || []).includes(cb.value);
          });
        } else {
          el.value = this.template.example[f.id];
        }
      }
    });
  }

  _confirm() {
    const overlay = document.getElementById(this.overlayId);
    if (!overlay) return;
    const data = collectFieldValues(this.template.fields || [], overlay);
    const errors = validateFields(this.template.fields || [], data);
    // 清除旧错误
    overlay.querySelectorAll('.wa-fm-error').forEach((e) => e.classList.remove('show'));
    overlay.querySelectorAll('.wa-fm-input').forEach((i) => i.classList.remove('error'));
    if (Object.keys(errors).length > 0) {
      // 显示错误
      Object.keys(errors).forEach((fid) => {
        const errEl = overlay.querySelector(`#wa-fm-error-${fid}`);
        const inputEl = overlay.querySelector(`[data-field-id="${fid}"]`);
        if (errEl) errEl.classList.add('show');
        if (inputEl && inputEl.classList.contains('wa-fm-input')) inputEl.classList.add('error');
      });
      // 聚焦第一个错误字段
      const firstErr = overlay.querySelector('.wa-fm-input.error');
      if (firstErr) firstErr.focus();
      return;
    }
    const result = { template: this.template, formData: data, selectedKBs: this.selectedKBs, mode: this.mode };
    this.close();
    this.onConfirm?.(result);
  }

  _cancel() {
    this.close();
    this.onCancel?.();
  }
}
