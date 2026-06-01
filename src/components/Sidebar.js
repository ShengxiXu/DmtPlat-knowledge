export class Sidebar {
  constructor(container) {
    this.container = container;
    this.navItems = [
      { id: 'list', label: '知识库列表', icon: 'folder-open' },
      { id: 'detail', label: '知识库详情', icon: 'file-lines' },
      { id: 'userChat', label: '用户聊天', icon: 'message' },
    ];
    this.systemItems = [
      { id: 'settings', label: '设置', icon: 'gear' },
      { id: 'theme', label: '主题', icon: 'palette' },
    ];
    this.activeItem = 'list';
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <aside class="sidebar">
        <div class="logo">
          <div class="logo-icon">S</div>
          SSO Hub
        </div>
        <nav class="nav">
          <div class="nav-section">知识库</div>
          ${this.navItems
            .map(
              (item) => `
            <div
              class="nav-item ${this.activeItem === item.id ? 'active' : ''}"
              data-id="${item.id}"
            >
              <i class="fa-solid fa-${item.icon}"></i> ${item.label}
            </div>
          `
            )
            .join('')}
          <div class="nav-section">系统</div>
          ${this.systemItems
            .map(
              (item) => `
            <div
              class="nav-item ${this.activeItem === item.id ? 'active' : ''}"
              data-id="${item.id}"
            >
              <i class="fa-solid fa-${item.icon}"></i> ${item.label}
            </div>
          `
            )
            .join('')}
        </nav>
      </aside>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem) {
        const id = navItem.dataset.id;
        this.activeItem = id;
        this.render();
        this.onNavChange?.(id);
      }
    });
  }

  setOnNavChange(callback) {
    this.onNavChange = callback;
  }

  setActive(itemId) {
    this.activeItem = itemId;
    this.render();
  }

  setOnKBSelect(callback) {
    this.onKBSelect = callback;
  }
}