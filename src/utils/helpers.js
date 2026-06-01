export function formatDate(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date;
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function throttle(fn, limit = 100) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function validateEmail(email) {
  const re = /^[\w.-]+@[\w.-]+\.\w{2,}$/;
  return re.test(email);
}

export function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function scrollToTop(element) {
  element.scrollTo({ top: 0, behavior: 'smooth' });
}

export function scrollToBottom(element) {
  element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
}

export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function getRatingStars(rating) {
  const filled = `<i class="fa-solid fa-star" style="color:#FFD700;"></i>`.repeat(rating);
  const empty = `<i class="fa-solid fa-star" style="color:#DDD;"></i>`.repeat(5 - rating);
  return filled + empty;
}

export function getTypeIcon(type) {
  const icons = {
    文档: 'file-lines',
    网页: 'globe',
    数据库: 'database',
    问答: 'message',
  };
  return `<i class="fa-solid fa-${icons[type] || 'file-lines'}"></i>`;
}

export function getStatusClass(status) {
  return status === 'active' ? '' : 'inactive';
}

export function getStatusText(status) {
  return status === 'active' ? '已启用' : '已禁用';
}

export function icon(name, className = '') {
  return `<i class="fa-solid fa-${name} ${className}"></i>`;
}
