/**
 * RichEditor - TipTap/ProseMirror 富文本编辑器封装(Vanilla JS)
 *
 * 提供 createRichEditor() 创建编辑器实例,按 format 组装扩展集。
 * 模板编辑器与文档创作编辑器共用此内核。
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

/**
 * 构建扩展列表
 * @param {string} format - word|table|email|list|steps
 * @param {object} opts - { placeholder }
 */
function buildExtensions(format, opts = {}) {
  const placeholder = opts.placeholder || '开始输入内容...';
  const base = [
    // StarterKit v3 内置 link/underline,直接通过 StarterKit.configure 传参配置,
    // 不再单独导入 Link/Underline 扩展,避免 "Duplicate extension names" 警告
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      },
      underline: {},
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Image.configure({ inline: false, allowBase64: true }),
    Subscript,
    Superscript,
    Placeholder.configure({ placeholder }),
  ];

  if (format === 'list') {
    base.push(TaskList, TaskItem.configure({ nested: true }));
  }

  if (format === 'table') {
    base.push(
      Table.configure({ resizable: true, cellMinWidth: 80, lastColumnResizable: true }),
      TableRow,
      TableHeader,
      TableCell
    );
  }

  return base;
}

/**
 * 创建富文本编辑器
 * @param {object} params
 * @param {HTMLElement} params.element - 挂载元素
 * @param {string} params.format - word|table|email|list|steps
 * @param {string} params.content - 初始 HTML 内容
 * @param {function} params.onUpdate - 内容变更回调 ({ html, json })
 * @param {string} params.placeholder
 * @param {boolean} params.editable
 * @returns {object} 编辑器句柄 { getHTML, getJSON, setHTML, setFocus, destroy, getInstance, on, off }
 */
export function createRichEditor({
  element,
  format = 'word',
  content = '<p></p>',
  onUpdate = null,
  placeholder = '',
  editable = true,
}) {
  if (!element) throw new Error('createRichEditor: element is required');

  const extensions = buildExtensions(format, { placeholder });

  const editor = new Editor({
    element,
    extensions,
    content: content || '<p></p>',
    editable,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        try {
          onUpdate({ html: editor.getHTML(), json: editor.getJSON() });
        } catch (err) {
          console.error('[RichEditor] onUpdate error:', err);
        }
      }
    },
  });

  return {
    getInstance() {
      return editor;
    },
    getHTML() {
      return editor.getHTML();
    },
    getJSON() {
      return editor.getJSON();
    },
    setHTML(html) {
      editor.commands.setContent(html || '<p></p>', { emitUpdate: false });
    },
    setFocus() {
      editor.commands.focus();
    },
    isEditable() {
      return editor.isEditable;
    },
    setEditable(v) {
      editor.setEditable(v);
    },
    on(event, cb) {
      editor.on(event, cb);
    },
    off(event, cb) {
      editor.off(event, cb);
    },
    destroy() {
      try {
        editor.destroy();
      } catch (err) {
        console.error('[RichEditor] destroy error:', err);
      }
    },
  };
}

/**
 * 检测当前是否安装了 TipTap(用于容错)
 */
export function isRichEditorAvailable() {
  try {
    return !!Editor;
  } catch {
    return false;
  }
}
