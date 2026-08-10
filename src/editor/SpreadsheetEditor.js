import {
  columnIndexToLetter,
  normalizeTableResult,
  syncLegacyMirror,
  ensureSheetIntegrity,
  getCellFormat,
  setRangeFormat,
  getRangeFormats,
  applyFormatSnapshot,
  getRangeValues,
  setRangeValues,
  getRangeValuesSnapshot,
  applyValuesSnapshot,
  sortSheetByColumn,
  isCoveredByMerge,
  getMergeAt,
  adjustMerges,
} from '../utils/spreadsheetHelpers.js';
import './SpreadsheetEditor.css';

/**
 * SpreadsheetEditor - Excel 风格电子表格编辑器
 *
 * 保持项目现有浅色/品牌绿主题，支持：
 * - 工具栏、公式栏、Excel 行列标
 * - 单元格选中/范围选择/方向键导航
 * - 字体/字号/加粗/斜体/下划线/颜色/填充/对齐/边框/合并单元格
 * - 行列增删、拖拽排序、拖拽调整宽高
 * - 多 Sheet
 * - 复制/粘贴/撤销/重做
 */
export class SpreadsheetEditor {
  constructor(container, result, options = {}) {
    if (!container || !result) {
      throw new Error('SpreadsheetEditor: container and result are required');
    }
    this.container = container;
    this.result = result;
    this.options = options;
    this.onChange = options.onChange || (() => {});

    // 初始化数据结构
    normalizeTableResult(this.result);

    // 状态
    this.active = { r: 0, c: 0 };
    this.selection = { r1: 0, c1: 0, r2: 0, c2: 0 };
    this.isSelecting = false;
    this.isEditing = false;
    this.editBox = null;
    this.contextMenu = null;

    // 拖拽调整宽高
    this.resizeState = null;

    // 拖拽排序
    this.dragSortState = null;

    // 剪贴板
    this.clipboard = null;

    // Undo/Redo
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;

    // 默认列宽/行高
    this.defaultColWidth = 120;
    this.defaultRowHeight = 28;

    // DOM 引用
    this.els = {};

    // 绑定事件处理器引用，便于销毁
    this._handlers = {};
  }

  init() {
    this.buildDOM();
    this.bindEvents();
    this.renderSheet();
    this.updateToolbarState();
  }

  // ===================== DOM 构建 =====================

  buildDOM() {
    this.container.innerHTML = `
      <div class="wa-spreadsheet">
        <div class="wa-spreadsheet-toolbar">
          <div class="wa-spreadsheet-toolbar-group">
            <button type="button" data-ss-cmd="undo" title="撤销 (Ctrl+Z)"><i class="fa-solid fa-rotate-left"></i></button>
            <button type="button" data-ss-cmd="redo" title="重做 (Ctrl+Y)"><i class="fa-solid fa-rotate-right"></i></button>
          </div>
          <div class="wa-spreadsheet-toolbar-group">
            <select data-ss-format="fontFamily" title="字体">
              <option value="">默认</option>
              <option value="Arial">Arial</option>
              <option value="PingFang SC">苹方</option>
              <option value="Microsoft YaHei">微软雅黑</option>
              <option value="Times New Roman">Times New Roman</option>
            </select>
            <select data-ss-format="fontSize" title="字号">
              <option value="">默认</option>
              <option value="10">10</option>
              <option value="12">12</option>
              <option value="13">13</option>
              <option value="14">14</option>
              <option value="16">16</option>
              <option value="18">18</option>
              <option value="20">20</option>
              <option value="24">24</option>
            </select>
          </div>
          <div class="wa-spreadsheet-toolbar-group">
            <button type="button" data-ss-format="bold" title="加粗 (Ctrl+B)"><i class="fa-solid fa-bold"></i></button>
            <button type="button" data-ss-format="italic" title="斜体 (Ctrl+I)"><i class="fa-solid fa-italic"></i></button>
            <button type="button" data-ss-format="underline" title="下划线 (Ctrl+U)"><i class="fa-solid fa-underline"></i></button>
            <button type="button" data-ss-format="strike" title="删除线"><i class="fa-solid fa-strikethrough"></i></button>
          </div>
          <div class="wa-spreadsheet-toolbar-group">
            <input type="color" data-ss-format="color" title="字体颜色" value="#1f2937" />
            <input type="color" data-ss-format="fillColor" title="填充颜色" value="#ffffff" />
          </div>
          <div class="wa-spreadsheet-toolbar-group">
            <button type="button" data-ss-format="align-left" title="左对齐"><i class="fa-solid fa-align-left"></i></button>
            <button type="button" data-ss-format="align-center" title="居中"><i class="fa-solid fa-align-center"></i></button>
            <button type="button" data-ss-format="align-right" title="右对齐"><i class="fa-solid fa-align-right"></i></button>
          </div>
          <div class="wa-spreadsheet-toolbar-group">
            <button type="button" data-ss-cmd="border-all" title="所有边框"><i class="fa-solid fa-border-all"></i></button>
            <button type="button" data-ss-cmd="border-none" title="清除边框"><i class="fa-solid fa-ban"></i></button>
            <button type="button" data-ss-cmd="mergeCells" title="合并/取消合并单元格"><i class="fa-solid fa-object-group"></i></button>
            <button type="button" data-ss-cmd="clear-format" title="清除格式"><i class="fa-solid fa-eraser"></i></button>
          </div>
          <div class="wa-spreadsheet-toolbar-group">
            <button type="button" data-ss-cmd="insert-row-above" title="上方插入行"><i class="fa-solid fa-arrow-up"></i></button>
            <button type="button" data-ss-cmd="insert-row-below" title="下方插入行"><i class="fa-solid fa-arrow-down"></i></button>
            <button type="button" data-ss-cmd="insert-col-left" title="左侧插入列"><i class="fa-solid fa-arrow-left"></i></button>
            <button type="button" data-ss-cmd="insert-col-right" title="右侧插入列"><i class="fa-solid fa-arrow-right"></i></button>
            <button type="button" data-ss-cmd="delete-rows" title="删除选中行"><i class="fa-solid fa-trash"></i></button>
            <button type="button" data-ss-cmd="delete-cols" title="删除选中列"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
        <div class="wa-spreadsheet-formula-bar">
          <div class="wa-spreadsheet-name-box">A1</div>
          <div class="wa-spreadsheet-fx">fx</div>
          <input type="text" class="wa-spreadsheet-formula-input" placeholder="输入内容或公式" />
        </div>
        <div class="wa-spreadsheet-viewport">
          <div class="wa-spreadsheet-corner" title="全选"></div>
          <div class="wa-spreadsheet-col-headers"></div>
          <div class="wa-spreadsheet-row-headers"></div>
          <div class="wa-spreadsheet-grid">
            <table class="wa-spreadsheet-table">
              <tbody></tbody>
            </table>
            <div class="wa-spreadsheet-selection" style="display:none"></div>
            <div class="wa-spreadsheet-active-cell" style="display:none"></div>
            <div class="wa-spreadsheet-edit-box" contenteditable="true" style="display:none"></div>
          </div>
        </div>
        <div class="wa-spreadsheet-sheet-bar">
          <button type="button" class="wa-spreadsheet-add-sheet" title="新增工作表"><i class="fa-solid fa-plus"></i></button>
          <div class="wa-spreadsheet-tabs"></div>
        </div>
      </div>
    `;

    const root = this.container.querySelector('.wa-spreadsheet');
    this.els = {
      root,
      toolbar: root.querySelector('.wa-spreadsheet-toolbar'),
      nameBox: root.querySelector('.wa-spreadsheet-name-box'),
      formulaInput: root.querySelector('.wa-spreadsheet-formula-input'),
      corner: root.querySelector('.wa-spreadsheet-corner'),
      colHeaders: root.querySelector('.wa-spreadsheet-col-headers'),
      rowHeaders: root.querySelector('.wa-spreadsheet-row-headers'),
      grid: root.querySelector('.wa-spreadsheet-grid'),
      table: root.querySelector('.wa-spreadsheet-table'),
      tableBody: root.querySelector('.wa-spreadsheet-table tbody'),
      selection: root.querySelector('.wa-spreadsheet-selection'),
      activeCell: root.querySelector('.wa-spreadsheet-active-cell'),
      editBox: root.querySelector('.wa-spreadsheet-edit-box'),
      sheetBar: root.querySelector('.wa-spreadsheet-sheet-bar'),
      tabs: root.querySelector('.wa-spreadsheet-tabs'),
      addSheetBtn: root.querySelector('.wa-spreadsheet-add-sheet'),
    };
    this.editBox = this.els.editBox;
  }

  // ===================== 事件绑定 =====================

  bindEvents() {
    const {
      toolbar,
      grid,
      corner,
      colHeaders,
      rowHeaders,
      sheetBar,
      formulaInput,
      editBox,
    } = this.els;

    // 工具栏
    this._handlers.toolbarClick = (e) => this.onToolbarClick(e);
    toolbar.addEventListener('click', this._handlers.toolbarClick);
    this._handlers.toolbarChange = (e) => this.onToolbarChange(e);
    toolbar.addEventListener('change', this._handlers.toolbarChange);

    // 表格网格
    this._handlers.gridMouseDown = (e) => this.onGridMouseDown(e);
    grid.addEventListener('mousedown', this._handlers.gridMouseDown);
    this._handlers.gridMouseMove = (e) => this.onGridMouseMove(e);
    grid.addEventListener('mousemove', this._handlers.gridMouseMove);
    this._handlers.gridMouseUp = (e) => this.onGridMouseUp(e);
    window.addEventListener('mouseup', this._handlers.gridMouseUp);
    this._handlers.gridDblClick = (e) => this.onGridDblClick(e);
    grid.addEventListener('dblclick', this._handlers.gridDblClick);
    this._handlers.gridContextMenu = (e) => this.onGridContextMenu(e);
    grid.addEventListener('contextmenu', this._handlers.gridContextMenu);

    // 行列标
    this._handlers.colHeaderMouseDown = (e) => this.onColHeaderMouseDown(e);
    colHeaders.addEventListener('mousedown', this._handlers.colHeaderMouseDown);
    this._handlers.rowHeaderMouseDown = (e) => this.onRowHeaderMouseDown(e);
    rowHeaders.addEventListener('mousedown', this._handlers.rowHeaderMouseDown);
    this._handlers.cornerClick = () => this.selectAll();
    corner.addEventListener('click', this._handlers.cornerClick);

    // 公式栏
    this._handlers.formulaFocus = () =>
      this.startEdit(this.active.r, this.active.c, formulaInput.value);
    formulaInput.addEventListener('focus', this._handlers.formulaFocus);
    this._handlers.formulaInput = (e) => {
      if (this.isEditing) {
        this.editBox.textContent = e.target.value;
      }
    };
    formulaInput.addEventListener('input', this._handlers.formulaInput);
    this._handlers.formulaKeyDown = (e) => this.onFormulaKeyDown(e);
    formulaInput.addEventListener('keydown', this._handlers.formulaKeyDown);

    // 编辑框
    this._handlers.editBoxInput = () => {
      if (this.isEditing) {
        formulaInput.value = this.editBox.textContent;
      }
    };
    editBox.addEventListener('input', this._handlers.editBoxInput);
    this._handlers.editBoxKeyDown = (e) => this.onEditBoxKeyDown(e);
    editBox.addEventListener('keydown', this._handlers.editBoxKeyDown);
    this._handlers.editBoxBlur = () => this.commitEdit();
    editBox.addEventListener('blur', this._handlers.editBoxBlur);

    // 键盘导航
    this._handlers.keyDown = (e) => this.onKeyDown(e);
    document.addEventListener('keydown', this._handlers.keyDown);

    // Sheet 标签
    this._handlers.sheetBarClick = (e) => this.onSheetBarClick(e);
    sheetBar.addEventListener('click', this._handlers.sheetBarClick);
    this._handlers.sheetBarContextMenu = (e) => this.onSheetBarContextMenu(e);
    sheetBar.addEventListener(
      'contextmenu',
      this._handlers.sheetBarContextMenu
    );

    // 滚动同步
    this._handlers.gridScroll = () => this.onGridScroll();
    grid.addEventListener('scroll', this._handlers.gridScroll);
  }

  // ===================== Sheet 数据访问 =====================

  get sheet() {
    return this.result.sheets[this.result.activeSheetIndex || 0];
  }

  getSheet(index) {
    return this.result.sheets[index];
  }

  ensureSheet() {
    ensureSheetIntegrity(this.sheet);
  }

  // ===================== 渲染 =====================

  renderSheet() {
    this.ensureSheet();
    this.renderColHeaders();
    this.renderRowHeaders();
    this.renderGrid();
    this.renderSelection();
    this.renderTabs();
    this.updateNameBox();
    this.updateFormulaBar();
    this.updateToolbarState();
  }

  renderColHeaders() {
    const sheet = this.sheet;
    const html = sheet.columns
      .map((_, i) => {
        const width = sheet.colWidths[i] || this.defaultColWidth;
        return `
        <div class="wa-spreadsheet-col-header" data-col="${i}" style="width:${width}px">
          ${columnIndexToLetter(i)}
          <span class="wa-spreadsheet-resize-handle col" data-resize="col" data-index="${i}"></span>
        </div>
      `;
      })
      .join('');
    this.els.colHeaders.innerHTML = html;
  }

  renderRowHeaders() {
    const sheet = this.sheet;
    const html = sheet.rows
      .map((_, i) => {
        const height = sheet.rowHeights[i] || this.defaultRowHeight;
        return `
        <div class="wa-spreadsheet-row-header" data-row="${i}" style="height:${height}px">
          ${i + 1}
          <span class="wa-spreadsheet-resize-handle row" data-resize="row" data-index="${i}"></span>
        </div>
      `;
      })
      .join('');
    this.els.rowHeaders.innerHTML = html;
  }

  renderGrid() {
    const sheet = this.sheet;
    const { columns, rows, formats } = sheet;

    const html = rows
      .map((row, r) => {
        const height = sheet.rowHeights[r] || this.defaultRowHeight;
        const cellsHtml = columns
          .map((_, c) => {
            if (isCoveredByMerge(sheet, r, c)) return '';
            const value = row[c] != null ? row[c] : '';
            const fmt = formats[r]?.[c] || {};
            const merge = getMergeAt(sheet, r, c);
            const style = this.buildCellStyle(fmt, merge, c, sheet.colWidths);
            const className = this.buildCellClass(fmt, merge, r, c);
            const widthStyle = merge
              ? `width:${this.calculateMergeWidth(sheet, merge)}px`
              : '';
            const heightStyle = merge
              ? `height:${this.calculateMergeHeight(sheet, merge)}px`
              : '';
            const attrs = `data-row="${r}" data-col="${c}" ${merge ? `rowspan="${merge.rowspan}" colspan="${merge.colspan}"` : ''}`;
            return `<td class="${className}" ${attrs} style="${style}${widthStyle ? `;${widthStyle}` : ''}${heightStyle ? `;${heightStyle}` : ''}">${this.escapeHtml(String(value))}</td>`;
          })
          .join('');
        return `<tr class="wa-spreadsheet-row" data-row="${r}" style="height:${height}px">${cellsHtml}</tr>`;
      })
      .join('');

    this.els.tableBody.innerHTML = html;
    this.syncHeaderSizes();
  }

  buildCellStyle(fmt, merge, c, colWidths) {
    const styles = [];
    if (fmt.bold) styles.push('font-weight:700');
    if (fmt.italic) styles.push('font-style:italic');
    if (fmt.underline) styles.push('text-decoration:underline');
    if (fmt.strike) styles.push('text-decoration:line-through');
    if (fmt.color) styles.push(`color:${fmt.color}`);
    if (fmt.fillColor) styles.push(`background-color:${fmt.fillColor}`);
    if (fmt.fontSize) styles.push(`font-size:${fmt.fontSize}px`);
    if (fmt.fontFamily) styles.push(`font-family:${fmt.fontFamily}`);
    if (fmt.hAlign) styles.push(`text-align:${fmt.hAlign}`);
    if (fmt.borderTop) styles.push('border-top:1px solid #9ca3af');
    if (fmt.borderRight) styles.push('border-right:1px solid #9ca3af');
    if (fmt.borderBottom) styles.push('border-bottom:1px solid #9ca3af');
    if (fmt.borderLeft) styles.push('border-left:1px solid #9ca3af');
    if (!merge) {
      const w = colWidths[c] || this.defaultColWidth;
      styles.push(`width:${w}px`);
    }
    return styles.join(';');
  }

  buildCellClass(fmt, merge, r, c) {
    const classes = ['wa-spreadsheet-cell'];
    if (fmt.bold) classes.push('bold');
    if (fmt.italic) classes.push('italic');
    if (fmt.underline) classes.push('underline');
    if (fmt.strike) classes.push('strike');
    if (fmt.hAlign) classes.push(`align-${fmt.hAlign}`);
    if (merge) {
      if (r !== merge.r || c !== merge.c) classes.push('merged-hidden');
    }
    return classes.join(' ');
  }

  calculateMergeWidth(sheet, merge) {
    let width = 0;
    for (let c = merge.c; c < merge.c + merge.colspan; c++) {
      width += sheet.colWidths[c] || this.defaultColWidth;
    }
    return width;
  }

  calculateMergeHeight(sheet, merge) {
    let height = 0;
    for (let r = merge.r; r < merge.r + merge.rowspan; r++) {
      height += sheet.rowHeights[r] || this.defaultRowHeight;
    }
    return height;
  }

  syncHeaderSizes() {
    // 表头尺寸由 renderColHeaders/renderRowHeaders 控制，表格 cell 的 width/height 由 inline style 控制
  }

  renderSelection() {
    const { selection, activeCell } = this.els;
    const cell = this.getCellElement(this.active.r, this.active.c);

    if (cell) {
      const rect = this.getCellRect(this.active.r, this.active.c);
      activeCell.style.display = 'block';
      activeCell.style.left = `${rect.left}px`;
      activeCell.style.top = `${rect.top}px`;
      activeCell.style.width = `${rect.width}px`;
      activeCell.style.height = `${rect.height}px`;
    } else {
      activeCell.style.display = 'none';
    }

    if (this.isRangeSelected()) {
      const rect = this.getRangeRect(this.selection);
      selection.style.display = 'block';
      selection.style.left = `${rect.left}px`;
      selection.style.top = `${rect.top}px`;
      selection.style.width = `${rect.width}px`;
      selection.style.height = `${rect.height}px`;
    } else {
      selection.style.display = 'none';
    }

    this.highlightHeaders();
  }

  highlightHeaders() {
    const { r1, c1, r2, c2 } = this.selection;
    this.els.colHeaders
      .querySelectorAll('.wa-spreadsheet-col-header')
      .forEach((el) => {
        const c = parseInt(el.dataset.col, 10);
        el.classList.toggle(
          'selected',
          c >= Math.min(c1, c2) && c <= Math.max(c1, c2)
        );
      });
    this.els.rowHeaders
      .querySelectorAll('.wa-spreadsheet-row-header')
      .forEach((el) => {
        const r = parseInt(el.dataset.row, 10);
        el.classList.toggle(
          'selected',
          r >= Math.min(r1, r2) && r <= Math.max(r1, r2)
        );
      });
  }

  renderTabs() {
    const html = this.result.sheets
      .map(
        (sheet, i) => `
      <div class="wa-spreadsheet-tab ${i === this.result.activeSheetIndex ? 'active' : ''}" data-sheet="${i}">
        ${this.escapeHtml(sheet.name || `Sheet${i + 1}`)}
      </div>
    `
      )
      .join('');
    this.els.tabs.innerHTML = html;
  }

  updateNameBox() {
    this.els.nameBox.textContent = `${columnIndexToLetter(this.active.c)}${this.active.r + 1}`;
  }

  updateFormulaBar() {
    const value = this.sheet.rows[this.active.r]?.[this.active.c] ?? '';
    this.els.formulaInput.value = String(value);
  }

  // ===================== DOM 工具 =====================

  getCellElement(r, c) {
    return this.els.tableBody.querySelector(
      `.wa-spreadsheet-cell[data-row="${r}"][data-col="${c}"]`
    );
  }

  getCellRect(r, c) {
    const cell = this.getCellElement(r, c);
    if (!cell) return { left: 0, top: 0, width: 0, height: 0 };
    const gridRect = this.els.grid.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    return {
      left: cellRect.left - gridRect.left + this.els.grid.scrollLeft,
      top: cellRect.top - gridRect.top + this.els.grid.scrollTop,
      width: cellRect.width,
      height: cellRect.height,
    };
  }

  getRangeRect(range) {
    const r1 = Math.min(range.r1, range.r2);
    const r2 = Math.max(range.r1, range.r2);
    const c1 = Math.min(range.c1, range.c2);
    const c2 = Math.max(range.c1, range.c2);
    const start = this.getCellRect(r1, c1);
    const end = this.getCellRect(r2, c2);
    return {
      left: start.left,
      top: start.top,
      width: start.width + (end.left - start.left),
      height: start.height + (end.top - start.top),
    };
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===================== 选区操作 =====================

  selectCell(r, c, endR = r, endC = c) {
    const sheet = this.sheet;
    r = Math.max(0, Math.min(r, sheet.rows.length - 1));
    c = Math.max(0, Math.min(c, sheet.columns.length - 1));
    endR = Math.max(0, Math.min(endR, sheet.rows.length - 1));
    endC = Math.max(0, Math.min(endC, sheet.columns.length - 1));

    this.active = { r, c };
    this.selection = { r1: r, c1: c, r2: endR, c2: endC };
    this.renderSelection();
    this.updateNameBox();
    this.updateFormulaBar();
    this.updateToolbarState();
    this.scrollCellIntoView(r, c);
  }

  selectRange(r1, c1, r2, c2) {
    this.selection = { r1, c1, r2, c2 };
    this.active = { r: Math.min(r1, r2), c: Math.min(c1, c2) };
    this.renderSelection();
    this.updateNameBox();
    this.updateFormulaBar();
    this.updateToolbarState();
  }

  selectAll() {
    const sheet = this.sheet;
    if (sheet.rows.length === 0 || sheet.columns.length === 0) return;
    this.selectRange(0, 0, sheet.rows.length - 1, sheet.columns.length - 1);
  }

  selectColumn(c) {
    const sheet = this.sheet;
    if (sheet.rows.length === 0) return;
    this.selectRange(0, c, sheet.rows.length - 1, c);
  }

  selectRow(r) {
    const sheet = this.sheet;
    if (sheet.columns.length === 0) return;
    this.selectRange(r, 0, r, sheet.columns.length - 1);
  }

  isRangeSelected() {
    const { r1, c1, r2, c2 } = this.selection;
    return r1 !== r2 || c1 !== c2;
  }

  getSelectedRange() {
    return {
      r1: Math.min(this.selection.r1, this.selection.r2),
      c1: Math.min(this.selection.c1, this.selection.c2),
      c2: Math.max(this.selection.c1, this.selection.c2),
      r2: Math.max(this.selection.r1, this.selection.r2),
    };
  }

  scrollCellIntoView(r, c) {
    const cell = this.getCellElement(r, c);
    if (cell) cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // ===================== 编辑 =====================

  startEdit(r, c, initialValue = null) {
    if (this.isEditing) this.commitEdit();
    const sheet = this.sheet;
    if (r < 0 || r >= sheet.rows.length || c < 0 || c >= sheet.columns.length)
      return;

    this.isEditing = true;
    this.active = { r, c };
    this.selectCell(r, c);

    const value =
      initialValue != null ? initialValue : (sheet.rows[r][c] ?? '');
    const rect = this.getCellRect(r, c);

    this.editBox.style.display = 'block';
    this.editBox.style.left = `${rect.left}px`;
    this.editBox.style.top = `${rect.top}px`;
    this.editBox.style.width = `${rect.width}px`;
    this.editBox.style.minHeight = `${rect.height}px`;
    this.editBox.textContent = String(value);
    this.editBox.focus();

    // 全选内容
    const range = document.createRange();
    range.selectNodeContents(this.editBox);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    this.els.formulaInput.value = String(value);
    this.els.formulaInput.focus();
    this.els.formulaInput.setSelectionRange(
      this.els.formulaInput.value.length,
      this.els.formulaInput.value.length
    );
  }

  commitEdit() {
    if (!this.isEditing) return;
    const { r, c } = this.active;
    const newValue = this.editBox.textContent;
    const oldValue = this.sheet.rows[r]?.[c] ?? '';

    if (String(newValue) !== String(oldValue)) {
      this.pushCommand({
        type: 'setValue',
        range: { r1: r, c1: c, r2: r, c2: c },
        oldValues: [{ r, c, value: oldValue }],
        newValues: [{ r, c, value: newValue }],
      });
      if (!this.sheet.rows[r]) this.sheet.rows[r] = [];
      this.sheet.rows[r][c] = newValue;
      this.refreshCell(r, c);
      this.notifyChange();
    }

    this.isEditing = false;
    this.editBox.style.display = 'none';
    this.editBox.textContent = '';
    this.updateFormulaBar();
    this.updateToolbarState();
  }

  cancelEdit() {
    if (!this.isEditing) return;
    this.isEditing = false;
    this.editBox.style.display = 'none';
    this.editBox.textContent = '';
    this.updateFormulaBar();
    this.els.grid.focus();
  }

  refreshCell(r, c) {
    const cell = this.getCellElement(r, c);
    if (!cell) return;
    const value = this.sheet.rows[r]?.[c] ?? '';
    const fmt = getCellFormat(this.sheet, r, c);
    const merge = getMergeAt(this.sheet, r, c);
    cell.innerHTML = this.escapeHtml(String(value));
    cell.className = this.buildCellClass(fmt, merge, r, c);
    cell.style.cssText = this.buildCellStyle(
      fmt,
      merge,
      c,
      this.sheet.colWidths
    );
  }

  // ===================== 工具栏事件 =====================

  onToolbarClick(e) {
    const btn = e.target.closest('[data-ss-cmd]');
    if (!btn) return;
    const cmd = btn.dataset.ssCmd;
    this.execCommand(cmd);
  }

  onToolbarChange(e) {
    const target = e.target.closest('[data-ss-format]');
    if (!target) return;
    const formatType = target.dataset.ssFormat;
    let value = target.value;
    if (value === '') value = null;

    switch (formatType) {
      case 'fontFamily':
        this.applyFormat({ fontFamily: value });
        break;
      case 'fontSize':
        this.applyFormat({ fontSize: value ? parseInt(value, 10) : null });
        break;
      case 'color':
        this.applyFormat({ color: value });
        break;
      case 'fillColor':
        this.applyFormat({ fillColor: value });
        break;
    }
  }

  execCommand(cmd) {
    const range = this.getSelectedRange();
    switch (cmd) {
      case 'undo':
        this.undo();
        break;
      case 'redo':
        this.redo();
        break;
      case 'bold':
        this.toggleFormat('bold');
        break;
      case 'italic':
        this.toggleFormat('italic');
        break;
      case 'underline':
        this.toggleFormat('underline');
        break;
      case 'strike':
        this.toggleFormat('strike');
        break;
      case 'align-left':
        this.applyFormat({ hAlign: 'left' });
        break;
      case 'align-center':
        this.applyFormat({ hAlign: 'center' });
        break;
      case 'align-right':
        this.applyFormat({ hAlign: 'right' });
        break;
      case 'border-all':
        this.applyFormat({
          borderTop: true,
          borderRight: true,
          borderBottom: true,
          borderLeft: true,
        });
        break;
      case 'border-none':
        this.applyFormat({
          borderTop: null,
          borderRight: null,
          borderBottom: null,
          borderLeft: null,
        });
        break;
      case 'mergeCells':
        this.toggleMergeCells();
        break;
      case 'clear-format':
        this.clearFormat();
        break;
      case 'insert-row-above':
        this.insertRows(range.r1, 1);
        break;
      case 'insert-row-below':
        this.insertRows(range.r2 + 1, 1);
        break;
      case 'insert-col-left':
        this.insertCols(range.c1, 1);
        break;
      case 'insert-col-right':
        this.insertCols(range.c2 + 1, 1);
        break;
      case 'delete-rows':
        this.deleteRows(range.r1, range.r2 - range.r1 + 1);
        break;
      case 'delete-cols':
        this.deleteCols(range.c1, range.c2 - range.c1 + 1);
        break;
    }
  }

  // ===================== 格式应用 =====================

  applyFormat(patch) {
    const range = this.getSelectedRange();
    const oldFormats = getRangeFormats(this.sheet, range);
    setRangeFormat(this.sheet, range, patch);
    this.pushCommand({
      type: 'applyFormat',
      range,
      oldFormats,
      newFormats: getRangeFormats(this.sheet, range),
    });
    this.refreshRange(range);
    this.updateToolbarState();
    this.notifyChange();
  }

  toggleFormat(key) {
    const range = this.getSelectedRange();
    // 如果选区内格式不一致，统一设置为 true；如果都相同，取反
    let allTrue = true;
    let hasValue = false;
    for (let r = range.r1; r <= range.r2; r++) {
      for (let c = range.c1; c <= range.c2; c++) {
        const fmt = getCellFormat(this.sheet, r, c);
        if (fmt[key]) hasValue = true;
        else allTrue = false;
      }
    }
    const newValue = hasValue && allTrue ? null : true;
    this.applyFormat({ [key]: newValue });
  }

  clearFormat() {
    const range = this.getSelectedRange();
    const oldFormats = getRangeFormats(this.sheet, range);
    for (let r = range.r1; r <= range.r2; r++) {
      for (let c = range.c1; c <= range.c2; c++) {
        if (this.sheet.formats[r]) this.sheet.formats[r][c] = {};
      }
    }
    this.pushCommand({
      type: 'applyFormat',
      range,
      oldFormats,
      newFormats: getRangeFormats(this.sheet, range),
    });
    this.refreshRange(range);
    this.updateToolbarState();
    this.notifyChange();
  }

  refreshRange(range) {
    for (let r = range.r1; r <= range.r2; r++) {
      for (let c = range.c1; c <= range.c2; c++) {
        this.refreshCell(r, c);
      }
    }
    this.renderSelection();
  }

  updateToolbarState() {
    const fmt = getCellFormat(this.sheet, this.active.r, this.active.c);

    this.els.toolbar.querySelectorAll('[data-ss-format]').forEach((el) => {
      const type = el.dataset.ssFormat;
      if (type === 'bold') el.classList.toggle('active', !!fmt.bold);
      else if (type === 'italic') el.classList.toggle('active', !!fmt.italic);
      else if (type === 'underline')
        el.classList.toggle('active', !!fmt.underline);
      else if (type === 'strike') el.classList.toggle('active', !!fmt.strike);
      else if (type === 'align-left')
        el.classList.toggle('active', fmt.hAlign === 'left' || !fmt.hAlign);
      else if (type === 'align-center')
        el.classList.toggle('active', fmt.hAlign === 'center');
      else if (type === 'align-right')
        el.classList.toggle('active', fmt.hAlign === 'right');
      else if (type === 'fontFamily') el.value = fmt.fontFamily || '';
      else if (type === 'fontSize') el.value = fmt.fontSize || '';
      else if (type === 'color') el.value = fmt.color || '#1f2937';
      else if (type === 'fillColor') el.value = fmt.fillColor || '#ffffff';
    });

    // 合并单元格按钮状态
    const merge = getMergeAt(this.sheet, this.active.r, this.active.c);
    const mergeBtn = this.els.toolbar.querySelector(
      '[data-ss-cmd="mergeCells"]'
    );
    if (mergeBtn) mergeBtn.classList.toggle('active', !!merge);

    // undo/redo
    const undoBtn = this.els.toolbar.querySelector('[data-ss-cmd="undo"]');
    const redoBtn = this.els.toolbar.querySelector('[data-ss-cmd="redo"]');
    if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }

  // ===================== 合并单元格 =====================

  toggleMergeCells() {
    const range = this.getSelectedRange();
    const existing = getMergeAt(this.sheet, range.r1, range.c1);

    if (
      existing &&
      existing.r === range.r1 &&
      existing.c === range.c1 &&
      existing.rowspan === range.r2 - range.r1 + 1 &&
      existing.colspan === range.c2 - range.c1 + 1
    ) {
      // 取消合并
      this.sheet.merges = this.sheet.merges.filter((m) => m !== existing);
    } else {
      // 合并
      if (range.r2 < range.r1 || range.c2 < range.c1) return;
      // 清除与新区域相交的合并
      this.sheet.merges = this.sheet.merges.filter((m) => {
        const mEndR = m.r + m.rowspan - 1;
        const mEndC = m.c + m.colspan - 1;
        return (
          mEndR < range.r1 ||
          m.r > range.r2 ||
          mEndC < range.c1 ||
          m.c > range.c2
        );
      });
      this.sheet.merges.push({
        r: range.r1,
        c: range.c1,
        rowspan: range.r2 - range.r1 + 1,
        colspan: range.c2 - range.c1 + 1,
      });
    }
    this.renderGrid();
    this.renderSelection();
    this.notifyChange();
  }

  // ===================== 行列操作 =====================

  insertRows(index, count) {
    const sheet = this.sheet;
    const oldRows = [];
    for (let i = 0; i < count; i++)
      oldRows.push(new Array(sheet.columns.length).fill(''));

    this.pushCommand({ type: 'insertRows', index, count, oldRows });
    sheet.rows.splice(index, 0, ...oldRows);
    sheet.formats.splice(index, 0, ...oldRows.map(() => []));
    sheet.rowHeights.splice(
      index,
      0,
      ...oldRows.map(() => this.defaultRowHeight)
    );
    adjustMerges(sheet, 'insertRow', index, count);
    this.renderSheet();
    this.notifyChange();
  }

  deleteRows(index, count) {
    const sheet = this.sheet;
    if (sheet.rows.length <= count) return; // 至少保留一行
    const deletedRows = sheet.rows.splice(index, count);
    const deletedFormats = sheet.formats.splice(index, count);
    const deletedHeights = sheet.rowHeights.splice(index, count);
    adjustMerges(sheet, 'deleteRow', index, count);
    this.pushCommand({
      type: 'deleteRows',
      index,
      count,
      deletedRows,
      deletedFormats,
      deletedHeights,
    });
    this.active.r = Math.min(index, sheet.rows.length - 1);
    this.selectCell(this.active.r, this.active.c);
    this.renderSheet();
    this.notifyChange();
  }

  insertCols(index, count) {
    const sheet = this.sheet;
    this.pushCommand({ type: 'insertCols', index, count });
    for (let i = 0; i < count; i++) {
      sheet.columns.splice(index + i, 0, '新列');
      sheet.colWidths.splice(index + i, 0, this.defaultColWidth);
    }
    sheet.rows.forEach((row, ri) => {
      for (let i = 0; i < count; i++) row.splice(index + i, 0, '');
      sheet.formats[ri].splice(index, 0, ...new Array(count).fill({}));
    });
    adjustMerges(sheet, 'insertCol', index, count);
    this.renderSheet();
    this.notifyChange();
  }

  deleteCols(index, count) {
    const sheet = this.sheet;
    if (sheet.columns.length <= count) return; // 至少保留一列
    this.pushCommand({ type: 'deleteCols', index, count });
    sheet.columns.splice(index, count);
    sheet.colWidths.splice(index, count);
    sheet.rows.forEach((row, ri) => {
      row.splice(index, count);
      sheet.formats[ri].splice(index, count);
    });
    adjustMerges(sheet, 'deleteCol', index, count);
    this.active.c = Math.min(index, sheet.columns.length - 1);
    this.selectCell(this.active.r, this.active.c);
    this.renderSheet();
    this.notifyChange();
  }

  duplicateRow(r) {
    const sheet = this.sheet;
    const copy = [...sheet.rows[r]];
    const fmtCopy = (sheet.formats[r] || []).map((f) => ({ ...f }));
    this.pushCommand({
      type: 'insertRows',
      index: r + 1,
      count: 1,
      oldRows: [new Array(sheet.columns.length).fill('')],
    });
    sheet.rows.splice(r + 1, 0, copy);
    sheet.formats.splice(r + 1, 0, fmtCopy);
    sheet.rowHeights.splice(
      r + 1,
      0,
      sheet.rowHeights[r] || this.defaultRowHeight
    );
    adjustMerges(sheet, 'insertRow', r + 1, 1);
    this.renderSheet();
    this.notifyChange();
  }

  duplicateCol(c) {
    const sheet = this.sheet;
    const colName = sheet.columns[c];
    const width = sheet.colWidths[c];
    this.pushCommand({ type: 'insertCols', index: c + 1, count: 1 });
    sheet.columns.splice(c + 1, 0, colName);
    sheet.colWidths.splice(c + 1, 0, width);
    sheet.rows.forEach((row, ri) => {
      row.splice(c + 1, 0, row[c]);
      sheet.formats[ri].splice(c + 1, 0, { ...(sheet.formats[ri]?.[c] || {}) });
    });
    adjustMerges(sheet, 'insertCol', c + 1, 1);
    this.renderSheet();
    this.notifyChange();
  }

  sortColumn(c, asc) {
    this.pushCommand({
      type: 'sortRows',
      oldRows: this.sheet.rows.map((r) => [...r]),
      oldFormats: this.sheet.formats.map((r) => r.map((f) => ({ ...f }))),
    });
    sortSheetByColumn(this.sheet, c, asc);
    this.renderSheet();
    this.notifyChange();
  }

  // ===================== 鼠标事件 =====================

  onGridMouseDown(e) {
    if (e.button !== 0) return;
    const cell = e.target.closest('.wa-spreadsheet-cell');
    const resize = e.target.closest('.wa-spreadsheet-resize-handle');
    if (resize) return; // resize handle 单独处理

    if (cell) {
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      if (e.shiftKey) {
        this.selection.r2 = r;
        this.selection.c2 = c;
        this.renderSelection();
      } else {
        this.isSelecting = true;
        this.selectCell(r, c);
      }
    }
  }

  onGridMouseMove(e) {
    if (!this.isSelecting) return;
    const cell = e.target.closest('.wa-spreadsheet-cell');
    if (!cell) return;
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    this.selection.r2 = r;
    this.selection.c2 = c;
    this.renderSelection();
  }

  onGridMouseUp() {
    this.isSelecting = false;
  }

  onGridDblClick(e) {
    const cell = e.target.closest('.wa-spreadsheet-cell');
    if (!cell) return;
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    this.startEdit(r, c);
  }

  onColHeaderMouseDown(e) {
    if (e.button !== 0) return;
    const resize = e.target.closest('.wa-spreadsheet-resize-handle');
    if (resize) {
      this.startResize(e, 'col', parseInt(resize.dataset.index, 10));
      return;
    }
    const header = e.target.closest('.wa-spreadsheet-col-header');
    if (!header) return;
    const c = parseInt(header.dataset.col, 10);
    if (e.shiftKey) {
      this.selection.c2 = c;
      this.selection.r2 = this.sheet.rows.length - 1;
      this.renderSelection();
    } else {
      this.selectColumn(c);
      this.isSelecting = true;
    }
  }

  onRowHeaderMouseDown(e) {
    if (e.button !== 0) return;
    const resize = e.target.closest('.wa-spreadsheet-resize-handle');
    if (resize) {
      this.startResize(e, 'row', parseInt(resize.dataset.index, 10));
      return;
    }
    const header = e.target.closest('.wa-spreadsheet-row-header');
    if (!header) return;
    const r = parseInt(header.dataset.row, 10);
    if (e.shiftKey) {
      this.selection.r2 = r;
      this.selection.c2 = this.sheet.columns.length - 1;
      this.renderSelection();
    } else {
      this.selectRow(r);
      this.isSelecting = true;
    }
  }

  onGridContextMenu(e) {
    e.preventDefault();
    const cell = e.target.closest('.wa-spreadsheet-cell');
    const colHeader = e.target.closest('.wa-spreadsheet-col-header');
    const rowHeader = e.target.closest('.wa-spreadsheet-row-header');

    let menuType = 'cell';
    let index = -1;
    if (colHeader) {
      menuType = 'col';
      index = parseInt(colHeader.dataset.col, 10);
    } else if (rowHeader) {
      menuType = 'row';
      index = parseInt(rowHeader.dataset.row, 10);
    } else if (cell) {
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      this.selectCell(r, c);
    }

    this.openContextMenu(e.clientX, e.clientY, menuType, index);
  }

  // ===================== 调整列宽/行高 =====================

  startResize(e, type, index) {
    e.preventDefault();
    e.stopPropagation();
    const sheet = this.sheet;
    const startPos = type === 'col' ? e.clientX : e.clientY;
    const startSize =
      type === 'col'
        ? sheet.colWidths[index] || this.defaultColWidth
        : sheet.rowHeights[index] || this.defaultRowHeight;

    this.resizeState = { type, index, startPos, startSize };

    this._handlers.resizeMove = (ev) => this.onResizeMove(ev);
    this._handlers.resizeUp = (ev) => this.onResizeUp(ev);
    document.addEventListener('mousemove', this._handlers.resizeMove);
    document.addEventListener('mouseup', this._handlers.resizeUp);
  }

  onResizeMove(e) {
    if (!this.resizeState) return;
    const { type, index, startPos, startSize } = this.resizeState;
    const delta = (type === 'col' ? e.clientX : e.clientY) - startPos;
    const newSize = Math.max(type === 'col' ? 40 : 20, startSize + delta);
    if (type === 'col') {
      this.sheet.colWidths[index] = newSize;
      this.renderColHeaders();
      this.renderGrid();
    } else {
      this.sheet.rowHeights[index] = newSize;
      this.renderRowHeaders();
      this.renderGrid();
    }
    this.renderSelection();
  }

  onResizeUp() {
    this.resizeState = null;
    document.removeEventListener('mousemove', this._handlers.resizeMove);
    document.removeEventListener('mouseup', this._handlers.resizeUp);
    this.notifyChange();
  }

  // ===================== 右键菜单 =====================

  openContextMenu(x, y, type, index) {
    this.closeContextMenu();
    const items = this.buildContextMenuItems(type, index);
    const menu = document.createElement('div');
    menu.className = 'wa-spreadsheet-context-menu';
    menu.innerHTML = items
      .map(
        (it) => `
      <button type="button" class="wa-spreadsheet-context-menu-item ${it.danger ? 'danger' : ''}" data-cmd="${it.cmd}" ${it.disabled ? 'disabled' : ''}>
        <i class="fa-solid ${it.icon}"></i><span>${it.label}</span>
      </button>
    `
      )
      .join('');

    document.body.appendChild(menu);
    this.contextMenu = menu;

    const rect = menu.getBoundingClientRect();
    let top = y;
    let left = x;
    if (top + rect.height > window.innerHeight)
      top = window.innerHeight - rect.height - 8;
    if (left + rect.width > window.innerWidth)
      left = window.innerWidth - rect.width - 8;
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-cmd]');
      if (!item || item.disabled) return;
      e.stopPropagation();
      this.execContextCommand(item.dataset.cmd, type, index);
      this.closeContextMenu();
    });

    setTimeout(() => {
      this._handlers.docClickForMenu = (ev) => {
        if (!menu.contains(ev.target)) this.closeContextMenu();
      };
      document.addEventListener(
        'mousedown',
        this._handlers.docClickForMenu,
        true
      );
    }, 0);
  }

  closeContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
    if (this._handlers.docClickForMenu) {
      document.removeEventListener(
        'mousedown',
        this._handlers.docClickForMenu,
        true
      );
      this._handlers.docClickForMenu = null;
    }
  }

  buildContextMenuItems(type) {
    const sheet = this.sheet;
    if (type === 'row') {
      return [
        { cmd: 'insert-row-above', icon: 'fa-arrow-up', label: '上方插入行' },
        { cmd: 'insert-row-below', icon: 'fa-arrow-down', label: '下方插入行' },
        { cmd: 'dup-row', icon: 'fa-copy', label: '复制此行' },
        {
          cmd: 'delete-row',
          icon: 'fa-trash',
          label: '删除此行',
          danger: true,
          disabled: sheet.rows.length <= 1,
        },
        { cmd: 'sort-asc', icon: 'fa-sort-up', label: '按此列升序' },
        { cmd: 'sort-desc', icon: 'fa-sort-down', label: '按此列降序' },
      ];
    }
    if (type === 'col') {
      return [
        { cmd: 'insert-col-left', icon: 'fa-arrow-left', label: '左侧插入列' },
        {
          cmd: 'insert-col-right',
          icon: 'fa-arrow-right',
          label: '右侧插入列',
        },
        { cmd: 'dup-col', icon: 'fa-copy', label: '复制此列' },
        {
          cmd: 'delete-col',
          icon: 'fa-trash',
          label: '删除此列',
          danger: true,
          disabled: sheet.columns.length <= 1,
        },
        { cmd: 'sort-asc', icon: 'fa-sort-up', label: '按此列升序' },
        { cmd: 'sort-desc', icon: 'fa-sort-down', label: '按此列降序' },
      ];
    }
    return [
      { cmd: 'cut', icon: 'fa-scissors', label: '剪切' },
      { cmd: 'copy', icon: 'fa-copy', label: '复制' },
      { cmd: 'paste', icon: 'fa-paste', label: '粘贴' },
      { cmd: 'clear', icon: 'fa-eraser', label: '清除内容' },
      { cmd: 'mergeCells', icon: 'fa-object-group', label: '合并单元格' },
    ];
  }

  execContextCommand(cmd, type, index) {
    switch (cmd) {
      case 'insert-row-above':
        this.insertRows(index, 1);
        break;
      case 'insert-row-below':
        this.insertRows(index + 1, 1);
        break;
      case 'dup-row':
        this.duplicateRow(index);
        break;
      case 'delete-row':
        this.deleteRows(index, 1);
        break;
      case 'insert-col-left':
        this.insertCols(index, 1);
        break;
      case 'insert-col-right':
        this.insertCols(index + 1, 1);
        break;
      case 'dup-col':
        this.duplicateCol(index);
        break;
      case 'delete-col':
        this.deleteCols(index, 1);
        break;
      case 'sort-asc':
        this.sortColumn(index, true);
        break;
      case 'sort-desc':
        this.sortColumn(index, false);
        break;
      case 'cut':
        this.cut();
        break;
      case 'copy':
        this.copy();
        break;
      case 'paste':
        this.paste();
        break;
      case 'clear':
        this.clearSelectionValues();
        break;
      case 'mergeCells':
        this.toggleMergeCells();
        break;
    }
  }

  // ===================== 键盘事件 =====================

  onKeyDown(e) {
    if (this.isEditing) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.commitEdit();
        this.moveActive(1, 0);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.commitEdit();
        this.moveActive(0, e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelEdit();
      }
      return;
    }

    // 公式栏聚焦时，方向键不应导航单元格
    if (document.activeElement === this.els.formulaInput) return;

    const { r, c } = this.active;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (e.shiftKey) {
        this.selection.r2 = Math.max(
          0,
          Math.min(this.selection.r2 + dr, this.sheet.rows.length - 1)
        );
        this.selection.c2 = Math.max(
          0,
          Math.min(this.selection.c2 + dc, this.sheet.columns.length - 1)
        );
        this.renderSelection();
      } else {
        this.moveActive(dr, dc);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.startEdit(r, c);
    } else if (e.key === 'F2') {
      e.preventDefault();
      this.startEdit(r, c);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.clearSelectionValues();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      this.copy();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      this.paste();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      this.cut();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this.redo();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // 直接输入开始编辑
      this.startEdit(r, c, e.key);
    }
  }

  onEditBoxKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.commitEdit();
      this.moveActive(1, 0);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.commitEdit();
      this.moveActive(0, e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.cancelEdit();
    }
  }

  onFormulaKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.commitEdit();
      this.moveActive(1, 0);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.cancelEdit();
    }
  }

  moveActive(dr, dc) {
    const { r, c } = this.active;
    const newR = Math.max(0, Math.min(r + dr, this.sheet.rows.length - 1));
    const newC = Math.max(0, Math.min(c + dc, this.sheet.columns.length - 1));
    this.selectCell(newR, newC);
  }

  onGridScroll() {
    // 可选：同步固定行列头滚动，当前使用 sticky/overflow 方案，无需额外处理
  }

  // ===================== 复制/粘贴 =====================

  clearSelectionValues() {
    const range = this.getSelectedRange();
    const oldValues = getRangeValuesSnapshot(this.sheet, range);
    for (let r = range.r1; r <= range.r2; r++) {
      for (let c = range.c1; c <= range.c2; c++) {
        if (this.sheet.rows[r]) this.sheet.rows[r][c] = '';
      }
    }
    this.pushCommand({
      type: 'setValue',
      range,
      oldValues,
      newValues: getRangeValuesSnapshot(this.sheet, range),
    });
    this.refreshRange(range);
    this.notifyChange();
  }

  copy() {
    const values = getRangeValues(this.sheet, this.getSelectedRange());
    const tsv = values
      .map((row) => row.map((v) => String(v).replace(/\t/g, ' ')).join('\t'))
      .join('\n');
    this.clipboard = { values };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).catch(() => {});
    }
  }

  cut() {
    this.copy();
    this.clearSelectionValues();
  }

  async paste() {
    let tsv = '';
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        tsv = await navigator.clipboard.readText();
      }
    } catch {
      // ignore
    }
    if (!tsv && this.clipboard) {
      this.pasteValues(this.clipboard.values);
      return;
    }
    if (!tsv) return;
    const values = tsv.split('\n').map((line) => line.split('\t'));
    this.pasteValues(values);
  }

  pasteValues(values) {
    if (!Array.isArray(values) || values.length === 0) return;
    const { r, c } = this.active;
    const range = {
      r1: r,
      c1: c,
      r2: r + values.length - 1,
      c2: c + Math.max(0, ...values.map((row) => row.length - 1)),
    };
    const oldValues = getRangeValuesSnapshot(this.sheet, range);
    setRangeValues(this.sheet, r, c, values);
    this.pushCommand({
      type: 'setValue',
      range,
      oldValues,
      newValues: getRangeValuesSnapshot(this.sheet, range),
    });
    this.renderSheet();
    this.notifyChange();
  }

  // ===================== Undo / Redo =====================

  pushCommand(cmd) {
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.maxUndoSteps) this.undoStack.shift();
    this.redoStack = [];
    this.updateToolbarState();
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    this.applyCommandInverse(cmd);
    this.redoStack.push(cmd);
    this.updateToolbarState();
    this.notifyChange();
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    this.applyCommand(cmd);
    this.undoStack.push(cmd);
    this.updateToolbarState();
    this.notifyChange();
  }

  applyCommand(cmd) {
    switch (cmd.type) {
      case 'setValue':
        setRangeValues(
          this.sheet,
          cmd.range.r1,
          cmd.range.c1,
          this.snapshotToMatrix(cmd.newValues, cmd.range)
        );
        break;
      case 'applyFormat':
        applyFormatSnapshot(this.sheet, cmd.newFormats);
        break;
      case 'insertRows':
        this.sheet.rows.splice(cmd.index, 0, ...cmd.oldRows);
        this.sheet.formats.splice(cmd.index, 0, ...cmd.oldRows.map(() => []));
        this.sheet.rowHeights.splice(
          cmd.index,
          0,
          ...cmd.oldRows.map(() => this.defaultRowHeight)
        );
        adjustMerges(this.sheet, 'insertRow', cmd.index, cmd.count);
        break;
      case 'deleteRows':
        this.sheet.rows.splice(cmd.index, cmd.count);
        this.sheet.formats.splice(cmd.index, cmd.count);
        this.sheet.rowHeights.splice(cmd.index, cmd.count);
        adjustMerges(this.sheet, 'deleteRow', cmd.index, cmd.count);
        break;
      case 'insertCols':
        for (let i = 0; i < cmd.count; i++) {
          this.sheet.columns.splice(cmd.index + i, 0, '新列');
          this.sheet.colWidths.splice(cmd.index + i, 0, this.defaultColWidth);
        }
        this.sheet.rows.forEach((row, ri) => {
          for (let i = 0; i < cmd.count; i++) row.splice(cmd.index + i, 0, '');
          this.sheet.formats[ri].splice(
            cmd.index,
            0,
            ...new Array(cmd.count).fill({})
          );
        });
        adjustMerges(this.sheet, 'insertCol', cmd.index, cmd.count);
        break;
      case 'deleteCols':
        this.sheet.columns.splice(cmd.index, cmd.count);
        this.sheet.colWidths.splice(cmd.index, cmd.count);
        this.sheet.rows.forEach((row, ri) => {
          row.splice(cmd.index, cmd.count);
          this.sheet.formats[ri].splice(cmd.index, cmd.count);
        });
        adjustMerges(this.sheet, 'deleteCol', cmd.index, cmd.count);
        break;
      case 'sortRows':
        this.sheet.rows = cmd.newRows.map((r) => [...r]);
        this.sheet.formats = cmd.newFormats.map((r) =>
          r.map((f) => ({ ...f }))
        );
        break;
    }
    this.renderSheet();
  }

  applyCommandInverse(cmd) {
    switch (cmd.type) {
      case 'setValue':
        applyValuesSnapshot(this.sheet, cmd.oldValues);
        break;
      case 'applyFormat':
        applyFormatSnapshot(this.sheet, cmd.oldFormats);
        break;
      case 'insertRows':
        this.sheet.rows.splice(cmd.index, cmd.count);
        this.sheet.formats.splice(cmd.index, cmd.count);
        this.sheet.rowHeights.splice(cmd.index, cmd.count);
        adjustMerges(this.sheet, 'deleteRow', cmd.index, cmd.count);
        break;
      case 'deleteRows':
        this.sheet.rows.splice(cmd.index, 0, ...cmd.deletedRows);
        this.sheet.formats.splice(cmd.index, 0, ...cmd.deletedFormats);
        this.sheet.rowHeights.splice(cmd.index, 0, ...cmd.deletedHeights);
        adjustMerges(this.sheet, 'insertRow', cmd.index, cmd.count);
        break;
      case 'insertCols':
        this.sheet.columns.splice(cmd.index, cmd.count);
        this.sheet.colWidths.splice(cmd.index, cmd.count);
        this.sheet.rows.forEach((row, ri) => {
          row.splice(cmd.index, cmd.count);
          this.sheet.formats[ri].splice(cmd.index, cmd.count);
        });
        adjustMerges(this.sheet, 'deleteCol', cmd.index, cmd.count);
        break;
      case 'deleteCols':
        // deleteCols 命令未保存被删数据，undo 受限；这里重新插入空白列
        for (let i = 0; i < cmd.count; i++) {
          this.sheet.columns.splice(cmd.index + i, 0, '新列');
          this.sheet.colWidths.splice(cmd.index + i, 0, this.defaultColWidth);
        }
        this.sheet.rows.forEach((row, ri) => {
          for (let i = 0; i < cmd.count; i++) row.splice(cmd.index + i, 0, '');
          this.sheet.formats[ri].splice(
            cmd.index,
            0,
            ...new Array(cmd.count).fill({})
          );
        });
        adjustMerges(this.sheet, 'insertCol', cmd.index, cmd.count);
        break;
      case 'sortRows':
        this.sheet.rows = cmd.oldRows.map((r) => [...r]);
        this.sheet.formats = cmd.oldFormats.map((r) =>
          r.map((f) => ({ ...f }))
        );
        break;
    }
    this.renderSheet();
  }

  snapshotToMatrix(snapshot, range) {
    const matrix = [];
    for (let r = range.r1; r <= range.r2; r++) {
      const row = [];
      for (let c = range.c1; c <= range.c2; c++) {
        const item = snapshot.find((s) => s.r === r && s.c === c);
        row.push(item ? item.value : '');
      }
      matrix.push(row);
    }
    return matrix;
  }

  // ===================== Sheet 管理 =====================

  onSheetBarClick(e) {
    const tab = e.target.closest('.wa-spreadsheet-tab');
    if (tab) {
      this.switchSheet(parseInt(tab.dataset.sheet, 10));
      return;
    }
    if (e.target.closest('.wa-spreadsheet-add-sheet')) {
      this.addSheet();
    }
  }

  onSheetBarContextMenu(e) {
    const tab = e.target.closest('.wa-spreadsheet-tab');
    if (!tab) return;
    e.preventDefault();
    const index = parseInt(tab.dataset.sheet, 10);
    this.openContextMenu(e.clientX, e.clientY, 'sheet', index);
  }

  addSheet() {
    const newSheet = {
      name: `Sheet${this.result.sheets.length + 1}`,
      columns: ['A', 'B', 'C'],
      rows: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
      formats: [
        [{}, {}, {}],
        [{}, {}, {}],
        [{}, {}, {}],
      ],
      colWidths: [
        this.defaultColWidth,
        this.defaultColWidth,
        this.defaultColWidth,
      ],
      rowHeights: [
        this.defaultRowHeight,
        this.defaultRowHeight,
        this.defaultRowHeight,
      ],
      merges: [],
    };
    this.result.sheets.push(newSheet);
    this.switchSheet(this.result.sheets.length - 1);
    this.notifyChange();
  }

  switchSheet(index) {
    if (index < 0 || index >= this.result.sheets.length) return;
    this.result.activeSheetIndex = index;
    syncLegacyMirror(this.result);
    this.active = { r: 0, c: 0 };
    this.selection = { r1: 0, c1: 0, r2: 0, c2: 0 };
    this.undoStack = [];
    this.redoStack = [];
    this.renderSheet();
    this.notifyChange();
  }

  renameSheet(index, newName) {
    const sheet = this.result.sheets[index];
    if (!sheet) return;
    sheet.name = newName || sheet.name;
    this.renderTabs();
    this.notifyChange();
  }

  deleteSheet(index) {
    if (this.result.sheets.length <= 1) return;
    this.result.sheets.splice(index, 1);
    if (this.result.activeSheetIndex >= this.result.sheets.length) {
      this.result.activeSheetIndex = this.result.sheets.length - 1;
    }
    this.switchSheet(this.result.activeSheetIndex);
    this.notifyChange();
  }

  // ===================== 通知外部 =====================

  notifyChange() {
    syncLegacyMirror(this.result);
    this.onChange();
  }

  // ===================== 销毁 =====================

  destroy() {
    this.closeContextMenu();
    const {
      toolbar,
      grid,
      corner,
      colHeaders,
      rowHeaders,
      sheetBar,
      formulaInput,
      editBox,
    } = this.els;
    if (toolbar)
      toolbar.removeEventListener('click', this._handlers.toolbarClick);
    if (toolbar)
      toolbar.removeEventListener('change', this._handlers.toolbarChange);
    if (grid)
      grid.removeEventListener('mousedown', this._handlers.gridMouseDown);
    if (grid)
      grid.removeEventListener('mousemove', this._handlers.gridMouseMove);
    if (corner) corner.removeEventListener('click', this._handlers.cornerClick);
    if (colHeaders)
      colHeaders.removeEventListener(
        'mousedown',
        this._handlers.colHeaderMouseDown
      );
    if (rowHeaders)
      rowHeaders.removeEventListener(
        'mousedown',
        this._handlers.rowHeaderMouseDown
      );
    if (sheetBar)
      sheetBar.removeEventListener('click', this._handlers.sheetBarClick);
    if (sheetBar)
      sheetBar.removeEventListener(
        'contextmenu',
        this._handlers.sheetBarContextMenu
      );
    if (formulaInput)
      formulaInput.removeEventListener('focus', this._handlers.formulaFocus);
    if (formulaInput)
      formulaInput.removeEventListener('input', this._handlers.formulaInput);
    if (formulaInput)
      formulaInput.removeEventListener(
        'keydown',
        this._handlers.formulaKeyDown
      );
    if (editBox)
      editBox.removeEventListener('input', this._handlers.editBoxInput);
    if (editBox)
      editBox.removeEventListener('keydown', this._handlers.editBoxKeyDown);
    if (editBox)
      editBox.removeEventListener('blur', this._handlers.editBoxBlur);
    document.removeEventListener('mouseup', this._handlers.gridMouseUp);
    document.removeEventListener('keydown', this._handlers.keyDown);
    if (this._handlers.resizeMove)
      document.removeEventListener('mousemove', this._handlers.resizeMove);
    if (this._handlers.resizeUp)
      document.removeEventListener('mouseup', this._handlers.resizeUp);
    if (this.container) this.container.innerHTML = '';
  }
}
