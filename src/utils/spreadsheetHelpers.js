/**
 * Spreadsheet helpers - 电子表格通用工具函数
 * 无 DOM 操作，纯数据处理。
 */

/**
 * 列索引转 Excel 列标：0 -> A, 25 -> Z, 26 -> AA
 */
export function columnIndexToLetter(index) {
  if (index < 0) return '';
  let result = '';
  let n = index;
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

/**
 * Excel 列标转列索引：A -> 0, Z -> 25, AA -> 26
 */
export function letterToColumnIndex(str) {
  if (!str) return -1;
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    result = result * 26 + (str.charCodeAt(i) - 64);
  }
  return result - 1;
}

/**
 * 创建默认格式对象
 */
export function createDefaultFormat() {
  return {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    color: null,
    fillColor: null,
    fontSize: null,
    fontFamily: null,
    hAlign: null,
    vAlign: null,
    borderTop: null,
    borderRight: null,
    borderBottom: null,
    borderLeft: null,
  };
}

/**
 * 深拷贝 Sheet
 */
export function cloneSheet(sheet) {
  return JSON.parse(JSON.stringify(sheet));
}

/**
 * 深拷贝整个 result 表格部分
 */
export function cloneTableResult(result) {
  return {
    ...result,
    sheets: (result.sheets || []).map(cloneSheet),
    columns: [...(result.columns || [])],
    rows: (result.rows || []).map((r) => (Array.isArray(r) ? [...r] : [])),
  };
}

/**
 * 旧数据兼容：把 result.columns/result.rows 包装成单个 sheet
 */
export function normalizeTableResult(result) {
  if (!result) return;
  if (!Array.isArray(result.sheets) || result.sheets.length === 0) {
    result.sheets = [
      {
        name: 'Sheet1',
        columns: Array.isArray(result.columns) ? [...result.columns] : [],
        rows: Array.isArray(result.rows)
          ? result.rows.map((r) => (Array.isArray(r) ? [...r] : []))
          : [],
        formats: [],
        colWidths: [],
        rowHeights: [],
        merges: [],
      },
    ];
    result.activeSheetIndex = 0;
  }
  // 确保 activeSheetIndex 有效
  if (
    typeof result.activeSheetIndex !== 'number' ||
    result.activeSheetIndex < 0
  ) {
    result.activeSheetIndex = 0;
  }
  if (result.activeSheetIndex >= result.sheets.length) {
    result.activeSheetIndex = result.sheets.length - 1;
  }
  const sheet = result.sheets[result.activeSheetIndex];
  ensureSheetIntegrity(sheet);
  syncLegacyMirror(result);
}

/**
 * 确保 Sheet 内部数据结构完整
 */
export function ensureSheetIntegrity(sheet) {
  if (!sheet) return;
  if (!Array.isArray(sheet.columns)) sheet.columns = [];
  if (!Array.isArray(sheet.rows)) sheet.rows = [];
  if (!Array.isArray(sheet.formats)) sheet.formats = [];
  if (!Array.isArray(sheet.colWidths)) sheet.colWidths = [];
  if (!Array.isArray(sheet.rowHeights)) sheet.rowHeights = [];
  if (!Array.isArray(sheet.merges)) sheet.merges = [];

  // 补齐 formats 维度
  expandFormatsToMatchRows(sheet);

  // 确保每一行长度与列数一致
  const colCount = sheet.columns.length;
  sheet.rows.forEach((row) => {
    if (!Array.isArray(row)) row = [];
    while (row.length < colCount) row.push('');
    if (row.length > colCount) row.length = colCount;
  });
}

/**
 * 把当前活动 Sheet 同步到 result 顶层 columns/rows
 */
export function syncLegacyMirror(result) {
  if (!result || !Array.isArray(result.sheets)) return;
  const idx = result.activeSheetIndex || 0;
  const sheet = result.sheets[idx];
  if (!sheet) return;
  result.columns = [...sheet.columns];
  result.rows = sheet.rows.map((r) => (Array.isArray(r) ? [...r] : []));
}

/**
 * 获取单元格格式
 */
export function getCellFormat(sheet, r, c) {
  if (!sheet || !sheet.formats) return {};
  const row = sheet.formats[r];
  if (!row) return {};
  return row[c] || {};
}

/**
 * 设置单元格格式（局部 patch）
 */
export function setCellFormat(sheet, r, c, patch) {
  if (!sheet) return;
  expandFormatsToMatchRows(sheet);
  if (!sheet.formats[r]) sheet.formats[r] = [];
  const current = sheet.formats[r][c] || {};
  sheet.formats[r][c] = { ...current, ...patch };
}

/**
 * 批量设置区域格式
 */
export function setRangeFormat(sheet, range, patch) {
  if (!sheet || !range) return;
  const { r1, c1, r2, c2 } = range;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      setCellFormat(sheet, r, c, patch);
    }
  }
}

/**
 * 获取区域格式快照（用于 undo）
 */
export function getRangeFormats(sheet, range) {
  if (!sheet || !range) return [];
  const { r1, c1, r2, c2 } = range;
  const result = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      result.push({ r, c, format: { ...getCellFormat(sheet, r, c) } });
    }
  }
  return result;
}

/**
 * 应用格式快照
 */
export function applyFormatSnapshot(sheet, snapshot) {
  if (!sheet || !Array.isArray(snapshot)) return;
  snapshot.forEach(({ r, c, format }) => {
    setCellFormat(sheet, r, c, format);
  });
}

/**
 * 补齐 formats 数组维度以匹配 rows
 */
export function expandFormatsToMatchRows(sheet) {
  if (!sheet || !Array.isArray(sheet.rows) || !Array.isArray(sheet.formats))
    return;
  const colCount = sheet.columns.length;
  while (sheet.formats.length < sheet.rows.length) {
    sheet.formats.push([]);
  }
  sheet.formats.forEach((row) => {
    if (!Array.isArray(row)) row = [];
    while (row.length < colCount) row.push({});
    if (row.length > colCount) row.length = colCount;
  });
}

/**
 * 行列变更后调整合并单元格
 * mode: 'insertRow' | 'deleteRow' | 'insertCol' | 'deleteCol'
 * index: 变更位置
 * count: 变更数量（正数）
 */
export function adjustMerges(sheet, mode, index, count = 1) {
  if (!sheet || !Array.isArray(sheet.merges)) return;
  const newMerges = [];
  sheet.merges.forEach((m) => {
    const endR = m.r + m.rowspan - 1;
    const endC = m.c + m.colspan - 1;

    if (mode === 'insertRow') {
      if (index > endR) {
        newMerges.push(m);
      } else if (index <= m.r) {
        newMerges.push({ ...m, r: m.r + count });
      } else {
        // 插入位置在合并区域内，取消该合并
      }
    } else if (mode === 'deleteRow') {
      if (index > endR) {
        newMerges.push(m);
      } else if (index + count <= m.r) {
        newMerges.push({ ...m, r: m.r - count });
      } else {
        // 删除区域与合并区域相交，取消该合并
      }
    } else if (mode === 'insertCol') {
      if (index > endC) {
        newMerges.push(m);
      } else if (index <= m.c) {
        newMerges.push({ ...m, c: m.c + count });
      } else {
        // 插入位置在合并区域内，取消该合并
      }
    } else if (mode === 'deleteCol') {
      if (index > endC) {
        newMerges.push(m);
      } else if (index + count <= m.c) {
        newMerges.push({ ...m, c: m.c - count });
      } else {
        // 删除区域与合并区域相交，取消该合并
      }
    }
  });
  sheet.merges = newMerges;
}

/**
 * 检查某个单元格是否属于某个合并区域（非左上角）
 */
export function isCoveredByMerge(sheet, r, c) {
  if (!sheet || !Array.isArray(sheet.merges)) return false;
  return sheet.merges.some((m) => {
    if (r === m.r && c === m.c) return false;
    return r >= m.r && r < m.r + m.rowspan && c >= m.c && c < m.c + m.colspan;
  });
}

/**
 * 获取单元格所属的合并区域
 */
export function getMergeAt(sheet, r, c) {
  if (!sheet || !Array.isArray(sheet.merges)) return null;
  return (
    sheet.merges.find(
      (m) => r >= m.r && r < m.r + m.rowspan && c >= m.c && c < m.c + m.colspan
    ) || null
  );
}

/**
 * 按列排序（用于列头菜单）
 */
export function sortSheetByColumn(sheet, ci, asc = true) {
  if (!sheet || !Array.isArray(sheet.rows) || sheet.rows.length === 0) return;
  sheet.rows.sort((a, b) => {
    const av = a[ci] != null ? String(a[ci]) : '';
    const bv = b[ci] != null ? String(b[ci]) : '';
    const an = parseFloat(av.replace(/,/g, ''));
    const bn = parseFloat(bv.replace(/,/g, ''));
    if (!isNaN(an) && !isNaN(bn) && av.trim() !== '' && bv.trim() !== '') {
      return asc ? an - bn : bn - an;
    }
    return asc ? av.localeCompare(bv, 'zh') : bv.localeCompare(av, 'zh');
  });
}

/**
 * 获取选区内的值矩阵（用于复制）
 */
export function getRangeValues(sheet, range) {
  if (!sheet || !range) return [];
  const { r1, c1, r2, c2 } = range;
  const result = [];
  for (let r = r1; r <= r2; r++) {
    const row = [];
    for (let c = c1; c <= c2; c++) {
      row.push(sheet.rows[r]?.[c] ?? '');
    }
    result.push(row);
  }
  return result;
}

/**
 * 把值矩阵写入选区（用于粘贴）
 */
export function setRangeValues(sheet, startR, startC, values) {
  if (!sheet || !Array.isArray(values)) return;
  values.forEach((row, ri) => {
    const r = startR + ri;
    if (!sheet.rows[r]) sheet.rows[r] = [];
    row.forEach((val, ci) => {
      const c = startC + ci;
      sheet.rows[r][c] = val;
    });
  });
  expandFormatsToMatchRows(sheet);
}

/**
 * 把区域值快照用于 undo
 */
export function getRangeValuesSnapshot(sheet, range) {
  if (!sheet || !range) return [];
  const { r1, c1, r2, c2 } = range;
  const result = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      result.push({ r, c, value: sheet.rows[r]?.[c] ?? '' });
    }
  }
  return result;
}

/**
 * 应用值快照
 */
export function applyValuesSnapshot(sheet, snapshot) {
  if (!sheet || !Array.isArray(snapshot)) return;
  snapshot.forEach(({ r, c, value }) => {
    if (!sheet.rows[r]) sheet.rows[r] = [];
    sheet.rows[r][c] = value;
  });
}

/**
 * 将内部格式对象转换为 xlsx 库可接受的 cell.s（尽力而为）
 * xlsx@0.18.5 社区版对样式支持有限，此处提供基础映射。
 */
export function buildXlsxStyle(format) {
  if (!format) return {};
  const style = {};
  const font = {};
  if (format.bold) font.bold = true;
  if (format.italic) font.italic = true;
  if (format.underline) font.underline = true;
  if (format.strike) font.strike = true;
  if (format.color) font.color = { rgb: format.color.replace('#', '') };
  if (format.fontSize) font.sz = format.fontSize;
  if (format.fontFamily) font.name = format.fontFamily;
  if (Object.keys(font).length > 0) style.font = font;

  if (format.fillColor) {
    style.fill = {
      fgColor: { rgb: format.fillColor.replace('#', '') },
      patternType: 'solid',
    };
  }

  const alignment = {};
  if (format.hAlign) alignment.horizontal = format.hAlign;
  if (format.vAlign) alignment.vertical = format.vAlign;
  if (Object.keys(alignment).length > 0) style.alignment = alignment;

  const border = {};
  if (format.borderTop)
    border.top = { style: 'thin', color: { rgb: '9CA3AF' } };
  if (format.borderRight)
    border.right = { style: 'thin', color: { rgb: '9CA3AF' } };
  if (format.borderBottom)
    border.bottom = { style: 'thin', color: { rgb: '9CA3AF' } };
  if (format.borderLeft)
    border.left = { style: 'thin', color: { rgb: '9CA3AF' } };
  if (Object.keys(border).length > 0) style.border = border;

  return style;
}

/**
 * 导出：从 sheet 生成 xlsx 工作表配置
 */
export function sheetToXlsxConfig(sheet) {
  if (!sheet) return null;
  const aoa = [sheet.columns, ...sheet.rows];
  return {
    aoa,
    cols: (sheet.colWidths || []).map((w) => ({ wpx: w })),
    rows: (sheet.rowHeights || []).map((h) => ({ hpx: h })),
    merges: (sheet.merges || []).map((m) => ({
      s: { r: m.r, c: m.c },
      e: { r: m.r + m.rowspan - 1, c: m.c + m.colspan - 1 },
    })),
    formats: sheet.formats || [],
  };
}
