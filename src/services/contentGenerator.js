// 流式内容生成服务
// 统一接口：generate() 返回异步迭代器，产出 thinking / chunk / done 三类事件
// 先内置 MockGenerator（包装 mockGenerateContent），预留 RemoteGenerator 槽位
import { mockGenerateContent } from '../data/workAssistantData.js';

function buildThinkingSteps(template, selectedKBs) {
  const tplName = template?.name || '智能匹配模板';
  const hasKb = selectedKBs && selectedKBs.length > 0;
  if (hasKb) {
    const kbNames = selectedKBs.map((k) => k.name).join('、');
    return [`匹配模板：${tplName}`, `检索知识库：${kbNames}`, '提取相关资料', '基于字段信息生成内容'];
  }
  return [`匹配模板：${tplName}`, '解析字段信息', '规划内容结构', '生成结构化内容'];
}

function chunkText(text, size = 3) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

function resultToStreamText(result, template, selectedKBs) {
  const kbNames = selectedKBs && selectedKBs.length > 0
    ? selectedKBs.map((k) => k.name).join('、')
    : '';
  const kbNote = kbNames
    ? `<p class="wa-chat-kb-note"><i class="fa-solid fa-book"></i> 已参考《${kbNames}》中的相关资料</p>`
    : '';

  // 文本类型直接取 content
  if (result.content) {
    return kbNote + result.content;
  }
  // 表格类型转 HTML
  if (result.columns && result.rows) {
    const thead = `<tr>${result.columns.map((c) => `<th>${c}</th>`).join('')}</tr>`;
    const tbody = result.rows.map((r) => `<tr>${result.columns.map((c) => `<td>${r[c] || ''}</td>`).join('')}</tr>`).join('');
    return `${kbNote}<table class="wa-chat-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  }
  // 其他类型降级为字符串
  return kbNote + (typeof result === 'string' ? result : JSON.stringify(result, null, 2));
}

/**
 * 流式生成（Mock 实现）
 * @param {Object} template - 场景模板对象
 * @param {Object} formData - 字段值
 * @param {string} mode - 生成模式（free/strict/...）
 * @param {Array} selectedKBs - 关联知识库数组
 * @param {Object} options - 其他选项
 * @returns {AsyncGenerator} 产出 { type, step?/text?/result? }
 */
export async function* generate(template, formData, mode = 'free', selectedKBs = [], options = {}) {
  // 阶段 1：思考步骤
  const steps = buildThinkingSteps(template, selectedKBs);
  for (const step of steps) {
    await delay(550);
    yield { type: 'thinking', step };
    await delay(150);
    yield { type: 'thinking_done', step };
  }

  await delay(300);

  // 阶段 2：生成结果（调用 mockGenerateContent）
  const result = mockGenerateContent(template, formData, mode, selectedKBs, options);
  yield { type: 'result_meta', result, template, selectedKBs };

  // 阶段 3：流式输出文本
  const fullText = resultToStreamText(result, template, selectedKBs);
  const chunks = chunkText(fullText, 4);
  for (const chunk of chunks) {
    await delay(18);
    yield { type: 'chunk', text: chunk };
  }

  // 阶段 4：完成
  yield { type: 'done', result, template, selectedKBs };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 预留：RemoteGenerator（未来接入真实 LLM 接口）
// export async function* generateRemote(template, formData, mode, selectedKBs, options) {
//   const res = await fetch('/api/generate', { method: 'POST', body: JSON.stringify({...}) });
//   const reader = res.body.getReader();
//   const decoder = new TextDecoder();
//   while (true) {
//     const { done, value } = await reader.read();
//     if (done) break;
//     const text = decoder.decode(value);
//     // 解析 SSE 并 yield 事件
//   }
// }
