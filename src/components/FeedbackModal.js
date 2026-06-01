export class FeedbackModal {
  constructor(options = {}) {
    this.question = options.question || '';
    this.answer = options.answer || '';
    this.onSubmit = options.onSubmit || (() => {});
    this.modal = null;
  }

  render() {
    const modal = document.createElement('div');
    modal.className = 'feedback-modal-overlay';
    modal.innerHTML = `
      <div class="feedback-modal">
        <div class="feedback-modal-header">
          <h3>请评价本次回答</h3>
          <button class="feedback-modal-close">&times;</button>
        </div>
        <div class="feedback-modal-body">
          <div class="feedback-question">
            <span class="feedback-label">您的问题：</span>
            <p>${this.question}</p>
          </div>
          <div class="feedback-answer">
            <span class="feedback-label">系统回答：</span>
            <p>${this.answer}</p>
          </div>
          <div class="feedback-rating-section">
            <div class="feedback-label">满意度评分</div>
            <div class="rating-stars">
              ${[1, 2, 3, 4, 5].map((star) => `
                <button class="star-btn" data-rating="${star}">
                  <i class="fa-solid fa-star"></i>
                </button>
              `).join('')}
            </div>
            <div class="rating-text" id="rating-text"></div>
          </div>
          <div class="feedback-reason-section" id="feedback-reason-section" style="display:none;">
            <div class="feedback-label">请说明不满意的原因（可选）</div>
            <div class="reason-options">
              <label class="reason-option">
                <input type="checkbox" name="reason" value="wrong">
                <span>回答错误</span>
              </label>
              <label class="reason-option">
                <input type="checkbox" name="reason" value="incomplete">
                <span>回答不完整</span>
              </label>
              <label class="reason-option">
                <input type="checkbox" name="reason" value="irrelevant">
                <span>回答不相关</span>
              </label>
              <label class="reason-option">
                <input type="checkbox" name="reason" value="confusing">
                <span>回答不清楚</span>
              </label>
              <label class="reason-option">
                <input type="checkbox" name="reason" value="other">
                <span>其他</span>
              </label>
            </div>
            <textarea class="feedback-textarea" placeholder="请输入详细反馈..."></textarea>
          </div>
          <div class="feedback-suggestion-section" id="feedback-suggestion-section" style="display:none;">
            <div class="feedback-label">您认为正确的回答应该是？</div>
            <textarea class="suggestion-textarea" placeholder="请提供您认为正确的答案，帮助我们改进知识库..."></textarea>
          </div>
        </div>
        <div class="feedback-modal-footer">
          <button class="btn btn-secondary feedback-btn-skip">跳过评价</button>
          <button class="btn btn-primary feedback-btn-submit" disabled>提交评价</button>
        </div>
      </div>
    `;
    this.modal = modal;
    this.bindEvents();
    return modal;
  }

  bindEvents() {
    const closeBtn = this.modal.querySelector('.feedback-modal-close');
    const skipBtn = this.modal.querySelector('.feedback-btn-skip');
    const submitBtn = this.modal.querySelector('.feedback-btn-submit');
    const starBtns = this.modal.querySelectorAll('.star-btn');
    const reasonSection = this.modal.getElementById('feedback-reason-section');
    const suggestionSection = this.modal.getElementById('feedback-suggestion-section');

    closeBtn.addEventListener('click', () => this.close());
    skipBtn.addEventListener('click', () => this.close());

    starBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rating);
        this.setRating(rating);
        submitBtn.disabled = false;

        if (rating <= 2) {
          reasonSection.style.display = 'block';
          suggestionSection.style.display = 'block';
        } else {
          reasonSection.style.display = 'none';
          suggestionSection.style.display = 'none';
        }
      });
    });

    submitBtn.addEventListener('click', () => this.submit());
  }

  setRating(rating) {
    const stars = this.modal.querySelectorAll('.star-btn');
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });

    const ratingText = this.modal.getElementById('rating-text');
    const texts = ['', '非常不满意', '不满意', '一般', '满意', '非常满意'];
    ratingText.textContent = texts[rating];
  }

  submit() {
    const rating = this.modal.querySelectorAll('.star-btn.active').length;
    const reasons = Array.from(this.modal.querySelectorAll('input[name="reason"]:checked'))
      .map((input) => input.value);
    const feedback = this.modal.querySelector('.feedback-textarea').value;
    const suggestion = this.modal.querySelector('.suggestion-textarea').value;

    const feedbackData = {
      question: this.question,
      answer: this.answer,
      rating,
      reasons,
      feedback,
      suggestion,
      timestamp: new Date().toISOString(),
    };

    this.onSubmit(feedbackData);
    this.close();
    this.showThankYou();
  }

  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  showThankYou() {
    const thankYouModal = document.createElement('div');
    thankYouModal.className = 'feedback-modal-overlay thank-you';
    thankYouModal.innerHTML = `
      <div class="feedback-modal thank-you-modal">
        <div class="thank-you-icon">
          <i class="fa-solid fa-check-circle"></i>
        </div>
        <h3>感谢您的反馈！</h3>
        <p>您的评价对我们非常重要，帮助我们不断改进服务。</p>
        <button class="btn btn-primary thank-you-btn">确定</button>
      </div>
    `;
    document.body.appendChild(thankYouModal);

    thankYouModal.querySelector('.thank-you-btn').addEventListener('click', () => {
      thankYouModal.remove();
    });

    setTimeout(() => {
      thankYouModal.remove();
    }, 3000);
  }

  show() {
    if (!this.modal) {
      document.body.appendChild(this.render());
    }
  }
}