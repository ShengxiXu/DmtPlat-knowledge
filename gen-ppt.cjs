const PptxGenJS = require('pptxgenjs');
const pres = new PptxGenJS();

pres.author = 'DmtPlat';
pres.title = '智能工作助手 - 产品介绍';
pres.company = 'DmtPlat AI';
pres.layout = 'LAYOUT_16x9';

const SLIDE_W = 10;
const SLIDE_H = 5.625;
const MARGIN = 0.5;
const CX = MARGIN;
const CW = SLIDE_W - 2 * MARGIN;

const C = {
  p: '3B6CFF',
  s: '7A5CFF',
  a: 'FF5C8A',
  g: '1AAF6C',
  b: 'E0445A',
  dk: '0B1024',
  dk2: '1A2238',
  tx: '111216',
  tx2: '55596A',
  tx3: '8A8F9E',
  wh: 'FFFFFF',
  lt: 'F5F7FF',
};

function addDarkBg(s) {
  s.background = { color: C.dk };
}
function addLightBg(s) {
  s.background = { color: 'F7F7F8' };
}
function card(s, x, y, w, h, fc, lc) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x,
    y,
    w,
    h,
    fill: { color: fc || C.wh },
    line: { color: lc || 'E5E7EB', w: 1 },
    rectRadius: 0.08,
  });
}
function footer(s, n, t) {
  s.addText('DmtPlat · 智能工作助手', {
    x: CX,
    y: SLIDE_H - 0.4,
    w: 4,
    h: 0.25,
    fontSize: 9,
    color: C.tx3,
  });
  s.addText(n + ' / ' + t, {
    x: SLIDE_W - 1.2,
    y: SLIDE_H - 0.4,
    w: 0.7,
    h: 0.25,
    fontSize: 9,
    color: C.tx3,
    align: 'right',
  });
}
function header(s, sec, ttl) {
  s.addText(sec, {
    x: CX,
    y: 0.35,
    w: 3,
    h: 0.25,
    fontSize: 9,
    color: C.tx3,
    charSpacing: 2,
  });
  s.addText(ttl, {
    x: CX,
    y: 0.7,
    w: CW,
    h: 0.6,
    fontSize: 26,
    bold: true,
    fontFace: 'Georgia',
    color: C.tx,
  });
}

const TOTAL = 12;
let n = 0;

// 1: Cover
n++;
let s1 = pres.addSlide();
addDarkBg(s1);
s1.addShape(pres.shapes.RECTANGLE, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: C.dk2 },
});
s1.addShape(pres.shapes.OVAL, {
  x: 1,
  y: -1,
  w: 4,
  h: 4,
  fill: { color: C.p, transparency: 85 },
  line: { color: C.p, transparency: 100 },
});
s1.addShape(pres.shapes.OVAL, {
  x: 6,
  y: 2,
  w: 5,
  h: 5,
  fill: { color: C.s, transparency: 85 },
  line: { color: C.s, transparency: 100 },
});
s1.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 3.5,
  y: 1.4,
  w: 3,
  h: 0.4,
  fill: { color: C.wh, transparency: 85 },
  line: { color: C.wh, transparency: 75, w: 1 },
  rectRadius: 0.2,
});
s1.addText('DmtPlat AI 知识库管理系统', {
  x: 3.5,
  y: 1.45,
  w: 3,
  h: 0.3,
  fontSize: 12,
  color: C.wh,
  align: 'center',
});
s1.addText('智能工作助手', {
  x: 1,
  y: 2.1,
  w: 8,
  h: 1,
  fontSize: 52,
  bold: true,
  fontFace: 'Georgia',
  color: C.wh,
  align: 'center',
  charSpacing: 2,
});
s1.addText('面向企业岗位的 AI 内容创作工作台', {
  x: 2,
  y: 3.3,
  w: 6,
  h: 0.4,
  fontSize: 18,
  color: C.wh,
  align: 'center',
});
s1.addText('产品介绍 · 2026', {
  x: 4,
  y: 4.6,
  w: 2,
  h: 0.3,
  fontSize: 11,
  color: C.wh,
  transparency: 50,
  align: 'center',
});

// 2: Agenda
n++;
let s2 = pres.addSlide();
addLightBg(s2);
header(s2, '目录 CONTENTS', '今天我们将介绍');
const ag = [
  ['01', '产品定位与价值', '解决什么问题，为谁服务', C.p],
  ['02', '核心功能矩阵', '6大岗位 × 9种创作能力', C.s],
  ['03', '亮点功能详解', 'PPT三步生成、双模板系统', C.a],
  ['04', '技术架构与优势', '价值总结', C.g],
];
for (let i = 0; i < ag.length; i++) {
  const it = ag[i];
  const x = CX + (i % 2) * 4.5,
    y = 1.5 + Math.floor(i / 2) * 1.7;
  card(s2, x, y, 4.2, 1.4, C.wh, 'E5E7EB');
  s2.addText(it[0], {
    x: x + 0.3,
    y: y + 0.25,
    w: 0.7,
    h: 0.5,
    fontSize: 32,
    bold: true,
    fontFace: 'Georgia',
    color: it[3],
  });
  s2.addText(it[1], {
    x: x + 1.1,
    y: y + 0.3,
    w: 2.8,
    h: 0.35,
    fontSize: 16,
    bold: true,
    color: C.tx,
  });
  s2.addText(it[2], {
    x: x + 1.1,
    y: y + 0.7,
    w: 2.8,
    h: 0.3,
    fontSize: 11,
    color: C.tx2,
  });
}
footer(s2, n, TOTAL);

// 3: Positioning
n++;
let s3 = pres.addSlide();
addLightBg(s3);
header(s3, '产品定位 POSITIONING', '面向岗位的 AI 内容创作工作台');
s3.addText(
  '基于知识库或大模型能力，快速生成岗位工作所需内容，覆盖方案、话术、PPT、表格、报告等多种业务场景。',
  {
    x: CX,
    y: 1.5,
    w: 4.5,
    h: 1,
    fontSize: 14,
    color: C.tx2,
    lineSpacingMultiple: 1.5,
  }
);
s3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: CX,
  y: 2.8,
  w: 4.5,
  h: 1,
  fill: { color: C.p, transparency: 93 },
  line: { color: C.p, w: 1 },
  rectRadius: 0.08,
});
s3.addText('核心理念', {
  x: CX + 0.2,
  y: 2.9,
  w: 4,
  h: 0.3,
  fontSize: 12,
  bold: true,
  color: C.p,
});
s3.addText(
  '创作模板决定"生成什么内容"，结构模板决定"内容如何呈现"，实现内容与结构彻底解耦。',
  {
    x: CX + 0.2,
    y: 3.2,
    w: 4.1,
    h: 0.5,
    fontSize: 11,
    color: C.tx2,
    lineSpacingMultiple: 1.4,
  }
);
const ft = [
  ['🎯', '精准岗位匹配', '6大岗位定制化'],
  ['📚', '知识库驱动', '私有知识生成'],
  ['🎨', '结构化输出', '专业排版'],
  ['⚡', '高效复用', '模板一键调用'],
];
for (let i = 0; i < ft.length; i++) {
  const f = ft[i];
  const x = 5.2 + (i % 2) * 2.2,
    y = 1.5 + Math.floor(i / 2) * 1.5;
  card(s3, x, y, 2, 1.3, C.wh, 'E5E7EB');
  s3.addText(f[0], { x: x + 0.2, y: y + 0.15, w: 0.5, h: 0.45, fontSize: 22 });
  s3.addText(f[1], {
    x: x + 0.2,
    y: y + 0.65,
    w: 1.6,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: C.tx,
  });
  s3.addText(f[2], {
    x: x + 0.2,
    y: y + 0.95,
    w: 1.6,
    h: 0.25,
    fontSize: 10,
    color: C.tx2,
  });
}
footer(s3, n, TOTAL);

// 4: Pain vs Solution
n++;
let s4 = pres.addSlide();
addLightBg(s4);
header(s4, '痛点与方案', '从"不会写"到"秒级生成专业内容"');
card(s4, CX, 1.4, 4.2, 3.3, 'FEF2F2', 'FECACA');
s4.addShape(pres.shapes.RECTANGLE, {
  x: CX,
  y: 1.4,
  w: 4.2,
  h: 0.06,
  fill: { color: C.b },
});
s4.addText('❌ 传统工作方式', {
  x: CX + 0.3,
  y: 1.6,
  w: 3.6,
  h: 0.35,
  fontSize: 16,
  bold: true,
  color: C.b,
});
const pains = [
  '方案/PPT/报告撰写耗时耗力',
  '新人不熟悉岗位话术和规范',
  '企业知识库沉睡，难以复用',
  '内容格式不统一，质量参差不齐',
  '重复劳动多，产出效率低',
];
for (let i = 0; i < pains.length; i++) {
  s4.addText('• ' + pains[i], {
    x: CX + 0.4,
    y: 2.1 + i * 0.48,
    w: 3.5,
    h: 0.4,
    fontSize: 12,
    color: C.tx2,
  });
}
s4.addShape(pres.shapes.OVAL, {
  x: 4.6,
  y: 2.7,
  w: 0.8,
  h: 0.8,
  fill: { color: 'F7F7F8' },
  line: { color: 'D1D5DB', w: 1 },
});
s4.addText('VS', {
  x: 4.6,
  y: 2.85,
  w: 0.8,
  h: 0.5,
  fontSize: 18,
  bold: true,
  fontFace: 'Georgia',
  color: C.tx3,
  align: 'center',
});
card(s4, 5.5, 1.4, 4.2, 3.3, 'F0FDF4', 'BBF7D0');
s4.addShape(pres.shapes.RECTANGLE, {
  x: 5.5,
  y: 1.4,
  w: 4.2,
  h: 0.06,
  fill: { color: C.g },
});
s4.addText('✅ 智能工作助手', {
  x: 5.8,
  y: 1.6,
  w: 3.6,
  h: 0.35,
  fontSize: 16,
  bold: true,
  color: C.g,
});
const sols = [
  '填写关键信息，AI秒级生成初稿',
  '内置岗位模板，新人快速上手',
  '对接知识库，引用来源可追溯',
  '结构模板保证输出专业统一',
  '模板复用，效率提升10倍+',
];
for (let i = 0; i < sols.length; i++) {
  s4.addText('• ' + sols[i], {
    x: 5.9,
    y: 2.1 + i * 0.48,
    w: 3.5,
    h: 0.4,
    fontSize: 12,
    color: C.tx2,
  });
}
footer(s4, n, TOTAL);

// 5: 6 Roles
n++;
let s5 = pres.addSlide();
addLightBg(s5);
header(s5, '岗位覆盖', '为每个岗位定制专属AI能力');
const roles = [
  [
    '🤝',
    '销售',
    '客户方案、产品话术',
    '59A674',
    ['写作', '表格', 'PPT', '翻译'],
  ],
  [
    '🎧',
    '客服',
    '标准回复、问题解答',
    '6B9B8A',
    ['写作', '转写', '翻译', '表格'],
  ],
  [
    '📢',
    '市场运营',
    '营销文案、行业报告',
    'C4A35A',
    ['写作', '图像', '视频', '报告'],
  ],
  [
    '👥',
    '人力资源',
    '招聘JD、绩效评估',
    '8B5CF6',
    ['写作', '表格', 'PPT', '报告'],
  ],
  [
    '💡',
    '产品经理',
    'PRD文档、功能清单',
    'EC4899',
    ['写作', '表格', 'PPT', '报告'],
  ],
  [
    '🔧',
    '技术支持',
    '技术文档、故障排查',
    '6366F1',
    ['写作', '表格', '报告', '转写'],
  ],
];
for (let i = 0; i < roles.length; i++) {
  const r = roles[i];
  const col = i % 3,
    row = Math.floor(i / 3),
    x = CX + col * 3,
    y = 1.4 + row * 1.85;
  const rc = r[3];
  card(s5, x, y, 2.8, 1.65, C.wh, 'E5E7EB');
  s5.addShape(pres.shapes.OVAL, {
    x: x + 0.2,
    y: y + 0.2,
    w: 0.6,
    h: 0.6,
    fill: { color: rc, transparency: 85 },
    line: { color: rc, transparency: 100 },
  });
  s5.addText(r[0], {
    x: x + 0.2,
    y: y + 0.23,
    w: 0.6,
    h: 0.55,
    fontSize: 20,
    align: 'center',
  });
  s5.addText(r[1], {
    x: x + 0.9,
    y: y + 0.25,
    w: 1.7,
    h: 0.3,
    fontSize: 15,
    bold: true,
    color: C.tx,
  });
  s5.addText(r[2], {
    x: x + 0.9,
    y: y + 0.55,
    w: 1.7,
    h: 0.25,
    fontSize: 10,
    color: C.tx2,
  });
  const abs = r[4];
  for (let ai = 0; ai < abs.length; ai++) {
    const px = x + 0.2 + (ai % 2) * 1.2,
      py = y + 1 + Math.floor(ai / 2) * 0.28;
    s5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: px,
      y: py,
      w: 1.1,
      h: 0.24,
      fill: { color: rc, transparency: 90 },
      line: { color: rc, transparency: 70, w: 0.5 },
      rectRadius: 0.12,
    });
    s5.addText(abs[ai], {
      x: px,
      y: py,
      w: 1.1,
      h: 0.24,
      fontSize: 8,
      color: rc,
      align: 'center',
      valign: 'middle',
    });
  }
}
footer(s5, n, TOTAL);

// 6: 9 Capabilities
n++;
let s6 = pres.addSlide();
addLightBg(s6);
header(s6, '创作能力', '全方位满足内容创作需求');
const caps = [
  ['✍️', '智能写作', '方案、话术、邮件、报告', '支持知识库', C.p],
  ['📊', '表格生成', '对比表、清单表、报价单', '支持知识库', C.p],
  ['🖥️', 'PPT生成', '三步生成完整PPT', '核心亮点', C.a],
  ['📈', '研究报告', '行业研究、市场调研', '仅知识库', C.g],
  ['🌐', '智能翻译', '多语言文本和文档', '自由生成', C.tx3],
  ['🎤', '录音转写', '音频转写+要点提取', '支持附件', C.tx3],
  ['🖼️', '图像生成', '图片、海报、配图', '多模态', C.s],
  ['🎬', '视频生成', '短视频脚本、数字人', '多模态', C.s],
  ['🎵', '音乐生成', '背景音乐素材', '多模态', C.s],
];
for (let i = 0; i < caps.length; i++) {
  const c = caps[i];
  const col = i % 3,
    row = Math.floor(i / 3),
    x = CX + col * 3,
    y = 1.4 + row * 1.2;
  card(s6, x, y, 2.8, 1, C.wh, 'E5E7EB');
  s6.addText(c[0], { x: x + 0.15, y: y + 0.15, w: 0.5, h: 0.4, fontSize: 18 });
  s6.addText(c[1], {
    x: x + 0.7,
    y: y + 0.18,
    w: 1.4,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: C.tx,
  });
  s6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: x + 2.05,
    y: y + 0.2,
    w: 0.6,
    h: 0.2,
    fill: { color: c[4], transparency: 88 },
    line: { color: c[4], transparency: 70, w: 0.5 },
    rectRadius: 0.1,
  });
  s6.addText(c[3], {
    x: x + 2.05,
    y: y + 0.2,
    w: 0.6,
    h: 0.2,
    fontSize: 7,
    color: c[4],
    align: 'center',
    valign: 'middle',
  });
  s6.addText(c[2], {
    x: x + 0.2,
    y: y + 0.6,
    w: 2.4,
    h: 0.3,
    fontSize: 10,
    color: C.tx2,
  });
}
footer(s6, n, TOTAL);

// 7: PPT Highlight
n++;
let s7 = pres.addSlide();
addLightBg(s7);
s7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: CX,
  y: 0.35,
  w: 0.8,
  h: 0.25,
  fill: { color: C.a, transparency: 88 },
  line: { color: C.a, transparency: 70, w: 0.75 },
  rectRadius: 0.12,
});
s7.addText('核心功能', {
  x: CX,
  y: 0.35,
  w: 0.8,
  h: 0.25,
  fontSize: 8,
  bold: true,
  color: C.a,
  align: 'center',
  valign: 'middle',
});
s7.addText('PPT 三步生成流程', {
  x: 1.4,
  y: 0.33,
  w: 3,
  h: 0.3,
  fontSize: 11,
  bold: true,
  color: C.p,
  charSpacing: 1,
});
s7.addText('简单三步，生成专业级PPT', {
  x: CX,
  y: 0.75,
  w: CW,
  h: 0.6,
  fontSize: 28,
  bold: true,
  fontFace: 'Georgia',
  color: C.tx,
});
const psteps = [
  ['1', '主题内容', C.p, ['汇报主题、对象', '核心信息、要点', '表单化填写']],
  ['2', '视觉结构', C.s, ['10套结构模板', '6种主题配色', '实时预览、母版']],
  ['3', '大纲确认', C.a, ['可视化编辑', '增删拖拽排序', '一键生成PPT']],
];
for (let i = 0; i < psteps.length; i++) {
  const st = psteps[i];
  const x = CX + i * 3.1,
    y = 1.7;
  s7.addShape(pres.shapes.OVAL, {
    x: x,
    y: y,
    w: 0.5,
    h: 0.5,
    fill: { color: st[2] },
    line: { color: st[2] },
  });
  s7.addText(st[0], {
    x: x,
    y: y,
    w: 0.5,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: C.wh,
    align: 'center',
    valign: 'middle',
  });
  s7.addText(st[1], {
    x: x + 0.65,
    y: y + 0.08,
    w: 2,
    h: 0.35,
    fontSize: 15,
    bold: true,
    color: st[2],
  });
  if (i < 2)
    s7.addText('→', {
      x: x + 2.7,
      y: y + 0.05,
      w: 0.3,
      h: 0.4,
      fontSize: 20,
      color: C.tx3,
      align: 'center',
    });
  card(s7, x, y + 0.7, 2.85, 1.7, C.wh, 'E5E7EB');
  s7.addShape(pres.shapes.RECTANGLE, {
    x: x,
    y: y + 0.7,
    w: 2.85,
    h: 0.05,
    fill: { color: st[2] },
  });
  const items = st[3];
  for (let ii = 0; ii < items.length; ii++) {
    s7.addText('• ' + items[ii], {
      x: x + 0.2,
      y: y + 0.85 + ii * 0.4,
      w: 2.5,
      h: 0.35,
      fontSize: 11,
      color: C.tx2,
    });
  }
}
footer(s7, n, TOTAL);

// 8: Dual Template
n++;
let s8 = pres.addSlide();
addLightBg(s8);
header(s8, '模板系统', '创作模板 + 结构模板，彻底解耦');
card(s8, CX, 1.4, 4.3, 3.1, C.wh, 'BFDBFE');
s8.addShape(pres.shapes.RECTANGLE, {
  x: CX,
  y: 1.4,
  w: 4.3,
  h: 0.06,
  fill: { color: C.p },
});
s8.addShape(pres.shapes.OVAL, {
  x: CX + 0.25,
  y: 1.65,
  w: 0.5,
  h: 0.5,
  fill: { color: C.p },
});
s8.addText('📝', {
  x: CX + 0.25,
  y: 1.68,
  w: 0.5,
  h: 0.45,
  fontSize: 18,
  align: 'center',
});
s8.addText('创作模板', {
  x: CX + 0.9,
  y: 1.7,
  w: 2,
  h: 0.35,
  fontSize: 18,
  bold: true,
  color: C.tx,
});
s8.addText('"输入信息 → AI生成内容"的任务配置，回答"生成什么内容"', {
  x: CX + 0.25,
  y: 2.3,
  w: 3.8,
  h: 0.5,
  fontSize: 11,
  color: C.tx2,
  lineSpacingMultiple: 1.4,
});
const cpts = [
  '为谁用？（岗位角色）',
  '做什么？（能力类型）',
  '填什么？（输入字段）',
  '怎么生成？（提示词）',
];
for (let i = 0; i < cpts.length; i++) {
  s8.addText('✓ ' + cpts[i], {
    x: CX + 0.3,
    y: 2.85 + i * 0.35,
    w: 3.5,
    h: 0.3,
    fontSize: 11,
    color: C.tx,
  });
}
card(s8, 5.2, 1.4, 4.3, 3.1, C.wh, 'DDD6FE');
s8.addShape(pres.shapes.RECTANGLE, {
  x: 5.2,
  y: 1.4,
  w: 4.3,
  h: 0.06,
  fill: { color: C.s },
});
s8.addShape(pres.shapes.OVAL, {
  x: 5.45,
  y: 1.65,
  w: 0.5,
  h: 0.5,
  fill: { color: C.s },
});
s8.addText('🎨', {
  x: 5.45,
  y: 1.68,
  w: 0.5,
  h: 0.45,
  fontSize: 18,
  align: 'center',
});
s8.addText('结构模板', {
  x: 6.1,
  y: 1.7,
  w: 2,
  h: 0.35,
  fontSize: 18,
  bold: true,
  color: C.tx,
});
s8.addText('固定结构、章节、版式与视觉样式，回答"内容如何呈现"', {
  x: 5.45,
  y: 2.3,
  w: 3.8,
  h: 0.5,
  fontSize: 11,
  color: C.tx2,
  lineSpacingMultiple: 1.4,
});
const spts = [
  '输出长什么样？（视觉风格）',
  '有哪些章节/页面？（结构）',
  '每个位置放什么？（占位符）',
  '用什么视觉风格？（主题）',
];
for (let i = 0; i < spts.length; i++) {
  s8.addText('✓ ' + spts[i], {
    x: 5.5,
    y: 2.85 + i * 0.35,
    w: 3.5,
    h: 0.3,
    fontSize: 11,
    color: C.tx,
  });
}
footer(s8, n, TOTAL);

// 9: User Value
n++;
let s9 = pres.addSlide();
addLightBg(s9);
header(s9, '用户价值', '为用户和企业创造实实在在的价值');
const vals = [
  [
    '用户价值 01',
    '降低认知成本',
    '语义清晰，30秒理解',
    'EEF4FF',
    'BFDBFE',
    C.p,
  ],
  ['用户价值 02', '产出可预期', '提前预览，避免反复', 'F0FDF4', 'BBF7D0', C.g],
  [
    '用户价值 03',
    '内容更专业',
    '完整章节统一视觉',
    'F4EFFF',
    'DDD6FE',
    '8B5CF6',
  ],
  [
    '用户价值 04',
    '提升复用率',
    '模板复用，效率10倍+',
    'FFF0F6',
    'FBCFE8',
    'EC4899',
  ],
  ['企业价值 01', '企业定制', '上传VI母版', 'FFF5EA', 'FED7AA', 'C4A35A'],
  ['企业价值 02', '竞争壁垒', '双重壁垒，提升留存', 'EEF4FF', 'BFDBFE', C.p],
];
for (let i = 0; i < vals.length; i++) {
  const v = vals[i];
  const col = i % 3,
    row = Math.floor(i / 2),
    x = CX + col * 3,
    y = 1.4 + row * 1.8;
  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x,
    y,
    w: 2.85,
    h: 1.6,
    fill: { color: v[3] },
    line: { color: v[4], w: 1 },
    rectRadius: 0.1,
  });
  s9.addText(v[0], {
    x: x + 0.2,
    y: y + 0.15,
    w: 2.4,
    h: 0.25,
    fontSize: 8,
    color: C.tx3,
    charSpacing: 1,
  });
  s9.addText(v[1], {
    x: x + 0.2,
    y: y + 0.45,
    w: 2.4,
    h: 0.4,
    fontSize: 17,
    bold: true,
    fontFace: 'Georgia',
    color: C.tx,
  });
  s9.addText(v[2], {
    x: x + 0.2,
    y: y + 0.9,
    w: 2.4,
    h: 0.5,
    fontSize: 10,
    color: C.tx2,
    lineSpacingMultiple: 1.4,
  });
}
footer(s9, n, TOTAL);

// 10: Tech Stack
n++;
let s10 = pres.addSlide();
addLightBg(s10);
header(s10, '技术架构', '轻量高效，易于扩展');
const tiers = [
  [
    '前端',
    1.4,
    [
      ['Vite', '构建工具'],
      ['JS ES6+', '原生模块'],
      ['CSS3', '主题系统'],
      ['FontAwesome', '图标库'],
    ],
    C.p,
  ],
  [
    '后端',
    2.5,
    [
      ['Express', 'Web框架'],
      ['Multer', '文件上传'],
      ['多格式解析', 'DOCX/XLSX/PDF'],
      ['PptxGenJS', 'PPT生成'],
    ],
    C.s,
  ],
  [
    '存储',
    3.6,
    [
      ['localStorage', '本地存储'],
      ['CORS', '跨域支持'],
      ['JSZip', 'ZIP处理'],
      ['ESLint', '代码规范'],
    ],
    C.a,
  ],
];
for (let t = 0; t < tiers.length; t++) {
  const tier = tiers[t];
  s10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: CX,
    y: tier[1],
    w: 1.2,
    h: 0.7,
    fill: { color: C.lt },
    line: { color: 'D1D5DB', w: 1 },
    rectRadius: 0.08,
  });
  s10.addText(tier[0], {
    x: CX,
    y: tier[1],
    w: 1.2,
    h: 0.7,
    fontSize: 10,
    bold: true,
    color: C.tx2,
    align: 'center',
    valign: 'middle',
  });
  const cells = tier[2];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const x = 1.8 + i * 2;
    card(s10, x, tier[1], 1.85, 0.7, C.wh, 'D1D5DB');
    s10.addText(c[0], {
      x: x + 0.1,
      y: tier[1] + 0.15,
      w: 1.65,
      h: 0.25,
      fontSize: 11,
      bold: true,
      color: C.tx,
    });
    s10.addText(c[1], {
      x: x + 0.1,
      y: tier[1] + 0.4,
      w: 1.65,
      h: 0.2,
      fontSize: 9,
      color: C.tx3,
    });
  }
}
footer(s10, n, TOTAL);

// 11: Summary
n++;
let s11 = pres.addSlide();
addLightBg(s11);
s11.addText('一句话总结', {
  x: 4,
  y: 0.6,
  w: 2,
  h: 0.3,
  fontSize: 11,
  bold: true,
  color: C.p,
  align: 'center',
  charSpacing: 1,
});
s11.addText('可预期、可复用、可定制的\n企业级内容生成引擎', {
  x: 1,
  y: 1,
  w: 8,
  h: 1.2,
  fontSize: 30,
  bold: true,
  fontFace: 'Georgia',
  color: C.tx,
  align: 'center',
  lineSpacingMultiple: 1.3,
});
const kpis = [
  ['6', '大岗位角色', C.p],
  ['9', '种创作能力', C.s],
  ['10+', '套PPT模板', C.a],
  ['11', '个业务场景', C.g],
];
for (let i = 0; i < kpis.length; i++) {
  const k = kpis[i];
  const x = CX + i * 2.28;
  s11.addText(k[0], {
    x,
    y: 2.6,
    w: 2.1,
    h: 0.8,
    fontSize: 44,
    bold: true,
    fontFace: 'Georgia',
    color: k[2],
    align: 'center',
  });
  s11.addText(k[1], {
    x,
    y: 3.5,
    w: 2.1,
    h: 0.3,
    fontSize: 13,
    color: C.tx2,
    align: 'center',
  });
}
s11.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 1.5,
  y: 4.2,
  w: 7,
  h: 0.7,
  fill: { color: C.p, transparency: 95 },
  line: { color: C.p, transparency: 80, w: 1 },
  rectRadius: 0.1,
});
s11.addText(
  '将"模板"拆分为"创作模板"和"结构模板"，让智能工作助手从"任务配置"升级为企业级内容生成引擎',
  {
    x: 1.7,
    y: 4.25,
    w: 6.6,
    h: 0.6,
    fontSize: 12,
    color: C.tx,
    align: 'center',
    valign: 'middle',
    lineSpacingMultiple: 1.4,
  }
);
footer(s11, n, TOTAL);

// 12: Thank You
n++;
let s12 = pres.addSlide();
addDarkBg(s12);
s12.addShape(pres.shapes.RECTANGLE, {
  x: 0,
  y: 0,
  w: SLIDE_W,
  h: SLIDE_H,
  fill: { color: C.dk2 },
});
s12.addShape(pres.shapes.OVAL, {
  x: 1,
  y: -1,
  w: 4,
  h: 4,
  fill: { color: C.p, transparency: 85 },
  line: { color: C.p, transparency: 100 },
});
s12.addShape(pres.shapes.OVAL, {
  x: 6,
  y: 2,
  w: 5,
  h: 5,
  fill: { color: C.s, transparency: 85 },
  line: { color: C.s, transparency: 100 },
});
s12.addText('谢谢聆听', {
  x: 1,
  y: 1.8,
  w: 8,
  h: 1.1,
  fontSize: 52,
  bold: true,
  fontFace: 'Georgia',
  color: C.wh,
  align: 'center',
  charSpacing: 3,
});
s12.addText('智能工作助手 · 让AI成为每个人的工作伙伴', {
  x: 2,
  y: 3.2,
  w: 6,
  h: 0.4,
  fontSize: 15,
  color: C.wh,
  transparency: 25,
  align: 'center',
});

pres
  .writeFile({ fileName: '智能工作助手产品介绍.pptx' })
  .then(() => console.log('PPT generated successfully!'))
  .catch((e) => console.error('Error:', e));
