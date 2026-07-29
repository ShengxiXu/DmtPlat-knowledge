export class Header {
  constructor(container) {
    this.container = container;
    this.title = '知识库列表';
    this.subtitle = '';
    this.actions = [];
    this.render();
  }

  setTitle(title, subtitle = '') {
    this.title = title;
    this.subtitle = subtitle;
    this.render();
  }

  setActions(actions) {
    this.actions = actions;
    this.render();
  }

  render() {
    this.container.innerHTML = '<header class="app-header"><div class="header-left"><div class="logo"><div class="logo-icon">S</div>SSO Hub</div></div><div class="header-center"><div class="header-search-wrapper"><div class="header-search"><i class="fa-solid fa-search search-icon"></i><input type="text" placeholder="搜索知识库、文档..." class="search-input"/><button class="search-clear" style="display: none;"><i class="fa-solid fa-xmark"></i></button></div></div></div><div class="header-right"><div class="header-actions"><button class="header-btn notification-btn" title="通知"><i class="fa-solid fa-bell"></i><span class="notification-badge">3</span></button><button class="header-btn settings-btn" title="设置"><i class="fa-solid fa-gear"></i></button><button class="header-btn theme-btn" title="切换主题"><i class="fa-solid fa-sun sun-icon"></i><i class="fa-solid fa-moon moon-icon"></i></button></div><div class="user-profile"><div class="profile-avatar"><i class="fa-solid fa-user"></i></div><div class="profile-info"><div class="profile-name">用户</div><div class="profile-role">普通用户</div></div><i class="fa-solid fa-chevron-down profile-arrow"></i></div></div></header>';
    this.bindEvents();
  }

  bindEvents() {
    const themeBtn = this.container.querySelector('.theme-btn');
    const sunIcon = this.container.querySelector('.sun-icon');
    const moonIcon = this.container.querySelector('.moon-icon');

    const updateThemeIcon = () => {
      if (document.documentElement.classList.contains('dark')) {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      }
    };

    updateThemeIcon();

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        try {
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
        } catch (e) {}
        updateThemeIcon();
      });
    }

    const searchInput = this.container.querySelector('.search-input');
    const searchClear = this.container.querySelector('.search-clear');
    
    if (searchInput && searchClear) {
      searchInput.addEventListener('input', (e) => {
        searchClear.style.display = e.target.value ? 'flex' : 'none';
      });
      
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.style.display = 'none';
        searchInput.focus();
      });
    }
  }
}