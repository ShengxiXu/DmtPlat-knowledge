import * as mockData from '../data/mockData.js';
import { ChatContainer } from '../components/ChatContainer.js';
import { FeedbackModal } from '../components/FeedbackModal.js';
import { TuningModal } from '../components/TuningModal.js';
import { getRatingStars } from '../utils/helpers.js';

export class KBDetail {
  constructor(container, kbData = null) {
    this.container = container;
    this.kbData = kbData || {
      id: 'kb_202405001',
      name: '产品文档中心',
      createdAt: '2024-01-15',
      creator: '管理员',
      lastUpdate: '2小时前',
    };
    this.activeTab = 'tab-docs';
    // 加载用户通过工作助手添加的文档，与默认文档合并
    this.documents = this.loadDocuments();
    this.trainingLogs = mockData.trainingLogs || [];
    this.evaluationRecords = mockData.evaluationRecords || [];
    this.apiKeys = mockData.apiKeys || [];
    this.chatMessages = mockData.chatMessages || [];
    this.evalStats = mockData.evalStats || {
      accuracy: '0%',
      averageRating: '0',
      averageResponse: '0s',
      totalQuestions: '0',
    };

    console.log('KBDetail initialized with:', this.kbData.name);
    console.log('Documents count:', this.documents.length);
    console.log('Training logs count:', this.trainingLogs.length);

    this.render();
  }

  render() {
    console.log('=== KBDetail render() 开始 ===');
    console.log('this.documents:', this.documents);
    console.log('this.documents.length:', this.documents.length);
    console.log('this.trainingLogs.length:', this.trainingLogs.length);
    console.log(
      'this.evaluationRecords.length:',
      this.evaluationRecords.length
    );
    console.log('this.apiKeys.length:', this.apiKeys.length);
    console.log('this.chatMessages.length:', this.chatMessages.length);
    console.log('this.evalStats:', this.evalStats);
    console.log('this.activeTab:', this.activeTab);
    console.log('=== KBDetail render() 结束 ===');
  }

  renderDataSourceTabs() {
    const dataSources = this.kbData.dataSources || [
      { type: 'document', name: '文档上传' },
      { type: 'web', name: '网页爬取' },
      { type: 'qa', name: '问答导入' },
    ];

    const tabConfig = {
      document: { tabId: 'tab-docs', icon: 'file-lines', label: '文档管理' },
      web: { tabId: 'tab-crawl', icon: 'globe', label: '网页爬取' },
      database: {
        tabId: 'tab-database',
        icon: 'database',
        label: '数据库连接',
      },
      qa: { tabId: 'tab-qa', icon: 'message', label: '问答管理' },
    };

    return dataSources
      .map((ds, index) => {
        const config = tabConfig[ds.type];
        if (!config) return '';
        return `<div class="tab ${index === 0 ? 'active' : ''}" data-tab="${config.tabId}"><i class="fa-solid fa-${config.icon}"></i> ${config.label}</div>`;
      })
      .join('');
  }

  render() {
    console.log('=== KBDetail render() 开始 ===');
    console.log('this.documents:', this.documents);
    console.log('this.documents.length:', this.documents.length);
    console.log('this.trainingLogs.length:', this.trainingLogs.length);
    console.log(
      'this.evaluationRecords.length:',
      this.evaluationRecords.length
    );
    console.log('this.apiKeys.length:', this.apiKeys.length);
    console.log('this.chatMessages.length:', this.chatMessages.length);
    console.log('this.evalStats:', this.evalStats);
    console.log('this.activeTab:', this.activeTab);
    console.log('=== KBDetail render() 结束 ===');

    this.container.innerHTML = `
      <header class="header">
        <div style="display:flex;align-items:center;gap:20px;">
          <button class="btn btn-ghost" id="back-btn">← 返回</button>
          <h1 class="header-title">知识库详情</h1>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary"><i class="fa-solid fa-gear"></i> 设置</button>
          <button class="btn btn-primary"><i class="fa-solid fa-play"></i> 开始训练</button>
        </div>
      </header>

      <div class="content">
        <div class="detail-header">
          <div>
            <h2 class="detail-title">${this.kbData.name}</h2>
            <div class="detail-meta">
              <span>ID: ${this.kbData.id}</span>
              <span>创建者: ${this.kbData.creator}</span>
              <span>创建于: ${this.kbData.createdAt}</span>
              <span>更新于: ${this.kbData.lastUpdate}</span>
            </div>
          </div>
        </div>

        <div class="tabs" id="kb-tabs">
          ${this.renderDataSourceTabs()}
          <div class="tab" data-tab="tab-train"><i class="fa-solid fa-bullseye"></i> 训练配置</div>
          <div class="tab" data-tab="tab-chat"><i class="fa-solid fa-message"></i> 问答测试</div>
          <div class="tab" data-tab="tab-eval"><i class="fa-solid fa-chart-bar"></i> 效果评估</div>
          <div class="tab" data-tab="tab-bindings"><i class="fa-solid fa-link"></i> 应用绑定</div>
        </div>

        <div id="tab-content-container"></div>
      </div>
    `;

    this.renderTabContent();
    this.bindEvents();
  }

  renderTabContent() {
    const container = document.getElementById('tab-content-container');
    if (!container) {
      console.error('tab-content-container not found');
      return;
    }

    console.log('Current activeTab:', this.activeTab);

    let content = '';
    switch (this.activeTab) {
      case 'tab-docs':
        content = this.renderDocsTab();
        break;
      case 'tab-crawl':
        content = this.renderCrawlTab();
        break;
      case 'tab-database':
        content = this.renderDatabaseTab();
        break;
      case 'tab-qa':
        content = this.renderQATab();
        break;
      case 'tab-train':
        content = this.renderTrainTab();
        break;
      case 'tab-chat':
        content = this.renderChatTab();
        break;
      case 'tab-eval':
        content = this.renderEvalTab();
        break;
      case 'tab-bindings':
        content = this.renderBindingsTab();
        break;
      default:
        content = '<div style="padding:24px;">请选择一个标签页</div>';
    }

    console.log('Content length:', content.length);
    container.innerHTML = content;

    if (this.activeTab === 'tab-chat') {
      setTimeout(() => this.initChat(), 50);
    }
  }

  renderDocsTab() {
    return `
      <div id="tab-docs" class="tab-content active">
        <div class="card" style="margin-bottom:16px;">
          <div class="doc-search-header">
            <div class="doc-search-input-wrapper">
              <i class="fa-solid fa-magnifying-glass doc-search-icon"></i>
              <input type="text" id="doc-search-input" class="doc-search-input" placeholder="搜索文档...">
              <button class="doc-search-clear" id="search-clear-btn" style="display:none;">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <button class="doc-search-advanced-btn" id="advanced-search-btn">
              <i class="fa-solid fa-sliders"></i>
              <span>高级搜索</span>
            </button>
          </div>
        </div>
        
        <div class="card">
          <div
            class="doc-upload-zone"
            id="upload-zone"
            ondrop="dropHandler(event)"
            ondragover="dragOverHandler(event)"
            ondragleave="dragLeaveHandler(event)"
          >
            <i class="fa-solid fa-folder-open" style="font-size:48px;margin-bottom:16px;"></i>
            <div style="font-size:16px;font-weight:500;margin-bottom:8px;color:var(--kb-text);">拖拽文件到此处上传</div>
            <div style="font-size:13px;color:var(--kb-text-muted);">支持 PDF、Word、TXT、Markdown，单个文件最大 50MB</div>
            <button class="btn btn-secondary" style="margin-top:16px;" id="select-file-btn">选择文件</button>
          </div>

          <div class="doc-list">
            ${this.documents
              .map(
                (doc) => `
              <div class="doc-item">
                <i class="fa-solid ${doc.source === 'workAssistant' ? 'fa-wand-magic-sparkles' : 'fa-file-lines'} doc-icon" ${doc.source === 'workAssistant' ? 'style="color:var(--kb-primary)"' : ''}></i>
                <div class="doc-info">
                  <div class="doc-name">${doc.name}${doc.source === 'workAssistant' ? ' <span class="doc-source-badge">工作助手</span>' : ''}</div>
                  <div class="doc-meta">${doc.size} · ${doc.type} · 上传于 ${doc.uploadTime}${doc.sourceTemplate ? ` · 模板：${doc.sourceTemplate}` : ''}</div>
                </div>
                <div class="doc-status tag ${doc.status === '已索引' ? 'tag-primary' : ''}">${doc.status}</div>
                <div class="doc-progress">
                  <div class="doc-progress-bar" style="width:${doc.progress}%"></div>
                </div>
                <button class="btn btn-sm btn-ghost doc-preview-btn" data-id="${doc.id}"><i class="fa-solid fa-eye"></i></button>
                <button class="btn btn-sm btn-ghost doc-delete-btn" data-id="${doc.id}"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  loadDocuments() {
    const defaultDocs = mockData.documents || [];
    const kbId = this.kbData?.id;
    if (!kbId) return defaultDocs;
    try {
      const userDocs = JSON.parse(localStorage.getItem('kb_documents_' + kbId) || '[]');
      // 用户添加的文档排在前面
      return [...userDocs, ...defaultDocs];
    } catch {
      return defaultDocs;
    }
  }

  renderCrawlTab() {
    const crawlHistory = [
      {
        id: 1,
        url: 'https://example.com/docs',
        depth: 2,
        status: 'completed',
        pages: 15,
        time: '2024-01-15 10:30',
        size: '2.3 MB',
      },
      {
        id: 2,
        url: 'https://docs.example.com/api',
        depth: 3,
        status: 'completed',
        pages: 42,
        time: '2024-01-16 14:20',
        size: '5.8 MB',
      },
      {
        id: 3,
        url: 'https://help.example.com',
        depth: 2,
        status: 'running',
        pages: 8,
        time: '2024-01-18 09:15',
        size: '1.2 MB',
      },
      {
        id: 4,
        url: 'https://blog.example.com',
        depth: 1,
        status: 'failed',
        pages: 0,
        time: '2024-01-17 16:45',
        size: '0 KB',
      },
    ];

    return `
      <div id="tab-crawl" class="tab-content">
        <div class="card" style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="flex:1;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                <div style="grid-column:1/-1;">
                  <label class="form-label" style="font-size:15px;font-weight:600;margin-bottom:10px;"><i class="fa-solid fa-link"></i> 爬取URL <span style="color:#ff4d4f;">*</span></label>
                  <textarea class="textarea" id="crawl-url-input" placeholder="每行一个URL&#10;例如:&#10;https://example.com&#10;https://docs.example.com" rows="4" style="width:100%;"></textarea>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                  <label class="form-label" style="font-size:14px;font-weight:500;"><i class="fa-solid fa-magnifying-glass"></i> 爬取深度 <span style="color:#ff4d4f;">*</span></label>
                  <div style="display:flex;align-items:center;gap:12px;">
                    <div style="position:relative;">
                      <input type="number" id="crawl-depth-input" class="input" min="1" max="10" value="2" style="width:90px;height:38px;font-size:15px;text-align:center;">
                    </div>
                    <div class="depth-info" id="depth-info" style="padding:10px 14px;background:linear-gradient(135deg, var(--kb-primary-muted) 0%, rgba(89,166,116,0.08) 100%);border:1px solid var(--kb-border);border-radius:8px;">
                      <div style="font-size:12px;color:var(--kb-primary);font-weight:500;margin-bottom:6px;">深度说明</div>
                      <div style="font-size:11px;color:var(--kb-text-muted);line-height:1.5;">
                        <div>• 深度=1：仅爬取当前页面</div>
                        <div>• 深度=2：当前页面+直接链接</div>
                        <div>• 深度=3：递归三层链接</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                  <label class="form-label" style="font-size:14px;font-weight:500;"><i class="fa-solid fa-clock"></i> 请求间隔(秒)</label>
                  <div style="display:flex;align-items:flex-start;gap:12px;">
                    <input type="number" id="crawl-interval-input" class="input" min="1" max="60" value="3" style="width:90px;height:38px;font-size:15px;text-align:center;">
                    <div style="flex:1;">
                      <div style="font-size:12px;color:var(--kb-text-muted);line-height:1.4;padding-top:6px;">
                        设置请求间隔，避免过于频繁访问目标网站<br>
                        <span style="color:var(--kb-primary);font-weight:500;">建议值：3-5秒</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style="display:flex;gap:14px;margin-top:24px;padding-top:20px;border-top:1px solid var(--kb-border-light);">
                <button class="btn btn-primary" id="start-crawl-btn" style="padding:10px 24px;font-size:14px;font-weight:500;">
                  <i class="fa-solid fa-play"></i> 开始爬取
                </button>
                <button class="btn btn-secondary" id="save-crawl-btn" style="padding:10px 24px;font-size:14px;">
                  <i class="fa-solid fa-floppy-disk"></i> 保存配置
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-size:16px;font-weight:600;">爬取任务历史</h3>
            <div class="search-box" style="width:250px;">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="crawl-search-input" placeholder="搜索URL...">
            </div>
          </div>

          <div class="crawl-table">
            <div class="crawl-table-header">
              <div class="crawl-th">URL</div>
              <div class="crawl-th">爬取深度</div>
              <div class="crawl-th">状态</div>
              <div class="crawl-th">爬取页数</div>
              <div class="crawl-th">数据大小</div>
              <div class="crawl-th">爬取时间</div>
              <div class="crawl-th">操作</div>
            </div>
            <div class="crawl-table-body">
              ${crawlHistory
                .map(
                  (task) => `
                <div class="crawl-table-row">
                  <div class="crawl-td">
                    <div style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${task.url}">${task.url}</div>
                  </div>
                  <div class="crawl-td">${task.depth}</div>
                  <div class="crawl-td">
                    ${task.status === 'completed' ? '<span class="tag tag-success">✓ 已完成</span>' : ''}
                    ${task.status === 'running' ? '<span class="tag tag-warning">● 爬取中</span>' : ''}
                    ${task.status === 'failed' ? '<span class="tag tag-error">✗ 失败</span>' : ''}
                  </div>
                  <div class="crawl-td">${task.pages}</div>
                  <div class="crawl-td">${task.size}</div>
                  <div class="crawl-td">${task.time}</div>
                  <div class="crawl-td">
                    <button class="btn btn-sm btn-ghost crawl-view-btn" data-id="${task.id}"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn btn-sm btn-ghost crawl-retry-btn" data-id="${task.id}"><i class="fa-solid fa-rotate-right"></i></button>
                    <button class="btn btn-sm btn-ghost crawl-delete-btn" data-id="${task.id}"><i class="fa-solid fa-trash-can"></i></button>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="crawl-progress-modal" style="display:none;">
          <div class="modal" style="width:500px;">
            <div class="modal-header">
              <h3>爬取进度</h3>
              <button class="btn btn-circle btn-ghost modal-close">&times;</button>
            </div>
            <div class="modal-body" style="padding:20px;">
              <div id="crawl-progress-content">
                <div style="text-align:center;margin-bottom:20px;">
                  <i class="fa-solid fa-globe" style="font-size:32px;margin-bottom:8px;"></i>
                  <div style="font-size:14px;color:var(--kb-text);">正在爬取网页...</div>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" id="crawl-progress-fill" style="width:0%;"></div>
                </div>
                <div style="text-align:center;margin-top:12px;">
                  <span id="crawl-progress-text">0%</span>
                </div>
                <div style="margin-top:16px;">
                  <div style="font-size:12px;color:var(--kb-text-muted);">已爬取: <span id="crawl-pages">0</span> 页</div>
                  <div style="font-size:12px;color:var(--kb-text-muted);">当前URL: <span id="crawl-current-url">-</span></div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-danger" id="stop-crawl-btn"><i class="fa-solid fa-square"></i> 停止爬取</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderDatabaseTab() {
    const dbConnections = [
      {
        id: 1,
        name: 'MySQL-产品库',
        type: 'MySQL',
        host: '192.168.1.100',
        port: 3306,
        database: 'product_db',
        status: 'connected',
        lastSync: '2024-01-18 10:30',
      },
      {
        id: 2,
        name: 'PostgreSQL-日志库',
        type: 'PostgreSQL',
        host: '192.168.1.101',
        port: 5432,
        database: 'log_db',
        status: 'connected',
        lastSync: '2024-01-18 09:00',
      },
      {
        id: 3,
        name: 'Oracle-财务库',
        type: 'Oracle',
        host: '192.168.1.102',
        port: 1521,
        database: 'finance_db',
        status: 'disconnected',
        lastSync: '2024-01-15 16:45',
      },
    ];

    return `
      <div id="tab-database" class="tab-content">
        <div class="card" style="margin-bottom:16px;">
          <h3 style="font-size:16px;font-weight:600;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--kb-border);">新建数据库连接</h3>
          <div class="db-form-container">
            <div class="db-form-row">
              <div class="db-form-group">
                <label class="db-form-label">连接名称 <span class="required">*</span></label>
                <input type="text" class="input" id="db-name-input" placeholder="请输入连接名称">
              </div>
              <div class="db-form-group">
                <label class="db-form-label">数据库类型 <span class="required">*</span></label>
                <select class="input" id="db-type-select">
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="oracle">Oracle</option>
                  <option value="sqlserver">SQL Server</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </div>
              <div class="db-form-group">
                <label class="db-form-label">数据库地址 <span class="required">*</span></label>
                <input type="text" class="input" id="db-host-input" placeholder="localhost">
              </div>
              <div class="db-form-group">
                <label class="db-form-label">端口 <span class="required">*</span></label>
                <input type="number" class="input" id="db-port-input" min="1" max="65535" value="3306">
              </div>
            </div>
            <div class="db-form-row">
              <div class="db-form-group">
                <label class="db-form-label">数据库名 <span class="required">*</span></label>
                <input type="text" class="input" id="db-database-input" placeholder="database_name">
              </div>
              <div class="db-form-group">
                <label class="db-form-label">用户名</label>
                <input type="text" class="input" id="db-username-input" placeholder="username">
              </div>
              <div class="db-form-group">
                <label class="db-form-label">密码</label>
                <input type="password" class="input" id="db-password-input" placeholder="password">
              </div>
            </div>
            <div class="db-form-row db-form-row-full">
              <div class="db-form-group-full">
                <label class="db-form-label">查询语句（可选）</label>
                <textarea class="textarea" id="db-query-input" placeholder="SELECT * FROM table_name WHERE ..." rows="3"></textarea>
              </div>
            </div>
            <div class="db-form-actions">
              <button class="btn btn-primary" id="test-db-btn"><i class="fa-solid fa-plug"></i> 测试连接</button>
              <button class="btn btn-secondary" id="save-db-btn"><i class="fa-solid fa-floppy-disk"></i> 保存连接</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-size:16px;font-weight:600;">数据库连接列表</h3>
            <div class="search-box" style="width:250px;">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="db-search-input" placeholder="搜索连接...">
            </div>
          </div>

          <div class="db-table">
            <div class="db-table-header">
              <div class="db-th">连接名称</div>
              <div class="db-th">数据库类型</div>
              <div class="db-th">主机地址</div>
              <div class="db-th">数据库名</div>
              <div class="db-th">状态</div>
              <div class="db-th">最后同步</div>
              <div class="db-th">操作</div>
            </div>
            <div class="db-table-body">
              ${dbConnections
                .map(
                  (conn) => `
                <div class="db-table-row">
                  <div class="db-td">${conn.name}</div>
                  <div class="db-td">
                    <span class="tag ${conn.type === 'MySQL' ? 'tag-primary' : conn.type === 'PostgreSQL' ? 'tag-success' : conn.type === 'Oracle' ? 'tag-warning' : 'tag-info'}">${conn.type}</span>
                  </div>
                  <div class="db-td">${conn.host}:${conn.port}</div>
                  <div class="db-td">${conn.database}</div>
                  <div class="db-td">
                    ${conn.status === 'connected' ? '<span class="tag tag-success">● 已连接</span>' : '<span class="tag tag-error">✗ 已断开</span>'}
                  </div>
                  <div class="db-td">${conn.lastSync}</div>
                  <div class="db-td">
                    <button class="btn btn-sm btn-ghost db-sync-btn" data-id="${conn.id}"><i class="fa-solid fa-rotate-right"></i></button>
                    <button class="btn btn-sm btn-ghost db-edit-btn" data-id="${conn.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-sm btn-ghost db-delete-btn" data-id="${conn.id}"><i class="fa-solid fa-trash-can"></i></button>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderQATab() {
    const qaPairs = [
      {
        id: 1,
        question: '如何重置密码？',
        answer:
          '您可以在登录页面点击"忘记密码"，通过邮箱或手机号验证后重置密码。',
        status: '已启用',
        createdAt: '2024-01-15',
      },
      {
        id: 2,
        question: '如何联系客服？',
        answer:
          '您可以通过页面右下角的在线客服按钮联系我们，工作时间为周一至周五 9:00-18:00。',
        status: '已启用',
        createdAt: '2024-01-16',
      },
      {
        id: 3,
        question: '订单多久发货？',
        answer: '订单通常在下单后24小时内发货，节假日可能会有延迟。',
        status: '已启用',
        createdAt: '2024-01-18',
      },
      {
        id: 4,
        question: '支持哪些支付方式？',
        answer: '我们支持支付宝、微信支付、银行卡等多种支付方式。',
        status: '已禁用',
        createdAt: '2024-01-20',
      },
    ];

    return `
      <div id="tab-qa" class="tab-content">
        <div class="card" style="margin-bottom:16px;">
          <div class="qa-search-header">
            <div class="qa-search-input-wrapper">
              <i class="fa-solid fa-magnifying-glass qa-search-icon"></i>
              <input type="text" id="qa-search-input" class="qa-search-input" placeholder="搜索问答...">
              <button class="qa-search-clear" id="qa-search-clear" style="display:none;">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="qa-search-actions">
              <button class="qa-btn-import" id="import-qa-btn">
                <i class="fa-solid fa-download"></i>
                <span>导入问答</span>
              </button>
              <button class="qa-btn-add" id="add-qa-btn">
                <i class="fa-solid fa-plus"></i>
                <span>添加问答</span>
              </button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="qa-stats">
            <div class="stat-item">
              <div class="stat-value">${qaPairs.length}</div>
              <div class="stat-label">问答总数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${qaPairs.filter((q) => q.status === '已启用').length}</div>
              <div class="stat-label">已启用</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${qaPairs.filter((q) => q.status === '已禁用').length}</div>
              <div class="stat-label">已禁用</div>
            </div>
          </div>

          <div class="qa-table">
            <div class="qa-table-header">
              <div class="qa-th">问题</div>
              <div class="qa-th">答案</div>
              <div class="qa-th">状态</div>
              <div class="qa-th">创建时间</div>
              <div class="qa-th">操作</div>
            </div>
            <div class="qa-table-body">
              ${qaPairs
                .map(
                  (qa) => `
                <div class="qa-table-row">
                  <div class="qa-td">${qa.question}</div>
                  <div class="qa-td qa-answer">${qa.answer}</div>
                  <div class="qa-td">
                    <span class="tag ${qa.status === '已启用' ? 'tag-primary' : 'tag-secondary'}">${qa.status}</span>
                  </div>
                  <div class="qa-td">${qa.createdAt}</div>
                  <div class="qa-td">
                    <button class="btn btn-sm btn-ghost qa-edit-btn" data-id="${qa.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-sm btn-ghost qa-delete-btn" data-id="${qa.id}"><i class="fa-solid fa-trash-can"></i></button>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="qa-modal">
          <div class="modal" style="width:500px;">
            <div class="modal-header">
              <h3 id="qa-modal-title">添加问答</h3>
              <button class="btn btn-circle btn-ghost modal-close">&times;</button>
            </div>
            <div class="modal-body" style="padding:20px;">
              <div class="form-group">
                <label class="form-label">问题 *</label>
                <textarea class="textarea" id="qa-question" placeholder="请输入问题" rows="3"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">答案 *</label>
                <textarea class="textarea" id="qa-answer" placeholder="请输入答案" rows="5"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="qa-modal-cancel">取消</button>
              <button class="btn btn-primary" id="qa-modal-save">保存</button>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="import-qa-modal">
          <div class="modal" style="width:500px;">
            <div class="modal-header">
              <h3>导入问答</h3>
              <button class="btn btn-circle btn-ghost modal-close">&times;</button>
            </div>
            <div class="modal-body" style="padding:20px;">
              <div class="form-group">
                <label class="form-label">选择文件</label>
                <div class="upload-zone" id="qa-upload-zone" style="border:2px dashed var(--kb-border);border-radius:8px;padding:32px;text-align:center;cursor:pointer;">
                  <i class="fa-solid fa-folder-open" style="font-size:32px;margin-bottom:12px;"></i>
                  <div style="font-size:14px;color:var(--kb-text);margin-bottom:4px;">点击或拖拽文件到此处</div>
                  <div style="font-size:12px;color:var(--kb-text-muted);">支持 CSV、Excel、JSON 格式</div>
                  <input type="file" id="qa-file-input" accept=".csv,.xlsx,.json" style="display:none;">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">或手动输入</label>
                <textarea class="textarea" id="qa-batch-input" placeholder="每行一个问答对，格式：问题|答案" rows="8"></textarea>
                <div style="font-size:12px;color:var(--kb-text-muted);margin-top:8px;">示例：如何重置密码？|通过邮箱验证后重置</div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="import-qa-cancel">取消</button>
              <button class="btn btn-primary" id="import-qa-save">开始导入</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTrainTab() {
    return `
      <div id="tab-train" class="tab-content">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <h3 style="font-size:16px;font-weight:600;">训练配置</h3>
            <div style="display:flex;gap:12px;">
              <button class="btn btn-secondary" id="save-config-btn"><i class="fa-solid fa-floppy-disk"></i> 保存配置</button>
              <button class="btn btn-primary" id="start-train-btn"><i class="fa-solid fa-play"></i> 开始训练</button>
            </div>
          </div>

          <div class="segment-strategy">
            <div class="strategy-title">
              <i class="fa-solid fa-layer-group"></i>
              <span>分段策略</span>
            </div>

            <div class="segment-tabs">
              <div class="tab-item active" data-type="auto">
                <i class="fa-solid fa-brain"></i>
                <span>自动分段</span>
              </div>
              <div class="tab-item" data-type="paragraph">
                <i class="fa-solid fa-file-lines"></i>
                <span>按段落</span>
              </div>
              <div class="tab-item" data-type="length">
                <i class="fa-solid fa-hashtag"></i>
                <span>按字数</span>
              </div>
              <div class="tab-item" data-type="marker">
                <i class="fa-solid fa-tag"></i>
                <span>按标记</span>
              </div>
            </div>

            <div id="segmentation-config">
              <div class="config-panel" id="config-auto">
                <div class="mode-options">
                  <div class="mode-option active">平衡模式</div>
                  <div class="mode-option">精准模式</div>
                  <div class="mode-option">快速模式</div>
                </div>

                <div class="slider-row">
                  <label class="slider-label">目标分段长度</label>
                  <div class="slider-control">
                    <input type="range" class="range-slider" min="300" max="1500" value="600" oninput="this.nextElementSibling.textContent=this.value">
                    <span class="slider-value">600</span>
                  </div>
                </div>

                <div class="slider-row">
                  <label class="slider-label">重叠长度</label>
                  <div class="slider-control">
                    <input type="range" class="range-slider" min="0" max="200" value="80" oninput="this.nextElementSibling.textContent=this.value">
                    <span class="slider-value">80</span>
                  </div>
                </div>
              </div>

              <div class="config-panel hidden" id="config-paragraph">
                <div class="form-group">
                  <label class="form-label">段落分隔符</label>
                  <div class="radio-group">
                    <div class="radio-btn active">双换行符</div>
                    <div class="radio-btn">单换行符</div>
                    <div class="radio-btn">句号+换行</div>
                  </div>
                </div>
                <div class="config-row">
                  <div>
                    <div class="config-label">合并短段落</div>
                    <div class="config-desc">将小于指定长度的段落合并到上一段</div>
                  </div>
                  <div class="toggle active" onclick="this.classList.toggle('active')"></div>
                </div>
                <div class="form-group">
                  <label class="form-label">最小段落长度</label>
                  <div class="slider-wrap">
                    <input type="range" class="slider" min="50" max="300" value="100" oninput="this.nextElementSibling.textContent=this.value">
                    <span class="slider-val">100</span>
                  </div>
                </div>
              </div>

              <div class="config-panel hidden" id="config-length">
                <div class="form-group">
                  <label class="form-label">固定分段长度</label>
                  <div class="slider-wrap">
                    <input type="range" class="slider" min="200" max="2000" value="500" oninput="this.nextElementSibling.textContent=this.value">
                    <span class="slider-val">500</span>
                  </div>
                  <div class="form-tip">每个分段的固定字符数，建议 300-1000 字符</div>
                </div>
                <div class="form-group">
                  <label class="form-label">重叠长度</label>
                  <div class="slider-wrap">
                    <input type="range" class="slider" min="0" max="200" value="50" oninput="this.nextElementSibling.textContent=this.value">
                    <span class="slider-val">50</span>
                  </div>
                </div>
                <div class="config-row">
                  <div>
                    <div class="config-label">智能断句</div>
                    <div class="config-desc">尽量在句子边界处断开，避免截断语义</div>
                  </div>
                  <div class="toggle active" onclick="this.classList.toggle('active')"></div>
                </div>
              </div>

              <div class="config-panel hidden" id="config-marker">
                <div class="form-group">
                  <label class="form-label">分割标记</label>
                  <div class="input-group">
                    <input type="text" class="input" id="marker-input" placeholder="输入分割标记，如 --- 或 === " value="---">
                  </div>
                  <div class="form-tip">文档中用于分隔段落的特殊标记</div>
                </div>
                <div class="form-group">
                  <label class="form-label">常用标记</label>
                  <div class="radio-group">
                    <div class="radio-btn active">--- (分隔线)</div>
                    <div class="radio-btn">=== (粗分隔线)</div>
                    <div class="radio-btn">### (三级标题)</div>
                    <div class="radio-btn">自定义</div>
                  </div>
                </div>
                <div class="config-row">
                  <div>
                    <div class="config-label">保留标记</div>
                    <div class="config-desc">在分段结果中保留分割标记</div>
                  </div>
                  <div class="toggle" onclick="this.classList.toggle('active')"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="config-section">
            <div class="config-section-title">索引配置</div>
            <div class="config-row">
              <div>
                <div class="config-label">启用向量化索引</div>
                <div class="config-desc">将文档转换为向量表示，支持语义检索</div>
              </div>
              <div class="toggle active" onclick="this.classList.toggle('active')"></div>
            </div>
            <div class="config-row">
              <div>
                <div class="config-label">启用关键词索引</div>
                <div class="config-desc">提取关键词建立倒排索引，支持精确匹配</div>
              </div>
              <div class="toggle active" onclick="this.classList.toggle('active')"></div>
            </div>
            <div class="config-row">
              <div>
                <div class="config-label">启用全文索引</div>
                <div class="config-desc">建立全文检索索引，支持模糊查询</div>
              </div>
              <div class="toggle" onclick="this.classList.toggle('active')"></div>
            </div>
          </div>

          <div class="config-section">
            <div class="config-section-title">训练日志</div>
            <div class="log-timeline">
              ${this.trainingLogs
                .map(
                  (log) => `
                <div class="log-item">
                  <div class="log-time">${log.time}</div>
                  <div class="log-text">${log.text}<span class="log-tag">${log.tag}</span></div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderChatTab() {
    return `
      <div id="tab-chat" class="tab-content">
        <div id="chat-container"></div>
      </div>
    `;
  }

  renderEvalTab() {
    return `
      <div id="tab-eval" class="tab-content">
        <div class="eval-stats">
          <div class="eval-stat">
            <div class="eval-stat-value">${this.evalStats.accuracy}</div>
            <div class="eval-stat-label">回答准确率</div>
          </div>
          <div class="eval-stat">
            <div class="eval-stat-value">${this.evalStats.averageRating}</div>
            <div class="eval-stat-label">平均评分</div>
          </div>
          <div class="eval-stat">
            <div class="eval-stat-value">${this.evalStats.averageResponse}</div>
            <div class="eval-stat-label">平均响应</div>
          </div>
          <div class="eval-stat">
            <div class="eval-stat-value">${this.evalStats.totalQuestions}</div>
            <div class="eval-stat-label">总问答数</div>
          </div>
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div class="eval-filters">
              <button class="eval-filter active">全部</button>
              <button class="eval-filter">⭐⭐⭐⭐⭐</button>
              <button class="eval-filter">⭐⭐⭐⭐</button>
              <button class="eval-filter">⭐⭐⭐</button>
            <button class="eval-filter">⭐⭐</button>
            <button class="eval-filter">⭐</button>
            </div>
            <div class="time-filters">
              <button class="time-filter active">全部时间</button>
              <button class="time-filter">今天</button>
              <button class="time-filter">本周</button>
              <button class="time-filter">本月</button>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>问题</th>
                  <th>回答摘要</th>
                  <th>评分</th>
                  <th>状态</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${this.evaluationRecords
                  .map(
                    (record) => `
                    <tr>
                      <td>${record.question}</td>
                      <td>${record.answer}</td>
                      <td>${getRatingStars(record.rating)}</td>
                      <td><span class="eval-status ${this.getStatusClass(record.rating)}">${this.getStatusText(record.rating)}</span></td>
                      <td>${record.time}</td>
                      <td>
                        <button class="btn btn-sm btn-ghost view-detail-btn" data-id="${record.id}">查看</button>
                        ${record.rating <= 2 && record.status !== 'completed' ? `<button class="btn btn-sm btn-primary tuning-btn" data-id="${record.id}">调优</button>` : ''}
                      </td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  getStatusClass(rating) {
    if (rating <= 2) return 'status-pending';
    if (rating === 3) return 'status-processing';
    return 'status-completed';
  }

  getStatusText(rating) {
    if (rating <= 2) return '需要优化';
    if (rating === 3) return '待评估';
    return '已达标';
  }

  renderBindingsTab() {
    return `
      <div id="tab-bindings" class="tab-content">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="font-size:16px;font-weight:600;">API密钥</h3>
            <button class="btn btn-primary" id="new-key-btn">+ 新建密钥</button>
          </div>

          ${this.apiKeys
            .map(
              (key) => `
            <div class="key-item">
              <div class="key-info">
                <div class="key-name">${key.name}</div>
                <div class="key-value">${key.value}</div>
                <div style="font-size:12px;color:var(--kb-text-muted);margin-top:4px;">创建于 ${key.createdAt} · 最后使用 ${key.lastUsed}</div>
              </div>
              <div class="key-actions">
                <div class="toggle ${key.active ? 'active' : ''}" onclick="this.classList.toggle('active')"></div>
                <button class="btn btn-sm btn-ghost copy-key-btn" data-key="${key.value}">复制</button>
                <button class="btn btn-sm btn-ghost">重置</button>
              </div>
            </div>
          `
            )
            .join('')}

          <div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--kb-border);">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">接入代码示例</h3>
            <div style="background:var(--kb-hover-bg);padding:16px;border-radius:8px;font-family:monospace;font-size:13px;line-height:1.6;overflow-x:auto;border:1px solid var(--kb-border);">
              <div style="color:var(--kb-text-muted);">// JavaScript SDK 接入示例</div>
              <div style="color:var(--kb-text);">const kb = new KnowledgeBase({
              <div style="color:var(--kb-text);">  apiKey: 'kb_live_xxxxxxxxxxxx',
              <div style="color:var(--kb-text);">  baseURL: 'https://api.ssohub.com'
              <div style="color:var(--kb-text);">});
              <div style="color:var(--kb-text);">
              <div style="color:var(--kb-text);">const answer = await kb.query('如何重置密码？');
            </div>
          </div>
        </div>
      </div>
    `;
  }

  initChat() {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      const chat = new ChatContainer(chatContainer, {
        messages: this.chatMessages,
        placeholder: '输入问题，测试知识库问答效果...',
      });
      chat.setOnSendMessage((message) => {
        const botResponse = {
          id: Date.now(),
          role: 'bot',
          content: `这是针对问题「${message}」的模拟回答。在实际应用中，系统会查询知识库并返回相关答案。`,
        };
        chat.addMessage(botResponse);
      });
    }
  }

  bindEvents() {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.onBack?.();
      });
    }

    const tabs = this.container.querySelectorAll('.tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.dataset.tab;

        const contentContainer = document.getElementById(
          'tab-content-container'
        );
        if (contentContainer) {
          this.renderTabContent();

          setTimeout(() => {
            this.bindTabEvents();
          }, 50);
        }
      });
    });

    this.bindTabEvents();
  }

  bindTabEvents() {
    const radioGroups = this.container.querySelectorAll('.radio-group');
    radioGroups.forEach((group) => {
      const buttons = group.querySelectorAll('.radio-btn');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          buttons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          if (group.id === 'segmentation-type-group') {
            const type = btn.dataset.type;
            const panels = document.querySelectorAll('.config-panel');
            panels.forEach((panel) => panel.classList.add('hidden'));
            const activePanel = document.getElementById(`config-${type}`);
            if (activePanel) {
              activePanel.classList.remove('hidden');
            }
          }
        });
      });
    });

    const segmentTabs = this.container.querySelector('.segment-tabs');
    if (segmentTabs) {
      const tabItems = segmentTabs.querySelectorAll('.tab-item');
      tabItems.forEach((item) => {
        item.addEventListener('click', () => {
          tabItems.forEach((tab) => tab.classList.remove('active'));
          item.classList.add('active');

          const type = item.dataset.type;
          const panels = document.querySelectorAll('.config-panel');
          panels.forEach((panel) => panel.classList.add('hidden'));
          const activePanel = document.getElementById(`config-${type}`);
          if (activePanel) {
            activePanel.classList.remove('hidden');
          }
        });
      });
    }

    const docSearchInput = document.getElementById('doc-search-input');
    if (docSearchInput) {
      docSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const keyword = docSearchInput.value.trim();
          if (keyword) {
            const matchedDocs = this.documents.filter(
              (doc) =>
                doc.name.toLowerCase().includes(keyword.toLowerCase()) ||
                doc.type.toLowerCase().includes(keyword.toLowerCase())
            );
            if (matchedDocs.length > 0) {
              this.showToast(
                `搜索到 ${matchedDocs.length} 个匹配的文档`,
                'success'
              );
            } else {
              this.showToast(`未找到包含"${keyword}"的文档`, 'error');
            }
          }
        }
      });
    }

    const advancedSearchBtn = document.getElementById('advanced-search-btn');
    if (advancedSearchBtn) {
      advancedSearchBtn.addEventListener('click', () => {
        this.showAdvancedSearchModal();
      });
    }

    const selectFileBtn = document.getElementById('select-file-btn');
    if (selectFileBtn) {
      selectFileBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.pdf,.doc,.docx,.txt,.md';
        input.onchange = (e) => {
          const files = Array.from(e.target.files);
          files.forEach((file) => {
            this.showToast(`正在上传: ${file.name}`, 'success');
          });
        };
        input.click();
      });
    }

    const previewBtns = this.container.querySelectorAll('.doc-preview-btn');
    previewBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const docId = btn.dataset.id;
        const doc = this.documents.find((d) => d.id === docId);
        if (doc) {
          this.showDocPreview(doc);
        }
      });
    });

    const deleteBtns = this.container.querySelectorAll('.doc-delete-btn');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const docId = btn.dataset.id;
        const doc = this.documents.find((d) => d.id === docId);
        if (doc) {
          this.confirmDelete(doc);
        }
      });
    });

    const startTrainBtn = document.getElementById('start-train-btn');
    if (startTrainBtn) {
      startTrainBtn.addEventListener('click', () => {
        this.startTraining();
      });
    }

    const startCrawlBtn = document.getElementById('start-crawl-btn');
    if (startCrawlBtn) {
      startCrawlBtn.addEventListener('click', () => {
        this.startCrawl();
      });
    }

    const saveCrawlBtn = document.getElementById('save-crawl-btn');
    if (saveCrawlBtn) {
      saveCrawlBtn.addEventListener('click', () => {
        const urls =
          document.getElementById('crawl-url-input')?.value.trim() || '';
        const depth =
          document.getElementById('crawl-depth-input')?.value || '2';
        const interval =
          document.getElementById('crawl-interval-input')?.value || '3';

        if (!urls) {
          this.showToast('请输入爬取URL', 'error');
          return;
        }

        this.showToast('配置已保存', 'success');
      });
    }

    const crawlRetryBtns = this.container.querySelectorAll('.crawl-retry-btn');
    crawlRetryBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const taskId = btn.dataset.id;
        this.showToast(`正在重试爬取任务 ${taskId}...`, 'info');
        this.simulateCrawlProgress();
      });
    });

    const crawlDeleteBtns =
      this.container.querySelectorAll('.crawl-delete-btn');
    crawlDeleteBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const taskId = btn.dataset.id;
        if (confirm(`确定要删除爬取任务 ${taskId} 吗？`)) {
          this.showToast('任务已删除', 'success');
        }
      });
    });

    const stopCrawlBtn = document.getElementById('stop-crawl-btn');
    if (stopCrawlBtn) {
      stopCrawlBtn.addEventListener('click', () => {
        const modal = document.getElementById('crawl-progress-modal');
        if (modal) {
          modal.style.display = 'none';
        }
        this.showToast('爬取已停止', 'info');
      });
    }

    const saveConfigBtn = document.getElementById('save-config-btn');
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => {
        this.saveConfig();
      });
    }

    const evalFilters = this.container.querySelectorAll('.eval-filter');
    evalFilters.forEach((filter) => {
      filter.addEventListener('click', () => {
        evalFilters.forEach((f) => f.classList.remove('active'));
        filter.classList.add('active');
        const rating = filter.textContent;
        this.filterByRating(rating);
      });
    });

    const viewDetailBtns = this.container.querySelectorAll('.view-detail-btn');
    viewDetailBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.id;
        const record = evaluationRecords.find((r) => r.id === recordId);
        if (record) {
          this.showEvalDetail(record);
        }
      });
    });

    const tuningBtns = this.container.querySelectorAll('.tuning-btn');
    tuningBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.id;
        const record = this.evaluationRecords.find((r) => r.id === recordId);
        if (record) {
          this.showTuningModal(record);
        }
      });
    });

    const copyKeyBtns = this.container.querySelectorAll('.copy-key-btn');
    copyKeyBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const keyValue = btn.dataset.key;
        try {
          await navigator.clipboard.writeText(keyValue);
          this.showToast('密钥已复制到剪贴板', 'success');
        } catch (err) {
          this.showToast('复制失败', 'error');
        }
      });
    });

    const newKeyBtn = document.getElementById('new-key-btn');
    if (newKeyBtn) {
      newKeyBtn.addEventListener('click', () => {
        this.showNewKeyModal();
      });
    }

    const addQABtn = document.getElementById('add-qa-btn');
    if (addQABtn) {
      addQABtn.addEventListener('click', () => {
        const modal = document.getElementById('qa-modal');
        if (modal) {
          modal.classList.add('active');
        }
      });
    }

    const importQABtn = document.getElementById('import-qa-btn');
    if (importQABtn) {
      importQABtn.addEventListener('click', () => {
        const modal = document.getElementById('import-qa-modal');
        if (modal) {
          modal.classList.add('active');
        }
      });
    }

    const modalCloseBtns = this.container.querySelectorAll('.modal-close');
    modalCloseBtns.forEach((btn) => {
      btn.removeEventListener('click', this.modalCloseHandler);
      btn.addEventListener('click', this.modalCloseHandler);
    });

    const qaModalCancel = document.getElementById('qa-modal-cancel');
    if (qaModalCancel) {
      qaModalCancel.removeEventListener('click', this.qaModalCancelHandler);
      qaModalCancel.addEventListener('click', this.qaModalCancelHandler);
    }

    const importQACancel = document.getElementById('import-qa-cancel');
    if (importQACancel) {
      importQACancel.removeEventListener('click', this.importQACancelHandler);
      importQACancel.addEventListener('click', this.importQACancelHandler);
    }
  }

  modalCloseHandler = (e) => {
    const modal = e.target.closest('.modal-overlay');
    if (modal) {
      modal.classList.remove('active');
    }
  };

  qaModalCancelHandler = () => {
    const modal = document.getElementById('qa-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  };

  importQACancelHandler = () => {
    const modal = document.getElementById('import-qa-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  };

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  showAdvancedSearchModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal" style="width:500px;">
        <div class="modal-header">
          <h3 style="font-size:18px;font-weight:600;"><i class="fa-solid fa-sliders"></i> 高级搜索</h3>
          <button class="btn btn-circle btn-ghost" id="adv-search-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body" style="padding:20px;">
          <div style="display:flex;flex-direction:column;gap:16px;">
            <div>
              <label class="form-label">文件类型</label>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                <label style="margin-right:16px;"><input type="checkbox" value="pdf"> PDF</label>
                <label style="margin-right:16px;"><input type="checkbox" value="doc"> Word</label>
                <label style="margin-right:16px;"><input type="checkbox" value="txt"> TXT</label>
                <label style="margin-right:16px;"><input type="checkbox" value="md"> Markdown</label>
              </div>
            </div>
            <div>
              <label class="form-label">文件大小</label>
              <div style="display:flex;gap:12px;">
                <input type="number" class="input" placeholder="最小(KB)" style="width:100px;">
                <span>~</span>
                <input type="number" class="input" placeholder="最大(KB)" style="width:100px;">
              </div>
            </div>
            <div>
              <label class="form-label">上传时间</label>
              <select class="select" style="width:200px;">
                <option value="">全部时间</option>
                <option value="today">今天</option>
                <option value="week">最近一周</option>
                <option value="month">最近一个月</option>
                <option value="year">最近一年</option>
              </select>
            </div>
            <div>
              <label class="form-label">状态</label>
              <div style="display:flex;gap:16px;">
                <label><input type="radio" name="adv-status" value="all" checked> 全部</label>
                <label><input type="radio" name="adv-status" value="processed"> 已处理</label>
                <label><input type="radio" name="adv-status" value="pending"> 待处理</label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="adv-search-reset">重置</button>
          <button class="btn btn-primary" id="adv-search-apply">应用筛选</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document
      .getElementById('adv-search-close')
      .addEventListener('click', () => {
        modal.remove();
      });

    document
      .getElementById('adv-search-reset')
      .addEventListener('click', () => {
        modal
          .querySelectorAll('input[type="checkbox"]')
          .forEach((cb) => (cb.checked = false));
        modal.querySelectorAll('input[type="radio"]')[0].checked = true;
        modal
          .querySelectorAll('input[type="number"]')
          .forEach((inp) => (inp.value = ''));
        modal.querySelector('select').value = '';
      });

    document
      .getElementById('adv-search-apply')
      .addEventListener('click', () => {
        modal.remove();
        this.showToast('筛选条件已应用', 'success');
      });
  }

  showDocPreview(doc) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 style="font-size:18px;font-weight:600;"><i class="fa-solid fa-file-lines"></i> ${doc.name}</h3>
          <button class="btn btn-circle btn-ghost" onclick="this.closest('.modal-overlay').remove()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div style="padding:16px;background:var(--kb-hover-bg);border-radius:8px;">
            <div style="font-size:14px;color:var(--kb-text-muted);margin-bottom:12px;">文件信息</div>
            <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap;">
              <div><strong>类型:</strong> ${doc.type}</div>
              <div><strong>大小:</strong> ${doc.size}</div>
              <div><strong>状态:</strong> ${doc.status}</div>
              ${doc.sourceTemplate ? `<div><strong>来源模板:</strong> ${doc.sourceTemplate}</div>` : ''}
            </div>
            <div style="font-size:14px;color:var(--kb-text-muted);margin-bottom:8px;">内容预览${doc.source === 'workAssistant' ? '' : '（模拟）'}</div>
            <div style="font-size:13px;color:var(--kb-text);line-height:1.6;padding:12px;background:var(--kb-card-bg);border-radius:6px;border:1px solid var(--kb-border);max-height:400px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;">
              ${doc.content ? this.escapeHtml(doc.content) : `这是 "${doc.name}" 的内容预览。由于这是一个模拟系统，实际内容会从文件中读取并显示在这里。支持 PDF、Word、TXT 和 Markdown 等格式的预览。`}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">关闭</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  confirmDelete(doc) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 style="font-size:18px;font-weight:600;"><i class="fa-solid fa-trash-can"></i> 删除确认</h3>
          <button class="btn btn-circle btn-ghost" id="confirm-delete-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div style="padding:16px;">
            <div style="font-size:16px;color:var(--kb-text);margin-bottom:8px;">确定要删除文件 "${doc.name}" 吗？</div>
            <div style="font-size:13px;color:var(--kb-text-muted);">此操作无法撤销，请谨慎操作。</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-delete-cancel">取消</button>
          <button class="btn btn-primary" id="confirm-delete-ok">确认删除</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#confirm-delete-close').addEventListener('click', closeModal);
    modal.querySelector('#confirm-delete-cancel').addEventListener('click', closeModal);
    modal.querySelector('#confirm-delete-ok').addEventListener('click', () => {
      // 从 localStorage 中删除用户添加的文档
      if (doc.source === 'workAssistant' && this.kbData?.id) {
        try {
          const key = 'kb_documents_' + this.kbData.id;
          const docs = JSON.parse(localStorage.getItem(key) || '[]').filter((d) => d.id !== doc.id);
          localStorage.setItem(key, JSON.stringify(docs));
        } catch {
          /* ignore */
        }
      }
      // 从内存列表中移除
      const idx = this.documents.findIndex((d) => d.id === doc.id);
      if (idx >= 0) this.documents.splice(idx, 1);
      closeModal();
      this.renderTabContent();
      this.bindEvents();
      this.showToast('文件已删除', 'success');
    });
  }

  startTraining() {
    const startBtn = document.getElementById('start-train-btn');
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.innerHTML = '⏳ 训练中...';
    }

    this.showToast('训练任务已启动', 'info');

    const steps = [
      { time: '', text: '开始训练任务 #129', tag: '开始' },
      { time: '', text: '文档解析完成，共 128 个片段', tag: '完成' },
      { time: '', text: '开始构建索引', tag: '处理中' },
      { time: '', text: '向量化索引构建完成', tag: '完成' },
      { time: '', text: '训练任务完成', tag: '成功' },
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        const now = new Date();
        step.time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        const logContainer = document.querySelector('.log-timeline');
        if (logContainer) {
          const logItem = document.createElement('div');
          logItem.className = 'log-item';
          logItem.innerHTML = `
            <div class="log-time">${step.time}</div>
            <div class="log-text">${step.text}<span class="log-tag">${step.tag}</span></div>
          `;
          logContainer.prepend(logItem);
        }

        if (index === steps.length - 1) {
          if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fa-solid fa-play"></i> 开始训练';
          }
          this.showToast('训练完成！', 'success');
        }
      }, index * 1500);
    });
  }

  saveConfig() {
    this.showToast('配置已保存', 'success');
  }

  startCrawl() {
    const urls = document.getElementById('crawl-url-input')?.value.trim() || '';
    const depth = document.getElementById('crawl-depth-input')?.value || '2';

    if (!urls) {
      this.showToast('请输入爬取URL', 'error');
      return;
    }

    const urlList = urls.split('\n').filter((u) => u.trim());
    if (urlList.length === 0) {
      this.showToast('请输入有效的URL', 'error');
      return;
    }

    const progressModal = document.getElementById('crawl-progress-modal');
    if (progressModal) {
      progressModal.style.display = 'flex';
    }

    this.simulateCrawlProgress(urlList, parseInt(depth));
  }

  simulateCrawlProgress(urls, depth) {
    let progress = 0;
    let pages = 0;
    let currentUrlIndex = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 8;
      pages += Math.floor(Math.random() * 3);

      if (currentUrlIndex < urls.length) {
        const currentUrl = document.getElementById('crawl-current-url');
        if (currentUrl) {
          currentUrl.textContent = urls[currentUrlIndex];
        }
        if (Math.random() > 0.7) {
          currentUrlIndex++;
        }
      }

      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          const progressModal = document.getElementById('crawl-progress-modal');
          if (progressModal) {
            progressModal.style.display = 'none';
          }
          this.showToast(`爬取完成！共爬取 ${pages} 页`, 'success');
        }, 500);
      }

      const progressFill = document.getElementById('crawl-progress-fill');
      const progressText = document.getElementById('crawl-progress-text');
      const crawlPages = document.getElementById('crawl-pages');

      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressText) progressText.textContent = `${Math.round(progress)}%`;
      if (crawlPages) crawlPages.textContent = pages;
    }, 400);
  }

  filterByRating(rating) {
    if (rating === '全部') {
      this.renderTabContent();
      return;
    }

    const ratingMap = {
      '⭐⭐⭐⭐⭐': 5,
      '⭐⭐⭐⭐': 4,
      '⭐⭐⭐': 3,
      '⭐⭐': 2,
      '⭐': 1,
    };

    const filteredRecords = evaluationRecords.filter(
      (r) => r.rating === ratingMap[rating]
    );

    const container = document.getElementById('tab-content-container');
    container.innerHTML = `
      <div id="tab-eval" class="tab-content">
        <div class="eval-stats">
          <div class="eval-stat">
            <div class="eval-stat-value">${evalStats.accuracy}</div>
            <div class="eval-stat-label">回答准确率</div>
          </div>
          <div class="eval-stat">
            <div class="eval-stat-value">${evalStats.averageRating}</div>
            <div class="eval-stat-label">平均评分</div>
          </div>
          <div class="eval-stat">
            <div class="eval-stat-value">${evalStats.averageResponse}</div>
            <div class="eval-stat-label">平均响应</div>
          </div>
          <div class="eval-stat">
            <div class="eval-stat-value">${filteredRecords.length}</div>
            <div class="eval-stat-label">筛选结果</div>
          </div>
        </div>

        <div class="card">
          <div class="eval-filters">
            <button class="eval-filter">全部</button>
            <button class="eval-filter">⭐⭐⭐⭐⭐</button>
            <button class="eval-filter">⭐⭐⭐⭐</button>
            <button class="eval-filter">⭐⭐⭐</button>
            <button class="eval-filter">⭐⭐</button>
            <button class="eval-filter active">${rating}</button>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>问题</th>
                  <th>回答摘要</th>
                  <th>评分</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRecords
                  .map(
                    (record) => `
                    <tr>
                      <td>${record.question}</td>
                      <td>${record.answer}</td>
                      <td>${getRatingStars(record.rating)}</td>
                      <td>${record.time}</td>
                      <td><button class="btn btn-sm btn-ghost view-detail-btn" data-id="${record.id}">查看</button></td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.bindTabEvents();
  }

  showEvalDetail(record) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 style="font-size:18px;font-weight:600;"><i class="fa-solid fa-chart-bar"></i> 评价详情</h3>
          <button class="btn btn-circle btn-ghost" onclick="this.closest('.modal-overlay').remove()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div style="padding:16px;">
            <div style="margin-bottom:20px;">
              <div style="font-size:13px;color:var(--kb-text-muted);margin-bottom:8px;">用户问题</div>
              <div style="font-size:16px;color:var(--kb-text);padding:12px;background:var(--kb-hover-bg);border-radius:8px;">${record.question}</div>
            </div>
            <div style="margin-bottom:20px;">
              <div style="font-size:13px;color:var(--kb-text-muted);margin-bottom:8px;">AI 回答</div>
              <div style="font-size:14px;color:var(--kb-text);line-height:1.6;padding:12px;background:var(--kb-hover-bg);border-radius:8px;">${record.answer}</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="font-size:13px;color:var(--kb-text-muted);">用户评分:</div>
              <div style="font-size:20px;">${getRatingStars(record.rating)}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">关闭</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showTuningModal(record) {
    const tuningModal = new TuningModal({
      record: record,
      onSubmit: (tuningData) => {
        this.handleTuningSubmit(tuningData);
      },
    });
    tuningModal.show();
  }

  handleTuningSubmit(tuningData) {
    const recordIndex = this.evaluationRecords.findIndex(
      (r) => r.id === tuningData.recordId
    );
    if (recordIndex !== -1) {
      this.evaluationRecords[recordIndex].status = tuningData.status;
      if (tuningData.type === 'update') {
        this.evaluationRecords[recordIndex].answer = tuningData.answer;
        this.evaluationRecords[recordIndex].rating = 5;
      }
    }
    this.switchTab('tab-eval');
    this.showToast('知识库优化完成', 'success');
  }

  showNewKeyModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 style="font-size:18px;font-weight:600;"><i class="fa-solid fa-key"></i> 新建 API 密钥</h3>
          <button class="btn btn-circle btn-ghost" onclick="this.closest('.modal-overlay').remove()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">密钥名称</label>
            <input type="text" class="input" id="new-key-name" placeholder="输入密钥名称">
          </div>
          <div class="form-group">
            <label class="form-label">密钥权限</label>
            <div class="radio-group">
              <div class="radio-btn active">只读</div>
              <div class="radio-btn">读写</div>
            </div>
          </div>
          <div style="padding:12px;background:var(--kb-primary-subtle);border-radius:8px;">
            <div style="font-size:13px;color:var(--kb-primary-dark);">
              <i class="fa-solid fa-lock"></i> 密钥将在创建后显示一次，请妥善保管
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="btn btn-primary" id="create-key-btn">创建密钥</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('create-key-btn').addEventListener('click', () => {
      modal.remove();
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div class="toast toast-success show"><i class="fa-solid fa-check"></i> 密钥已创建</div>'
      );
      setTimeout(() => document.querySelector('.toast')?.remove(), 3000);
    });
  }

  setOnBack(callback) {
    this.onBack = callback;
  }
}
