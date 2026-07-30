import { scrollToBottom } from '../utils/helpers.js';

export class ChatContainer {
  constructor(container, options = {}) {
    this.container = container;
    this.messages = options.messages || [];
    this.placeholder = options.placeholder || '输入问题...';
    this.onSendMessage = options.onSendMessage;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="chat-container">
        <div class="chat-header">
          <div class="chat-title"><i class="fa-solid fa-message"></i> 智能问答</div>
          <button class="btn btn-sm btn-ghost" id="clear-chat-${this.container.id}" title="清空聊天"><i class="fa-solid fa-trash-can"></i></button>
        </div>
        
        <div class="chat-messages" id="chat-messages-${this.container.id}">
          ${this.renderMessages()}
        </div>
        
        <div class="quick-questions" id="quick-questions-${this.container.id}">
          <div class="quick-title">快捷提问</div>
          <div class="quick-list">
            ${this.renderQuickQuestions()}
          </div>
        </div>
        
        <div class="chat-input">
          <input type="text" id="chat-input-${this.container.id}" placeholder="${this.placeholder}">
          <button class="btn btn-primary" id="chat-send-${this.container.id}">发送</button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderMessages() {
    if (this.messages.length === 0) {
      return `
        <div class="empty-chat">
          <i class="fa-solid fa-robot" style="font-size:48px;margin-bottom:16px;"></i>
          <div style="font-size:16px;color:var(--kb-text);margin-bottom:8px;">您好！我是智能助手</div>
          <div style="font-size:14px;color:var(--kb-text-muted);">有什么我可以帮助您的吗？</div>
          <div style="margin-top:20px;">
            <div style="font-size:13px;color:var(--kb-text-muted);margin-bottom:12px;">试试这些问题：</div>
            <div class="suggested-questions">
              <button class="suggest-btn">如何重置密码？</button>
              <button class="suggest-btn">产品功能介绍</button>
              <button class="suggest-btn">常见问题解答</button>
            </div>
          </div>
        </div>
      `;
    }

    return this.messages
      .map((msg) => {
        const isUser = msg.role === 'user';
        const time =
          msg.time ||
          new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          });
        return `
          <div class="chat-message" style="flex-direction:${isUser ? 'row-reverse' : 'row'}">
            <div class="chat-avatar ${isUser ? 'user' : ''}">${isUser ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>'}</div>
            <div class="chat-bubble-wrapper">
              <div class="chat-bubble ${isUser ? 'user' : ''}">${msg.content}</div>
              <div class="chat-time">${time} 
                <button class="copy-btn" data-content="${encodeURIComponent(msg.content)}"><i class="fa-solid fa-copy"></i></button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  renderQuickQuestions() {
    const questions = [
      '如何重置密码？',
      '产品有哪些功能？',
      '如何创建知识库？',
      '支持哪些文件格式？',
      '训练需要多长时间？',
    ];

    return questions
      .map(
        (q, index) => `
        <button class="quick-btn" id="quick-btn-${this.container.id}-${index}">${q}</button>
      `
      )
      .join('');
  }

  bindEvents() {
    const input = document.getElementById(`chat-input-${this.container.id}`);
    const sendBtn = document.getElementById(`chat-send-${this.container.id}`);
    const clearBtn = document.getElementById(`clear-chat-${this.container.id}`);

    const sendMessage = (content) => {
      const messageContent = content || input.value.trim();
      if (!messageContent) return;

      const userMsg = {
        id: Date.now(),
        role: 'user',
        content: messageContent,
        time: new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      this.addMessage(userMsg);
      input.value = '';

      this.onSendMessage?.(messageContent);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);

    clearBtn.addEventListener('click', () => {
      if (confirm('确定要清空所有聊天记录吗？')) {
        this.messages = [];
        this.render();
      }
    });

    const quickBtns = document.querySelectorAll(
      `#quick-questions-${this.container.id} .quick-btn`
    );
    quickBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        sendMessage(btn.textContent);
      });
    });

    const copyBtns = document.querySelectorAll('.copy-btn');
    copyBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const content = decodeURIComponent(btn.dataset.content);
        try {
          await navigator.clipboard.writeText(content);
          const originalText = btn.textContent;
          btn.textContent = '✓';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        } catch (err) {
          console.error('复制失败:', err);
        }
      });
    });

    const suggestBtns = document.querySelectorAll('.suggest-btn');
    suggestBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        sendMessage(btn.textContent);
      });
    });
  }

  addMessage(message) {
    if (!message.time) {
      message.time = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    this.messages.push(message);
    const messagesContainer = document.getElementById(
      `chat-messages-${this.container.id}`
    );

    if (messagesContainer.querySelector('.empty-chat')) {
      messagesContainer.innerHTML = '';
    }

    const isUser = message.role === 'user';
    const msgHTML = `
      <div class="chat-message" style="flex-direction:${isUser ? 'row-reverse' : 'row'}">
        <div class="chat-avatar ${isUser ? 'user' : ''}">${isUser ? '👤' : '🤖'}</div>
        <div class="chat-bubble-wrapper">
          <div class="chat-bubble ${isUser ? 'user' : ''}">${message.content}</div>
          <div class="chat-time">${message.time} 
            <button class="copy-btn" data-content="${encodeURIComponent(message.content)}">📋</button>
          </div>
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', msgHTML);
    scrollToBottom(messagesContainer);

    setTimeout(() => {
      const copyBtn = messagesContainer.querySelector('.copy-btn:last-child');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          const content = decodeURIComponent(copyBtn.dataset.content);
          try {
            await navigator.clipboard.writeText(content);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓';
            setTimeout(() => {
              copyBtn.textContent = originalText;
            }, 2000);
          } catch (err) {
            console.error('复制失败:', err);
          }
        });
      }
    }, 100);
  }

  setOnSendMessage(callback) {
    this.onSendMessage = callback;
  }
}
