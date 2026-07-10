import XLSX from 'xlsx';

export function parseXLSX(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheets = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    const rows = json.map((row) => row.map((cell) => String(cell).trim()));

    // 识别表头：第一行非空且字段数最多
    const headerRow = rows.find((r) => r.some((c) => c.length > 0)) || [];
    const dataRows = rows.slice(1).filter((r) => r.some((c) => c.length > 0));

    sheets.push({
      name: sheetName,
      rowCount: rows.length,
      columnCount: headerRow.length,
      headers: headerRow,
      sampleRows: dataRows.slice(0, 5),
    });
  }

  const firstSheet = sheets[0];

  return {
    fileType: 'xlsx',
    title: firstSheet?.name || '',
    sheetCount: workbook.SheetNames.length,
    sheets,
    suggestedFields: buildXLSXSuggestedFields(sheets),
  };
}

function buildXLSXSuggestedFields(sheets) {
  const fields = [
    { id: 'sheet_name', label: '表格名称', type: 'text', required: false, placeholder: '例如：Q3 销售数据' },
  ];

  const firstSheet = sheets[0];
  if (firstSheet?.headers?.length > 0) {
    fields.push({
      id: 'headers',
      label: '列标题',
      type: 'textarea',
      required: false,
      placeholder: '用逗号分隔的列标题',
      rows: 2,
    });
    fields.push({
      id: 'data_rows',
      label: '数据行',
      type: 'textarea',
      required: false,
      placeholder: '每行一条数据，用逗号或制表符分隔',
      rows: 6,
    });
  }

  return fields;
}
