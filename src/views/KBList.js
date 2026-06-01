import { knowledgeBases as defaultKBs } from '../data/mockData.js';
import { KBCard } from '../components/KBCard.js';

export let knowledgeBases = [];

export class KBList {
  constructor(container) {
    this.container = container;
    this.currentPage = 1;
    this.pageSize = 6;
    this.searchQuery = '';
    this.filterType = '全部';
    this.filterStatus = '全部';
    this.loadKBs();
    this.render();
  }

  loadKBs() {
    const savedKBs = localStorage.getItem('knowledgeBases');
    if (savedKBs) {
      try {
        knowledgeBases = JSON.parse(savedKBs);
      } catch (e) {
        console.error('Failed to load saved KBs:', e);
        knowledgeBases = [...defaultKBs];
        localStorage.setItem('knowledgeBases', JSON.stringify(knowledgeBases));
      }
    } else {
      knowledgeBases = [...defaultKBs];
      localStorage.setItem('knowledgeBases', JSON.stringify(knowledgeBases));
    }

    const newKB = localStorage.getItem('newKB');
    if (newKB) {
      try {
        const kbData = JSON.parse(newKB);
        knowledgeBases.unshift(kbData);
        localStorage.setItem('knowledgeBases', JSON.stringify(knowledgeBases));
        localStorage.removeItem('newKB');
      } catch (e) {
        console.error('Failed to load new KB:', e);
        localStorage.removeItem('newKB');
      }
    }
  }

  render() {
    this.container.innerHTML = `
      <header class="header">
        <h1 class="header-title">知识库管理</h1>
        <div class="header-actions">
          <div class="search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="kb-search-input" class="input" placeholder="搜索知识库..." value="${this.searchQuery}">
          </div>
          <button class="btn btn-primary" id="create-kb-btn">
            + 新建知识库
          </button>
        </div>
      </header>

      <div class="content">
        <div class="kb-toolbar">
          <div class="filter-tags" id="type-filter">
            <button class="filter-tag ${this.filterType === '全部' ? 'active' : ''}" data-type="全部"><i class="fa-solid fa-folder-open"></i> 全部</button>
            <button class="filter-tag ${this.filterType === '文档' ? 'active' : ''}" data-type="文档"><i class="fa-solid fa-file-lines"></i> 文档</button>
            <button class="filter-tag ${this.filterType === '问答' ? 'active' : ''}" data-type="问答"><i class="fa-solid fa-message"></i> 问答</button>
            <button class="filter-tag ${this.filterType === '网页' ? 'active' : ''}" data-type="网页"><i class="fa-solid fa-globe"></i> 网页</button>
          </div>
          <div style="color:var(--kb-text-muted);font-size:14px;">共 ${this.getFilteredKBs().length} 个知识库</div>
        </div>

        <div class="kb-grid" id="kb-grid"></div>

        <div class="pagination" id="kb-pagination">
          ${this.renderPagination()}
        </div>
      </div>
    `;

    this.renderKBGrid();
    this.bindEvents();
  }

  getFilteredKBs() {
    const kbs = Array.isArray(knowledgeBases) ? knowledgeBases : [];
    return kbs.filter((kb) => {
      const matchesSearch = !this.searchQuery || 
        kb.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        kb.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesType = this.filterType === '全部' || kb.type === this.filterType;
      const matchesStatus = this.filterStatus === '全部' || kb.status === (this.filterStatus === '已启用' ? 'active' : 'disabled');
      return matchesSearch && matchesType && matchesStatus;
    });
  }

  renderKBGrid() {
    const gridContainer = document.getElementById('kb-grid');
    gridContainer.innerHTML = '';

    const filteredKBs = this.getFilteredKBs();
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    const paginatedKBs = filteredKBs.slice(start, end);

    if (paginatedKBs.length === 0) {
      gridContainer.innerHTML = `
        <div style="text-align:center;padding:60px;">
          <div style="font-size:48px;margin-bottom:16px;">📭</div>
          <div style="font-size:16px;color:var(--kb-text);">没有找到匹配的知识库</div>
          <div style="font-size:14px;color:var(--kb-text-muted);margin-top:8px;">请尝试调整搜索条件或筛选标签</div>
        </div>
      `;
      return;
    }

    paginatedKBs.forEach((kb) => {
      const card = new KBCard(kb);
      gridContainer.appendChild(card.element);
      card.setOnClick(() => {
        this.onKBSelect?.(kb);
      });
      card.setOnAction((action, kbData) => {
        this.onKBAction?.(action, kbData);
      });
    });
  }

  renderPagination() {
    const filteredKBs = this.getFilteredKBs();
    const totalPages = Math.ceil(filteredKBs.length / this.pageSize);
    
    if (totalPages <= 1) return '';

    let html = `
      <button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} id="prev-page">←</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `
        <button class="page-btn ${this.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>
      `;
    }

    html += `
      <button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} id="next-page">→</button>
      <div class="page-info">第 ${this.currentPage} / ${totalPages} 页</div>
    `;

    return html;
  }

  bindEvents() {
    const searchInput = document.getElementById('kb-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.currentPage = 1;
        this.render();
      });
    }

    const typeFilters = this.container.querySelectorAll('#type-filter .filter-tag');
    typeFilters.forEach((filter) => {
      filter.addEventListener('click', () => {
        typeFilters.forEach((f) => f.classList.remove('active'));
        filter.classList.add('active');
        this.filterType = filter.dataset.type;
        this.currentPage = 1;
        this.render();
      });
    });

    const createBtn = document.getElementById('create-kb-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.onCreateClick?.();
      });
    }

    const pagination = document.getElementById('kb-pagination');
    if (pagination) {
      pagination.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('page-btn')) {
          if (target.id === 'prev-page' && this.currentPage > 1) {
            this.currentPage--;
            this.render();
          } else if (target.id === 'next-page') {
            const totalPages = Math.ceil(this.getFilteredKBs().length / this.pageSize);
            if (this.currentPage < totalPages) {
              this.currentPage++;
              this.render();
            }
          } else if (target.dataset.page) {
            this.currentPage = parseInt(target.dataset.page);
            this.render();
          }
        }
      });
    }
  }

  setOnKBSelect(callback) {
    this.onKBSelect = callback;
  }

  setOnCreateClick(callback) {
    this.onCreateClick = callback;
  }

  setOnKBAction(callback) {
    this.onKBAction = callback;
  }
}
