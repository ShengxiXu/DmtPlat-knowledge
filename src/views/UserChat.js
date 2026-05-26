import { knowledgeBases, userChatMessages, suggestions } from '../data/mockData.js';
import { ChatContainer } from '../components/ChatContainer.js';
import { getTypeIcon } from '../utils/helpers.js';

export class UserChat {
  constructor(container) {
    this.container = container;
    this.activeKB = knowledgeBases[0];
    this.searchQuery = '';
    this.expandedGroups = {
      shared: true,
      joined: false,
      profile: false,
    };
    this.render();
  }

  getHistoryConversations() {
    return [
      { id: '1', title: '这个知识库对我有什么好处？', icon: '' },
      { id: '2', title: '数智化互通平台核心信息汇总', icon: '' },
      { id: '3', title: '如何用AI做短剧？', icon: '📹' },
      { id: '4', title: '文档管理、训练配置、问答测试...', icon: '' },
      { id: '5', title: '有哪些好用的Skill？', icon: '⚡' },
      { id: '6', title: 'OKR与KPI有何不同？', icon: '' },
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
            <div 
              class="kb-item" 
              id="personal-kb"
              data-id="personal"
            >
              <span>📚</span>
              <span>个人知识库</span>
            </div>
          </div>

          <div class="sidebar-section">
            <div class="kb-group-header" data-group="shared">
              <span>📤</span>
              <span>共享知识库</span>
              <span class="expand-arrow">${this.expandedGroups.shared ? '▼' : '▶'}</span>
            </div>
            <div class="kb-group-content ${this.expandedGroups.shared ? '' : 'collapsed'}">
              <div class="kb-item featured">
                <span>🔥</span>
                <span>知识库广场</span>
              </div>
              <div class="kb-item add">
                <span>+</span>
                <span>创建共享知识库</span>
              </div>
              <div class="kb-group-sub" data-group="joined">
                <div class="kb-group-sub-header">
                  <span>${this.expandedGroups.joined ? '▼' : '▶'}</span>
                  <span>我加入的</span>
                </div>
                <div class="kb-group-sub-content ${this.expandedGroups.joined ? '' : 'collapsed'}">
                  ${knowledgeBases.slice(0, 3).map(kb => `
                    <div class="kb-sub-item" data-id="${kb.id}">
                      <span>${getTypeIcon(kb.type)}</span>
                      <span>${kb.name}</span>
                      <span class="kb-sub-count">${kb.documentCount} ${kb.type === '问答' ? '问答' : '文档'}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="kb-group-sub" data-group="profile">
                <div class="kb-group-sub-header">
                  <span>${this.expandedGroups.profile ? '▼' : '▶'}</span>
                  <span>个人中心</span>
                </div>
                <div class="kb-group-sub-content ${this.expandedGroups.profile ? '' : 'collapsed'}">
                  ${knowledgeBases.slice(3).map(kb => `
                    <div class="kb-sub-item" data-id="${kb.id}">
                      <span>${getTypeIcon(kb.type)}</span>
                      <span>${kb.name}</span>
                      <span class="kb-sub-count">${kb.documentCount} ${kb.type === '问答' ? '问答' : '文档'}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="sidebar-divider"></div>

          <div class="sidebar-section">
            <div class="history-header">
              <span>历史对话</span>
              <button class="search-btn" id="history-search-btn">🔍</button>
            </div>
            <div class="search-box ${this.searchQuery ? 'active' : ''}" id="history-search-box">
              <input 
                type="text" 
                placeholder="搜索历史对话..." 
                value="${this.searchQuery}"
                id="history-search-input"
              >
            </div>
            <div class="history-list">
              ${filteredConversations.length > 0
                ? filteredConversations.map((conv) => `
                  <div class="history-item" data-id="${conv.id}">
                    <span class="history-icon">${conv.icon || '💬'}</span>
                    <span class="history-title">${conv.title}</span>
                  </div>
                `).join('')
                : `<div class="empty-history">暂无历史对话</div>`
              }
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
              <button class="btn btn-sm btn-ghost">🌙</button>
              <button class="btn btn-sm btn-ghost">📞</button>
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

    const groupHeaders = this.container.querySelectorAll('.kb-group-header');
    groupHeaders.forEach((header) => {
      header.addEventListener('click', () => {
        const groupId = header.dataset.group;
        this.expandedGroups[groupId] = !this.expandedGroups[groupId];
        this.render();
      });
    });

    const subGroupHeaders = this.container.querySelectorAll('.kb-group-sub-header');
    subGroupHeaders.forEach((header) => {
      const parentGroup = header.parentElement;
      const groupId = parentGroup.dataset.group;
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        this.expandedGroups[groupId] = !this.expandedGroups[groupId];
        this.render();
      });
    });

    const kbSubItems = this.container.querySelectorAll('.kb-sub-item');
    kbSubItems.forEach((item) => {
      item.addEventListener('click', () => {
        const kbId = item.dataset.id;
        this.activeKB = knowledgeBases.find((kb) => kb.id === kbId);
        
        const titleEl = this.container.querySelector('.user-chat-title h2');
        if (titleEl) {
          titleEl.textContent = this.activeKB.name;
        }
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
