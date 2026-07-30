export class TuningModal {
  constructor(options = {}) {
    this.record = options.record || {};
    this.onSubmit = options.onSubmit || (() => {});
    this.modal = null;
    this.currentStep = 1;
  }

  render() {
    const modal = document.createElement('div');
    modal.className = 'tuning-modal-overlay';
    modal.innerHTML = `
      <div class="tuning-modal">
        <div class="tuning-modal-header">
          <h3>知识库调优</h3>
          <button class="tuning-modal-close">&times;</button>
        </div>
        <div class="tuning-modal-body">
          <div class="tuning-steps">
            ${this.renderSteps()}
          </div>

          ${this.renderStepContent()}
        </div>
        <div class="tuning-modal-footer">
          ${this.renderFooterButtons()}
        </div>
      </div>
    `;
    this.modal = modal;
    this.bindEvents();
    return modal;
  }

  renderSteps() {
    const steps = [
      { number: '1', title: '问题分析' },
      { number: '2', title: '优化方案' },
      { number: '3', title: '确认提交' },
    ];

    return steps
      .map((step, index) => {
        let className = 'tuning-step';
        if (index + 1 === this.currentStep) className += ' active';
        else if (index + 1 < this.currentStep) className += ' completed';

        return `
        <div class="${className}">
          <div class="tuning-step-number">${step.number}</div>
          <div class="tuning-step-title">${step.title}</div>
        </div>
      `;
      })
      .join('');
  }

  renderStepContent() {
    switch (this.currentStep) {
      case 1:
        return this.renderStep1();
      case 2:
        return this.renderStep2();
      case 3:
        return this.renderStep3();
      default:
        return this.renderStep1();
    }
  }

  renderStep1() {
    const reasons = {
      wrong: '回答错误',
      incomplete: '回答不完整',
      irrelevant: '回答不相关',
      confusing: '回答不清楚',
      other: '其他',
    };

    return `
      <div class="tuning-section">
        <div class="tuning-section-title">用户评价详情</div>
        <div class="tuning-status ${this.getStatusClass()}">
          <i class="fa-solid ${this.getStatusIcon()}"></i>
          <span>${this.getStatusText()}</span>
        </div>
        
        <div class="tuning-form-group">
          <label>用户问题</label>
          <textarea readonly class="tuning-content">${this.record.question || ''}</textarea>
        </div>
        
        <div class="tuning-form-group">
          <label>系统回答</label>
          <textarea readonly class="tuning-content">${this.record.answer || ''}</textarea>
        </div>
        
        <div class="tuning-form-group">
          <label>用户评分</label>
          <div style="display:flex;align-items:center;gap:8px;">
            ${this.renderStars(this.record.rating)}
            <span style="color:var(--kb-text-muted);">${this.getRatingText(this.record.rating)}</span>
          </div>
        </div>
        
        ${
          this.record.reasons && this.record.reasons.length > 0
            ? `
        <div class="tuning-form-group">
          <label>不满意原因</label>
          <div style="display:flex;flex-wrap:gap;gap:8px;">
            ${this.record.reasons.map((r) => `<span style="padding:4px 12px;background:var(--kb-warning-muted);color:var(--kb-warning);border-radius:20px;font-size:13px;">${reasons[r] || r}</span>`).join('')}
          </div>
        </div>
        `
            : ''
        }
        
        ${
          this.record.feedback
            ? `
        <div class="tuning-form-group">
          <label>用户反馈</label>
          <textarea readonly class="tuning-content">${this.record.feedback}</textarea>
        </div>
        `
            : ''
        }
        
        ${
          this.record.suggestion
            ? `
        <div class="tuning-form-group">
          <label>用户建议的正确回答</label>
          <textarea readonly class="tuning-content">${this.record.suggestion}</textarea>
        </div>
        `
            : ''
        }
      </div>
    `;
  }

  renderStep2() {
    return `
      <div class="tuning-section">
        <div class="tuning-section-title">选择优化方式</div>
        
        <div class="tuning-form-group">
          <label>优化类型</label>
          <select id="tuning-type">
            <option value="update">更新知识库答案</option>
            <option value="add">添加新的问答对</option>
            <option value="ignore">标记为无需优化</option>
          </select>
        </div>
        
        <div class="tuning-form-group" id="tuning-answer-group">
          <label>优化后的答案</label>
          <textarea id="tuning-answer" placeholder="请输入优化后的答案..."></textarea>
        </div>
        
        <div class="tuning-form-group" id="tuning-tags-group">
          <label>关联标签（可选）</label>
          <input type="text" id="tuning-tags" placeholder="多个标签用逗号分隔">
        </div>
        
        <div class="tuning-form-group">
          <label>优化备注（可选）</label>
          <textarea id="tuning-note" placeholder="请输入优化备注..."></textarea>
        </div>
      </div>
    `;
  }

  renderStep3() {
    const tuningType =
      this.modal?.querySelector('#tuning-type')?.value || 'update';
    const answer = this.modal?.querySelector('#tuning-answer')?.value || '';
    const tags = this.modal?.querySelector('#tuning-tags')?.value || '';
    const note = this.modal?.querySelector('#tuning-note')?.value || '';

    const typeText = {
      update: '更新知识库答案',
      add: '添加新的问答对',
      ignore: '标记为无需优化',
    };

    return `
      <div class="tuning-section">
        <div class="tuning-section-title">优化确认</div>
        
        <div class="tuning-form-group">
          <label>优化类型</label>
          <div class="tuning-content">${typeText[tuningType]}</div>
        </div>
        
        ${
          tuningType !== 'ignore' && answer
            ? `
        <div class="tuning-form-group">
          <label>优化后的答案</label>
          <div class="tuning-content">${answer}</div>
        </div>
        `
            : ''
        }
        
        ${
          tags
            ? `
        <div class="tuning-form-group">
          <label>关联标签</label>
          <div class="tuning-content">${tags}</div>
        </div>
        `
            : ''
        }
        
        ${
          note
            ? `
        <div class="tuning-form-group">
          <label>优化备注</label>
          <div class="tuning-content">${note}</div>
        </div>
        `
            : ''
        }
        
        <div style="padding:16px;background:var(--kb-primary-subtle);border-radius:8px;margin-top:16px;">
          <p style="margin:0;font-size:14px;color:var(--kb-primary-dark);">
            <i class="fa-solid fa-info-circle" style="margin-right:8px;"></i>
            优化完成后，该评价记录将被标记为已处理，新的答案将在下次问答时生效。
          </p>
        </div>
      </div>
    `;
  }

  renderFooterButtons() {
    if (this.currentStep === 1) {
      return `
        <button class="btn btn-secondary tuning-btn-back" disabled>上一步</button>
        <button class="btn btn-primary tuning-btn-next">下一步</button>
      `;
    } else if (this.currentStep === 2) {
      return `
        <button class="btn btn-secondary tuning-btn-back">上一步</button>
        <button class="btn btn-primary tuning-btn-next">下一步</button>
      `;
    } else {
      return `
        <button class="btn btn-secondary tuning-btn-back">上一步</button>
        <button class="btn btn-primary tuning-btn-submit">确认优化</button>
      `;
    }
  }

  renderStars(rating) {
    return Array.from(
      { length: 5 },
      (_, i) =>
        `<i class="fa-solid fa-star ${i < rating ? 'active' : ''}" style="${i < rating ? 'color:var(--kb-primary);' : 'color:var(--kb-border);'}"></i>`
    ).join('');
  }

  getRatingText(rating) {
    const texts = ['', '非常不满意', '不满意', '一般', '满意', '非常满意'];
    return texts[rating] || '';
  }

  getStatusClass() {
    const rating = this.record.rating || 0;
    if (rating <= 2) return 'pending';
    if (rating === 3) return 'processing';
    return 'completed';
  }

  getStatusIcon() {
    const rating = this.record.rating || 0;
    if (rating <= 2) return 'fa-exclamation-circle';
    if (rating === 3) return 'fa-clock';
    return 'fa-check-circle';
  }

  getStatusText() {
    const rating = this.record.rating || 0;
    if (rating <= 2) return '需要优化';
    if (rating === 3) return '待评估';
    return '已达标';
  }

  bindEvents() {
    const closeBtn = this.modal.querySelector('.tuning-modal-close');
    const backBtn = this.modal.querySelector('.tuning-btn-back');
    const nextBtn = this.modal.querySelector('.tuning-btn-next');
    const submitBtn = this.modal.querySelector('.tuning-btn-submit');
    const typeSelect = this.modal.querySelector('#tuning-type');

    closeBtn.addEventListener('click', () => this.close());

    backBtn.addEventListener('click', () => this.prevStep());

    nextBtn.addEventListener('click', () => this.nextStep());

    submitBtn?.addEventListener('click', () => this.submit());

    typeSelect?.addEventListener('change', (e) => {
      const answerGroup = this.modal.getElementById('tuning-answer-group');
      const tagsGroup = this.modal.getElementById('tuning-tags-group');
      if (e.target.value === 'ignore') {
        answerGroup.style.display = 'none';
        tagsGroup.style.display = 'none';
      } else {
        answerGroup.style.display = 'block';
        tagsGroup.style.display = 'block';
      }
    });
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateModal();
    }
  }

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
      this.updateModal();
    }
  }

  updateModal() {
    const body = this.modal.querySelector('.tuning-modal-body');
    const footer = this.modal.querySelector('.tuning-modal-footer');

    body.innerHTML = `
      <div class="tuning-steps">
        ${this.renderSteps()}
      </div>
      ${this.renderStepContent()}
    `;

    footer.innerHTML = this.renderFooterButtons();
    this.bindEvents();
  }

  submit() {
    const tuningType =
      this.modal.querySelector('#tuning-type')?.value || 'update';
    const answer = this.modal.querySelector('#tuning-answer')?.value || '';
    const tags = this.modal.querySelector('#tuning-tags')?.value || '';
    const note = this.modal.querySelector('#tuning-note')?.value || '';

    const tuningData = {
      recordId: this.record.id,
      type: tuningType,
      answer,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      note,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };

    this.onSubmit(tuningData);
    this.close();
    this.showSuccess();
  }

  showSuccess() {
    const successModal = document.createElement('div');
    successModal.className = 'tuning-modal-overlay';
    successModal.innerHTML = `
      <div class="tuning-modal" style="width:400px;text-align:center;padding:40px;">
        <div style="font-size:60px;color:var(--kb-success);margin-bottom:16px;">
          <i class="fa-solid fa-check-circle"></i>
        </div>
        <h3 style="margin:0 0 8px;">优化完成</h3>
        <p style="color:var(--kb-text-muted);margin:0 0 24px;">知识库已成功更新，新的答案将立即生效</p>
        <button class="btn btn-primary">确定</button>
      </div>
    `;
    document.body.appendChild(successModal);

    successModal.querySelector('.btn').addEventListener('click', () => {
      successModal.remove();
    });
  }

  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  show() {
    if (!this.modal) {
      document.body.appendChild(this.render());
    }
  }
}
