// 纯函数：渲染场景/内容模板的字段输入控件
// 从 WorkAssistant.renderField() 抽出，供 FieldModal 和 WorkAssistant 共用
export function renderFieldInput(field, value = '') {
  const val = value || '';
  const required = field.required ? '<span class="wa-fm-req">*</span>' : '';

  let input = '';
  switch (field.type) {
    case 'textarea':
      input = `<textarea class="wa-fm-input" id="wa-fm-field-${field.id}" rows="${field.rows || 3}" placeholder="${field.placeholder || ''}" data-field-id="${field.id}" data-required="${!!field.required}">${escapeHtml(val)}</textarea>`;
      break;
    case 'select':
      input = `
        <select class="wa-fm-input wa-fm-select" id="wa-fm-field-${field.id}" data-field-id="${field.id}" data-required="${!!field.required}">
          <option value="">请选择</option>
          ${field.options.map((opt) => `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>`).join('')}
        </select>
      `;
      break;
    case 'multi_select':
      input = `
        <div class="wa-fm-multiselect" data-field-id="${field.id}" data-required="${!!field.required}">
          ${field.options.map((opt) => `
            <label class="wa-fm-check">
              <input type="checkbox" value="${opt}" ${(val || []).includes(opt) ? 'checked' : ''}>
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      `;
      break;
    case 'number':
      input = `<input type="number" class="wa-fm-input" id="wa-fm-field-${field.id}" value="${escapeHtml(val)}" placeholder="${field.placeholder || ''}" data-field-id="${field.id}" data-required="${!!field.required}">`;
      break;
    case 'date':
      input = `<input type="date" class="wa-fm-input" id="wa-fm-field-${field.id}" value="${escapeHtml(val)}" placeholder="${field.placeholder || ''}" data-field-id="${field.id}" data-required="${!!field.required}">`;
      break;
    default:
      input = `<input type="text" class="wa-fm-input" id="wa-fm-field-${field.id}" value="${escapeHtml(val)}" placeholder="${field.placeholder || ''}" data-field-id="${field.id}" data-required="${!!field.required}">`;
  }

  return `
    <div class="wa-fm-group">
      <label class="wa-fm-label">${field.label}${required}</label>
      ${input}
      <div class="wa-fm-error" id="wa-fm-error-${field.id}">此字段为必填</div>
    </div>
  `;
}

export function collectFieldValues(fields, container) {
  const data = {};
  fields.forEach((f) => {
    const el = container.querySelector(`[data-field-id="${f.id}"]`);
    if (!el) { data[f.id] = ''; return; }
    if (f.type === 'multi_select') {
      const checked = container.querySelectorAll(`[data-field-id="${f.id}"] input:checked`);
      data[f.id] = Array.from(checked).map((c) => c.value);
    } else {
      data[f.id] = el.value || '';
    }
  });
  return data;
}

export function validateFields(fields, data) {
  const errors = {};
  fields.forEach((f) => {
    if (f.required) {
      const v = data[f.id];
      const empty = Array.isArray(v) ? v.length === 0 : !v || !String(v).trim();
      if (empty) errors[f.id] = '此字段为必填';
    }
  });
  return errors;
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
