/**
 * RichToolbar - 飞书风格富文本工具栏
 *
 * 双模式:
 *   'document' - 文档创作编辑器,完整飞书级功能(颜色、字号、链接、图片、表格合并等)
 *   'template' - 模板编辑器,精简结构化功能(基础格式、标题、列表、对齐,无颜色/图片/链接)
 */

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef',
  '#f5a623', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d', '#3b6cff', '#1d4ed8',
  '#10b981', '#059669', '#047857', '#065f46', '#7a5cff', '#6d28d9', '#5b21b6', '#4c1d95',
  '#ec4899', '#db2777', '#be185d', '#9d174d', '#0891b2', '#0e7490', '#155e75', '#164e63',
];

const HIGHLIGHT_COLORS = [
  '#fef08a', '#fde68a', '#fcd34d', '#fdba74', '#fca5a5', '#f9a8d4', '#c4b5fd', '#a5b4fc',
  '#93c5fd', '#7dd3fc', '#67e8f9', '#6ee7b7', '#86efac', '#bef264', '#fde047', '#fef3c7',
  '#ffffff', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#262626',
];

const icon = (cls) => `<i class="fa-solid ${cls}"></i>`;

function btn({ id, title, iconCls, text, disabled = false }) {
  const inner = iconCls ? icon(iconCls) : text || '';
  return `<button type="button" class="ctm-rt-btn" data-rt="${id}" title="${title}" ${
    disabled ? 'disabled' : ''
  }>${inner}</button>`;
}

function groupStart() {
  return `<div class="ctm-rt-group">`;
}
function groupEnd() {
  return `</div>`;
}

function dropdownBtn({ id, title, label, iconCls }) {
  const inner = iconCls ? `${icon(iconCls)}` : `<span>${label}</span>`;
  return `<button type="button" class="ctm-rt-btn ctm-rt-dropdown" data-rt="${id}" title="${title}">${inner}<i class="fa-solid fa-chevron-down ctm-rt-caret"></i></button>`;
}

/**
 * 构建工具栏 HTML
 */
function buildToolbarHTML(format, mode) {
  const isDoc = mode === 'document';
  const isTable = format === 'table';
  let html = '<div class="ctm-rich-toolbar">';

  // 撤销重做(两种模式都有)
  html += groupStart();
  html += btn({ id: 'undo', title: '撤销 (Ctrl+Z)', iconCls: 'fa-rotate-left' });
  html += btn({ id: 'redo', title: '重做 (Ctrl+Y)', iconCls: 'fa-rotate-right' });
  html += groupEnd();

  // 文本格式
  html += groupStart();
  html += btn({ id: 'bold', title: '加粗 (Ctrl+B)', iconCls: 'fa-bold' });
  html += btn({ id: 'italic', title: '斜体 (Ctrl+I)', iconCls: 'fa-italic' });
  html += btn({ id: 'underline', title: '下划线 (Ctrl+U)', iconCls: 'fa-underline' });
  html += btn({ id: 'strike', title: '删除线', iconCls: 'fa-strikethrough' });
  if (isDoc) {
    html += btn({ id: 'code', title: '行内代码', iconCls: 'fa-code' });
  }
  html += groupEnd();

  // 标题(下拉)
  html += groupStart();
  html += dropdownBtn({ id: 'heading', title: '段落样式', iconCls: 'fa-paragraph' });
  html += groupEnd();

  // 列表
  html += groupStart();
  html += btn({ id: 'bulletList', title: '无序列表', iconCls: 'fa-list-ul' });
  html += btn({ id: 'orderedList', title: '有序列表', iconCls: 'fa-list-ol' });
  if (format === 'list' || isDoc) {
    html += btn({ id: 'taskList', title: '待办列表', iconCls: 'fa-list-check' });
  }
  html += groupEnd();

  // 对齐
  html += groupStart();
  html += btn({ id: 'alignLeft', title: '左对齐', iconCls: 'fa-align-left' });
  html += btn({ id: 'alignCenter', title: '居中', iconCls: 'fa-align-center' });
  html += btn({ id: 'alignRight', title: '右对齐', iconCls: 'fa-align-right' });
  if (isDoc) {
    html += btn({ id: 'alignJustify', title: '两端对齐', iconCls: 'fa-align-justify' });
  }
  html += groupEnd();

  // 文档模式独有:颜色
  if (isDoc) {
    html += groupStart();
    html += dropdownBtn({ id: 'textColor', title: '文字颜色', iconCls: 'fa-font', label: 'A' });
    html += dropdownBtn({ id: 'highlight', title: '背景高亮', iconCls: 'fa-highlighter' });
    html += groupEnd();
  }

  // 文档模式独有:插入
  if (isDoc) {
    html += groupStart();
    html += btn({ id: 'link', title: '插入链接', iconCls: 'fa-link' });
    html += btn({ id: 'image', title: '插入图片', iconCls: 'fa-image' });
    html += btn({ id: 'hr', title: '分割线', iconCls: 'fa-minus' });
    html += btn({ id: 'quote', title: '引用', iconCls: 'fa-quote-left' });
    html += btn({ id: 'codeBlock', title: '代码块', iconCls: 'fa-file-code' });
    html += groupEnd();
  }

  // 表格专属(两种模式都支持基础表格操作,文档模式额外支持合并)
  if (isTable) {
    html += groupStart();
    html += btn({ id: 'insertTable', title: '插入表格', iconCls: 'fa-table' });
    html += btn({ id: 'addRowBefore', title: '上方插行', iconCls: 'fa-arrow-up' });
    html += btn({ id: 'addRowAfter', title: '下方插行', iconCls: 'fa-arrow-down' });
    html += btn({ id: 'addColBefore', title: '左侧插列', iconCls: 'fa-arrow-left' });
    html += btn({ id: 'addColAfter', title: '右侧插列', iconCls: 'fa-arrow-right' });
    html += groupEnd();

    html += groupStart();
    html += btn({ id: 'deleteRow', title: '删除行', iconCls: 'fa-eraser' });
    html += btn({ id: 'deleteCol', title: '删除列', iconCls: 'fa-eraser' });
    html += btn({ id: 'deleteTable', title: '删除表格', iconCls: 'fa-trash-can' });
    html += groupEnd();

    if (isDoc) {
      html += groupStart();
      html += btn({ id: 'mergeCells', title: '合并单元格', iconCls: 'fa-object-group' });
      html += btn({ id: 'splitCell', title: '拆分单元格', iconCls: 'fa-object-ungroup' });
      html += btn({ id: 'toggleHeaderRow', title: '表头行', iconCls: 'fa-heading' });
      html += btn({ id: 'cellBgColor', title: '单元格背景色', iconCls: 'fa-fill-drip' });
      html += groupEnd();
    }
  }

  // 清除格式
  html += groupStart();
  html += btn({ id: 'clearFormat', title: '清除格式', iconCls: 'fa-remove-format' });
  html += groupEnd();

  html += '</div>';
  return html;
}

/**
 * 创建下拉菜单内容
 */
function buildDropdownContent(id) {
  if (id === 'heading') {
    return `
      <div class="ctm-rt-menu-item" data-rt-set="paragraph"><i class="fa-solid fa-paragraph"></i> 正文</div>
      <div class="ctm-rt-menu-item" data-rt-set="h1"><i class="fa-solid fa-heading"></i> 标题 1</div>
      <div class="ctm-rt-menu-item" data-rt-set="h2"><i class="fa-solid fa-heading"></i> 标题 2</div>
      <div class="ctm-rt-menu-item" data-rt-set="h3"><i class="fa-solid fa-heading"></i> 标题 3</div>
    `;
  }
  if (id === 'textColor') {
    return `<div class="ctm-rt-color-grid">${TEXT_COLORS.map(
      (c) => `<div class="ctm-rt-color-cell" data-rt-color="${c}" style="background:${c}"></div>`
    ).join('')}</div>`;
  }
  if (id === 'highlight') {
    return `<div class="ctm-rt-color-grid">${HIGHLIGHT_COLORS.map(
      (c) => `<div class="ctm-rt-color-cell" data-rt-highlight="${c}" style="background:${c}"></div>`
    ).join('')}</div>`;
  }
  if (id === 'cellBgColor') {
    return `<div class="ctm-rt-color-grid">${HIGHLIGHT_COLORS.map(
      (c) => `<div class="ctm-rt-color-cell" data-rt-cellbg="${c}" style="background:${c}"></div>`
    ).join('')}</div>`;
  }
  return '';
}

/**
 * 创建链接弹窗 HTML
 */
function buildLinkPopover() {
  return `
    <div class="ctm-rt-popover ctm-rt-link-popover">
      <input type="text" class="ctm-rt-link-input" placeholder="输入链接地址 https://..." />
      <input type="text" class="ctm-rt-link-text" placeholder="显示文字(可选)" />
      <button type="button" class="ctm-rt-link-ok btn btn-primary">应用</button>
      <button type="button" class="ctm-rt-link-remove btn btn-outline">移除链接</button>
    </div>
  `;
}

/**
 * 创建图片弹窗 HTML
 */
function buildImagePopover() {
  return `
    <div class="ctm-rt-popover ctm-rt-image-popover">
      <input type="text" class="ctm-rt-image-url" placeholder="图片地址 https://..." />
      <button type="button" class="ctm-rt-image-ok btn btn-primary">插入</button>
    </div>
  `;
}

/**
 * 创建工具栏
 * @param {object} params
 * @param {object} params.editor - createRichEditor 返回的句柄
 * @param {HTMLElement} params.container - 工具栏挂载容器
 * @param {string} params.format - word|table|email|list|steps
 * @param {string} params.mode - 'document' | 'template'
 */
export function createRichToolbar({ editor, container, format = 'word', mode = 'document' }) {
  if (!container) throw new Error('createRichToolbar: container is required');

  container.innerHTML = buildToolbarHTML(format, mode);
  const root = container.querySelector('.ctm-rich-toolbar');

  // 用于存放打开的浮层,便于关闭
  let activePopover = null;

  const closePopover = () => {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
      document.removeEventListener('mousedown', onDocClick, true);
    }
  };

  const onDocClick = (e) => {
    if (activePopover && !activePopover.contains(e.target) && !e.target.closest('.ctm-rt-dropdown')) {
      closePopover();
    }
  };

  const openPopover = (anchorBtn, html, width) => {
    closePopover();
    activePopover = document.createElement('div');
    activePopover.className = 'ctm-rt-popover-wrap';
    activePopover.innerHTML = html;
    if (width) activePopover.style.width = `${width}px`;
    document.body.appendChild(activePopover);
    const rect = anchorBtn.getBoundingClientRect();
    activePopover.style.position = 'fixed';
    activePopover.style.left = `${rect.left}px`;
    activePopover.style.top = `${rect.bottom + 4}px`;
    activePopover.style.zIndex = '30000';
    document.addEventListener('mousedown', onDocClick, true);
    return activePopover;
  };

  // 执行命令映射
  const runCommand = (id) => {
    const inst = editor.getInstance();
    const chain = inst.chain().focus();
    switch (id) {
      case 'undo':
        chain.undo().run();
        break;
      case 'redo':
        chain.redo().run();
        break;
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'underline':
        chain.toggleUnderline().run();
        break;
      case 'strike':
        chain.toggleStrike().run();
        break;
      case 'code':
        chain.toggleCode().run();
        break;
      case 'bulletList':
        chain.toggleBulletList().run();
        break;
      case 'orderedList':
        chain.toggleOrderedList().run();
        break;
      case 'taskList':
        chain.toggleTaskList?.().run() || chain.toggleBulletList().run();
        break;
      case 'alignLeft':
        chain.setTextAlign('left').run();
        break;
      case 'alignCenter':
        chain.setTextAlign('center').run();
        break;
      case 'alignRight':
        chain.setTextAlign('right').run();
        break;
      case 'alignJustify':
        chain.setTextAlign('justify').run();
        break;
      case 'quote':
        chain.toggleBlockquote().run();
        break;
      case 'codeBlock':
        chain.toggleCodeBlock().run();
        break;
      case 'hr':
        chain.setHorizontalRule().run();
        break;
      case 'clearFormat':
        chain.clearNodes().unsetAllMarks().run();
        break;
      // 表格命令
      case 'insertTable':
        chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'addRowBefore':
        chain.addRowBefore().run();
        break;
      case 'addRowAfter':
        chain.addRowAfter().run();
        break;
      case 'addColBefore':
        chain.addColumnBefore().run();
        break;
      case 'addColAfter':
        chain.addColumnAfter().run();
        break;
      case 'deleteRow':
        chain.deleteRow().run();
        break;
      case 'deleteCol':
        chain.deleteColumn().run();
        break;
      case 'deleteTable':
        chain.deleteTable().run();
        break;
      case 'mergeCells':
        chain.mergeCells().run();
        break;
      case 'splitCell':
        chain.splitCell().run();
        break;
      case 'toggleHeaderRow':
        chain.toggleHeaderRow().run();
        break;
      default:
        break;
    }
  };

  // 普通按钮点击
  root.querySelectorAll('.ctm-rt-btn[data-rt]').forEach((btnEl) => {
    if (btnEl.classList.contains('ctm-rt-dropdown')) return;
    btnEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btnEl.dataset.rt;
      if (id === 'link') {
        openLinkPopover(btnEl);
        return;
      }
      if (id === 'image') {
        openImagePopover(btnEl);
        return;
      }
      runCommand(id);
    });
  });

  // 下拉菜单
  root.querySelectorAll('.ctm-rt-dropdown').forEach((dropdown) => {
    dropdown.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = dropdown.dataset.rt;
      const popover = openPopover(dropdown, buildDropdownContent(id), id === 'heading' ? 160 : 224);
      popover.querySelectorAll('[data-rt-set]').forEach((item) => {
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const val = item.dataset.rtSet;
          const inst = editor.getInstance();
          if (val === 'paragraph') {
            inst.chain().focus().setParagraph().run();
          } else {
            inst.chain().focus().setHeading({ level: parseInt(val.replace('h', '')) }).run();
          }
          closePopover();
        });
      });
      popover.querySelectorAll('[data-rt-color]').forEach((cell) => {
        cell.addEventListener('click', (ev) => {
          ev.stopPropagation();
          editor.getInstance().chain().focus().setColor(cell.dataset.rtColor).run();
          closePopover();
        });
      });
      popover.querySelectorAll('[data-rt-highlight]').forEach((cell) => {
        cell.addEventListener('click', (ev) => {
          ev.stopPropagation();
          editor.getInstance().chain().focus().toggleHighlight({ color: cell.dataset.rtHighlight }).run();
          closePopover();
        });
      });
      popover.querySelectorAll('[data-rt-cellbg]').forEach((cell) => {
        cell.addEventListener('click', (ev) => {
          ev.stopPropagation();
          editor.getInstance().chain().focus().setCellAttribute('background', cell.dataset.rtCellbg).run();
          closePopover();
        });
      });
    });
  });

  // 链接弹窗
  function openLinkPopover(anchorBtn) {
    const inst = editor.getInstance();
    const prevAttrs = inst.getAttributes('link');
    const popover = openPopover(anchorBtn, buildLinkPopover(), 320);
    const urlInput = popover.querySelector('.ctm-rt-link-input');
    const textInput = popover.querySelector('.ctm-rt-link-text');
    if (prevAttrs.href) urlInput.value = prevAttrs.href;
    const selectedText = inst.state.selection.empty
      ? ''
      : inst.state.doc.textBetween(inst.state.selection.from, inst.state.selection.to, ' ');
    if (selectedText) textInput.value = selectedText;
    setTimeout(() => urlInput.focus(), 0);

    const apply = () => {
      const url = urlInput.value.trim();
      if (!url) return;
      const chain = inst.chain().focus().extendMarkRange('link');
      if (textInput.value.trim() && selectedText) {
        chain.insertContent({ type: 'text', text: textInput.value.trim(), marks: [{ type: 'link', attrs: { href: url } }] });
      } else {
        chain.setLink({ href: url });
      }
      chain.run();
      closePopover();
    };

    popover.querySelector('.ctm-rt-link-ok').addEventListener('click', apply);
    popover.querySelector('.ctm-rt-link-remove').addEventListener('click', () => {
      inst.chain().focus().extendMarkRange('link').unsetLink().run();
      closePopover();
    });
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        apply();
      }
    });
  }

  // 图片弹窗
  function openImagePopover(anchorBtn) {
    const inst = editor.getInstance();
    const popover = openPopover(anchorBtn, buildImagePopover(), 320);
    const urlInput = popover.querySelector('.ctm-rt-image-url');
    setTimeout(() => urlInput.focus(), 0);
    const apply = () => {
      const url = urlInput.value.trim();
      if (!url) return;
      inst.chain().focus().setImage({ src: url }).run();
      closePopover();
    };
    popover.querySelector('.ctm-rt-image-ok').addEventListener('click', apply);
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        apply();
      }
    });
  }

  // 实时刷新按钮 active 状态
  const refreshState = () => {
    const inst = editor.getInstance();
    const set = (id, active) => {
      const el = root.querySelector(`.ctm-rt-btn[data-rt="${id}"]`);
      if (el) el.classList.toggle('active', !!active);
    };
    set('bold', inst.isActive('bold'));
    set('italic', inst.isActive('italic'));
    set('underline', inst.isActive('underline'));
    set('strike', inst.isActive('strike'));
    set('code', inst.isActive('code'));
    set('bulletList', inst.isActive('bulletList'));
    set('orderedList', inst.isActive('orderedList'));
    set('taskList', inst.isActive('taskList'));
    set('quote', inst.isActive('blockquote'));
    set('codeBlock', inst.isActive('codeBlock'));
    set('alignLeft', inst.isActive({ textAlign: 'left' }));
    set('alignCenter', inst.isActive({ textAlign: 'center' }));
    set('alignRight', inst.isActive({ textAlign: 'right' }));
    set('alignJustify', inst.isActive({ textAlign: 'justify' }));

    // 表格命令可用性
    const inTable = inst.isActive('table');
    ['addRowBefore', 'addRowAfter', 'addColBefore', 'addColAfter', 'deleteRow', 'deleteCol', 'deleteTable', 'mergeCells', 'splitCell', 'toggleHeaderRow', 'cellBgColor'].forEach(
      (id) => {
        const el = root.querySelector(`.ctm-rt-btn[data-rt="${id}"]`);
        if (el) el.disabled = !inTable;
      }
    );
  };

  editor.on('selectionUpdate', refreshState);
  editor.on('transaction', refreshState);
  editor.on('focus', refreshState);
  setTimeout(refreshState, 0);

  return {
    destroy() {
      closePopover();
      editor.off('selectionUpdate', refreshState);
      editor.off('transaction', refreshState);
      editor.off('focus', refreshState);
      container.innerHTML = '';
    },
    refresh: refreshState,
  };
}
