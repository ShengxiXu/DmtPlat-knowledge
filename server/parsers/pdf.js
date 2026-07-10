import { PDFParse } from 'pdf-parse';

export async function parsePDF(fileBuffer) {
  const parser = new PDFParse({ data: fileBuffer });
  const textResult = await parser.getText();
  const infoResult = await parser.getInfo();
  await parser.destroy();

  const text = textResult.text || '';
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 简单识别标题：短行、位于段落开头
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    if (line.length > 3 && line.length < 80 && !nextLine.startsWith(line)) {
      const isNumbered = /^\d+(\.\d+)*\s+/.test(line);
      const isBoldLike = line === line.toUpperCase() && line.length < 50;
      if (isNumbered || isBoldLike) {
        headings.push({ level: isNumbered ? line.split('.').length : 1, text: line });
      }
    }
  }

  // 按段落分组
  const paragraphs = [];
  let currentPara = '';
  for (const line of lines) {
    if (/^\d+(\.\d+)*\s+/.test(line) || (line.length < 80 && line === line.toUpperCase())) {
      if (currentPara) paragraphs.push(currentPara.trim());
      currentPara = line + ' ';
    } else {
      currentPara += line + ' ';
    }
  }
  if (currentPara) paragraphs.push(currentPara.trim());

  // 从 infoResult 提取页数
  const pageCount = infoResult.total || textResult.pages?.length || 0;

  return {
    fileType: 'pdf',
    title: infoResult.info?.Title || headings[0]?.text || '',
    author: infoResult.info?.Author || '',
    pageCount,
    headings: headings.slice(0, 30),
    paragraphs: paragraphs.filter((p) => p.length > 20).slice(0, 50),
    wordCount: text.split(/\s+/).length,
    suggestedFields: buildPDFSuggestedFields(headings),
  };
}

function buildPDFSuggestedFields(headings) {
  const fields = [
    { id: 'topic', label: '文档主题', type: 'text', required: true, placeholder: '例如：行业研究报告' },
    { id: 'summary_focus', label: '关注重点', type: 'textarea', required: false, placeholder: '希望从文档中重点提取或总结的内容', rows: 3 },
  ];

  if (headings.length > 3) {
    fields.push({
      id: 'key_sections',
      label: '关键章节',
      type: 'textarea',
      required: false,
      placeholder: '重点章节标题，每行一条',
      rows: 4,
    });
  }

  return fields;
}
