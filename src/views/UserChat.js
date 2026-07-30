import {
  knowledgeBases,
  userChatMessages,
  suggestions,
} from '../data/mockData.js';
import { ChatContainer } from '../components/ChatContainer.js';
import { getTypeIcon } from '../utils/helpers.js';

export class UserChat {
  constructor(container) {
    this.container = container;
    this.activeKB = knowledgeBases[0];
    this.searchQuery = '';
    this.expandedGroups = {
      personal: false,
      shared: false,
      history: false,
    };
    this.render();
  }

  getHistoryConversations() {
    return [
      { id: '1', title: '这个知识库对我有什么好处？', icon: 'help-circle' },
      { id: '2', title: '数智化互通平台核心信息汇总', icon: 'info' },
      { id: '3', title: '如何用AI做短剧？', icon: 'video' },
      { id: '4', title: '文档管理、训练配置、问答测试...', icon: 'layers' },
      { id: '5', title: '有哪些好用的Skill？', icon: 'zap' },
      { id: '6', title: 'OKR与KPI有何不同？', icon: 'bar-chart' },
    ];
  }

  filterConversations(conversations) {
    if (!this.searchQuery) return conversations;
    const query = this.searchQuery.toLowerCase();
    return conversations.filter((conv) =>
      conv.title.toLowerCase().includes(query)
    );
  }

  render() {
    const conversations = this.getHistoryConversations();
    const filteredConversations = this.filterConversations(conversations);

    this.container.innerHTML = `
      <div class="user-chat-layout">
        <aside class="user-kb-sidebar">
          <div class="sidebar-section">
            <button class="new-chat-btn" id="new-chat-btn">
              <span>⊕</span>
              <span>新对话</span>
            </button>
          </div>

          <div class="sidebar-section">
            <div class="nav-item expandable" data-group="personal">
              <i class="fa-solid fa-book-open"></i>
              <span>个人知识库</span>
              <i class="fa-solid fa-${this.expandedGroups.personal ? 'chevron-down' : 'chevron-right'} expand-arrow"></i>
            </div>
            <div class="nav-submenu ${this.expandedGroups.personal ? '' : 'collapsed'}">
              ${knowledgeBases
                .slice(0, 5)
                .map(
                  (kb, index) => `
                <div class="nav-subitem ${index === 0 ? 'default-active' : ''}" data-id="${kb.id}">
                  <i class="fa-solid fa-${kb.type === '问答' ? 'comments' : 'file-text'}"></i>
                  <span>${kb.name}</span>
                  <span class="kb-count">${kb.documentCount}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <div class="sidebar-section">
            <div class="nav-item expandable" data-group="shared">
              <i class="fa-solid fa-share-nodes"></i>
              <span>共享知识库</span>
              <i class="fa-solid fa-${this.expandedGroups.shared ? 'chevron-down' : 'chevron-right'} expand-arrow"></i>
            </div>
            <div class="nav-submenu ${this.expandedGroups.shared ? '' : 'collapsed'}">
              <div class="nav-subitem featured">
                <i class="fa-solid fa-fire-flame-curved"></i>
                <span>知识库广场</span>
              </div>
              <div class="nav-subitem">
                <i class="fa-solid fa-users"></i>
                <span>我加入的</span>
              </div>
            </div>
          </div>

          <div class="sidebar-section">
            <div class="nav-item expandable" data-group="history">
              <i class="fa-solid fa-history"></i>
              <span>历史会话</span>
              <i class="fa-solid fa-${this.expandedGroups.history ? 'chevron-down' : 'chevron-right'} expand-arrow"></i>
            </div>
            
            <div class="nav-submenu history-submenu ${this.expandedGroups.history ? '' : 'collapsed'}">
              <div class="search-box ${this.searchQuery ? 'active' : ''}" id="history-search-box">
                <input 
                  type="text" 
                  placeholder="搜索历史对话..." 
                  value="${this.searchQuery}"
                  id="history-search-input"
                >
              </div>

              <div class="history-list">
                ${
                  filteredConversations.length > 0
                    ? filteredConversations
                        .map(
                          (conv) => `
                    <div class="history-item" data-id="${conv.id}">
                      <span class="history-title">${conv.title}</span>
                    </div>
                  `
                        )
                        .join('')
                    : `<div class="empty-history">暂无历史对话</div>`
                }
              </div>
            </div>
          </div>
        </aside>

        <main class="user-chat-main">
          <header class="user-chat-header">
            <div class="user-chat-title">
              <h2>${this.activeKB.name}</h2>
              <div class="user-chat-status">
                <span class="status-dot"></span>
                在线
              </div>
            </div>
            <div class="user-chat-actions">
              <button class="btn btn-sm btn-ghost"><i class="fa-solid fa-moon"></i></button>
              <button class="btn btn-sm btn-ghost"><i class="fa-solid fa-phone"></i></button>
            </div>
          </header>

          <div id="user-chat-container"></div>
        </main>
      </div>
    `;

    this.initChat();
    this.bindEvents();
  }

  initChat() {
    const chatContainer = document.getElementById('user-chat-container');
    if (chatContainer) {
      this.chat = new ChatContainer(chatContainer, {
        messages: userChatMessages,
        suggestions: suggestions,
        showWelcome: true,
      });
      this.chat.setOnSendMessage((message) => {
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const botResponse = {
          id: Date.now(),
          role: 'bot',
          content: `这是针对问题「${message}」的模拟回答。在实际应用中，系统会查询知识库「${this.activeKB.name}」并返回相关答案。`,
          time,
        };
        this.chat.addMessage(botResponse);
      });
    }
  }

  bindEvents() {
    const searchBtn = this.container.querySelector('#history-search-btn');
    const searchBox = this.container.querySelector('#history-search-box');
    const searchInput = this.container.querySelector('#history-search-input');

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        searchBox.classList.toggle('active');
        if (searchBox.classList.contains('active')) {
          searchInput?.focus();
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
      });
    }

    const expandableNavItems = this.container.querySelectorAll(
      '.nav-item.expandable'
    );
    expandableNavItems.forEach((item) => {
      item.addEventListener('click', () => {
        const groupId = item.dataset.group;
        this.expandedGroups[groupId] = !this.expandedGroups[groupId];
        this.render();
      });
    });

    const navSubItems = this.container.querySelectorAll('.nav-subitem');
    navSubItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const kbList = knowledgeBases;
        if (kbList.length > 0) {
          this.activeKB = kbList[0];
          const titleEl = this.container.querySelector('.user-chat-title h2');
          if (titleEl) {
            titleEl.textContent = this.activeKB.name;
          }
        }
      });
    });

    const navItems = this.container.querySelectorAll(
      '.nav-item:not(.expandable)'
    );
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        navItems.forEach((nav) => nav.classList.remove('active'));
        item.classList.add('active');
      });
    });

    const historyItems = this.container.querySelectorAll('.history-item');
    historyItems.forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const conv = this.getHistoryConversations().find((c) => c.id === id);
        if (conv) {
          console.log('Selected conversation:', conv);
        }
      });
    });
  }
}
