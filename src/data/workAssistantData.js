import { generateId } from '../utils/helpers.js';

// 字段类型定义
export const fieldTypes = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  NUMBER: 'number',
  DATE: 'date',
  FILE: 'file',
};

// 内容输出形式
export const outputTypes = {
  TEXT: 'text',
  MARKDOWN: 'markdown',
  TABLE: 'table',
  LIST: 'list',
  EMAIL: 'email',
  PPT: 'ppt',
  QA: 'qa',
  STEPS: 'steps',
  REPORT: 'report',
  VIDEO: 'video',
  MUSIC: 'music',
};

// PPT 视觉主题定义
export const pptThemes = {
  business: {
    id: 'business',
    label: '商务正式',
    fontFamily: '"Times New Roman", "Songti SC", serif',
    coverBg: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    contentBg: '#ffffff',
    textColor: '#ffffff',
    contentTextColor: '#1f2937',
    accentColor: '#2d5a87',
  },
  tech: {
    id: 'tech',
    label: '科技现代',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    coverBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    contentBg: '#0f172a',
    textColor: '#ffffff',
    contentTextColor: '#e2e8f0',
    accentColor: '#38bdf8',
  },
  minimal: {
    id: 'minimal',
    label: '简约清新',
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
    coverBg: '#ffffff',
    contentBg: '#ffffff',
    textColor: '#1f2937',
    contentTextColor: '#374151',
    accentColor: '#10b981',
  },
  lively: {
    id: 'lively',
    label: '活泼生动',
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    coverBg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
    contentBg: '#fff7ed',
    textColor: '#ffffff',
    contentTextColor: '#7c2d12',
    accentColor: '#f97316',
  },
  academic: {
    id: 'academic',
    label: '学术严谨',
    fontFamily: 'Georgia, "Times New Roman", serif',
    coverBg: '#fafaf9',
    contentBg: '#fafaf9',
    textColor: '#44403c',
    contentTextColor: '#57534e',
    accentColor: '#78716c',
  },
  dark: {
    id: 'dark',
    label: '高端深色',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    coverBg: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
    contentBg: '#18181b',
    textColor: '#e4e4e7',
    contentTextColor: '#d4d4d8',
    accentColor: '#a1a1aa',
  },
};

// PPT 配色方案定义
export const pptColors = {
  green: { id: 'green', label: '品牌绿', primary: '#10b981', secondary: '#059669' },
  blue: { id: 'blue', label: '商务蓝', primary: '#2563eb', secondary: '#1d4ed8' },
  black: { id: 'black', label: '科技黑', primary: '#111827', secondary: '#374151' },
  orange: { id: 'orange', label: '活力橙', primary: '#f97316', secondary: '#ea580c' },
  gray: { id: 'gray', label: '高级灰', primary: '#6b7280', secondary: '#4b5563' },
  purple: { id: 'purple', label: '品质紫', primary: '#8b5cf6', secondary: '#7c3aed' },
};

// PPT 生成配置项定义
export const pptConfigDefinitions = {
  // 视觉表现
  theme: {
    id: 'theme',
    group: 'visual',
    label: '视觉主题',
    type: 'select',
    options: Object.values(pptThemes).map((t) => ({ value: t.id, label: t.label })),
    defaultValue: 'business',
  },
  color: {
    id: 'color',
    group: 'visual',
    label: '配色方案',
    type: 'select',
    options: Object.values(pptColors).map((c) => ({ value: c.id, label: c.label })),
    defaultValue: 'green',
  },
  ratio: {
    id: 'ratio',
    group: 'visual',
    label: '页面比例',
    type: 'select',
    options: [
      { value: '16:9', label: '16:9 宽屏' },
      { value: '4:3', label: '4:3 标准' },
      { value: '9:16', label: '9:16 竖版' },
    ],
    defaultValue: '16:9',
  },
  background: {
    id: 'background',
    group: 'visual',
    label: '背景风格',
    type: 'select',
    options: [
      { value: 'solid', label: '纯色' },
      { value: 'gradient', label: '渐变' },
      { value: 'graphic', label: '简约图形' },
      { value: 'white', label: '留白' },
      { value: 'texture', label: '暗色质感' },
    ],
    defaultValue: 'solid',
  },
  // 内容结构
  pageCount: {
    id: 'pageCount',
    group: 'structure',
    label: '预计页数',
    type: 'select',
    options: ['5', '8', '10', '15', '20'].map((v) => ({ value: v, label: `${v}页` })),
    defaultValue: '8',
  },
  density: {
    id: 'density',
    group: 'structure',
    label: '内容密度',
    type: 'select',
    options: [
      { value: 'simple', label: '简洁（每页1-2点）' },
      { value: 'standard', label: '标准（每页3-4点）' },
      { value: 'detailed', label: '详细（每页5-6点）' },
    ],
    defaultValue: 'standard',
  },
  structure: {
    id: 'structure',
    group: 'structure',
    label: '逻辑结构',
    type: 'select',
    options: [
      { value: 'total-part-total', label: '总-分-总' },
      { value: 'problem-solution', label: '问题-方案' },
      { value: 'timeline', label: '时间线' },
      { value: 'compare', label: '对比分析' },
      { value: 'story', label: '故事线' },
    ],
    defaultValue: 'total-part-total',
  },
  // 输出形式
  notes: {
    id: 'notes',
    group: 'output',
    label: '演讲备注',
    type: 'select',
    options: [
      { value: 'none', label: '不生成' },
      { value: 'brief', label: '简略' },
      { value: 'detailed', label: '详细' },
    ],
    defaultValue: 'detailed',
  },
  imageSuggestion: {
    id: 'imageSuggestion',
    group: 'output',
    label: '配图建议',
    type: 'select',
    options: [
      { value: 'none', label: '不生成' },
      { value: 'each', label: '每页1张' },
      { value: 'key', label: '关键页配图' },
    ],
    defaultValue: 'each',
  },
  exportFormat: {
    id: 'exportFormat',
    group: 'output',
    label: '导出格式',
    type: 'select',
    options: [
      { value: 'pptx', label: 'PPTX' },
      { value: 'pdf', label: 'PDF' },
      { value: 'outline', label: '仅大纲' },
    ],
    defaultValue: 'pptx',
  },
  // 品牌信息
  company: {
    id: 'company',
    group: 'brand',
    label: '公司名称',
    type: 'text',
    defaultValue: '',
  },
  presenter: {
    id: 'presenter',
    group: 'brand',
    label: '汇报人',
    type: 'text',
    defaultValue: '',
  },
  // 高级设置
  decorations: {
    id: 'decorations',
    group: 'advanced',
    label: '页面装饰',
    type: 'multi_select',
    options: [
      { value: 'underline', label: '标题下划线' },
      { value: 'leftbar', label: '左侧色块' },
      { value: 'pagenumber', label: '页码' },
      { value: 'chapter', label: '章节标识' },
    ],
    defaultValue: ['underline', 'leftbar', 'pagenumber'],
  },
  font: {
    id: 'font',
    group: 'advanced',
    label: '字体风格',
    type: 'select',
    options: [
      { value: 'sans', label: '无衬线（现代）' },
      { value: 'serif', label: '衬线（正式）' },
      { value: 'handwriting', label: '手写体（活泼）' },
    ],
    defaultValue: 'sans',
  },
  tone: {
    id: 'tone',
    group: 'advanced',
    label: '语言风格',
    type: 'select',
    options: [
      { value: 'formal', label: '正式' },
      { value: 'natural', label: '自然' },
      { value: 'passionate', label: '激情' },
      { value: 'data', label: '数据驱动' },
    ],
    defaultValue: 'formal',
  },
};

// ==================== 结构模板定义（新增） ====================
// 结构模板定义生成结果的固定结构、章节、页面版式与视觉样式，
// 可被多个创作模板复用。

export const structureTemplateTypes = {
  COVER: 'cover',
  TOC: 'toc',
  CONTENT: 'content',
  END: 'end',
  SECTION: 'section',
  CHAPTER: 'chapter',
};

export const contentStructureTemplates = [
  {
    id: 'business_8pages',
    name: '商务正式 8 页 PPT',
    description: '适用于客户汇报、商务提案的正式风格，包含封面、目录、5 页内容、结尾。',
    outputType: outputTypes.PPT,
    isSystem: true,
    style: {
      theme: 'business',
      color: 'green',
      ratio: '16:9',
      font: 'serif',
      background: 'gradient',
    },
    structure: [
      { type: 'cover', title: '封面', layout: 'center-title', placeholders: ['topic', 'audience', 'presenter'] },
      { type: 'toc', title: '目录', layout: 'left-title-right-nav', placeholders: ['sections'] },
      { type: 'content', title: '内容页', count: 5, layout: 'title-bullets', placeholders: ['title', 'bullets', 'visual'] },
      { type: 'end', title: '结尾', layout: 'center-message', placeholders: ['summary', 'nextSteps'] },
    ],
  },
  {
    id: 'tech_8pages',
    name: '科技现代 8 页 PPT',
    description: '适用于产品汇报、技术分享的现代科技风格，深色背景、蓝色强调。',
    outputType: outputTypes.PPT,
    isSystem: true,
    style: {
      theme: 'tech',
      color: 'blue',
      ratio: '16:9',
      font: 'sans',
      background: 'gradient',
    },
    structure: [
      { type: 'cover', title: '封面', layout: 'center-title', placeholders: ['topic', 'audience', 'presenter'] },
      { type: 'toc', title: '目录', layout: 'left-title-right-nav', placeholders: ['sections'] },
      { type: 'content', title: '内容页', count: 5, layout: 'title-bullets', placeholders: ['title', 'bullets', 'visual'] },
      { type: 'end', title: '结尾', layout: 'center-message', placeholders: ['summary', 'nextSteps'] },
    ],
  },
  {
    id: 'minimal_8pages',
    name: '简约清新 8 页 PPT',
    description: '适用于内部汇报、轻量化提案的清新风格，留白充分、绿色强调。',
    outputType: outputTypes.PPT,
    isSystem: true,
    style: {
      theme: 'minimal',
      color: 'green',
      ratio: '16:9',
      font: 'sans',
      background: 'white',
    },
    structure: [
      { type: 'cover', title: '封面', layout: 'center-title', placeholders: ['topic', 'audience', 'presenter'] },
      { type: 'toc', title: '目录', layout: 'left-title-right-nav', placeholders: ['sections'] },
      { type: 'content', title: '内容页', count: 5, layout: 'title-bullets', placeholders: ['title', 'bullets', 'visual'] },
      { type: 'end', title: '结尾', layout: 'center-message', placeholders: ['summary', 'nextSteps'] },
    ],
  },
  {
    id: 'lively_8pages',
    name: '活力橙 8 页 PPT',
    description: '适用于营销方案、创意提案的活泼风格，橙色活力、视觉冲击力强。',
    outputType: outputTypes.PPT,
    isSystem: true,
    style: {
      theme: 'lively',
      color: 'orange',
      ratio: '16:9',
      font: 'sans',
      background: 'gradient',
    },
    structure: [
      { type: 'cover', title: '封面', layout: 'center-title', placeholders: ['topic', 'audience', 'presenter'] },
      { type: 'toc', title: '目录', layout: 'left-title-right-nav', placeholders: ['sections'] },
      { type: 'content', title: '内容页', count: 5, layout: 'title-bullets', placeholders: ['title', 'bullets', 'visual'] },
      { type: 'end', title: '结尾', layout: 'center-message', placeholders: ['summary', 'nextSteps'] },
    ],
  },
  {
    id: 'academic_8pages',
    name: '学术严谨 8 页 PPT',
    description: '适用于研究报告、学术分享的严谨风格，灰色调、结构清晰。',
    outputType: outputTypes.PPT,
    isSystem: true,
    style: {
      theme: 'academic',
      color: 'gray',
      ratio: '16:9',
      font: 'serif',
      background: 'white',
    },
    structure: [
      { type: 'cover', title: '封面', layout: 'center-title', placeholders: ['topic', 'audience', 'presenter'] },
      { type: 'toc', title: '目录', layout: 'left-title-right-nav', placeholders: ['sections'] },
      { type: 'content', title: '内容页', count: 5, layout: 'title-bullets', placeholders: ['title', 'bullets', 'visual'] },
      { type: 'end', title: '结尾', layout: 'center-message', placeholders: ['summary', 'nextSteps'] },
    ],
  },
  {
    id: 'dark_8pages',
    name: '高端深色 8 页 PPT',
    description: '适用于产品发布、高端汇报的深色风格，质感强烈、视觉高级。',
    outputType: outputTypes.PPT,
    isSystem: true,
    style: {
      theme: 'dark',
      color: 'purple',
      ratio: '16:9',
      font: 'sans',
      background: 'gradient',
    },
    structure: [
      { type: 'cover', title: '封面', layout: 'center-title', placeholders: ['topic', 'audience', 'presenter'] },
      { type: 'toc', title: '目录', layout: 'left-title-right-nav', placeholders: ['sections'] },
      { type: 'content', title: '内容页', count: 5, layout: 'title-bullets', placeholders: ['title', 'bullets', 'visual'] },
      { type: 'end', title: '结尾', layout: 'center-message', placeholders: ['summary', 'nextSteps'] },
    ],
  },
  {
    id: 'business_blue_8pages',
    name: '商务蓝 8 页 PPT',
    description: '适用于政府汇报、企业年报的稳重风格，蓝色主调、专业可信。',
    outputType: outputTypes.PPT,
    isSystem: true,
    style: {
      theme: 'business',
      color: 'blue',
      ratio: '16:9',
      font: 'serif',
      background: 'solid',
    },
    structure: [
      { type: 'cover', title: '封面', layout: 'center-title', placeholders: ['topic', 'audience', 'presenter'] },
      { type: 'toc', title: '目录', layout: 'left-title-right-nav', placeholders: ['sections'] },
      { type: 'content', title: '内容页', count: 5, layout: 'title-bullets', placeholders: ['title', 'bullets', 'visual'] },
      { type: 'end', title: '结尾', layout: 'center-message', placeholders: ['summary', 'nextSteps'] },
    ],
  },
  {
    id: 'tech_black_8pages',
    name: '极客黑 8 页 PPT',
    description: '适用于技术发布会、黑客松演示的极客风格，纯黑背景、科技感十足。',
    outputType: outputTypes.PPT,
    isSystem: true,
    style: {
      theme: 'tech',
      color: 'black',
      ratio: '16:9',
      font: 'sans',
      background: 'texture',
    },
    structure: [
      { type: 'cover', title: '封面', layout: 'center-title', placeholders: ['topic', 'audience', 'presenter'] },
      { type: 'toc', title: '目录', layout: 'left-title-right-nav', placeholders: ['sections'] },
      { type: 'content', title: '内容页', count: 5, layout: 'title-bullets', placeholders: ['title', 'bullets', 'visual'] },
      { type: 'end', title: '结尾', layout: 'center-message', placeholders: ['summary', 'nextSteps'] },
    ],
  },
  {
    id: 'minimal_purple_8pages',
    name: '品质紫 8 页 PPT',
    description: '适用于品牌发布、品质宣传的优雅风格，紫色主调、高级质感。',
    outputType: outputTypes.PPT,
    isSystem: true,
    style: {
      theme: 'minimal',
      color: 'purple',
      ratio: '16:9',
      font: 'sans',
      background: 'graphic',
    },
    structure: [
      { type: 'cover', title: '封面', layout: 'center-title', placeholders: ['topic', 'audience', 'presenter'] },
      { type: 'toc', title: '目录', layout: 'left-title-right-nav', placeholders: ['sections'] },
      { type: 'content', title: '内容页', count: 5, layout: 'title-bullets', placeholders: ['title', 'bullets', 'visual'] },
      { type: 'end', title: '结尾', layout: 'center-message', placeholders: ['summary', 'nextSteps'] },
    ],
  },
  {
    id: 'report_standard',
    name: '标准研究报告',
    description: '适用于行业研究、市场调研的标准报告结构，包含摘要、背景、分析、结论、附录。',
    outputType: outputTypes.REPORT,
    isSystem: true,
    style: {
      theme: 'academic',
      color: 'gray',
      font: 'serif',
      background: 'white',
    },
    structure: [
      { type: 'cover', title: '封面', placeholders: ['topic', 'author', 'date'] },
      { type: 'toc', title: '目录', placeholders: ['sections'] },
      { type: 'section', title: '摘要', placeholders: ['summary'] },
      { type: 'section', title: '背景', placeholders: ['background'] },
      { type: 'section', title: '分析', count: 3, placeholders: ['title', 'content'] },
      { type: 'section', title: '结论', placeholders: ['conclusion'] },
      { type: 'end', title: '附录', placeholders: ['references'] },
    ],
  },
];

export function getStructureTemplateById(id) {
  return contentStructureTemplates.find((t) => t.id === id);
}

export function getStructureTemplatesByOutputType(outputType) {
  return contentStructureTemplates.filter((t) => t.outputType === outputType);
}

// 创作能力定义
export const workAbilities = [
  {
    id: 'writing',
    name: '文档写作',
    icon: 'pen-nib',
    description: '生成方案、话术、邮件、报告等文字内容',
    supportsKB: true,
    supportsFree: true,
  },
  {
    id: 'table',
    name: '表格',
    icon: 'table',
    description: '生成对比表、清单表、报价单等结构化表格',
    supportsKB: true,
    supportsFree: true,
  },
  {
    id: 'ppt',
    name: 'PPT生成',
    icon: 'presentation-screen',
    description: '基于主题生成PPT大纲和每页内容',
    supportsKB: true,
    supportsFree: true,
  },
  {
    id: 'report',
    name: '研究报告',
    icon: 'file-waveform',
    description: '基于资料生成行业研究、市场调研报告',
    supportsKB: true,
    supportsFree: false,
  },
  {
    id: 'translate',
    name: '翻译',
    icon: 'language',
    description: '翻译文本或文档，支持多语言',
    supportsKB: true,
    supportsFree: true,
  },
  {
    id: 'transcribe',
    name: '录音转写',
    icon: 'microphone-lines',
    description: '上传音频，转写并提取要点',
    supportsKB: true,
    supportsFree: true,
  },
  {
    id: 'image',
    name: '图像生成',
    icon: 'image',
    description: '根据描述生成图片、海报、配图',
    supportsKB: false,
    supportsFree: true,
  },
  {
    id: 'video',
    name: '视频生成',
    icon: 'video',
    description: '生成短视频脚本或数字人视频',
    supportsKB: false,
    supportsFree: true,
  },
  {
    id: 'music',
    name: '音乐生成',
    icon: 'music',
    description: '根据风格和情绪生成背景音乐',
    supportsKB: false,
    supportsFree: true,
  },
];

// 岗位角色定义
export const workRoles = [
  {
    id: 'sales',
    name: '销售',
    icon: 'handshake',
    description: '面向客户，生成方案、话术、报价等销售内容',
    color: '#59A674',
    recommendedAbilities: ['writing', 'table', 'ppt', 'translate'],
  },
  {
    id: 'customer_service',
    name: '客服',
    icon: 'headset',
    description: '面向客户咨询，生成标准回复与问题解答',
    color: '#6B9B8A',
    recommendedAbilities: ['writing', 'transcribe', 'translate', 'table'],
  },
  {
    id: 'marketing',
    name: '市场运营',
    icon: 'bullhorn',
    description: '面向推广，生成文案、活动、邮件等内容',
    color: '#C4A35A',
    recommendedAbilities: ['writing', 'image', 'video', 'ppt', 'report'],
  },
  {
    id: 'hr',
    name: '人力资源',
    icon: 'users',
    description: '面向招聘与培训，生成JD、制度解读等内容',
    color: '#f43f5e',
    recommendedAbilities: ['writing', 'table', 'ppt', 'report'],
  },
  {
    id: 'product',
    name: '产品经理',
    icon: 'lightbulb',
    description: '面向产品工作，生成PRD、分析、汇报材料',
    color: '#f97316',
    recommendedAbilities: ['writing', 'table', 'ppt', 'report'],
  },
  {
    id: 'tech_support',
    name: '技术支持',
    icon: 'screwdriver-wrench',
    description: '面向实施与运维，生成方案、排障、培训内容',
    color: '#3b82f6',
    recommendedAbilities: ['writing', 'table', 'report', 'transcribe'],
  },
];

// 生成模板定义
export const workTemplates = [
  // 销售 - 写作
  {
    id: 'sales_proposal',
    roleId: 'sales',
    abilityId: 'writing',
    name: '客户方案生成',
    description: '根据客户需求，基于产品知识库生成定制化解决方案',
    icon: 'file-contract',
    defaultMode: 'kb',
    recommendedKBs: ['kb_202405001', 'kb_202405002'],
    outputType: outputTypes.MARKDOWN,
    fields: [
      { id: 'customer_name', type: fieldTypes.TEXT, label: '客户名称', placeholder: '例如：某某制造有限公司', required: true },
      { id: 'industry', type: fieldTypes.SELECT, label: '所属行业', options: ['制造业', '互联网', '金融', '教育', '医疗', '零售', '其他'], required: false },
      { id: 'customer_needs', type: fieldTypes.TEXTAREA, label: '客户需求', placeholder: '请描述客户的核心需求、痛点或目标场景', required: true, rows: 4 },
      { id: 'budget', type: fieldTypes.TEXT, label: '预算范围', placeholder: '例如：10-50万', required: false },
      { id: 'competitors', type: fieldTypes.TEXT, label: '竞品信息', placeholder: '客户正在对比的竞品（可选）', required: false },
    ],
    example: {
      customer_name: '华东智能制造有限公司',
      industry: '制造业',
      customer_needs: '希望搭建企业知识库，统一管理产品文档、客服话术和内部培训资料，提升销售效率和客户服务质量。',
      budget: '20-30万',
      competitors: '某知名知识管理软件',
    },
  },
  {
    id: 'sales_pitch',
    roleId: 'sales',
    abilityId: 'writing',
    name: '产品介绍话术',
    description: '针对特定客户场景，生成简洁有力的产品介绍话术',
    icon: 'microphone-lines',
    defaultMode: 'kb',
    recommendedKBs: ['kb_202405001'],
    outputType: outputTypes.TEXT,
    fields: [
      { id: 'product_name', type: fieldTypes.TEXT, label: '产品名称', placeholder: '例如：DmtPlat AI知识库', required: true },
      { id: 'customer_pain', type: fieldTypes.TEXTAREA, label: '客户痛点', placeholder: '客户当前面临的主要问题', required: true, rows: 3 },
      { id: 'scenario', type: fieldTypes.TEXTAREA, label: '使用场景', placeholder: '客户可能在什么场景下使用该产品', required: false, rows: 3 },
      { id: 'tone', type: fieldTypes.SELECT, label: '话术风格', options: ['专业正式', '亲切自然', '简洁有力', '故事化'], required: false },
    ],
    example: {
      product_name: 'DmtPlat AI知识库',
      customer_pain: '销售团队找不到最新产品资料，每次给客户介绍都要反复确认，影响专业形象。',
      scenario: '销售拜访客户时需要快速介绍产品核心价值。',
      tone: '简洁有力',
    },
  },
  // 销售 - 表格
  {
    id: 'competitor_compare',
    roleId: 'sales',
    abilityId: 'table',
    name: '竞品对比表',
    description: '基于知识库生成我方与竞品的功能对比表',
    icon: 'table-cells',
    defaultMode: 'kb',
    recommendedKBs: ['kb_202405001'],
    outputType: outputTypes.TABLE,
    outputConfig: {
      columns: ['对比维度', 'DmtPlat', '竞品A', '优劣势分析'],
    },
    fields: [
      { id: 'competitor_name', type: fieldTypes.TEXT, label: '竞品名称', placeholder: '例如：某知名知识库', required: true },
      { id: 'compare_dimensions', type: fieldTypes.TEXTAREA, label: '对比维度', placeholder: '例如：数据接入、智能问答、部署方式、价格', required: false, rows: 3 },
    ],
    example: {
      competitor_name: '某知名知识管理软件',
      compare_dimensions: '数据接入、智能问答、部署方式、价格、扩展能力',
    },
  },
  // 销售 - PPT
  {
    id: 'sales_ppt',
    roleId: 'sales',
    abilityId: 'ppt',
    name: '客户汇报PPT',
    description: '基于客户和主题生成完整PPT大纲、演讲备注与配图建议',
    icon: 'presentation-screen',
    defaultMode: 'kb',
    recommendedKBs: ['kb_202405001', 'kb_202405002'],
    outputType: outputTypes.PPT,
    structureTemplateId: 'business_8pages',
    fields: [
      { id: 'topic', type: fieldTypes.TEXT, label: '汇报主题', placeholder: '例如：DmtPlat 企业知识库解决方案', required: true },
      { id: 'audience', type: fieldTypes.TEXT, label: '汇报对象', placeholder: '例如：客户IT负责人、业务负责人', required: false },
      { id: 'coreMessage', type: fieldTypes.TEXTAREA, label: '核心信息', placeholder: '一句话总结本次汇报最想传递的信息', required: false, rows: 2 },
      { id: 'keyPoints', type: fieldTypes.TEXTAREA, label: '必须包含的要点', placeholder: '例如：产品优势、客户案例、实施路径、报价', required: false, rows: 3 },
    ],
    example: {
      topic: 'DmtPlat 企业知识库解决方案',
      audience: '客户IT负责人、业务部门负责人',
      coreMessage: 'DmtPlat 能让企业知识真正被一线员工用起来，提升销售与客服效率。',
      keyPoints: '产品优势、核心能力、应用场景、实施路径、客户价值',
    },
  },
  // 客服 - 写作
  {
    id: 'cs_reply',
    roleId: 'customer_service',
    abilityId: 'writing',
    name: '标准回复生成',
    description: '基于客服知识库，生成礼貌、准确、可复用的标准回复',
    icon: 'reply',
    defaultMode: 'kb',
    recommendedKBs: ['kb_202405002', 'kb_202405001'],
    outputType: outputTypes.TEXT,
    fields: [
      { id: 'customer_question', type: fieldTypes.TEXTAREA, label: '客户问题', placeholder: '客户咨询的具体问题', required: true, rows: 4 },
      { id: 'customer_emotion', type: fieldTypes.SELECT, label: '客户情绪', options: ['平和', '着急', '不满', '满意', '质疑'], required: false },
      { id: 'reply_style', type: fieldTypes.SELECT, label: '回复风格', options: ['标准正式', '温和安抚', '简洁直接', '详细说明'], required: false },
    ],
    example: {
      customer_question: '你们的产品支持哪些文件格式上传？我有很多PDF和Word文档需要导入。',
      customer_emotion: '平和',
      reply_style: '标准正式',
    },
  },
  {
    id: 'cs_qa',
    roleId: 'customer_service',
    abilityId: 'writing',
    name: '问题解答',
    description: '针对客户问题，基于知识库生成结构化解答',
    icon: 'circle-question',
    defaultMode: 'kb',
    recommendedKBs: ['kb_202405002'],
    outputType: outputTypes.MARKDOWN,
    fields: [
      { id: 'question', type: fieldTypes.TEXTAREA, label: '客户问题', placeholder: '请输入客户的问题', required: true, rows: 3 },
      { id: 'detail_level', type: fieldTypes.SELECT, label: '详细程度', options: ['简要回答', '标准回答', '详细解释'], required: false },
    ],
    example: {
      question: '如何重置密码？我忘记了登录密码。',
      detail_level: '标准回答',
    },
  },
  // 客服 - 表格
  {
    id: 'issue_classify',
    roleId: 'customer_service',
    abilityId: 'table',
    name: '问题分类表',
    description: '基于知识库对高频问题进行分类整理',
    icon: 'list-check',
    defaultMode: 'kb',
    recommendedKBs: ['kb_202405002'],
    outputType: outputTypes.TABLE,
    outputConfig: {
      columns: ['问题类型', '典型问题', '处理建议', '对应知识库'],
    },
    fields: [
      { id: 'category_scope', type: fieldTypes.TEXT, label: '分类范围', placeholder: '例如：账号问题、功能咨询、故障反馈', required: false },
    ],
    example: {
      category_scope: '账号问题、功能咨询、故障反馈',
    },
  },
  // 市场运营 - 写作
  {
    id: 'marketing_copy',
    roleId: 'marketing',
    abilityId: 'writing',
    name: '营销文案',
    description: '基于产品资料生成推广文案、推文、活动文案',
    icon: 'bullhorn',
    defaultMode: 'free',
    recommendedKBs: ['kb_202405001'],
    outputType: outputTypes.TEXT,
    fields: [
      { id: 'product', type: fieldTypes.TEXT, label: '推广产品', placeholder: '例如：DmtPlat AI知识库', required: true },
      { id: 'channel', type: fieldTypes.SELECT, label: '投放渠道', options: ['微信公众号', '知乎', '小红书', '官网', '邮件'], required: false },
      { id: 'angle', type: fieldTypes.TEXTAREA, label: '切入角度', placeholder: '例如：企业知识管理痛点', required: false, rows: 3 },
    ],
    example: {
      product: 'DmtPlat AI知识库',
      channel: '微信公众号',
      angle: '销售团队找资料难、信息不统一',
    },
  },
  // 市场运营 - 研究报告
  {
    id: 'industry_report',
    roleId: 'marketing',
    abilityId: 'report',
    name: '行业研究报告',
    description: '基于知识库资料生成行业洞察报告',
    icon: 'chart-line',
    defaultMode: 'kb',
    recommendedKBs: ['kb_202405003', 'kb_202405001'],
    outputType: outputTypes.REPORT,
    structureTemplateId: 'report_standard',
    fields: [
      { id: 'topic', type: fieldTypes.TEXT, label: '研究主题', placeholder: '例如：企业知识管理市场趋势', required: true },
      { id: 'focus', type: fieldTypes.TEXTAREA, label: '关注重点', placeholder: '例如：市场规模、竞争格局、用户需求', required: false, rows: 3 },
    ],
    example: {
      topic: '企业知识管理市场趋势',
      focus: '市场规模、竞争格局、用户需求变化',
    },
  },
  // 产品经理 - 表格
  {
    id: 'prd_feature_table',
    roleId: 'product',
    abilityId: 'table',
    name: '功能清单表',
    description: '基于产品资料生成功能清单和优先级表格',
    icon: 'list-check',
    defaultMode: 'kb',
    recommendedKBs: ['kb_202405001'],
    outputType: outputTypes.TABLE,
    outputConfig: {
      columns: ['功能模块', '功能点', '优先级', '状态', '备注'],
    },
    fields: [
      { id: 'module', type: fieldTypes.TEXT, label: '模块范围', placeholder: '例如：知识库管理、智能问答、应用中心', required: false },
    ],
    example: {
      module: '知识库管理、智能问答、应用中心',
    },
  },
  // 产品经理 - PPT
  {
    id: 'product_ppt',
    roleId: 'product',
    abilityId: 'ppt',
    name: '产品汇报PPT',
    description: '基于主题生成产品汇报PPT大纲',
    icon: 'presentation-screen',
    defaultMode: 'kb',
    recommendedKBs: ['kb_202405001'],
    outputType: outputTypes.PPT,
    structureTemplateId: 'tech_8pages',
    fields: [
      { id: 'topic', type: fieldTypes.TEXT, label: '汇报主题', placeholder: '例如：Q3产品规划汇报', required: true },
      { id: 'audience', type: fieldTypes.TEXT, label: '汇报对象', placeholder: '例如：管理层、研发团队', required: false },
      { id: 'coreMessage', type: fieldTypes.TEXTAREA, label: '核心信息', placeholder: '一句话总结本次汇报最想传递的信息', required: false, rows: 2 },
      { id: 'keyPoints', type: fieldTypes.TEXTAREA, label: '必须包含的要点', placeholder: '例如：产品目标、关键指标、里程碑、风险', required: false, rows: 3 },
    ],
    example: {
      topic: 'Q3 产品规划汇报',
      audience: '管理层、研发团队',
      coreMessage: 'Q3 重点聚焦智能工作助手升级，提升一线员工内容创作效率。',
      keyPoints: '产品目标、关键指标、里程碑、风险与应对',
    },
  },
];

export function getAbilityById(id) {
  return workAbilities.find((a) => a.id === id);
}

export function getRoleById(id) {
  return workRoles.find((r) => r.id === id);
}

export function getTemplatesByRole(roleId) {
  return getAllTemplates().filter((t) => t.roleId === roleId);
}

export function getTemplatesByAbility(roleId, abilityId) {
  return getAllTemplates().filter((t) => t.roleId === roleId && t.abilityId === abilityId);
}

export function getRecommendedTemplates(roleId) {
  const role = getRoleById(roleId);
  if (!role) return [];
  return getAllTemplates().filter((t) => t.roleId === roleId && role.recommendedAbilities.includes(t.abilityId));
}

export function getRecommendedKBs(roleId, allKBs) {
  const templates = getTemplatesByRole(roleId);
  const kbIds = [...new Set(templates.flatMap((t) => t.recommendedKBs || []))];
  return allKBs.filter((kb) => kbIds.includes(kb.id));
}

// 模拟从示例文本提取模板
export function extractTemplateFromExample(options) {
  const { name, roleId, abilityId, exampleText, outputType } = options;
  const lines = exampleText.split('\n').map((l) => l.trim()).filter(Boolean);
  const title = lines[0] || name;
  const fields = [];

  // 简单规则：查找类似 {变量名} 或 「变量名」 的占位符
  const placeholderRegex = /[\{\[]([^}\]]+)[}\]]/g;
  const placeholders = new Set();
  exampleText.replace(placeholderRegex, (_, key) => placeholders.add(key.trim()));

  if (placeholders.size === 0) {
    // 没有显式占位符，尝试提取关键实体作为字段
    fields.push({ id: 'topic', type: fieldTypes.TEXT, label: '主题', placeholder: '请输入主题', required: true });
    if (exampleText.includes('客户')) fields.push({ id: 'customer', type: fieldTypes.TEXT, label: '客户名称', placeholder: '客户名称', required: false });
    if (exampleText.includes('产品')) fields.push({ id: 'product', type: fieldTypes.TEXT, label: '产品名称', placeholder: '产品名称', required: false });
    if (exampleText.includes('场景') || exampleText.includes('情况')) fields.push({ id: 'scenario', type: fieldTypes.TEXTAREA, label: '场景/背景', placeholder: '场景或背景描述', required: false, rows: 3 });
  } else {
    placeholders.forEach((key) => {
      const id = key.replace(/\s+/g, '_').toLowerCase();
      const isLong = key.length > 8 || key.includes('内容') || key.includes('描述');
      fields.push({
        id,
        type: isLong ? fieldTypes.TEXTAREA : fieldTypes.TEXT,
        label: key,
        placeholder: `请输入${key}`,
        required: true,
        rows: isLong ? 3 : undefined,
      });
    });
  }

  return {
    id: generateId('tmpl'),
    name,
    roleId,
    abilityId,
    outputType: outputType || outputTypes.TEXT,
    defaultMode: 'kb',
    description: `从示例「${title.substring(0, 20)}...」提取的自定义模板`,
    icon: 'file-lines',
    fields,
    promptTemplate: `请根据以下信息生成内容：\n${fields.map((f) => `${f.label}：{${f.id}}`).join('\n')}\n\n参考结构：\n${exampleText.substring(0, 300)}`,
    extractedFrom: exampleText.substring(0, 500),
  };
}

// 用户自定义模板存储
const CUSTOM_TEMPLATES_KEY = 'dmtplat_custom_templates';
const TEAM_TEMPLATES_KEY = 'dmtplat_team_templates';

export function getCustomTemplates() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCustomTemplate(template) {
  const templates = getCustomTemplates();
  const existingIndex = templates.findIndex((t) => t.id === template.id);
  if (existingIndex >= 0) {
    templates[existingIndex] = { ...templates[existingIndex], ...template, updatedAt: Date.now() };
  } else {
    templates.push({ ...template, createdAt: Date.now(), updatedAt: Date.now() });
  }
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
  return template;
}

export function deleteCustomTemplate(id) {
  const templates = getCustomTemplates().filter((t) => t.id !== id);
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

export function getTeamTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TEAM_TEMPLATES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function publishTeamTemplate(template) {
  const templates = getTeamTemplates();
  const teamTemplate = { ...template, isCustom: false, status: 'pending', publishedAt: Date.now() };
  templates.push(teamTemplate);
  localStorage.setItem(TEAM_TEMPLATES_KEY, JSON.stringify(templates));
}

export function approveTeamTemplate(id) {
  const templates = getTeamTemplates();
  const t = templates.find((x) => x.id === id);
  if (t) {
    t.status = 'approved';
    t.approvedAt = Date.now();
    localStorage.setItem(TEAM_TEMPLATES_KEY, JSON.stringify(templates));
  }
}

export function rejectTeamTemplate(id) {
  const templates = getTeamTemplates();
  const t = templates.find((x) => x.id === id);
  if (t) {
    t.status = 'rejected';
    localStorage.setItem(TEAM_TEMPLATES_KEY, JSON.stringify(templates));
  }
}

export function getAllTemplates() {
  return [...workTemplates, ...getCustomTemplates(), ...getTeamTemplates().filter((t) => t.status === 'approved')];
}

// 首页内容类型选择生成的统一入口：按类型 + 用户配置（篇幅/风格/行数等）产出内容
// 支持 markdown / ppt / table / email / list / steps
function generateByChatType(template, formData, mode, kbNames, options = {}) {
  const topic = (formData.topic || '').trim() || '指定主题';
  const type = template.chatContentType;
  const refs = getCitations(mode, template);
  const attachmentSuffix = options.attachmentContext
    ? `\n\n---\n\n## 参考附件\n\n以下内容结合了上传附件中的信息：\n${options.attachmentContext}`
    : '';

  // ---------- 文档 ----------
  if (type === 'markdown') {
    const lengthMap = {
      short: ['概述', '核心要点', '小结'],
      standard: ['背景', '核心要点', '实施步骤', '小结'],
      detailed: ['背景与目标', '现状分析', '核心要点', '实施步骤', '风险与应对', '小结'],
    };
    const styleTone = { formal: '正式严谨', plain: '通俗易懂', professional: '专业务实' }[options.style] || '专业';
    const sections = lengthMap[options.length] || lengthMap.standard;
    const body = sections.map((s) => `## ${s}\n\n围绕「${topic}」，从${styleTone}的角度展开：这里是关于${s}的要点说明，可结合实际情况补充细节。`).join('\n\n');
    return {
      title: `${topic}`,
      content: `# ${topic}\n\n> 类型：文档 · 风格：${styleTone} · 篇幅：${sections.length} 段\n\n${body}${attachmentSuffix}`,
      citations: refs,
    };
  }

  // ---------- PPT ----------
  if (type === 'ppt') {
    const styleLabelMap = { business: '商务正式', tech: '科技现代', minimal: '简约清新', lively: '活泼生动', academic: '学术严谨' };
    const colorHexMap = { business: '1C64F2', tech: '111827', minimal: '0E9F6E', lively: 'F05252', academic: '78716C' };
    const style = styleLabelMap[options.style] || '商务正式';
    const colorHex = colorHexMap[options.style] || '0E9F6E';
    const pageCount = parseInt(options.length, 10) || 12;
    const styleTone = { '商务正式': '稳重、专业、数据驱动', '科技现代': '前沿、简洁、强调创新', '简约清新': '清晰、留白、重点突出', '活泼生动': '亲和、故事化、场景化', '学术严谨': '严谨、规范、论证充分' }[style] || '专业';

    const sectionTitles = ['背景与目标', '现状分析', '核心策略', '关键举措', '预期成果', '风险与应对', '推进计划', '总结展望'];
    const pages = [
      { type: 'cover', title: topic, subtitle: `风格：${style}`, bullets: [], note: `开场点明汇报目标，风格基调：${styleTone}`, visual: `封面建议：${style}主题背景，突出标题`, layout: 'center' },
      { type: 'catalog', title: '汇报目录', bullets: sectionTitles.slice(0, Math.max(4, pageCount - 2)), note: '简要介绍汇报结构', visual: '目录页', layout: 'list' },
    ];
    for (let i = 0; i < pageCount - 2 && i < sectionTitles.length; i++) {
      pages.push({
        type: 'content',
        title: sectionTitles[i],
        bullets: [`关于「${topic}」的${sectionTitles[i]}要点一`, `关于「${topic}」的${sectionTitles[i]}要点二`, `关于「${topic}」的${sectionTitles[i]}要点三`],
        note: `${sectionTitles[i]}的讲解思路，保持${styleTone}。`,
        visual: `${sectionTitles[i]}页建议图表/图示`,
        layout: 'bullets',
      });
    }
    pages.push({ type: 'end', title: '谢谢', subtitle: '欢迎交流', bullets: [], note: '结尾致谢并引导问答', visual: '结尾页', layout: 'center' });
    return { title: topic, style, styleTone, color: '品牌绿', colorHex, coreMessage: topic, pages, citations: refs };
  }

  // ---------- 表格 ----------
  if (type === 'table') {
    const rowCount = parseInt(options.rows, 10) || 10;
    const columns = ['维度', '说明', '备注'];
    const dims = ['名称', '定位', '目标', '优势', '挑战', '资源', '节奏', '风险', '成果', '复盘', '扩展', '优化', '规范', '协同', '反馈'];
    const rows = [];
    for (let i = 0; i < rowCount; i++) {
      const dim = dims[i % dims.length];
      rows.push([dim, `围绕「${topic}」的${dim}相关说明`, '']);
    }
    return { title: `${topic}表`, columns, rows, citations: refs };
  }

  // ---------- 邮件 ----------
  if (type === 'email') {
    const toneMap = {
      formal: { greeting: '尊敬的对方：', closing: '顺颂商祺。' },
      friendly: { greeting: '您好呀：', closing: '祝好！' },
      serious: { greeting: '对方您好：', closing: '此致敬礼。' },
    };
    const t = toneMap[options.tone] || toneMap.formal;
    return {
      title: `${topic}邮件`,
      content: `**主题：${topic}**\n\n${t.greeting}\n\n关于「${topic}」，特此沟通如下：\n\n1. 背景说明：围绕${topic}的背景情况。\n2. 核心诉求：希望就${topic}达成共识。\n3. 下一步：期待您的反馈与确认。\n\n${t.closing}${attachmentSuffix}`,
      citations: refs,
    };
  }

  // ---------- 列表 ----------
  if (type === 'list') {
    const count = parseInt(options.count, 10) || 10;
    const items = [];
    for (let i = 1; i <= count; i++) {
      items.push(`${i}. 关于「${topic}」的第 ${i} 条要点`);
    }
    return { title: `${topic}清单`, content: `# ${topic}清单\n\n${items.join('\n')}${attachmentSuffix}`, citations: refs };
  }

  // ---------- 步骤 ----------
  if (type === 'steps') {
    const detailMap = {
      brief: ['明确目标', '制定方案', '执行推进', '复盘优化'],
      standard: ['明确目标', '拆解任务', '制定方案', '执行推进', '跟踪反馈', '复盘优化'],
      detailed: ['明确目标与范围', '现状调研与分析', '拆解任务与排期', '制定详细方案', '资源配置与动员', '分步执行推进', '持续跟踪反馈', '复盘总结与优化'],
    };
    const steps = detailMap[options.detail] || detailMap.standard;
    const body = steps.map((s, i) => `### 第 ${i + 1} 步：${s}\n围绕「${topic}」，说明本步骤的关键动作与注意事项。`).join('\n\n');
    return { title: `${topic}步骤`, content: `# ${topic}步骤\n\n${body}${attachmentSuffix}`, citations: refs };
  }

  // ---------- 视频 ----------
  if (type === 'video') {
    const styleMap = { realistic: '写实', anime: '动画', cinematic: '电影感', cartoon: '卡通' };
    const style = styleMap[options.style] || '电影感';
    const duration = parseInt(options.duration, 10) || 10;
    const ratio = options.ratio || '16:9';
    const sceneCount = Math.max(3, Math.min(6, Math.ceil(duration / 3)));
    const scenes = [];
    for (let i = 1; i <= sceneCount; i++) {
      scenes.push({
        index: i,
        time: `${(i - 1) * Math.ceil(duration / sceneCount)}s - ${i * Math.ceil(duration / sceneCount)}s`,
        shot: `镜头 ${i}：围绕「${topic}」的${style}画面`,
        desc: `${style}风格画面描述：以${topic}为核心，呈现第 ${i} 段叙事，注重光影与构图。`,
        audio: i === 1 ? '开场配乐渐入' : (i === sceneCount ? '配乐渐弱收尾' : '环境音 + 配乐推进'),
      });
    }
    return {
      title: `${topic}视频`,
      type: 'video',
      style, duration, ratio,
      resolution: ratio === '9:16' ? '1080×1920' : (ratio === '1:1' ? '1080×1080' : '1920×1080'),
      scenes,
      citations: refs,
    };
  }

  // ---------- 音乐 ----------
  if (type === 'music') {
    const genreMap = { pop: '流行', classical: '古典', electronic: '电子', light: '轻音乐', folk: '民谣' };
    const moodMap = { happy: '欢快', calm: '舒缓', energetic: '激昂', sad: '忧伤' };
    const genre = genreMap[options.genre] || '流行';
    const mood = moodMap[options.mood] || '欢快';
    const duration = parseInt(options.duration, 10) || 60;
    const tempo = { 流行: '100 BPM', 古典: '80 BPM', 电子: '124 BPM', 轻音乐: '90 BPM', 民谣: '85 BPM' }[genre] || '100 BPM';
    const instrumentMap = { 流行: '钢琴 + 木吉他 + 弦乐', 古典: '小提琴 + 大提琴 + 钢琴', 电子: '合成器 + 鼓机', 轻音乐: '钢琴 + 长笛', 民谣: '木吉他 + 口琴' };
    const instruments = instrumentMap[genre] || '钢琴 + 吉他';
    const sectionCount = Math.max(3, Math.min(5, Math.ceil(duration / 20)));
    const sections = [];
    const labels = ['前奏', '主歌', '副歌', '桥段', '尾奏'];
    for (let i = 0; i < sectionCount; i++) {
      const label = labels[i] || `段落 ${i + 1}`;
      sections.push({
        label,
        time: `${Math.round(i * duration / sectionCount)}s - ${Math.round((i + 1) * duration / sectionCount)}s`,
        desc: `${label}：${mood}情绪的${genre}段落，围绕「${topic}」展开旋律。`,
      });
    }
    const lyrics = `（歌词草稿）\n围绕「${topic}」，以${mood}的基调展开：\n第 1 句：点明${topic}的场景与情感\n第 2 句：深化主题，承接情绪\n第 3 句：推向高潮，呼应核心\n第 4 句：收束余韵，留有余味`;
    return {
      title: `${topic}音乐`,
      type: 'music',
      genre, mood, duration, tempo, instruments,
      sections, lyrics,
      citations: refs,
    };
  }

  return { title: topic, content: `暂未实现该类型的生成逻辑。${attachmentSuffix}`, citations: refs };
}

// 模拟生成内容
export function mockGenerateContent(template, formData, mode, selectedKBs, options = {}) {
  const kbNames = selectedKBs.map((kb) => kb.name).join('、') || '大语言模型';
  const attachmentContext = getAttachmentContext(options.attachments);
  const opts = { ...options, attachmentContext };

  // 首页内容类型选择生成的临时模板：按类型 + 配置项生成
  if (template.chatContentType) {
    return generateByChatType(template, formData, mode, kbNames, opts);
  }

  switch (template.outputType) {
    case outputTypes.TABLE:
      return generateTable(template, formData, mode, kbNames, opts);
    case outputTypes.PPT:
      return opts.stage === 'outline'
        ? generatePPTOutline(template, formData, mode, kbNames, opts)
        : generatePPT(template, formData, mode, kbNames, opts);
    case outputTypes.REPORT:
      return generateReport(template, formData, mode, kbNames, opts);
    default:
      return generateText(template, formData, mode, kbNames, opts);
  }
}

function getAttachmentContext(attachments = []) {
  if (!attachments.length) return '';
  const parts = attachments.map((file) => {
    const name = file.fileName || file.title || '未命名文件';
    const typeLabel = { pptx: 'PPT', docx: 'Word', xlsx: 'Excel', pdf: 'PDF', txt: '文本', md: 'Markdown' }[file.fileType] || file.fileType;
    let content = '';
    if (file.text) {
      content = file.text;
    } else if (file.paragraphs && file.paragraphs.length) {
      content = file.paragraphs.slice(0, 20).join('\n');
    } else if (file.headings && file.headings.length) {
      content = file.headings.map((h) => h.text).join('\n');
    } else if (file.slides && file.slides.length) {
      content = file.slides.map((s) => `${s.title || ''}\n${(s.bullets || []).slice(0, 5).join('\n')}`).join('\n\n');
    } else if (file.sheets && file.sheets.length) {
      content = file.sheets.map((s) => `${s.name}\n${(s.headers || []).join('\t')}`).join('\n\n');
    }
    const snippet = content ? content.substring(0, 800) : '';
    return `【附件：${name}（${typeLabel}）】${snippet ? '\n' + snippet : ''}`;
  });
  return '\n\n' + parts.join('\n\n');
}

function getCitations(mode, template) {
  if (mode === 'free') return [];
  if (template.id === 'competitor_compare') {
    return [
      { id: 1, kbName: '产品文档中心', docName: 'DmtPlat 产品白皮书', section: '第 2.1 节', text: 'DmtPlat 支持文档、网页、数据库等多源数据接入。' },
      { id: 2, kbName: '产品文档中心', docName: '功能对比表', section: '第 4.2 节', text: '私有化部署、API集成、权限管理为企业级核心能力。' },
    ];
  }
  if (template.id === 'sales_ppt' || template.id === 'product_ppt') {
    return [
      { id: 1, kbName: '产品文档中心', docName: '产品简介', section: '核心卖点', text: 'DmtPlat 让企业知识真正被用起来。' },
    ];
  }
  if (template.id === 'industry_report') {
    return [
      { id: 1, kbName: '法规政策库', docName: '行业政策汇编', section: '第 1 章', text: '企业数字化转型推动知识管理市场规模持续增长。' },
      { id: 2, kbName: '产品文档中心', docName: '市场调研', section: '趋势分析', text: 'AI 驱动的知识库成为企业智能化升级的重要基础设施。' },
    ];
  }
  if (template.roleId === 'sales') {
    return [
      { id: 1, kbName: '产品文档中心', docName: 'DmtPlat 产品白皮书', section: '第 2.1 节', text: 'DmtPlat 支持文档、网页、数据库等多源数据接入。' },
      { id: 2, kbName: '产品文档中心', docName: 'API接口文档v2.0.pdf', section: '第 3.2 节', text: '提供标准化 RESTful API，支持与现有业务系统快速集成。' },
      { id: 3, kbName: '客服知识库', docName: '常见问题汇总', section: 'Q128', text: '私有化部署方案可满足大型企业对数据安全的要求。' },
    ];
  }
  return [
    { id: 1, kbName: '客服知识库', docName: '常见问题', section: 'Q032', text: '系统支持 PDF、Word、TXT、Markdown 等常见格式上传。' },
  ];
}

function generateText(template, formData, mode, kbNames, options = {}) {
  const refs = getCitations(mode, template);
  const master = options.useMaster ? template.masterData : null;
  const attachmentContext = options.attachmentContext || getAttachmentContext(options.attachments);
  const contentTemplate = options.contentTemplate;

  if (contentTemplate && contentTemplate.content?.sections?.length) {
    return generateTextFromContentTemplate(template, formData, mode, kbNames, contentTemplate, refs, attachmentContext);
  }

  if (master?.fileType === 'docx') {
    return generateTextFromDOCXMaster(template, formData, mode, kbNames, master, refs, attachmentContext);
  }

  const attachmentSuffix = attachmentContext ? `\n\n---\n\n## 参考附件\n\n以下内容结合了上传附件中的信息：\n${attachmentContext}` : '';

  if (template.id === 'sales_proposal') {
    return {
      title: `${formData.customer_name || '客户'}解决方案`,
      content: `## 一、项目背景\n\n${formData.customer_name || '贵司'}作为${formData.industry || '行业'}领先企业，面临着知识分散、信息检索效率低、员工培训成本高等挑战[1]。为此，我们基于 DmtPlat AI 知识库管理系统，为您量身定制本解决方案。\n\n## 二、方案概述\n\n本方案将帮助${formData.customer_name || '贵司'}搭建统一的知识管理平台，整合产品文档、客服话术、培训资料等多源数据[1]。通过智能化的检索与问答能力，显著提升销售转化效率和客户服务质量。\n\n## 三、核心能力\n\n1. **多源数据接入**：支持文档上传、网页爬取、数据库连接等多种方式[1]\n2. **智能问答**：基于知识库提供 7×24 小时智能问答服务\n3. **灵活应用**：可扩展为销售助手、客服助手、培训助手等多种工作场景\n4. **安全可控**：支持私有化部署，满足企业数据安全要求[3]\n\n## 四、实施建议\n\n针对${formData.customer_needs || '您的需求'}，建议分三期推进：\n- 第一期：完成核心知识库搭建与产品文档导入\n- 第二期：接入客服与销售场景，实现智能问答\n- 第三期：与企业现有系统对接，实现 API 集成[2]\n\n${formData.budget ? `## 五、预算匹配\n\n本方案充分考虑了${formData.budget}的预算范围，提供高性价比的部署与实施方案。` : ''}\n${formData.competitors ? `\n## 六、差异化优势\n\n相比${formData.competitors}，DmtPlat 在知识库与应用层的打通、国产化适配、私有化部署灵活性方面具有明显优势。` : ''}${attachmentSuffix}`,
      citations: refs,
    };
  }

  if (template.id === 'sales_pitch') {
    return {
      title: `${formData.product_name || '产品'}介绍话术`,
      content: `您好！我了解到您目前在${formData.customer_pain || '知识管理'}方面有一些困扰。这正是我们${formData.product_name || '产品'}想要解决的问题。\n\n${formData.product_name || '产品'}的核心价值在于：让企业里散落在各处的知识，变成员工随手可调用的工作助手[1]。\n\n${formData.scenario ? `比如在${formData.scenario}，您只需要输入需求，系统就能基于企业知识库快速生成专业内容。` : ''}\n\n我可以帮您安排一次产品演示，让您更直观地感受一下？${attachmentSuffix}`,
      citations: refs,
    };
  }

  if (template.id === 'cs_reply') {
    const emotionPrefix = { 着急: '非常理解您的急切，', 不满: '非常抱歉给您带来不好的体验，', 满意: '感谢您的认可，', 质疑: '理解您的顾虑，', 平和: '' };
    const prefix = emotionPrefix[formData.customer_emotion] || '';
    return {
      title: '标准回复',
      content: `${prefix}关于您咨询的「${formData.customer_question || '问题'}」，为您解答如下：\n\n目前我们的系统支持 PDF、Word、TXT、Markdown 等常见文件格式上传[1]，同时也支持批量上传，单个文件最大 100MB。\n\n如果您的文档数量较多，建议可以先整理好文件夹，然后一次性拖拽上传，系统会自动解析并建立索引。\n\n如果还有其他问题，欢迎随时联系。${attachmentSuffix}`,
      citations: refs,
    };
  }

  if (template.id === 'cs_qa') {
    const detail = formData.detail_level || '标准回答';
    let content = '';
    if (detail === '简要回答') {
      content = '您可以在登录页面点击「忘记密码」，通过邮箱或手机验证码重置密码[1]。';
    } else if (detail === '标准回答') {
      content = `如果您忘记了登录密码，可以通过以下方式重置：\n\n1. 打开登录页面，点击「忘记密码」链接[1]\n2. 输入您的注册邮箱或手机号\n3. 获取并输入验证码\n4. 设置新密码并确认\n5. 使用新密码登录\n\n如果在重置过程中遇到问题，可以联系管理员协助处理。`;
    } else {
      content = `如果您忘记了登录密码，可以通过以下方式重置：\n\n1. **进入登录页面**：打开 DmtPlat 登录页，点击「忘记密码」[1]。\n2. **选择验证方式**：通过注册邮箱或绑定手机号验证。\n3. **获取验证码**：点击「获取验证码」。\n4. **输入验证码**：在页面中输入收到的验证码。\n5. **设置新密码**：按照密码规则设置新密码。\n6. **完成重置**：使用新密码登录系统。\n\n**注意事项**：验证码有效期为 10 分钟；连续多次失败可能锁定账号。`;
    }
    return { title: '问题解答', content: content + attachmentSuffix, citations: refs };
  }

  if (template.id === 'marketing_copy') {
    return {
      title: `${formData.product || '产品'}营销文案`,
      content: `还在为零散的产品资料头疼？\n\n${formData.product || '产品'}帮你把企业知识变成一线员工的战斗力。无论是销售拜访、客服应答还是内部培训，打开系统就能获得准确、专业的回答[1]。\n\n👉 免费预约演示，让知识真正被用起来！${attachmentSuffix}`,
      citations: refs,
    };
  }

  return { title: '生成结果', content: '暂未实现该模板的生成逻辑。' + attachmentSuffix, citations: refs };
}

function generateTextFromContentTemplate(template, formData, mode, kbNames, contentTemplate, refs, attachmentContext = '') {
  const sections = contentTemplate.content.sections || [];
  const topic = formData.topic || formData.customer_name || formData.product_name || contentTemplate.name || '文档主题';

  let content = '';
  sections.forEach((section, idx) => {
    const level = Math.min(section.level || 1, 4);
    const prefix = '#'.repeat(level);
    content += `${prefix} ${section.title}\n\n`;

    const guideText = section.guide || '相关内容描述';
    if (level === 1) {
      content += `本章节围绕「${section.title}」展开。${mode === 'kb' ? `基于${kbNames}知识库中的相关资料，` : ''}整理了以下核心内容：\n\n`;
      content += `- 核心要点一：关于${section.title}的关键信息[${(idx % refs.length) + 1}]\n`;
      content += `- 核心要点二：具体数据与事实支撑\n`;
      content += `- 核心要点三：实践经验与应用建议\n\n`;
    } else {
      content += `${guideText}的详细说明，包含具体的分析、数据和案例。${mode === 'kb' ? `内容参考了${kbNames}中的相关资料。` : ''}\n\n`;
    }
  });

  if (attachmentContext) {
    content += `\n---\n\n## 参考附件\n\n以下内容结合了上传附件中的信息：\n${attachmentContext}\n\n`;
  }

  return { title: contentTemplate.name + ' - ' + topic, content, citations: refs, contentTemplateId: contentTemplate.id };
}

function generateTextFromDOCXMaster(template, formData, mode, kbNames, master, refs, attachmentContext = '') {
  const topic = formData.topic || master.title || '文档主题';
  const headings = master.headings?.length ? master.headings : [{ level: 1, text: '概述' }, { level: 2, text: '主要内容' }, { level: 2, text: '总结' }];

  let content = '';
  for (const h of headings) {
    const prefix = '#'.repeat(Math.min(h.level, 6));
    const title = h.level === 1 ? topic : h.text;
    content += `${prefix} ${title}\n\n`;
    if (h.level === 1) {
      content += `本文档基于原文件母版生成，主题围绕「${topic}」。${mode === 'kb' ? '内容结合了知识库资料。' : '内容由大模型基于原结构生成。'}\n\n`;
    } else {
      content += `围绕「${title}」展开的内容要点：\n- 要点一\n- 要点二\n- 要点三\n\n`;
    }
  }

  if (attachmentContext) {
    content += `---\n\n## 参考附件\n\n以下内容结合了上传附件中的信息：\n${attachmentContext}\n\n`;
  }

  return { title: topic, content, citations: refs };
}

function generateTable(template, formData, mode, kbNames, options = {}) {
  const refs = getCitations(mode, template);
  const master = options.useMaster ? template.masterData : null;
  const attachmentContext = options.attachmentContext || getAttachmentContext(options.attachments);
  const attachmentRows = attachmentContext
    ? [[ '参考附件', attachmentContext.split('\n').filter(Boolean).slice(1, 4).join('；'), '', '' ]]
    : [];

  if (master?.fileType === 'xlsx' && master.sheets?.[0]?.headers?.length) {
    const headers = master.sheets[0].headers;
    const rows = headers.map((h) => headers.map((_) => `示例-${h}`));
    return { title: formData.sheet_name || master.title || '数据表', columns: headers, rows: [...rows, ...attachmentRows].slice(0, 12), citations: refs };
  }

  if (template.id === 'competitor_compare') {
    return {
      title: `${formData.competitor_name || '竞品'}对比表`,
      columns: template.outputConfig.columns,
      rows: [
        ['数据接入', '支持文档、网页、数据库、问答等多源接入[1]', '主要支持文档上传', '维度更全面，适配复杂企业环境'],
        ['智能问答', '基于知识库精准问答，支持引用溯源', '基础搜索问答', '准确性和可信度更高'],
        ['部署方式', '支持 SaaS 和私有化部署[2]', '多为 SaaS', '满足大型企业安全合规要求'],
        ['价格', '按使用量灵活计费，性价比高', '按座位数收费，成本较高', '更适合快速扩展'],
        ['扩展能力', '开放 API，可嵌入业务系统[2]', '扩展能力有限', '与现有系统无缝集成'],
        ...attachmentRows,
      ],
      citations: refs,
    };
  }

  if (template.id === 'issue_classify') {
    return {
      title: '客服问题分类表',
      columns: template.outputConfig.columns,
      rows: [
        ['账号问题', '忘记密码、账号锁定、权限申请', '引导用户重置密码或联系管理员', '客服知识库 Q015'],
        ['功能咨询', '支持哪些文件格式、如何创建知识库', '提供功能说明文档链接', '客服知识库 Q032'],
        ['故障反馈', '上传失败、搜索无结果、回答不准确', '收集复现步骤并提交工单', '客服知识库 Q128'],
        ['购买咨询', '价格、部署方式、定制开发', '转交销售团队跟进', '产品文档中心'],
        ...attachmentRows,
      ],
      citations: refs,
    };
  }

  if (template.id === 'prd_feature_table') {
    return {
      title: '产品功能清单表',
      columns: template.outputConfig.columns,
      rows: [
        ['知识库管理', '多源数据接入', '高', '已完成', '支持文档、网页、数据库'],
        ['知识库管理', '权限管理', '高', '已完成', '按角色配置访问权限'],
        ['智能问答', '引用溯源', '高', '开发中', '回答附带知识库来源'],
        ['应用中心', '智能工作助手', '中', '规划中', '基于岗位生成工作内客'],
        ['系统设置', '主题切换', '低', '已完成', '支持浅色/深色模式'],
        ...attachmentRows,
      ],
      citations: refs,
    };
  }

  return { title: '表格', columns: ['列1'], rows: [['示例数据'], ...attachmentRows], citations: refs };
}

// 根据用户确认/编辑后的大纲生成完整 PPT 页面内容
function buildPPTPagesFromUserOutline(outline, ctx) {
  const { topic, audience, coreMessage, color, styleTone, refs, attachmentContext } = ctx;

  const contentMap = {
    '背景与痛点': {
      subtitle: '企业知识管理的现状',
      bullets: ['知识分散在文档、邮件、聊天记录中，难以统一检索', '新员工培训成本高，知识传承依赖老员工经验', '一线销售、客服重复回答相同问题，效率低'],
      note: '用具体场景引发共鸣，比如“销售找方案要翻10分钟”。',
      visual: '建议配图：员工在多个系统中查找资料的示意图',
    },
    '解决方案': {
      subtitle: coreMessage,
      bullets: ['DmtPlat 提供一站式 AI 知识库管理平台', '支持文档、网页、数据库等多源数据接入', '通过智能问答让知识“开口说话”'],
      note: '这里要抛出核心方案，呼应封面给出的核心信息。',
      visual: '建议配图：DmtPlat 产品架构图或核心流程图',
    },
    '核心能力': {
      subtitle: '四大技术亮点',
      bullets: ['多源数据接入：PDF、Word、网页、数据库一键导入', '智能问答：基于大模型的语义理解与精准回复', '私有化部署：数据不出域，满足企业合规要求', '开放 API：与现有 OA、CRM、IM 系统快速集成'],
      note: '逐条讲解，每条约 30 秒，强调与客户相关的点。',
      visual: '建议配图：四宫格图标卡片',
    },
    '应用场景': {
      subtitle: '让知识真正被用起来',
      bullets: ['销售助手：客户方案、产品介绍、竞品对比', '客服助手：标准回复、问题解答、工单总结', '企业搜索门户：统一入口，秒级检索', '企业培训助手：课程学习、知识测验'],
      note: '结合客户实际岗位，挑选 2-3 个场景重点展开。',
      visual: '建议配图：岗位场景示意图或应用矩阵图',
    },
    '客户价值': {
      subtitle: '可量化的业务收益',
      bullets: ['知识检索效率提升 60% 以上', '新员工培训周期缩短 30%', '客服首次响应时间降低 50%', '销售方案准备时间从小时级降至分钟级'],
      note: '尽量用数据说话，如果客户有同行业案例可以补充。',
      visual: '建议配图：数据对比柱状图或收益雷达图',
    },
    '实施路径': {
      subtitle: '分阶段落地，风险可控',
      bullets: ['一期：搭建核心知识库，接入高频文档', '二期：对接业务系统，上线智能问答', '三期：扩展岗位助手，形成知识中台'],
      note: '强调项目可控，打消客户对实施周期的顾虑。',
      visual: '建议配图：三阶段时间轴',
    },
  };

  const attachmentLines = attachmentContext
    ? attachmentContext.split('\n').filter((line) => line.trim() && !line.startsWith('【附件')).slice(0, 3)
    : [];

  return outline.map((page, idx) => {
    const type = page.type === 'toc' ? 'catalog' : page.type || 'content';
    const title = page.title || (type === 'cover' ? topic : `第 ${idx + 1} 页`);

    if (type === 'cover') {
      return {
        type: 'cover',
        title,
        subtitle: page.subtitle || `面向 ${audience || '相关方'} 的汇报`,
        bullets: [],
        note: `开场先问候，点明汇报目标：${coreMessage}`,
        visual: `封面建议：简洁大气的${color}主题背景，突出标题与副标题`,
        layout: 'center',
      };
    }

    if (type === 'end') {
      return {
        type: 'end',
        title,
        subtitle: page.subtitle || '期待与您共创知识管理新范式',
        bullets: ['下一步：安排产品演示', '确认试点范围与关键干系人'],
        note: '收尾呼应核心信息，明确下一步动作。',
        visual: `结尾页建议：${color}品牌色背景，简洁致谢与联系方式`,
        layout: 'center',
      };
    }

    if (type === 'catalog') {
      return {
        type: 'catalog',
        title,
        subtitle: '',
        bullets: outline.filter((p) => p.type !== 'cover' && p.type !== 'end').map((p) => p.title),
        note: '快速让听众了解今天会讲什么，建立预期。',
        visual: '目录页建议：左侧大标题，右侧竖向导航条',
        layout: 'left-title-right-content',
      };
    }

    const matched = contentMap[title];
    const bullets = matched
      ? matched.bullets
      : [...(page.bullets || []), '结合业务实际，补充关键论据与数据', '强调与听众相关的价值点'].slice(0, 4);

    const enrichedBullets = attachmentLines.length ? [...bullets, ...attachmentLines].slice(0, 6) : bullets;

    return {
      type: 'content',
      title,
      subtitle: matched?.subtitle || page.subtitle || `围绕「${title}」展开`,
      bullets: enrichedBullets,
      note: matched?.note || `详细阐述“${title}”的核心观点，控制每页讲解时间在 1-2 分钟。`,
      visual: matched?.visual || `建议配图：与“${title}”相关的高质量场景图或示意图`,
      layout: 'left-title-right-content',
    };
  });
}

function generatePPTOutline(template, formData, mode, kbNames, options = {}) {
  const refs = getCitations(mode, template);
  const master = options.useMaster ? template.masterData : null;
  const attachmentContext = options.attachmentContext || getAttachmentContext(options.attachments);
  const skeleton = options.pptSkeleton;

  const topic = formData.topic || master?.title || '汇报主题';
  const audience = formData.audience || '相关方';
  const style = formData.style || '商务正式';
  const color = formData.color || '品牌绿';
  const pageCount = parseInt(formData.pages, 10) || 8;

  const styleTone = {
    '商务正式': '稳重、专业、数据驱动',
    '科技现代': '前沿、简洁、强调创新',
    '简约清新': '清晰、留白、重点突出',
    '活泼生动': '亲和、故事化、场景化',
  }[style] || '专业';

  const colorHex = {
    '品牌绿': '0E9F6E',
    '商务蓝': '1C64F2',
    '科技黑': '111827',
    '活力橙': 'F05252',
  }[color] || '0E9F6E';

  // 如果存在 PPT 母版，基于母版结构生成大纲
  if (master?.fileType === 'pptx' && master.slides?.length) {
    const targetCount = Math.max(2, Math.min(pageCount, master.slides.length + 5));
    const pages = [];
    for (let i = 0; i < targetCount; i++) {
      const masterSlide = master.slides[Math.min(i, master.slides.length - 1)];
      const type = masterSlide.type || 'content';
      if (type === 'cover') {
        pages.push({ type: 'cover', title: topic, subtitle: `基于 ${master.fileName || '原文件母版'} 生成` });
      } else if (type === 'catalog') {
        pages.push({ type: 'catalog', title: '汇报目录', subtitle: '' });
      } else if (type === 'end') {
        pages.push({ type: 'end', title: '感谢聆听', subtitle: '期待与您共创价值' });
      } else {
        pages.push({ type: 'content', title: masterSlide.title || `内容 ${i}`, subtitle: '待完善主题' });
      }
    }
    return {
      title: topic,
      style,
      styleTone,
      color,
      colorHex,
      pages: pages.map((p) => ({ ...p, bullets: [], note: '', visual: '', layout: p.type === 'cover' || p.type === 'end' ? 'center' : 'left-title-right-content' })),
      citations: refs,
      isOutline: true,
    };
  }

  if (skeleton && skeleton.storyline?.length) {
    const storylinePages = skeleton.storyline.map((item, idx) => ({
      type: 'content',
      title: item.title,
      subtitle: item.guide || '',
      guide: item.guide || '',
    }));

    const pages = [
      { type: 'cover', title: topic, subtitle: skeleton.name || `面向 ${audience} 的汇报` },
      { type: 'catalog', title: '汇报目录', subtitle: '' },
      ...storylinePages,
      { type: 'end', title: '感谢聆听', subtitle: '期待与您共创价值' },
    ].map((p) => ({
      ...p,
      bullets: [],
      note: '',
      visual: '',
      layout: p.type === 'cover' || p.type === 'end' ? 'center' : 'left-title-right-content',
    }));

    return {
      title: topic,
      style,
      styleTone,
      color,
      colorHex,
      pages,
      citations: refs,
      isOutline: true,
      skeletonId: skeleton.id,
      skeletonName: skeleton.name,
    };
  }

  const outlinePages = [
    { type: 'cover', title: topic, subtitle: `面向 ${audience} 的汇报` },
    { type: 'catalog', title: '汇报目录', subtitle: '' },
    { type: 'content', title: '背景与痛点', subtitle: '企业知识管理的现状' },
    { type: 'content', title: '解决方案', subtitle: `围绕${topic}的核心方案` },
    { type: 'content', title: '核心能力', subtitle: '四大技术亮点' },
    { type: 'content', title: '应用场景', subtitle: '让知识真正被用起来' },
    { type: 'content', title: '客户价值', subtitle: '可量化的业务收益' },
    { type: 'content', title: '实施路径', subtitle: '分阶段落地，风险可控' },
    { type: 'end', title: '感谢聆听', subtitle: '期待与您共创价值' },
  ];

  const pages = outlinePages.slice(0, pageCount).map((p) => ({
    ...p,
    bullets: [],
    note: '',
    visual: '',
    layout: p.type === 'cover' || p.type === 'end' ? 'center' : 'left-title-right-content',
  }));

  if (pageCount > outlinePages.length) {
    for (let i = outlinePages.length; i < pageCount; i++) {
      pages.push({
        type: 'content',
        title: `补充内容 ${i - outlinePages.length + 1}`,
        subtitle: '待完善主题',
        bullets: [],
        note: '',
        visual: '',
        layout: 'left-title-right-content',
      });
    }
  }

  return {
    title: topic,
    style,
    styleTone,
    color,
    colorHex,
    pages,
    citations: refs,
    isOutline: true,
  };
}

function generatePPT(template, formData, mode, kbNames, options = {}) {
  const refs = getCitations(mode, template);
  const master = options.useMaster ? template.masterData : null;
  const attachmentContext = options.attachmentContext || getAttachmentContext(options.attachments);

  const topic = formData.topic || master?.title || '汇报主题';
  const audience = formData.audience || '相关方';
  const style = formData.style || '商务正式';
  const color = formData.color || '品牌绿';
  const coreMessage = formData.coreMessage || `${topic}核心亮点`;
  const keyPoints = formData.keyPoints || '产品优势、核心能力、应用场景、客户价值';
  const pageCount = parseInt(formData.pages, 10) || 8;

  const styleTone = {
    '商务正式': '稳重、专业、数据驱动',
    '科技现代': '前沿、简洁、强调创新',
    '简约清新': '清晰、留白、重点突出',
    '活泼生动': '亲和、故事化、场景化',
  }[style] || '专业';

  const colorHex = {
    '品牌绿': '0E9F6E',
    '商务蓝': '1C64F2',
    '科技黑': '111827',
    '活力橙': 'F05252',
  }[color] || '0E9F6E';

  // 如果存在 PPT 母版，优先使用母版的主题与结构
  if (master?.fileType === 'pptx' && master.slides?.length) {
    return generatePPTFromMaster(template, formData, mode, kbNames, master, refs, pageCount);
  }

  // 如果用户已确认并编辑过大纲，优先按大纲结构生成内容
  const userOutline = options.pptOutline;
  if (Array.isArray(userOutline) && userOutline.length > 0) {
    const pages = buildPPTPagesFromUserOutline(userOutline, { topic, audience, coreMessage, color, styleTone, refs, attachmentContext });
    return {
      title: topic,
      style,
      styleTone,
      color,
      colorHex,
      coreMessage,
      pages,
      citations: refs,
    };
  }

  const basePages = [
    {
      type: 'cover',
      title: topic,
      subtitle: `面向 ${audience} 的汇报`,
      bullets: [],
      note: `开场先问候，点明汇报目标：${coreMessage}`,
      visual: `封面建议：简洁大气的${color}主题背景，突出标题与副标题`,
      layout: 'center',
    },
    {
      type: 'catalog',
      title: '汇报目录',
      subtitle: '',
      bullets: ['背景与痛点', '解决方案', '核心能力', '应用场景', '客户价值', '实施路径', '下一步'],
      note: '快速让听众了解今天会讲什么，建立预期。',
      visual: '目录页建议：左侧大标题，右侧竖向导航条',
      layout: 'left-title-right-content',
    },
    {
      type: 'content',
      title: '背景与痛点',
      subtitle: '企业知识管理的现状',
      bullets: [
        '知识分散在文档、邮件、聊天记录中，难以统一检索[1]',
        '新员工培训成本高，知识传承依赖老员工经验',
        '一线销售、客服重复回答相同问题，效率低',
      ],
      note: '用具体场景引发共鸣，比如“销售找方案要翻10分钟”。',
      visual: '建议配图：员工在多个系统中查找资料的示意图',
      layout: 'left-title-right-content',
    },
    {
      type: 'content',
      title: '解决方案',
      subtitle: coreMessage,
      bullets: [
        'DmtPlat 提供一站式 AI 知识库管理平台',
        '支持文档、网页、数据库等多源数据接入[1]',
        '通过智能问答让知识“开口说话”',
      ],
      note: '这里要抛出核心方案，呼应封面给出的核心信息。',
      visual: '建议配图：DmtPlat 产品架构图或核心流程图',
      layout: 'left-title-right-content',
    },
    {
      type: 'content',
      title: '核心能力',
      subtitle: '四大技术亮点',
      bullets: [
        '多源数据接入：PDF、Word、网页、数据库一键导入',
        '智能问答：基于大模型的语义理解与精准回复[2]',
        '私有化部署：数据不出域，满足企业合规要求',
        '开放 API：与现有 OA、CRM、IM 系统快速集成',
      ],
      note: '逐条讲解，每条约 30 秒，强调与客户相关的点。',
      visual: '建议配图：四宫格图标卡片',
      layout: 'left-title-right-content',
    },
    {
      type: 'content',
      title: '应用场景',
      subtitle: '让知识真正被用起来',
      bullets: [
        '销售助手：客户方案、产品介绍、竞品对比',
        '客服助手：标准回复、问题解答、工单总结',
        '企业搜索门户：统一入口，秒级检索',
        '企业培训助手：课程学习、知识测验',
      ],
      note: '结合客户实际岗位，挑选 2-3 个场景重点展开。',
      visual: '建议配图：岗位场景示意图或应用矩阵图',
      layout: 'left-title-right-content',
    },
    {
      type: 'content',
      title: '客户价值',
      subtitle: '可量化的业务收益',
      bullets: [
        '知识检索效率提升 60% 以上',
        '新员工培训周期缩短 30%',
        '客服首次响应时间降低 50%',
        '销售方案准备时间从小时级降至分钟级',
      ],
      note: '尽量用数据说话，如果客户有同行业案例可以补充。',
      visual: '建议配图：数据对比柱状图或收益雷达图',
      layout: 'left-title-right-content',
    },
    {
      type: 'content',
      title: '实施路径',
      subtitle: '分阶段落地，风险可控',
      bullets: [
        '一期：搭建核心知识库，接入高频文档',
        '二期：对接业务系统，上线智能问答',
        '三期：扩展岗位助手，形成知识中台',
      ],
      note: '强调项目可控，打消客户对实施周期的顾虑。',
      visual: '建议配图：三阶段时间轴',
      layout: 'left-title-right-content',
    },
    {
      type: 'end',
      title: '感谢聆听',
      subtitle: '期待与您共创知识管理新范式',
      bullets: ['下一步：安排产品演示', '确认试点范围与关键干系人'],
      note: '收尾呼应核心信息，明确下一步动作。',
      visual: `结尾页建议：${color}品牌色背景，简洁致谢与联系方式`,
      layout: 'center',
    },
  ];

  // 根据目标页数裁剪或扩展
  let pages = basePages.slice(0, pageCount);
  if (pageCount > basePages.length) {
    for (let i = basePages.length; i < pageCount; i++) {
      pages.push({
        type: 'content',
        title: `补充内容 ${i - basePages.length + 1}`,
        subtitle: `围绕「${keyPoints}」展开`,
        bullets: ['要点一', '要点二', '要点三'],
        note: '根据现场听众反馈灵活调整。',
        visual: '建议配图：与主题相关的示意图',
        layout: 'left-title-right-content',
      });
    }
  }

  if (attachmentContext) {
    const attachmentLines = attachmentContext.split('\n').filter(Boolean).slice(1, 4);
    pages = pages.map((page, idx) => {
      if (page.type !== 'content') return page;
      return {
        ...page,
        bullets: [...page.bullets, ...attachmentLines].slice(0, 6),
        note: page.note + '\n\n参考附件：已结合上传附件中的关键信息。',
      };
    });
  }

  return {
    title: topic,
    style,
    styleTone,
    color,
    colorHex,
    coreMessage,
    pages,
    citations: refs,
  };
}

export function generatePPTContentFromOutline(outline, template, formData, mode, kbNames, options = {}) {
  const refs = getCitations(mode, template);
  const master = options.useMaster ? template.masterData : null;
  const attachmentContext = options.attachmentContext || getAttachmentContext(options.attachments);
  const topic = outline.title;
  const coreMessage = formData.coreMessage || `${topic}核心亮点`;
  const keyPoints = formData.keyPoints || '产品优势、核心能力、应用场景、客户价值';
  const color = outline.color;
  const colorHex = outline.colorHex;
  const style = outline.style;
  const styleTone = outline.styleTone;

  const pageContentMap = {
    '背景与痛点': {
      bullets: [
        '知识分散在文档、邮件、聊天记录中，难以统一检索[1]',
        '新员工培训成本高，知识传承依赖老员工经验',
        '一线销售、客服重复回答相同问题，效率低',
      ],
      note: '用具体场景引发共鸣，比如“销售找方案要翻10分钟”。',
      visual: '建议配图：员工在多个系统中查找资料的示意图',
    },
    '解决方案': {
      bullets: [
        'DmtPlat 提供一站式 AI 知识库管理平台',
        '支持文档、网页、数据库等多源数据接入[1]',
        '通过智能问答让知识“开口说话”',
      ],
      note: '这里要抛出核心方案，呼应封面给出的核心信息。',
      visual: '建议配图：DmtPlat 产品架构图或核心流程图',
    },
    '核心能力': {
      bullets: [
        '多源数据接入：PDF、Word、网页、数据库一键导入',
        '智能问答：基于大模型的语义理解与精准回复[2]',
        '私有化部署：数据不出域，满足企业合规要求',
        '开放 API：与现有 OA、CRM、IM 系统快速集成',
      ],
      note: '逐条讲解，每条约 30 秒，强调与客户相关的点。',
      visual: '建议配图：四宫格图标卡片',
    },
    '应用场景': {
      bullets: [
        '销售助手：客户方案、产品介绍、竞品对比',
        '客服助手：标准回复、问题解答、工单总结',
        '企业搜索门户：统一入口，秒级检索',
        '企业培训助手：课程学习、知识测验',
      ],
      note: '结合客户实际岗位，挑选 2-3 个场景重点展开。',
      visual: '建议配图：岗位场景示意图或应用矩阵图',
    },
    '客户价值': {
      bullets: [
        '知识检索效率提升 60% 以上',
        '新员工培训周期缩短 30%',
        '客服首次响应时间降低 50%',
        '销售方案准备时间从小时级降至分钟级',
      ],
      note: '尽量用数据说话，如果客户有同行业案例可以补充。',
      visual: '建议配图：数据对比柱状图或收益雷达图',
    },
    '实施路径': {
      bullets: [
        '一期：搭建核心知识库，接入高频文档',
        '二期：对接业务系统，上线智能问答',
        '三期：扩展岗位助手，形成知识中台',
      ],
      note: '强调项目可控，打消客户对实施周期的顾虑。',
      visual: '建议配图：三阶段时间轴',
    },
  };

  const catalogBullets = outline.pages
    .filter((p) => p.type === 'content')
    .map((p) => p.title)
    .slice(0, 7);
  if (catalogBullets.length < 3) catalogBullets.push('总结与展望');

  const pages = outline.pages.map((page) => {
    if (page.type === 'cover') {
      return {
        ...page,
        bullets: [],
        note: `开场先问候，点明汇报目标：${coreMessage}`,
        visual: `封面建议：简洁大气的${color}主题背景，突出标题与副标题`,
        layout: 'center',
      };
    }
    if (page.type === 'catalog') {
      return {
        ...page,
        bullets: catalogBullets,
        note: '快速让听众了解今天会讲什么，建立预期。',
        visual: '目录页建议：左侧大标题，右侧竖向导航条',
        layout: 'left-title-right-content',
      };
    }
    if (page.type === 'end') {
      return {
        ...page,
        bullets: ['下一步：安排产品演示', '确认试点范围与关键干系人'],
        note: '收尾呼应核心信息，明确下一步动作。',
        visual: `结尾页建议：${color}品牌色背景，简洁致谢与联系方式`,
        layout: 'center',
      };
    }
    const fallback = {
      bullets: ['要点一', '要点二', '要点三'],
      note: '根据现场听众反馈灵活调整。',
      visual: '建议配图：与主题相关的示意图',
    };
    const content = pageContentMap[page.title] || fallback;
    const attachmentBullets = attachmentContext
      ? [attachmentContext.split('\n').filter(Boolean).slice(1, 4).join('；')]
      : [];
    return {
      ...page,
      bullets: [...content.bullets, ...attachmentBullets].slice(0, 6),
      note: content.note + (attachmentContext ? '\n\n参考附件：已结合上传附件中的关键信息。' : ''),
      visual: content.visual,
      layout: 'left-title-right-content',
    };
  });

  return {
    title: topic,
    style,
    styleTone,
    color,
    colorHex,
    coreMessage,
    pages,
    citations: refs,
  };
}

function generatePPTFromMaster(template, formData, mode, kbNames, master, refs, pageCount) {
  const topic = formData.topic || master.title || '汇报主题';
  const theme = master.theme || {};
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};

  // 从母版主题提取主色：优先 accent1，其次 dk1/lt1
  const primaryColor = colors.accent1 || colors.dk1 || colors.lt1 || '0E9F6E';
  const colorHex = primaryColor.replace('#', '');
  const majorFont = fonts.major || fonts.minor || 'Arial';
  const minorFont = fonts.minor || majorFont;

  // 按母版 slide 类型构造页面结构
  const masterTypes = master.slides.map((s) => s.type);
  const targetCount = Math.max(2, Math.min(pageCount, master.slides.length + 5));

  const pages = [];
  for (let i = 0; i < targetCount; i++) {
    const masterSlide = master.slides[Math.min(i, master.slides.length - 1)];
    const type = masterTypes[i] || masterSlide.type || 'content';

    if (type === 'cover') {
      pages.push({
        type: 'cover',
        title: topic,
        subtitle: `基于 ${master.fileName || '原文件母版'} 生成`,
        bullets: [],
        note: '开场点明汇报目标。',
        visual: `沿用原 PPT 封面风格，主题色 ${primaryColor}，主字体 ${majorFont}`,
        layout: 'center',
      });
    } else if (type === 'catalog') {
      pages.push({
        type: 'catalog',
        title: '汇报目录',
        subtitle: '',
        bullets: ['背景与痛点', '解决方案', '核心能力', '应用场景', '客户价值', '实施路径'],
        note: '快速让听众了解汇报结构。',
        visual: '沿用原目录页布局',
        layout: 'left-title-right-content',
      });
    } else if (type === 'end') {
      pages.push({
        type: 'end',
        title: '感谢聆听',
        subtitle: '期待与您共创价值',
        bullets: ['下一步：确认试点范围'],
        note: '收尾呼应核心信息。',
        visual: `沿用原结尾页风格，主题色 ${primaryColor}`,
        layout: 'center',
      });
    } else {
      const bullets = masterSlide.bullets?.length
        ? masterSlide.bullets.map((b) => (b.includes('{') ? '要点示例' : b)).slice(0, 5)
        : ['要点一', '要点二', '要点三'];
      pages.push({
        type: 'content',
        title: i === 1 ? '背景与痛点' : masterSlide.title || `内容 ${i}`,
        subtitle: '',
        bullets,
        note: `沿用原 ${masterSlide.type || 'content'} 页布局，字体 ${minorFont}`,
        visual: masterSlide.hasImage ? '沿用原页配图位置与风格' : '建议配图：与主题相关的示意图',
        layout: 'left-title-right-content',
      });
    }
  }

  return {
    title: topic,
    style: '基于母版',
    styleTone: `沿用原文件视觉风格（${majorFont} / ${primaryColor}）`,
    color: '母版色',
    colorHex,
    coreMessage: topic,
    pages,
    masterTheme: theme,
    citations: refs,
  };
}

function generateReport(template, formData, mode, kbNames, options = {}) {
  const refs = getCitations(mode, template);
  const master = options.useMaster ? template.masterData : null;
  const attachmentContext = options.attachmentContext || getAttachmentContext(options.attachments);
  const attachmentSuffix = attachmentContext ? `\n\n---\n\n## 参考附件\n\n以下内容结合了上传附件中的信息：\n${attachmentContext}` : '';

  if (master?.fileType === 'pdf' && master.headings?.length) {
    const topic = formData.topic || master.title || '研究报告';
    let content = `## 摘要\n\n本报告基于「${master.fileName || 'PDF 文档'}」的母版结构生成，主题围绕「${topic}」。${mode === 'kb' ? '内容结合了知识库资料。' : '内容由大模型基于原结构生成。'}\n\n`;
    for (const h of master.headings) {
      const prefix = '#'.repeat(Math.min(h.level + 1, 6));
      content += `${prefix} ${h.text}\n\n`;
      content += `围绕「${h.text}」的分析内容...\n\n`;
    }
    return { title: topic, content: content + attachmentSuffix, citations: refs };
  }

  return {
    title: `${formData.topic || '研究报告'}`,
    content: `## 摘要\n\n本报告围绕「${formData.topic || '研究主题'}」展开分析。当前，企业数字化转型推动知识管理市场规模持续增长[1]，AI 驱动的知识库成为企业智能化升级的重要基础设施[2]。\n\n## 一、市场概述\n\n企业知识管理市场正处于快速增长期。随着企业数据量激增和远程办公普及，传统的文档管理方式已难以满足员工即时获取知识的需求。\n\n## 二、关键趋势\n\n1. **AI 与知识库深度融合**：大语言模型提升了知识检索和问答的智能化水平。\n2. **多源数据整合**：企业希望将文档、网页、数据库等异构数据统一管理。\n3. **场景化应用**：知识库不再只是搜索工具，而是销售、客服、培训等岗位的工作助手。\n\n## 三、竞争格局\n\n市场主要参与者包括传统知识管理软件、协同办公平台以及新兴 AI 知识库产品。差异化能力体现在数据接入广度、AI 理解深度和应用场景丰富度。\n\n## 四、结论与建议\n\n企业选择知识库产品时应重点关注：与现有系统的集成能力、数据安全合规性、以及面向具体岗位的 AI 应用能力。${attachmentSuffix}`,
    citations: refs,
  };
}

// 本地存储历史记录
const STORAGE_KEY = 'workAssistantHistory';
const STORAGE_DRAFT_KEY = 'workAssistantDraft';
const STORAGE_ROLE_KEY = 'workAssistantLastRole';
const STORAGE_QUICK_SCENE_KEY = 'workAssistantQuickScene';
const STORAGE_QUICK_CONTENT_KEY = 'workAssistantQuickContent';

export function getWorkHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveWorkHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function addWorkHistory(record) {
  const history = getWorkHistory();
  history.unshift(record);
  if (history.length > 50) history.pop();
  saveWorkHistory(history);
}

export function getDraft(templateId) {
  try {
    const drafts = JSON.parse(localStorage.getItem(STORAGE_DRAFT_KEY) || '{}');
    return drafts[templateId] || null;
  } catch {
    return null;
  }
}

export function saveDraft(templateId, draft) {
  const drafts = JSON.parse(localStorage.getItem(STORAGE_DRAFT_KEY) || '{}');
  if (draft) {
    drafts[templateId] = draft;
  } else {
    delete drafts[templateId];
  }
  localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(drafts));
}

export function getLastRole() {
  return localStorage.getItem(STORAGE_ROLE_KEY) || 'sales';
}

export function setLastRole(roleId) {
  localStorage.setItem(STORAGE_ROLE_KEY, roleId);
}

// 首页「场景模板 / 内容模板」快速入口配置（最多3个模板 id）
function readQuickIds(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x).slice(0, 3) : [];
  } catch {
    return [];
  }
}
function writeQuickIds(key, ids) {
  const safe = Array.isArray(ids) ? ids.filter((x) => typeof x === 'string' && x).slice(0, 3) : [];
  localStorage.setItem(key, JSON.stringify(safe));
}
export function getQuickSceneTemplateIds() { return readQuickIds(STORAGE_QUICK_SCENE_KEY); }
export function setQuickSceneTemplateIds(ids) { writeQuickIds(STORAGE_QUICK_SCENE_KEY, ids); }
export function getQuickContentTemplateIds() { return readQuickIds(STORAGE_QUICK_CONTENT_KEY); }
export function setQuickContentTemplateIds(ids) { writeQuickIds(STORAGE_QUICK_CONTENT_KEY, ids); }

export function createWorkRecord(template, formData, mode, selectedKBs, result) {
  const kbs = Array.isArray(selectedKBs) ? selectedKBs : [];
  return {
    id: generateId('wa'),
    templateId: template?.id,
    templateName: template?.name,
    abilityId: template?.abilityId,
    abilityName: getAbilityById(template?.abilityId)?.name || '',
    roleId: template?.roleId,
    roleName: getRoleById(template?.roleId)?.name || '',
    mode,
    kbIds: kbs.map((kb) => kb.id),
    kbNames: kbs.map((kb) => kb.name),
    formData,
    result,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDraft: false,
  };
}
