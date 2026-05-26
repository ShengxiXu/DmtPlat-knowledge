export class ChatSidebar {
  constructor(container) {
    this.container = container;
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

  getKBList() {
    return [
      { id: 'kb1', name: '产品文档中心', count: '128 文档' },
      { id: 'kb2', name: '客服知识库', count: '256 问答' },
      { id: 'kb3', name: '法规政策库', count: '45 文档' },
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
      <aside class="chat-sidebar">
        <div class="sidebar-section">
          <button class="new-chat-btn" id="new-chat-btn">
            <span>⊕</span>
            <span>新对话</span>
          </button>
        </div>

        <div class="sidebar-section">
          <div class="kb-item" id="personal-kb">
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
                <span>▶</span>
                <span>我加入的</span>
              </div>
            </div>
            <div class="kb-group-sub" data-group="profile">
              <div class="kb-group-sub-header">
                <span>▶</span>
                <span>个人中心</span>
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
    `;

    this.bindEvents();
  }

  bindEvents() {
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        this.onNewChat?.();
      });
    }

    const searchBtn = document.getElementById('history-search-btn');
    const searchBox = document.getElementById('history-search-box');
    const searchInput = document.getElementById('history-search-input');

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        searchBox.classList.toggle('active');
        if (searchBox.classList.contains('active')) {
          searchInput.focus();
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

    const historyItems = this.container.querySelectorAll('.history-item');
    historyItems.forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const conv = this.getHistoryConversations().find((c) => c.id === id);
        if (conv) {
          this.onSelectConversation?.(conv);
        }
      });
    });

    const kbItems = this.container.querySelectorAll('.kb-item');
    kbItems.forEach((item) => {
      item.addEventListener('click', () => {
        if (!item.classList.contains('add')) {
          const kbList = this.getKBList();
          const firstKB = kbList[0];
          if (firstKB) {
            this.onSelectKB?.(firstKB);
          }
        }
      });
    });
  }

  setOnNewChat(callback) {
    this.onNewChat = callback;
  }

  setOnSelectKB(callback) {
    this.onSelectKB = callback;
  }

  setOnSelectConversation(callback) {
    this.onSelectConversation = callback;
  }
}
