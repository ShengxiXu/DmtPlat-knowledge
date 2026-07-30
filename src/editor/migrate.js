/**
 * 数据迁移层
 * 现有结构化数据(contentDoc.data / editorTemplate.content) ↔ HTML 双向转换
 *
 * 数据存储策略(v2):
 *   word:   { meta, sections:[{title, guide, text}] }   text/guide 存 HTML
 *   table:  { html }                                     整体存 HTML(含 <table>)
 *   email:  { subject, greeting, body:[HTML], closing, signature(HTML) }
 *   list:   { items:[{text(HTML), checked}] }
 *   steps:  { steps:[{title, detail(HTML)}] }
 *
 * 读取旧数据(v1,纯文本/二维数组)时自动转换为 HTML,写入统一存 HTML。
 */

const escapeHtml = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const textToParagraphs = (text) => {
  if (!text) return '';
  return String(text)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
};

/** 判断字符串是否像 HTML(包含标签) */
const looksLikeHtml = (s) => /<(p|h[1-6]|ul|ol|li|table|div|blockquote|pre|code)\b/i.test(String(s || ''));

// ============ 旧结构 → HTML ============

export function legacyWordToHtml(data) {
  const sections = data?.sections || [];
  if (sections.length === 0) return '<p></p>';
  return sections
    .map((s) => {
      const level = Math.min(Math.max(s.level || 1, 1), 3);
      const tag = `h${level + 1}`;
      const title = s.title ? `<${tag}>${escapeHtml(s.title)}</${tag}>` : '';
      const guide = s.guide
        ? looksLikeHtml(s.guide)
          ? s.guide
          : `<p><em>${escapeHtml(s.guide)}</em></p>`
        : '';
      const text = s.text
        ? looksLikeHtml(s.text)
          ? s.text
          : textToParagraphs(s.text)
        : '';
      return title + guide + text;
    })
    .join('');
}

export function legacyTableToHtml(data) {
  const columns = data?.columns || [];
  const rows = data?.rows || [];
  if (columns.length === 0 && rows.length === 0) return '<p></p>';
  const head =
    columns.length > 0
      ? `<thead><tr>${columns
          .map((c) => `<th>${escapeHtml(c)}</th>`)
          .join('')}</tr></thead>`
      : '';
  const body =
    rows.length > 0
      ? `<tbody>${rows
          .map(
            (row) =>
              `<tr>${(columns.length ? columns : row).map((_, ci) => `<td>${escapeHtml(row[ci] || '')}</td>`).join('')}</tr>`
          )
          .join('')}</tbody>`
      : '';
  return `<table>${head}${body}</table>`;
}

export function legacyEmailToHtml(data) {
  const parts = [];
  if (data?.subject) parts.push(`<h2>主题：${escapeHtml(data.subject)}</h2>`);
  if (data?.greeting) parts.push(`<p>${escapeHtml(data.greeting)}</p>`);
  (data?.body || []).forEach((p) => {
    parts.push(looksLikeHtml(p) ? p : `<p>${escapeHtml(p)}</p>`);
  });
  if (data?.closing) parts.push(`<p>${escapeHtml(data.closing)}</p>`);
  if (data?.signature)
    parts.push(
      looksLikeHtml(data.signature)
        ? data.signature
        : `<p><em>${escapeHtml(data.signature)}</em></p>`
    );
  return parts.length ? parts.join('') : '<p></p>';
}

export function legacyListToHtml(data) {
  const items = data?.items || [];
  if (items.length === 0) return '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>';
  return `<ul data-type="taskList">${items
    .map(
      (it) =>
        `<li data-type="taskItem" data-checked="${it.checked ? 'true' : 'false'}"><p>${
          looksLikeHtml(it.text) ? it.text : escapeHtml(it.text || '')
        }</p></li>`
    )
    .join('')}</ul>`;
}

export function legacyStepsToHtml(data) {
  const steps = data?.steps || [];
  if (steps.length === 0) return '<p></p>';
  return steps
    .map((s, i) => {
      const title = s.title ? `<h3>${i + 1}. ${escapeHtml(s.title)}</h3>` : '';
      const detail = s.detail
        ? looksLikeHtml(s.detail)
          ? s.detail
          : textToParagraphs(s.detail)
        : '';
      return title + detail;
    })
    .join('');
}

// ============ HTML → 旧结构(导出/向后兼容) ============

export function htmlToLegacyWord(html, originalData = {}) {
  const container = document.createElement('div');
  container.innerHTML = html || '';
  const sections = [];
  let current = null;
  container.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    const hMatch = tag.match(/^h([1-3])$/);
    if (hMatch) {
      if (current) sections.push(current);
      current = {
        title: node.textContent.trim(),
        level: parseInt(hMatch[1]),
        guide: '',
        text: '',
      };
    } else if (current) {
      const text = node.innerHTML.trim();
      if (tag === 'em' || (tag === 'p' && /^<em>/.test(text))) {
        current.guide = text;
      } else {
        current.text += (current.text ? '' : '') + text;
      }
    } else {
      current = { title: '', level: 1, guide: '', text: node.innerHTML.trim() };
    }
  });
  if (current) sections.push(current);
  return { meta: originalData.meta || {}, sections };
}

export function htmlToLegacyTable(html) {
  const container = document.createElement('div');
  container.innerHTML = html || '';
  const table = container.querySelector('table');
  if (!table) return { columns: ['列1', '列2', '列3'], rows: [['', '', '']] };
  const columns = [];
  table.querySelectorAll('thead th').forEach((th) => columns.push(th.textContent.trim()));
  const rows = [];
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const row = [];
    tr.querySelectorAll('td').forEach((td) => row.push(td.innerHTML.trim()));
    rows.push(row);
  });
  if (columns.length === 0 && rows.length > 0) {
    rows[0].forEach((_, i) => columns.push(`列${i + 1}`));
  }
  return { columns, rows };
}

export function htmlToLegacyEmail(html) {
  const container = document.createElement('div');
  container.innerHTML = html || '';
  const data = { subject: '', greeting: '', body: [], closing: '', signature: '' };
  container.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    const text = node.textContent.trim();
    if (tag === 'h2' && text.startsWith('主题')) {
      data.subject = text.replace(/^主题[：:]\s*/, '');
    } else if (tag === 'em' && data.body.length === 0) {
      data.greeting = node.innerHTML;
    } else if (tag === 'em') {
      data.signature = node.innerHTML;
    } else if (tag === 'p') {
      data.body.push(node.innerHTML);
    }
  });
  return data;
}

export function htmlToLegacyList(html) {
  const container = document.createElement('div');
  container.innerHTML = html || '';
  const items = [];
  container.querySelectorAll('li[data-type="taskItem"], li').forEach((li) => {
    items.push({
      text: li.innerHTML,
      checked: li.dataset.checked === 'true' || li.querySelector('input[type=checkbox]')?.checked || false,
    });
  });
  return { items: items.length ? items : [{ text: '', checked: false }] };
}

export function htmlToLegacySteps(html) {
  const container = document.createElement('div');
  container.innerHTML = html || '';
  const steps = [];
  let current = null;
  container.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'h3') {
      if (current) steps.push(current);
      const match = node.textContent.match(/^\s*(\d+)\.\s*(.*)$/);
      current = { title: match ? match[2] : node.textContent.trim(), detail: '' };
    } else if (current) {
      current.detail += (current.detail ? '' : '') + node.innerHTML;
    } else {
      current = { title: '', detail: node.innerHTML };
    }
  });
  if (current) steps.push(current);
  return { steps: steps.length ? steps : [{ title: '', detail: '' }] };
}

// ============ 统一入口 ============

const migrators = {
  word: { toHtml: legacyWordToHtml, fromHtml: htmlToLegacyWord },
  table: { toHtml: legacyTableToHtml, fromHtml: htmlToLegacyTable },
  email: { toHtml: legacyEmailToHtml, fromHtml: htmlToLegacyEmail },
  list: { toHtml: legacyListToHtml, fromHtml: htmlToLegacyList },
  steps: { toHtml: legacyStepsToHtml, fromHtml: htmlToLegacySteps },
};

/**
 * 确保数据中的内容字段为 HTML 格式
 * @param {object} data - contentDoc.data 或 editorTemplate.content
 * @param {string} format - word|table|email|list|steps
 * @returns {object} 转换后的 data(原对象会被标记 _v: 2)
 */
export function ensureHtmlContent(data, format) {
  if (!data || typeof data !== 'object') return data;
  if (data._v === 2) return data;
  const m = migrators[format];
  if (!m) return data;

  // table 格式:有 html 字段则直接用,否则从 columns/rows 迁移
  if (format === 'table') {
    if (!data.html) {
      data.html = m.toHtml(data);
    }
    data._v = 2;
    return data;
  }

  // word:sections 里的 text/guide 转 HTML
  if (format === 'word') {
    (data.sections || []).forEach((s) => {
      if (s.text && !looksLikeHtml(s.text)) s.text = textToParagraphs(s.text);
      if (s.guide && !looksLikeHtml(s.guide))
        s.guide = `<p><em>${escapeHtml(s.guide)}</em></p>`;
    });
    data._v = 2;
    return data;
  }

  // email:body/signature 转 HTML
  if (format === 'email') {
    (data.body || []).forEach((p, i) => {
      if (p && !looksLikeHtml(p)) data.body[i] = `<p>${escapeHtml(p)}</p>`;
    });
    if (data.signature && !looksLikeHtml(data.signature))
      data.signature = `<p><em>${escapeHtml(data.signature)}</em></p>`;
    data._v = 2;
    return data;
  }

  // list:items.text 转 HTML
  if (format === 'list') {
    (data.items || []).forEach((it) => {
      if (it.text && !looksLikeHtml(it.text)) it.text = escapeHtml(it.text);
    });
    data._v = 2;
    return data;
  }

  // steps:detail 转 HTML
  if (format === 'steps') {
    (data.steps || []).forEach((s) => {
      if (s.detail && !looksLikeHtml(s.detail)) s.detail = textToParagraphs(s.detail);
    });
    data._v = 2;
    return data;
  }

  return data;
}

/**
 * 将编辑器 HTML 写回 data 结构(供保存)
 * @param {object} data
 * @param {string} format
 * @param {string} html - 编辑器输出的 HTML
 */
export function writeHtmlToData(data, format, html) {
  if (!data) return data;
  if (format === 'table') {
    data.html = html;
  } else if (format === 'word') {
    const parsed = htmlToLegacyWord(html, data);
    data.sections = parsed.sections;
  } else if (format === 'email') {
    const parsed = htmlToLegacyEmail(html);
    Object.assign(data, parsed);
  } else if (format === 'list') {
    data.items = htmlToLegacyList(html).items;
  } else if (format === 'steps') {
    data.steps = htmlToLegacySteps(html).steps;
  }
  data._v = 2;
  return data;
}

/**
 * 从 data 中提取编辑器初始 HTML
 */
export function readHtmlFromData(data, format) {
  if (!data) return '<p></p>';
  ensureHtmlContent(data, format);
  if (format === 'table') return data.html || '<p></p>';
  if (format === 'word') return legacyWordToHtml(data);
  if (format === 'email') return legacyEmailToHtml(data);
  if (format === 'list') return legacyListToHtml(data);
  if (format === 'steps') return legacyStepsToHtml(data);
  return '<p></p>';
}
