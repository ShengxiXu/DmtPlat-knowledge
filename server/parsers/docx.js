import mammoth from 'mammoth';

export async function parseDOCX(fileBuffer) {
  const result = await mammoth.convertToHtml({ buffer: fileBuffer });
  const text = result.value;
  const messages = result.messages;

  // 简单提取标题：html 中的 h1-h6
  const headings = [];
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  while ((match = headingRegex.exec(text)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      text: match[2].replace(/<[^>]+>/g, '').trim(),
    });
  }

  // 提取表格
  const tables = [];
  const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
  while ((match = tableRegex.exec(text)) !== null) {
    const tableHtml = match[1];
    const rows = [];
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const cells = [];
      const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      if (cells.length) rows.push(cells);
    }
    tables.push(rows);
  }

  // 提取纯文本段落（去除空行）
  const plainText = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const paragraphs = plainText
    .split(/\n|\.\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);

  return {
    fileType: 'docx',
    title: headings[0]?.text || '',
    headings,
    tables,
    paragraphs: paragraphs.slice(0, 50),
    wordCount: plainText.split(/\s+/).length,
    suggestedFields: buildDOCXSuggestedFields(headings, tables),
    warnings: messages.map((m) => m.message),
  };
}

function buildDOCXSuggestedFields(headings, tables) {
  const fields = [
    {
      id: 'topic',
      label: '文档主题',
      type: 'text',
      required: true,
      placeholder: '例如：产品使用手册',
    },
    {
      id: 'audience',
      label: '目标读者',
      type: 'text',
      required: false,
      placeholder: '例如：新入职销售',
    },
  ];

  if (headings.length > 3) {
    fields.push({
      id: 'sections',
      label: '章节要点',
      type: 'textarea',
      required: false,
      placeholder: '主要章节标题，每行一条',
      rows: 5,
    });
  }

  if (tables.length > 0) {
    fields.push({
      id: 'table_data',
      label: '表格数据',
      type: 'textarea',
      required: false,
      placeholder: '需要填充到表格中的数据',
      rows: 4,
    });
  }

  return fields;
}
