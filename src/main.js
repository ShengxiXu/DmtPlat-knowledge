import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { CreateKBModal } from './components/CreateKBModal.js';
import { EditKBModal } from './components/EditKBModal.js';
import { KBList } from './views/KBList.js';
import { KBDetail } from './views/KBDetail.js';
import { UserChat } from './views/UserChat.js';
import { knowledgeBases } from './data/mockData.js';

class App {
  constructor() {
    this.app = document.getElementById('app');
    this.currentView = 'list';
    this.header = null;
    this.init();
  }

  init() {
    this.render();
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  render() {
    this.app.innerHTML = `
      <div class="app">
        <div id="header-container"></div>
        <div class="app-body">
          <div id="sidebar-container"></div>
          <main class="main" id="main-content"></main>
          <aside class="ai-sidebar" id="ai-sidebar">
            <div class="ai-sidebar-header">
              <div class="ai-sidebar-title"><i class="fa-solid fa-robot"></i> AI 助手</div>
              <button class="btn btn-sm btn-ghost" id="close-ai-sidebar"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="ai-chat">
              <div class="ai-message">
                <div class="ai-avatar">AI</div>
                <div class="ai-bubble">您好！我可以帮您快速了解知识库的使用方法，或协助您进行配置优化。</div>
              </div>
              <div class="ai-message" style="flex-direction:row-reverse;">
                <div class="ai-avatar" style="background:var(--kb-text-muted);">U</div>
                <div class="ai-bubble user">如何提升问答准确率？</div>
              </div>
              <div class="ai-message">
                <div class="ai-avatar">AI</div>
                <div class="ai-bubble">建议您：<br>1. 优化文档质量，确保内容准确<br>2. 调整分段长度至 500-800 字符<br>3. 启用向量化索引<br>4. 定期更新训练数据</div>
              </div>
            </div>
            <div class="ai-input">
              <input type="text" placeholder="询问 AI 助手...">
              <button class="btn btn-primary">➤</button>
            </div>
          </aside>
        </div>
      </div>
    `;

    this.initHeader();
    this.initSidebar();
    this.renderView('list');
    this.bindAISidebarEvents();
  }

  initHeader() {
    const headerContainer = document.getElementById('header-container');
    this.header = new Header(headerContainer);
  }

  initSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    this.sidebar = new Sidebar(sidebarContainer);
    this.sidebar.setOnNavChange((view) => {
      this.currentView = view;
      this.renderView(view);
    });
    this.sidebar.setOnKBSelect((kbData) => {
      this.currentView = 'detail';
      this.sidebar.setActive('detail');
      this.renderKBDetail(document.getElementById('main-content'), kbData);
    });
  }

  renderView(view) {
    const mainContent = document.getElementById('main-content');

    switch (view) {
      case 'list':
        this.renderKBList(mainContent);
        break;
      case 'detail':
        this.renderKBDetail(mainContent);
        break;
      case 'userChat':
        this.renderUserChat(mainContent);
        break;
      case 'settings':
        this.renderSettings(mainContent);
        break;
      case 'theme':
        this.renderTheme(mainContent);
        break;
      default:
        mainContent.innerHTML = `<div class="content"><h2>功能开发中...</h2></div>`;
    }
  }

  renderKBList(container) {
    const kbList = new KBList(container);
    kbList.setOnKBSelect((kbData) => {
      this.currentView = 'detail';
      this.sidebar.setActive('detail');
      this.renderKBDetail(document.getElementById('main-content'), kbData);
    });
    kbList.setOnCreateClick(() => {
      console.log('新建知识库按钮被点击');
      try {
        new CreateKBModal();
      } catch (error) {
        console.error('创建模态框失败:', error);
      }
    });
    kbList.setOnKBAction((action, kbData) => {
      console.log('Action:', action, kbData);
      switch (action) {
        case 'edit':
          new EditKBModal(kbData, (updatedKB) => {
            this.renderKBList(document.getElementById('main-content'));
          });
          break;
        case 'train':
          this.currentView = 'detail';
          this.sidebar.setActive('detail');
          this.renderKBDetail(document.getElementById('main-content'), kbData);
          setTimeout(() => {
            document.querySelector('.tab[data-tab="tab-train"]')?.click();
          }, 100);
          break;
        case 'test':
          this.currentView = 'detail';
          this.sidebar.setActive('detail');
          this.renderKBDetail(document.getElementById('main-content'), kbData);
          setTimeout(() => {
            document.querySelector('.tab[data-tab="tab-chat"]')?.click();
          }, 100);
          break;
      }
    });
  }

  renderKBDetail(container, kbData) {
    const kbDetail = new KBDetail(container, kbData);
    kbDetail.setOnBack(() => {
      this.currentView = 'list';
      this.sidebar.setActive('list');
      this.renderKBList(document.getElementById('main-content'));
    });
  }

  renderUserChat(container) {
    container.innerHTML = '';
    new UserChat(container);
  }

  renderSettings(container) {
    container.innerHTML = `
      <header class="header">
        <h1 class="header-title">系统设置</h1>
      </header>
      <div class="content">
        <div class="card">
          <h3 style="font-size:18px;font-weight:600;margin-bottom:24px;">系统设置</h3>
          <div class="config-section">
            <div class="config-section-title">基础设置</div>
            <div class="config-row">
              <div>
                <div class="config-label">启用通知</div>
                <div class="config-desc">接收系统通知和更新提醒</div>
              </div>
              <div class="toggle active" onclick="this.classList.toggle('active')"></div>
            </div>
            <div class="config-row">
              <div>
                <div class="config-label">自动保存</div>
                <div class="config-desc">自动保存编辑内容</div>
              </div>
              <div class="toggle active" onclick="this.classList.toggle('active')"></div>
            </div>
            <div class="config-row">
              <div>
                <div class="config-label">显示帮助提示</div>
                <div class="config-desc">在界面上显示操作提示</div>
              </div>
              <div class="toggle" onclick="this.classList.toggle('active')"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTheme(container) {
    container.innerHTML = `
      <header class="header">
        <h1 class="header-title">主题设置</h1>
      </header>
      <div class="content">
        <div class="card">
          <h3 style="font-size:18px;font-weight:600;margin-bottom:24px;">外观主题</h3>
          <div class="config-section">
            <div class="config-section-title">主题模式</div>
            <div class="radio-group">
              <div class="radio-btn active" onclick="toggleTheme('light')"><i class="fa-solid fa-sun"></i> 浅色模式</div>
              <div class="radio-btn" onclick="toggleTheme('dark')"><i class="fa-solid fa-moon"></i> 深色模式</div>
              <div class="radio-btn" onclick="toggleTheme('auto')"><i class="fa-solid fa-rotate-right"></i> 自动切换</div>
            </div>
          </div>
          <div class="config-section">
            <div class="config-section-title">主题颜色</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <button class="theme-color-btn active" style="background:#59A674;"></button>
              <button class="theme-color-btn" style="background:#6366F1;"></button>
              <button class="theme-color-btn" style="background:#EC4899;"></button>
              <button class="theme-color-btn" style="background:#F59E0B;"></button>
              <button class="theme-color-btn" style="background:#10B981;"></button>
              <button class="theme-color-btn" style="background:#8B5CF6;"></button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindAISidebarEvents() {
    const closeBtn = document.getElementById('close-ai-sidebar');
    const sidebar = document.getElementById('ai-sidebar');

    if (closeBtn && sidebar) {
      closeBtn.addEventListener('click', () => {
        sidebar.style.display = 'none';
      });
    }
  }
}

function toggleTheme(mode) {
  const html = document.documentElement;
  const radioBtns = document.querySelectorAll('.radio-btn');

  radioBtns.forEach((btn) => btn.classList.remove('active'));
  event.target.classList.add('active');

  switch (mode) {
    case 'dark':
      html.classList.add('dark');
      break;
    case 'light':
      html.classList.remove('dark');
      break;
    case 'auto':
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      break;
  }
}

window.toggleTheme = toggleTheme;

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
