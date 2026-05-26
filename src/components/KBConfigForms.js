export class DocumentConfigForm {
  constructor(config = {}) {
    this.config = {
      supportedFormats: config.supportedFormats || ['pdf', 'docx', 'md', 'txt', 'xlsx', 'pptx'],
      maxFileSize: config.maxFileSize || '50MB',
      allowUpload: config.allowUpload !== undefined ? config.allowUpload : true,
      allowWebCrawl: config.allowWebCrawl !== undefined ? config.allowWebCrawl : false,
      autoExtractImages: config.autoExtractImages !== undefined ? config.autoExtractImages : true,
      enableOCR: config.enableOCR !== undefined ? config.enableOCR : false,
      chunkSize: config.chunkSize || 512,
      chunkOverlap: config.chunkOverlap || 64,
      ...config
    };
    this.container = null;
  }

  render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="config-form">
        <div class="form-section">
          <h4>文件配置</h4>
          <div class="form-group">
            <label class="form-label">支持的文件格式</label>
            <div class="checkbox-grid">
              ${this.config.supportedFormats.map(format => `
                <label class="checkbox-item">
                  <input type="checkbox" checked value="${format}" />
                  <span>${format.toUpperCase()}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">最大文件大小</label>
              <input type="text" class="input" value="${this.config.maxFileSize}" />
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h4>功能开关</h4>
          <div class="toggle-group">
            <label class="toggle-item">
              <input type="checkbox" ${this.config.allowUpload ? 'checked' : ''} />
              <span>允许上传</span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" ${this.config.allowWebCrawl ? 'checked' : ''} />
              <span>允许网页抓取</span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" ${this.config.autoExtractImages ? 'checked' : ''} />
              <span>自动提取图片</span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" ${this.config.enableOCR ? 'checked' : ''} />
              <span>启用OCR识别</span>
            </label>
          </div>
        </div>
        
        <div class="form-section">
          <h4>文档分割设置</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Chunk大小 (token)</label>
              <input type="range" class="range" min="256" max="2048" value="${this.config.chunkSize}" />
              <span>${this.config.chunkSize}</span>
            </div>
            <div class="form-group">
              <label class="form-label">重叠大小 (token)</label>
              <input type="range" class="range" min="0" max="256" value="${this.config.chunkOverlap}" />
              <span>${this.config.chunkOverlap}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
  }

  bindEvents() {
    const ranges = this.container.querySelectorAll('.range');
    ranges.forEach(range => {
      range.addEventListener('input', (e) => {
        e.target.nextElementSibling.textContent = e.target.value;
      });
    });
  }

  getData() {
    const checkboxes = this.container.querySelectorAll('.checkbox-grid input:checked');
    const formats = Array.from(checkboxes).map(cb => cb.value);
    
    return {
      type: 'document',
      config: {
        supportedFormats: formats,
        maxFileSize: this.container.querySelector('input[type="text"]').value,
        allowUpload: this.container.querySelector('.toggle-group input:nth-child(1)').checked,
        allowWebCrawl: this.container.querySelector('.toggle-group input:nth-child(3)').checked,
        autoExtractImages: this.container.querySelector('.toggle-group input:nth-child(5)').checked,
        enableOCR: this.container.querySelector('.toggle-group input:nth-child(7)').checked,
        chunkSize: parseInt(this.container.querySelector('.range:nth-child(1)').value),
        chunkOverlap: parseInt(this.container.querySelector('.range:nth-child(2)').value)
      }
    };
  }
}

export class WebConfigForm {
  constructor(config = {}) {
    this.config = {
      crawlDepth: config.crawlDepth || 3,
      maxPages: config.maxPages || 100,
      followLinks: config.followLinks !== undefined ? config.followLinks : true,
      respectRobots: config.respectRobots !== undefined ? config.respectRobots : true,
      enableJavaScript: config.enableJavaScript !== undefined ? config.enableJavaScript : false,
      requestDelay: config.requestDelay || 1000,
      maxContentSize: config.maxContentSize || '10MB',
      excludePaths: config.excludePaths || [],
      ...config
    };
    this.container = null;
  }

  render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="config-form">
        <div class="form-section">
          <h4>爬取设置</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">爬取深度</label>
              <input type="range" class="range" min="1" max="10" value="${this.config.crawlDepth}" />
              <span>${this.config.crawlDepth} 层</span>
            </div>
            <div class="form-group">
              <label class="form-label">最大页面数</label>
              <input type="range" class="range" min="10" max="500" step="10" value="${this.config.maxPages}" />
              <span>${this.config.maxPages} 页</span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">请求间隔 (ms)</label>
              <input type="range" class="range" min="500" max="5000" step="100" value="${this.config.requestDelay}" />
              <span>${this.config.requestDelay}ms</span>
            </div>
            <div class="form-group">
              <label class="form-label">最大内容大小</label>
              <input type="text" class="input" value="${this.config.maxContentSize}" />
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h4>爬取选项</h4>
          <div class="toggle-group">
            <label class="toggle-item">
              <input type="checkbox" ${this.config.followLinks ? 'checked' : ''} />
              <span>跟随链接</span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" ${this.config.respectRobots ? 'checked' : ''} />
              <span>遵守Robots.txt</span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" ${this.config.enableJavaScript ? 'checked' : ''} />
              <span>启用JavaScript渲染</span>
            </label>
          </div>
        </div>
        
        <div class="form-section">
          <h4>排除路径</h4>
          <div class="form-group">
            <label class="form-label">排除的URL模式（每行一个）</label>
            <textarea class="textarea" placeholder="/admin/*&#10;/login/*&#10;/api/*">${this.config.excludePaths.join('\n')}</textarea>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
  }

  bindEvents() {
    const ranges = this.container.querySelectorAll('.range');
    ranges.forEach(range => {
      range.addEventListener('input', (e) => {
        e.target.nextElementSibling.textContent = e.target.value + (e.target === ranges[0] ? ' 层' : e.target === ranges[2] ? 'ms' : ' 页');
      });
    });
  }

  getData() {
    return {
      type: 'web',
      config: {
        crawlDepth: parseInt(this.container.querySelector('.range:nth-child(1)').value),
        maxPages: parseInt(this.container.querySelector('.range:nth-child(2)').value),
        requestDelay: parseInt(this.container.querySelector('.range:nth-child(3)').value),
        maxContentSize: this.container.querySelector('input[type="text"]').value,
        followLinks: this.container.querySelector('.toggle-group input:nth-child(1)').checked,
        respectRobots: this.container.querySelector('.toggle-group input:nth-child(3)').checked,
        enableJavaScript: this.container.querySelector('.toggle-group input:nth-child(5)').checked,
        excludePaths: this.container.querySelector('textarea').value.split('\n').filter(line => line.trim())
      }
    };
  }
}

export class DatabaseConfigForm {
  constructor(config = {}) {
    this.config = {
      dbType: config.dbType || 'mysql',
      host: config.host || 'localhost',
      port: config.port || 3306,
      database: config.database || '',
      username: config.username || '',
      password: config.password || '',
      tableWhitelist: config.tableWhitelist || [],
      enableFullText: config.enableFullText !== undefined ? config.enableFullText : true,
      syncInterval: config.syncInterval || 'daily',
      batchSize: config.batchSize || 1000,
      ...config
    };
    this.container = null;
  }

  render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="config-form">
        <div class="form-section">
          <h4>数据库连接</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">数据库类型</label>
              <select class="select">
                <option value="mysql" ${this.config.dbType === 'mysql' ? 'selected' : ''}>MySQL</option>
                <option value="postgresql" ${this.config.dbType === 'postgresql' ? 'selected' : ''}>PostgreSQL</option>
                <option value="sqlserver" ${this.config.dbType === 'sqlserver' ? 'selected' : ''}>SQL Server</option>
                <option value="sqlite" ${this.config.dbType === 'sqlite' ? 'selected' : ''}>SQLite</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">主机地址</label>
              <input type="text" class="input" value="${this.config.host}" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">端口</label>
              <input type="number" class="input" value="${this.config.port}" />
            </div>
            <div class="form-group">
              <label class="form-label">数据库名称</label>
              <input type="text" class="input" value="${this.config.database}" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <input type="text" class="input" value="${this.config.username}" />
            </div>
            <div class="form-group">
              <label class="form-label">密码</label>
              <input type="password" class="input" value="${this.config.password}" />
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h4>同步设置</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">同步频率</label>
              <select class="select">
                <option value="hourly" ${this.config.syncInterval === 'hourly' ? 'selected' : ''}>每小时</option>
                <option value="daily" ${this.config.syncInterval === 'daily' ? 'selected' : ''}>每日</option>
                <option value="weekly" ${this.config.syncInterval === 'weekly' ? 'selected' : ''}>每周</option>
                <option value="manual" ${this.config.syncInterval === 'manual' ? 'selected' : ''}>手动</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">批处理大小</label>
              <input type="range" class="range" min="100" max="5000" step="100" value="${this.config.batchSize}" />
              <span>${this.config.batchSize}</span>
            </div>
          </div>
          <div class="toggle-group">
            <label class="toggle-item">
              <input type="checkbox" ${this.config.enableFullText ? 'checked' : ''} />
              <span>启用全文索引</span>
            </label>
          </div>
        </div>
        
        <div class="form-section">
          <h4>表白名单</h4>
          <div class="form-group">
            <label class="form-label">允许同步的表名（逗号分隔）</label>
            <input type="text" class="input" placeholder="table1, table2, table3" value="${this.config.tableWhitelist.join(', ')}" />
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
  }

  bindEvents() {
    const range = this.container.querySelector('.range');
    range.addEventListener('input', (e) => {
      e.target.nextElementSibling.textContent = e.target.value;
    });
  }

  getData() {
    const tablesInput = this.container.querySelector('.form-section:last-child input').value;
    const tables = tablesInput ? tablesInput.split(',').map(t => t.trim()).filter(Boolean) : [];
    
    return {
      type: 'database',
      config: {
        dbType: this.container.querySelector('.select:nth-child(1)').value,
        host: this.container.querySelector('.input:nth-child(1)').value,
        port: parseInt(this.container.querySelector('.input:nth-child(2)').value),
        database: this.container.querySelector('.input:nth-child(3)').value,
        username: this.container.querySelector('.input:nth-child(4)').value,
        password: this.container.querySelector('.input:nth-child(5)').value,
        syncInterval: this.container.querySelector('.select:nth-child(2)').value,
        batchSize: parseInt(this.container.querySelector('.range').value),
        enableFullText: this.container.querySelector('.toggle-group input').checked,
        tableWhitelist: tables
      }
    };
  }
}

export class QAConfigForm {
  constructor(config = {}) {
    this.config = {
      trainingRounds: config.trainingRounds || 8,
      similarityThreshold: config.similarityThreshold || 0.8,
      maxResults: config.maxResults || 5,
      intentRecognition: config.intentRecognition !== undefined ? config.intentRecognition : true,
      multiTurnDialog: config.multiTurnDialog !== undefined ? config.multiTurnDialog : true,
      enableFAQ: config.enableFAQ !== undefined ? config.enableFAQ : true,
      enableEmbedding: config.enableEmbedding !== undefined ? config.enableEmbedding : true,
      answerTemplate: config.answerTemplate || '',
      ...config
    };
    this.container = null;
  }

  render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="config-form">
        <div class="form-section">
          <h4>模型训练设置</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">训练轮数</label>
              <input type="range" class="range" min="3" max="20" value="${this.config.trainingRounds}" />
              <span>${this.config.trainingRounds} 轮</span>
            </div>
            <div class="form-group">
              <label class="form-label">相似度阈值</label>
              <input type="range" class="range" min="0" max="1" step="0.05" value="${this.config.similarityThreshold}" />
              <span>${(this.config.similarityThreshold * 100).toFixed(0)}%</span>
            </div>
            <div class="form-group">
              <label class="form-label">最大返回结果</label>
              <input type="range" class="range" min="1" max="20" value="${this.config.maxResults}" />
              <span>${this.config.maxResults} 条</span>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h4>功能开关</h4>
          <div class="toggle-group">
            <label class="toggle-item">
              <input type="checkbox" ${this.config.intentRecognition ? 'checked' : ''} />
              <span>意图识别</span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" ${this.config.multiTurnDialog ? 'checked' : ''} />
              <span>多轮对话</span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" ${this.config.enableFAQ ? 'checked' : ''} />
              <span>FAQ匹配</span>
            </label>
            <label class="toggle-item">
              <input type="checkbox" ${this.config.enableEmbedding ? 'checked' : ''} />
              <span>向量检索</span>
            </label>
          </div>
        </div>
        
        <div class="form-section">
          <h4>回答模板</h4>
          <div class="form-group">
            <label class="form-label">自定义回答格式</label>
            <textarea class="textarea" placeholder="根据知识库内容，我来为您解答：\n\n{answer}">${this.config.answerTemplate}</textarea>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
  }

  bindEvents() {
    const ranges = this.container.querySelectorAll('.range');
    ranges[0].addEventListener('input', (e) => {
      e.target.nextElementSibling.textContent = e.target.value + ' 轮';
    });
    ranges[1].addEventListener('input', (e) => {
      e.target.nextElementSibling.textContent = (parseFloat(e.target.value) * 100).toFixed(0) + '%';
    });
    ranges[2].addEventListener('input', (e) => {
      e.target.nextElementSibling.textContent = e.target.value + ' 条';
    });
  }

  getData() {
    return {
      type: 'qa',
      config: {
        trainingRounds: parseInt(this.container.querySelector('.range:nth-child(1)').value),
        similarityThreshold: parseFloat(this.container.querySelector('.range:nth-child(2)').value),
        maxResults: parseInt(this.container.querySelector('.range:nth-child(3)').value),
        intentRecognition: this.container.querySelector('.toggle-group input:nth-child(1)').checked,
        multiTurnDialog: this.container.querySelector('.toggle-group input:nth-child(3)').checked,
        enableFAQ: this.container.querySelector('.toggle-group input:nth-child(5)').checked,
        enableEmbedding: this.container.querySelector('.toggle-group input:nth-child(7)').checked,
        answerTemplate: this.container.querySelector('textarea').value
      }
    };
  }
}

export const KBConfigFactory = {
  create(type, config = {}) {
    switch(type) {
      case 'document':
        return new DocumentConfigForm(config);
      case 'web':
        return new WebConfigForm(config);
      case 'database':
        return new DatabaseConfigForm(config);
      case 'qa':
        return new QAConfigForm(config);
      default:
        throw new Error(`Unknown KB type: ${type}`);
    }
  }
};
